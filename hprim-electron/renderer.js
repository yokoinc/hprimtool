// ============================================================================
// Orchestrateur du renderer : état partagé, réception des fichiers (IPC +
// glisser-déposer), délégation des clics (data-action) et thème automatique.
// Le rendu, la recherche, l'export et le visualiseur brut sont dans des
// modules dédiés (render.js / search.js / export.js / rawfile.js), chargés
// comme scripts classiques -> fonctions et variables globales partagées.
// ============================================================================

// État partagé entre modules (scripts classiques, portée globale)
const dropZone = document.getElementById('dropZone');
const results = document.getElementById('results');
let currentFileContent = null; // Contenu brut du fichier courant (utilisé par render/rawfile)
let isOpeningFile = false;      // Anti double-ouverture de la boîte de dialogue

// ----------------------------------------------------------------------------
// Réception des fichiers via le processus principal (menu / association .hpr)
// ----------------------------------------------------------------------------
window.electronAPI.onFileToOpen((filePath) => {
    Logger.debug('Fichier reçu:', filePath);
    handleFile(filePath);
});

window.electronAPI.onFileSelected((filePath) => {
    Logger.debug('Fichier sélectionné:', filePath);
    handleFile(filePath);
});

// Afficher la version de l'app dans la barre de titre
if (window.electronAPI.getVersion) {
    window.electronAPI.getVersion().then((v) => {
        const el = document.getElementById('appVersion');
        if (el && v) el.textContent = 'v' + v;
    }).catch(() => {});
}

// Lecture d'un fichier par chemin (le main valide chemin/extension/taille).
async function handleFile(filePath) {
    Logger.debug('handleFile appelé avec:', filePath);

    if (!filePath) {
        Logger.error('Aucun chemin de fichier fourni');
        results.innerHTML = '<p style="color: red;">Aucun fichier spécifié</p>';
        return;
    }

    try {
        Logger.debug('Tentative de lecture du fichier:', filePath);

        // Afficher le message de chargement et définir le curseur
        document.body.style.cursor = 'wait';
        const loadingMsg = window.i18n ? window.i18n.t('messages.loading') : 'Chargement du fichier';
        results.innerHTML = `<p style="color: blue;">${loadingMsg}: ${filePath}</p>`;

        // Lire le fichier avec Electron via electronAPI
        const content = await window.electronAPI.readFile(filePath);
        Logger.debug('Contenu lu, longueur:', content.length);

        Logger.debug('Début du parsing et affichage...');
        parseAndDisplay(content);
        Logger.debug('Fichier traité avec succès');

    } catch (error) {
        Logger.error('Erreur détaillée lors de la lecture du fichier:', error);

        // Réinitialiser l'état d'ouverture et le curseur même en cas d'erreur
        isOpeningFile = false;
        document.body.style.cursor = 'default';

        const fileErrorMsg = window.i18n ? window.i18n.t('messages.file_error') : 'Erreur lors de la lecture du fichier';
        results.innerHTML = `<p style="color: red;">${fileErrorMsg}: ${error.message}</p>
                            <p style="color: #666; font-size: 0.9em;">Fichier: ${filePath}</p>`;
    }
}

// Glisser-déposer : on lit le CONTENU du fichier (API web standard file.arrayBuffer(),
// disponible en sandbox et sur toute version d'Electron) et on le décode côté main.
// Indépendant de File.path (retiré en Electron 32+) et de webUtils (Electron 30+).
async function handleDroppedFile(file) {
    try {
        document.body.style.cursor = 'wait';
        const loadingMsg = window.i18n ? window.i18n.t('messages.loading') : 'Chargement du fichier';
        results.innerHTML = `<p style="color: blue;">${loadingMsg}: ${file.name}</p>`;

        const bytes = new Uint8Array(await file.arrayBuffer());
        const content = await window.electronAPI.decodeBuffer(bytes, file.name);
        parseAndDisplay(content);
    } catch (error) {
        isOpeningFile = false;
        document.body.style.cursor = 'default';
        const fileErrorMsg = window.i18n ? window.i18n.t('messages.file_error') : 'Erreur lors de la lecture du fichier';
        results.innerHTML = `<p style="color: red;">${fileErrorMsg}: ${error.message}</p>`;
        Logger.error('Erreur glisser-déposer:', error);
    }
}

// ----------------------------------------------------------------------------
// Initialisation et glisser-déposer
// ----------------------------------------------------------------------------
window.addEventListener('load', () => {
    // Message d'accueil simple - pas d'instructions évidentes
    results.innerHTML = '';
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        await handleDroppedFile(files[0]);
    }
});

// Clic sur la zone de drop pour ouvrir un fichier
dropZone.addEventListener('click', () => {
    if (isOpeningFile) return;

    isOpeningFile = true;
    // Envoyer un message au processus principal pour ouvrir la boîte de dialogue
    window.electronAPI.openFileDialog();

    // Réinitialiser après un court délai (sécurité)
    setTimeout(() => {
        isOpeningFile = false;
        document.body.style.cursor = 'default';
    }, 2000);
});

// ----------------------------------------------------------------------------
// Boutons de l'interface : délégation par data-action (compatible CSP
// script-src 'self', et fonctionne aussi pour le HTML généré dynamiquement).
// ----------------------------------------------------------------------------
const UI_ACTIONS = {
    'toggle-search': () => toggleSearch(),
    'print': () => window.print(),
    'export': () => exportToCSV(),
    'quit': () => quitApp(),
    'open': () => openFile(),
    'clear-search': () => clearSearch(),
    'view-raw': () => showRawFile(),
    'win-min': () => window.electronAPI.minimizeWindow && window.electronAPI.minimizeWindow(),
    'win-max': () => window.electronAPI.toggleMaximizeWindow && window.electronAPI.toggleMaximizeWindow(),
    'win-close': () => window.electronAPI.closeWindow && window.electronAPI.closeWindow()
};
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const handler = UI_ACTIONS[target.dataset.action];
    if (handler) handler();
});

// Ouvrir un fichier (bouton "Ouvrir" / zone de drop compacte)
function openFile() {
    if (isOpeningFile) return;

    isOpeningFile = true;
    window.electronAPI.openFileDialog();

    // Réinitialiser après un court délai (sécurité)
    setTimeout(() => {
        isOpeningFile = false;
        document.body.style.cursor = 'default';
    }, 2000);
}

// Quitter l'application
function quitApp() {
    window.electronAPI.quitApp();
}

// ----------------------------------------------------------------------------
// Thème automatique selon l'heure (sombre 19h-7h, clair 7h-19h)
// ----------------------------------------------------------------------------
function autoDetectTheme() {
    const now = new Date();
    const hour = now.getHours();

    const isDarkTime = hour >= 19 || hour < 7;
    const theme = isDarkTime ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', theme);
    Logger.debug(`Thème automatique détecté: ${theme} (${hour}h)`);

    // Programmer la prochaine vérification à la prochaine heure pleine
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    const msUntilNextHour = nextHour.getTime() - now.getTime();

    setTimeout(() => {
        autoDetectTheme();
        // Puis vérifier toutes les heures
        setInterval(autoDetectTheme, 60 * 60 * 1000);
    }, msUntilNextHour);
}

window.addEventListener('load', () => {
    autoDetectTheme();
});
