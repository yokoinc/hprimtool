const { app, BrowserWindow, Menu, dialog, ipcMain, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let fileToOpen = null;

// Fonction pour vérifier et déplacer l'app vers /Applications sur macOS
function checkAndMoveToApplications() {
    if (process.platform !== 'darwin') return;
    
    // Ignorer en mode développement (détecté par la présence d'Electron dans le chemin)
    if (process.execPath.includes('node_modules/electron')) {
        console.log('Mode développement détecté, vérification /Applications ignorée');
        return;
    }
    
    const appPath = app.getAppPath();
    let currentAppPath;
    let appName;
    
    // Dans une app packagée, process.execPath pointe vers l'exécutable dans Contents/MacOS
    if (process.execPath.endsWith('.app/Contents/MacOS/HPRIM Tool')) {
        // App packagée
        currentAppPath = path.dirname(path.dirname(path.dirname(process.execPath)));
        appName = path.basename(currentAppPath);
    } else {
        // Fallback pour d'autres cas
        appName = 'HPRIM Tool.app';
        currentAppPath = path.resolve(appPath, '..', '..');
    }
    
    const targetPath = `/Applications/${appName}`;
    
    console.log('=== DEBUG APPLICATIONS CHECK ===');
    console.log('appPath:', appPath);
    console.log('process.execPath:', process.execPath);
    console.log('appName:', appName);
    console.log('currentAppPath:', currentAppPath);
    console.log('targetPath:', targetPath);
    console.log('currentAppPath.startsWith("/Applications/"):', currentAppPath.startsWith('/Applications/'));
    
    // Vérifier si on est déjà dans /Applications
    if (currentAppPath.startsWith('/Applications/')) {
        console.log('Application déjà dans /Applications');
        return;
    }
    
    // Vérifier si l'app existe déjà dans /Applications
    if (fs.existsSync(targetPath)) {
        console.log('Application existe déjà dans /Applications');
        return;
    }
    
    // Proposer de déplacer l'application
    const response = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Déplacer vers Applications', 'Ouvrir le Finder', 'Continuer sans déplacer'],
        defaultId: 0,
        message: 'Déplacer HPRIM Tool vers le dossier Applications ?',
        detail: 'Pour un fonctionnement optimal (associations de fichiers, mises à jour), il est recommandé de placer HPRIM Tool dans le dossier Applications.\n\nVous pouvez le faire manuellement ou laisser l\'application vous aider.',
        icon: path.join(__dirname, 'icons', 'icon.png')
    });
    
    if (response === 0) {
        // Tentative de déplacement automatique
        try {
            const { execSync } = require('child_process');
            
            // Échapper correctement les chemins pour AppleScript
            const escapedCurrentPath = currentAppPath.replace(/'/g, "\\'");
            const escapedTargetDir = "/Applications/";
            
            // Méthode 1: Utiliser mv avec sudo via osascript
            const moveScript = `do shell script "mv '${escapedCurrentPath}' '${escapedTargetDir}'" with administrator privileges`;
            
            console.log('Script AppleScript:', moveScript);
            execSync(`osascript -e "${moveScript}"`, { timeout: 10000 });
            
            dialog.showMessageBoxSync(mainWindow, {
                type: 'info',
                message: 'Application déplacée !',
                detail: 'HPRIM Tool a été déplacé vers le dossier Applications. L\'application va redémarrer depuis son nouvel emplacement.',
                buttons: ['OK']
            });
            
            // Relancer l'app depuis le nouveau chemin
            shell.openPath(targetPath).then(() => {
                app.quit();
            });
            
        } catch (error) {
            console.error('Erreur lors du déplacement automatique:', error);
            
            // Fallback: ouvrir le Finder pour un déplacement manuel
            dialog.showMessageBoxSync(mainWindow, {
                type: 'info',
                message: 'Déplacement manuel requis',
                detail: 'Le déplacement automatique a échoué. Le Finder va s\'ouvrir pour vous permettre de glisser-déposer manuellement l\'application vers le dossier Applications.',
                buttons: ['OK']
            });
            
            // Ouvrir le dossier contenant l'app ET le dossier Applications
            shell.showItemInFolder(currentAppPath);
            shell.openPath('/Applications');
        }
    } else if (response === 1) {
        // Ouvrir le Finder pour un déplacement manuel
        shell.showItemInFolder(currentAppPath);
        shell.openPath('/Applications');
        
        dialog.showMessageBoxSync(mainWindow, {
            type: 'info',
            message: 'Déplacement manuel',
            detail: 'Glissez-déposez l\'application HPRIM Tool depuis son dossier actuel vers le dossier Applications qui vient de s\'ouvrir.',
            buttons: ['OK']
        });
    }
}

// Gestion des arguments de ligne de commande (fichier passé au lancement)
if (process.argv.length > 1) {
    const potentialFile = process.argv[process.argv.length - 1];
    if (potentialFile && (potentialFile.endsWith('.hpr') || potentialFile.endsWith('.hpm') || potentialFile.endsWith('.hpm1') || potentialFile.endsWith('.hpm2') || potentialFile.endsWith('.hpm3') || potentialFile.endsWith('.hprim'))) {
        fileToOpen = potentialFile;
        console.log('Fichier détecté au lancement:', fileToOpen);
    }
}

function createWindow() {
    // Créer la fenêtre principale
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 400,
        minHeight: 300,
        center: true,
        title: 'HPRIM Tool - Analyseur de résultats médicaux',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icons', 'icon.png')
    });

    // Charger l'interface
    mainWindow.loadFile('index.html');

    // Menu macOS
    if (process.platform === 'darwin') {
        const template = [
            {
                label: 'HPRIM Tool',
                submenu: [
                    { role: 'about', label: 'À propos de HPRIM Tool' },
                    { type: 'separator' },
                    { role: 'hide', label: 'Masquer HPRIM Tool' },
                    { role: 'hideothers', label: 'Masquer les autres' },
                    { role: 'unhide', label: 'Tout afficher' },
                    { type: 'separator' },
                    { role: 'quit', label: 'Quitter HPRIM Tool' }
                ]
            },
            {
                label: 'Fichier',
                submenu: [
                    {
                        label: 'Ouvrir...',
                        accelerator: 'CmdOrCtrl+O',
                        click: openFileDialog
                    },
                    { type: 'separator' },
                    { role: 'close', label: 'Fermer la fenêtre' }
                ]
            },
            {
                label: 'Édition',
                submenu: [
                    { role: 'undo', label: 'Annuler' },
                    { role: 'redo', label: 'Refaire' },
                    { type: 'separator' },
                    { role: 'cut', label: 'Couper' },
                    { role: 'copy', label: 'Copier' },
                    { role: 'paste', label: 'Coller' },
                    { role: 'selectall', label: 'Tout sélectionner' }
                ]
            },
            {
                label: 'Affichage',
                submenu: [
                    { role: 'reload', label: 'Actualiser' },
                    { role: 'toggledevtools', label: 'Outils de développement' },
                    { type: 'separator' },
                    { role: 'resetzoom', label: 'Taille réelle' },
                    { role: 'zoomin', label: 'Zoom avant' },
                    { role: 'zoomout', label: 'Zoom arrière' },
                    { type: 'separator' },
                    { role: 'togglefullscreen', label: 'Plein écran' }
                ]
            },
            {
                label: 'Fenêtre',
                submenu: [
                    { role: 'minimize', label: 'Réduire' },
                    { role: 'zoom', label: 'Zoom' },
                    { type: 'separator' },
                    { role: 'front', label: 'Tout à l\'avant' }
                ]
            }
        ];
        
        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    // Gérer les raccourcis globaux
    globalShortcut.register('CommandOrControl+Q', () => {
        app.quit();
    });

    globalShortcut.register('CommandOrControl+W', () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });

    globalShortcut.register('CommandOrControl+P', () => {
        if (mainWindow) {
            // Déclencher l'impression via JavaScript (comme le bouton Imprimer)
            mainWindow.webContents.executeJavaScript('window.print();');
        }
    });

    // Gérer la fermeture de la fenêtre - quitter l'app au lieu de juste fermer
    mainWindow.on('close', (event) => {
        app.quit();
    });

    // Événement quand la fenêtre est prête
    mainWindow.webContents.once('dom-ready', () => {
        // Vérifier si on doit déplacer l'app vers /Applications (macOS uniquement)
        setTimeout(() => {
            console.log('Appel de checkAndMoveToApplications()...');
            try {
                checkAndMoveToApplications();
            } catch (error) {
                console.error('Erreur dans checkAndMoveToApplications:', error);
                // Ne pas interrompre le fonctionnement de l'app
            }
        }, 1000); // Attendre 1 seconde pour que la fenêtre soit complètement chargée
        
        // Si un fichier a été passé au lancement, l'envoyer à la fenêtre
        if (fileToOpen) {
            console.log('Envoi du fichier à la fenêtre:', fileToOpen);
            mainWindow.webContents.send('file-to-open', fileToOpen);
            fileToOpen = null; // Reset pour éviter de le renvoyer
        }
    });
}

// Fonction pour ouvrir la boîte de dialogue de fichier
function openFileDialog() {
    dialog.showOpenDialog(mainWindow, {
        title: 'Sélectionner un fichier HPRIM',
        filters: [
            { name: 'Fichiers HPRIM', extensions: ['hpr', 'hpm', 'hpm1', 'hpm2', 'hpm3', 'hprim'] },
            { name: 'Fichiers texte', extensions: ['txt'] },
            { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            mainWindow.webContents.send('file-selected', filePath);
        }
    }).catch(err => {
        console.error('Erreur lors de l\'ouverture du fichier:', err);
    });
}

// IPC: Lire un fichier avec sécurité renforcée
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        // Validation du chemin de fichier
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Chemin de fichier invalide');
        }
        
        // Normaliser le chemin pour éviter les attaques de traversée
        const normalizedPath = path.normalize(filePath);
        
        // Vérifier que le chemin ne contient pas de traversée
        if (normalizedPath.includes('..')) {
            throw new Error('Traversée de répertoire non autorisée');
        }
        
        // Vérifier l'extension du fichier
        const allowedExtensions = ['.hpr', '.hpm', '.hpm1', '.hpm2', '.hpm3', '.hprim', '.txt'];
        const ext = path.extname(normalizedPath).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            throw new Error(`Extension de fichier non autorisée: ${ext}`);
        }
        
        // Vérifier que le fichier existe
        if (!fs.existsSync(normalizedPath)) {
            throw new Error('Fichier introuvable');
        }
        
        // Vérifier la taille du fichier (limite: 10MB)
        const stats = fs.statSync(normalizedPath);
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (stats.size > maxSize) {
            throw new Error(`Fichier trop volumineux (${Math.round(stats.size / 1024 / 1024)}MB > 10MB)`);
        }
        
        // Lire le fichier en binaire puis convertir en ISO-8859-1
        const buffer = fs.readFileSync(normalizedPath);
        
        // Vérifier que le fichier n'est pas vide
        if (buffer.length === 0) {
            throw new Error('Le fichier est vide');
        }
        
        // Convertir chaque byte en caractère ISO-8859-1
        let text = '';
        for (let i = 0; i < buffer.length; i++) {
            text += String.fromCharCode(buffer[i]);
        }
        
        console.log(`Fichier lu avec succès: ${normalizedPath} (${buffer.length} bytes)`);
        return text;
        
    } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
        
        // Messages d'erreur spécifiques selon le type d'erreur
        if (error.code === 'ENOENT') {
            throw new Error('Fichier introuvable');
        } else if (error.code === 'EACCES') {
            throw new Error('Accès refusé au fichier');
        } else if (error.code === 'EISDIR') {
            throw new Error('Le chemin spécifié est un dossier, pas un fichier');
        } else {
            throw new Error(`Erreur lors de la lecture du fichier: ${error.message}`);
        }
    }
});

// IPC: Ouvrir la boîte de dialogue de fichier
ipcMain.on('open-file-dialog', (event) => {
    openFileDialog();
});

// IPC: Quitter l'application
ipcMain.on('quit-app', (event) => {
    app.quit();
});

// IPC: Obtenir la langue du système
ipcMain.handle('get-system-language', async () => {
    return app.getLocale();
});

// IPC: Mettre à jour le titre de la fenêtre
ipcMain.on('update-window-title', (event, title) => {
    if (mainWindow) {
        mainWindow.setTitle(title);
    }
});

// IPC: Export CSV
ipcMain.handle('export-excel', async (event, resultsData, patientName) => {
    try {
        const fileName = `resultats_${patientName || 'patient'}_${new Date().toISOString().slice(0,10)}.csv`;
        
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Exporter en CSV',
            defaultPath: fileName,
            filters: [
                { name: 'CSV Files (Excel compatible)', extensions: ['csv'] },
                { name: 'Tous les fichiers', extensions: ['*'] }
            ]
        });

        if (filePath) {
            // S'assurer que le fichier a l'extension .csv
            const finalPath = filePath.endsWith('.csv') ? filePath : filePath + '.csv';
            
            // Créer le contenu CSV avec BOM UTF-8 pour Excel
            const BOM = '\uFEFF'; // BOM pour forcer UTF-8 dans Excel
            let csvContent = BOM + 'Analyse;Valeur;Unité;Valeurs de référence;Statut;Commentaires\n';
            
            resultsData.forEach(result => {
                // Nettoyer le nom (supprimer les deux-points de fin)
                const name = (result.name || '').replace(/:\s*$/, '').replace(/;/g, ',').replace(/"/g, '""');
                
                // Gérer les valeurs multiples
                let value = result.value1 || '';
                let unit = result.unit1 || '';
                
                if (result.hasMultipleUnits && result.value2) {
                    value += ` / ${result.value2}`;
                    unit += ` / ${result.unit2 || ''}`;
                }
                
                // Formater les normes proprement
                let norms = '';
                if (result.min1 !== null && result.max1 !== null) {
                    norms = `${result.min1} - ${result.max1}`;
                } else if (result.min1 !== null) {
                    norms = `> ${result.min1}`;
                } else if (result.max1 !== null) {
                    norms = `< ${result.max1}`;
                }
                
                // Ajouter les normes de la deuxième unité si applicable
                if (result.hasMultipleUnits && (result.min2 !== null || result.max2 !== null)) {
                    let norms2 = '';
                    if (result.min2 !== null && result.max2 !== null) {
                        norms2 = `${result.min2} - ${result.max2}`;
                    } else if (result.min2 !== null) {
                        norms2 = `> ${result.min2}`;
                    } else if (result.max2 !== null) {
                        norms2 = `< ${result.max2}`;
                    }
                    if (norms2) {
                        norms += ` / ${norms2}`;
                    }
                }
                
                const status = result.isAbnormal ? 'Anormal' : 'Normal';
                
                // Gérer les commentaires
                const comments = (result.comments && result.comments.length > 0) ? 
                    result.comments.join(' ').replace(/;/g, ',').replace(/"/g, '""') : '';
                
                csvContent += `"${name}";"${value}";"${unit}";"${norms}";"${status}";"${comments}"\n`;
            });

            // Sauvegarder le fichier CSV avec UTF-8 + BOM
            const fs = require('fs');
            fs.writeFileSync(finalPath, csvContent, 'utf8');
            
            console.log('Fichier CSV exporté vers:', finalPath);
            return { success: true, path: finalPath };
        } else {
            return { success: false, cancelled: true };
        }

    } catch (error) {
        console.error('Erreur export CSV:', error);
        return { success: false, error: error.message };
    }
});

// Export PDF function removed - only CSV/Excel export available

// Gestion de l'ouverture de fichiers par double-clic (macOS)
app.on('open-file', (event, filePath) => {
    event.preventDefault();
    console.log('Fichier ouvert via open-file:', filePath);
    
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('file-to-open', filePath);
    } else {
        fileToOpen = filePath;
    }
});

// Prêt à créer les fenêtres
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quitter quand toutes les fenêtres sont fermées
app.on('window-all-closed', () => {
    globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Nettoyer les raccourcis quand l'app se ferme
app.on('before-quit', () => {
    globalShortcut.unregisterAll();
});