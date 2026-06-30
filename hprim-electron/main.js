const { app, BrowserWindow, Menu, dialog, ipcMain, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { decodeBuffer } = require('./parser.js');
const { autoUpdater } = require('electron-updater');

// Sur certaines configs (pilotes GPU + Chromium d'Electron 27), le processus GPU
// plante en boucle au démarrage (sortie 0xC0000409) : chaque crash/redémarrage
// provoque un flash noir <-> thème (« glitch » au lancement). L'interface étant en
// 2D simple, le rendu logiciel est tout aussi fluide et supprime ces crashs.
// DOIT être appelé avant app 'ready'.
// Sécurité d'affichage : rendu logiciel par défaut (zéro crash GPU, démarrage net).
// NB : sous Electron 42, le GPU fonctionne sans planter (testé) — cette ligne peut
// être retirée pour réactiver l'accélération matérielle si un rendu accéléré est
// souhaité. Conservée par prudence vu l'historique de clignotement.
app.disableHardwareAcceleration();

let mainWindow;
let fileToOpen = null;

// Fonction pour vérifier et déplacer l'app vers /Applications sur macOS
function checkAndMoveToApplications() {
    if (process.platform !== 'darwin') return;
    
    // Ignorer en mode développement (détecté par la présence d'Electron dans le chemin)
    if (process.execPath.includes('node_modules/electron')) {
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
    
    
    // Vérifier si on est déjà dans /Applications
    if (currentAppPath.startsWith('/Applications/')) {
        return;
    }
    
    // Vérifier si l'app existe déjà dans /Applications
    if (fs.existsSync(targetPath)) {
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

// Extensions HPRIM reconnues — test INSENSIBLE À LA CASSE. Windows passe souvent
// l'extension en majuscules (ex. « .HPM »), ce qui faisait échouer l'ouverture au
// lancement à froid (endsWith sensible à la casse) alors que la 2ᵉ instance, elle,
// matchait : d'où « 1er double-clic = rien, 2e double-clic = ça ouvre ».
const HPRIM_FILE_RE = /\.(hpr|hpm|hpm1|hpm2|hpm3|hprim)$/i;
function isHprimFile(p) {
    return typeof p === 'string' && HPRIM_FILE_RE.test(p);
}

// Gestion des arguments de ligne de commande (fichier passé au lancement)
if (process.argv.length > 1) {
    const potentialFile = process.argv[process.argv.length - 1];
    if (isHprimFile(potentialFile)) {
        fileToOpen = potentialFile;
    }
}

// Couleur de fond initiale = fond du thème (clair/sombre) selon l'heure, pour éviter
// un flash blanc avant le premier rendu (fenêtre sans cadre). Règle alignée sur
// autoDetectTheme() (renderer) et theme-init.js : sombre de 19h à 7h.
function initialThemeBackground() {
    const h = new Date().getHours();
    return (h >= 19 || h < 7) ? '#0f172a' : '#f1f5f9';
}

function createWindow() {
    // Créer la fenêtre principale
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 400,
        minHeight: 300,
        center: true,
        show: false,                            // Affichée seulement quand le rendu est prêt (anti-flash)
        backgroundColor: initialThemeBackground(), // Fond du thème dès l'ouverture
        frame: false,               // Pas de barre de titre Windows (interface épurée)
        autoHideMenuBar: true,      // Pas de barre de menu
        title: 'HPRIM Tool - Analyseur de résultats médicaux',
        webPreferences: {
            nodeIntegration: false,     // ✅ Sécurisé - empêche l'accès direct à Node.js
            contextIsolation: true,     // ✅ Isolation du contexte pour la sécurité
            enableRemoteModule: false,  // ✅ Désactive le module remote vulnérable
            sandbox: true,              // ✅ Renderer/preload sandboxés (preload n'utilise que contextBridge/ipcRenderer/webUtils)
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icons', 'icon.png')
    });

    // Charger l'interface
    mainWindow.loadFile('index.html');

    // N'afficher la fenêtre que lorsque le renderer signale qu'il a fini de peindre
    // (thème + i18n appliqués, 2 frames passées) -> démarrage net, sans fenêtre vide
    // ni clignotement. Filet de sécurité : délai max si le signal n'arrive pas.
    const showWhenReady = () => { if (mainWindow && !mainWindow.isVisible()) mainWindow.show(); };
    ipcMain.once('renderer-ready', showWhenReady);
    setTimeout(showWhenReady, 4000); // secours si 'renderer-ready' n'est jamais reçu

    // Interface épurée : aucune barre de menu (les actions sont des boutons dans l'app).
    Menu.setApplicationMenu(null);

    // Les fenêtres ouvertes via window.open (visualiseur « fichier brut ») héritent
    // du même style épuré : sans cadre natif, comme la fenêtre principale. La fermeture
    // se fait par le bouton « Fermer » du contenu, et l'en-tête sert de zone de déplacement.
    mainWindow.webContents.setWindowOpenHandler(() => {
        return {
            action: 'allow',
            overrideBrowserWindowOptions: {
                frame: false,
                autoHideMenuBar: true,
                width: 800,
                height: 600,
                resizable: true
            }
        };
    });

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

    // Ouvrir un fichier (remplace l'entrée de menu supprimée)
    globalShortcut.register('CommandOrControl+O', () => {
        openFileDialog();
    });

    // Gérer la fermeture de la fenêtre - quitter l'app au lieu de juste fermer
    mainWindow.on('close', (event) => {
        app.quit();
    });

    // Événement quand la fenêtre est prête
    mainWindow.webContents.once('dom-ready', () => {
        // Vérifier si on doit déplacer l'app vers /Applications (macOS uniquement)
        setTimeout(() => {
            try {
                checkAndMoveToApplications();
            } catch (error) {
                // Ne pas interrompre le fonctionnement de l'app
            }
        }, 1000); // Attendre 1 seconde pour que la fenêtre soit complètement chargée
        
        // Si un fichier a été passé au lancement, l'envoyer à la fenêtre
        if (fileToOpen) {
            mainWindow.webContents.send('file-to-open', fileToOpen);
            fileToOpen = null; // Reset pour éviter de le renvoyer
        }
    });
}

// Variable pour éviter les doubles appels de dialogue
let isDialogOpen = false;

// Fonction pour ouvrir la boîte de dialogue de fichier
function openFileDialog() {
    // Protection contre les doubles appels
    if (isDialogOpen) {
        return;
    }
    
    isDialogOpen = true;
    
    dialog.showOpenDialog(mainWindow, {
        title: 'Sélectionner un fichier HPRIM',
        filters: [
            { name: 'Fichiers HPRIM', extensions: ['hpr', 'hpm', 'hpm1', 'hpm2', 'hpm3', 'hprim'] },
            { name: 'Fichiers texte', extensions: ['txt'] },
            { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
    }).then(result => {
        isDialogOpen = false;
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            mainWindow.webContents.send('file-selected', filePath);
        }
    }).catch(err => {
        isDialogOpen = false;
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
        
        // Lire le fichier en binaire
        const buffer = fs.readFileSync(normalizedPath);

        // Vérifier que le fichier n'est pas vide
        if (buffer.length === 0) {
            throw new Error('Le fichier est vide');
        }

        // Décodage avec détection d'encodage (UTF-8 strict, repli windows-1252)
        return decodeBuffer(buffer);
        
    } catch (error) {
        
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

// IPC: Décoder le contenu d'un fichier déposé (glisser-déposer).
// Pas de chemin requis -> fiable quelle que soit la version d'Electron et le sandbox.
ipcMain.handle('decode-buffer', async (event, data, fileName) => {
    try {
        const buffer = Buffer.from(data);
        if (buffer.length === 0) {
            throw new Error('Le fichier est vide');
        }
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (buffer.length > maxSize) {
            throw new Error(`Fichier trop volumineux (${Math.round(buffer.length / 1024 / 1024)}MB > 10MB)`);
        }
        const allowedExtensions = ['.hpr', '.hpm', '.hpm1', '.hpm2', '.hpm3', '.hprim', '.txt'];
        const ext = path.extname(fileName || '').toLowerCase();
        if (ext && !allowedExtensions.includes(ext)) {
            throw new Error(`Extension de fichier non autorisée: ${ext}`);
        }
        return decodeBuffer(buffer);
    } catch (error) {
        throw new Error(`Erreur lors de la lecture du fichier: ${error.message}`);
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

// IPC: Contrôles de fenêtre (barre de titre custom, fenêtre sans cadre)
ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window-maximize-toggle', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
});
ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
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
            
            return { success: true, path: finalPath };
        } else {
            return { success: false, cancelled: true };
        }

    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Export PDF function removed - only CSV/Excel export available

// Gestion de l'ouverture de fichiers par double-clic (macOS)
app.on('open-file', (event, filePath) => {
    event.preventDefault();
    
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('file-to-open', filePath);
    } else {
        fileToOpen = filePath;
    }
});

// Mise à jour automatique (Windows NSIS + Linux AppImage). Comportement « notifier
// puis installer » : téléchargement en tâche de fond, puis proposition de redémarrer.
// macOS non signé n'est pas pris en charge par l'updater -> mise à jour manuelle.
function setupAutoUpdater() {
    if (!app.isPackaged) return; // pas de mise à jour en développement

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-downloaded', (info) => {
        if (!mainWindow) return;
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            buttons: ['Redémarrer maintenant', 'Plus tard'],
            defaultId: 0,
            cancelId: 1,
            title: 'Mise à jour disponible',
            message: `HPRIM Tool ${info.version} est prêt à être installé.`,
            detail: 'Redémarrer maintenant pour appliquer la mise à jour ? Sinon elle sera installée à la prochaine fermeture de l\'application.'
        }).then(({ response }) => {
            if (response === 0) autoUpdater.quitAndInstall();
        }).catch(() => {});
    });

    // Une erreur de mise à jour (hors ligne, release absente…) ne doit jamais
    // déranger l'utilisateur ni bloquer l'application.
    autoUpdater.on('error', (err) => {
        console.error('Mise à jour : erreur ignorée —', err == null ? 'inconnue' : (err.stack || err).toString());
    });

    // Vérifier au lancement, avec un léger différé pour ne pas ralentir l'ouverture.
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch(() => {});
    }, 3000);
}

// Verrou d'instance unique : une seule fenêtre HPRIM Tool. Si une 2ᵉ instance est
// lancée (double-clic sur un .hpr alors que l'app tourne déjà), on récupère son
// argument fichier et on l'ouvre dans la fenêtre existante, au lieu d'ouvrir un
// second processus/fenêtre. (macOS passe déjà par l'événement 'open-file'.)
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    app.quit();
} else {
    app.on('second-instance', (event, argv) => {
        // Récupérer un éventuel fichier passé à la 2ᵉ instance (Windows/Linux)
        const potentialFile = argv[argv.length - 1];
        if (isHprimFile(potentialFile)) {
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('file-to-open', potentialFile);
            } else {
                fileToOpen = potentialFile;
            }
        }
        // Ramener la fenêtre existante au premier plan
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // Prêt à créer les fenêtres
    app.whenReady().then(() => {
        createWindow();
        setupAutoUpdater();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });
}

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