// Preload compatible sandbox:true — n'utilise que des API Electron (contextBridge,
// ipcRenderer), aucun module Node (pas de 'path'/'fs').
const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // La validation (normalisation, anti-traversée, extension, taille, existence)
    // est faite côté main dans le handler 'read-file' (processus de confiance).
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

    // Décodage d'un fichier déposé à partir de ses octets (glisser-déposer) — fiable
    // sans dépendre de File.path (supprimé en Electron 32+) ni de webUtils (Electron 30+).
    decodeBuffer: (data, fileName) => ipcRenderer.invoke('decode-buffer', data, fileName),
    
    openFileDialog: () => ipcRenderer.send('open-file-dialog'),

    quitApp: () => ipcRenderer.send('quit-app'),

    // Contrôles de fenêtre (barre de titre custom)
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    toggleMaximizeWindow: () => ipcRenderer.send('window-maximize-toggle'),
    closeWindow: () => ipcRenderer.send('window-close'),
    
    onFileToOpen: (callback) => {
        ipcRenderer.on('file-to-open', (event, filePath) => {
            if (typeof callback === 'function') {
                callback(filePath);
            }
        });
    },
    
    onFileSelected: (callback) => {
        ipcRenderer.on('file-selected', (event, filePath) => {
            if (typeof callback === 'function') {
                callback(filePath);
            }
        });
    },
    
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },
    
    // Export PDF function removed
    
    getSystemLanguage: () => {
        return ipcRenderer.invoke('get-system-language');
    },
    
    exportToExcel: (resultsData, patientName) => {
        return ipcRenderer.invoke('export-excel', resultsData, patientName);
    },
    
    updateWindowTitle: (title) => {
        return ipcRenderer.send('update-window-title', title);
    }
});

