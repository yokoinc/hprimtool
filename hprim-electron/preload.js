const { ipcRenderer, webUtils } = require('electron');
const path = require('path');


// Avec contextIsolation: true, on utilise contextBridge pour sécuriser l'exposition
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    readFile: (filePath) => {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Invalid file path');
        }
        
        const normalizedPath = path.normalize(filePath);
        if (normalizedPath.includes('..')) {
            throw new Error('Path traversal not allowed');
        }
        
        const allowedExtensions = ['.hpr', '.hpm', '.hpm1', '.hpm2', '.hpm3', '.hprim', '.txt'];
        const ext = path.extname(normalizedPath).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            throw new Error('File type not allowed');
        }
        
        return ipcRenderer.invoke('read-file', normalizedPath);
    },
    
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

