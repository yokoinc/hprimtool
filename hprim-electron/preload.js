const { ipcRenderer } = require('electron');
const path = require('path');

console.log('Preload script loaded');

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

console.log('electronAPI exposed to main world via contextBridge');