// Preload compatible sandbox:true — n'utilise que des API Electron (contextBridge,
// ipcRenderer, webUtils), aucun module Node (pas de 'path'/'fs').
const { ipcRenderer, contextBridge, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // La validation (normalisation, anti-traversée, extension, taille, existence)
    // est faite côté main dans le handler 'read-file' (processus de confiance).
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    
    openFileDialog: () => ipcRenderer.send('open-file-dialog'),

    // Récupère le chemin absolu d'un fichier glissé-déposé, de façon robuste aux
    // versions d'Electron : webUtils.getPathForFile (Electron 30+) avec repli sur
    // la propriété non-standard File.path (Electron <= 29, supprimée en 32+).
    getPathForFile: (file) => {
        try {
            if (webUtils && typeof webUtils.getPathForFile === 'function') {
                return webUtils.getPathForFile(file);
            }
        } catch (e) { /* repli ci-dessous */ }
        return (file && file.path) ? file.path : '';
    },
    
    quitApp: () => ipcRenderer.send('quit-app'),
    
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

