// Preload script that will be loaded in the renderer process
// This is where we can safely expose Node.js functionality to the renderer

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// specific electron APIs without exposing the entire API
contextBridge.exposeInMainWorld('electron', {
  // Example: expose a function to communicate with the main process
  sendToMain: (channel, data) => {
    // whitelist channels for security
    const validChannels = ['toMain', 'getData', 'saveData', 'window-control', 'save-products'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receiveFromMain: (channel, func) => {
    const validChannels = ['fromMain', 'dataResult', 'error', 'window-state-change', 'trigger-open-database', 'save-products-result', 'sync-database-path', 'sync-projects-database-path', 'selected-path'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // Platform info
  platform: process.platform,
  
  // Database path operations
  database: {
    selectPath: (customPath, isProjectsPath) => ipcRenderer.invoke('select-database-path', customPath, isProjectsPath),
    getPath: (isProjectsPath) => ipcRenderer.invoke('get-database-path', isProjectsPath),
    listFiles: (fileType) => ipcRenderer.invoke('list-database-files', fileType),
    readFile: (fileName, customPath) => ipcRenderer.invoke('read-database-file', fileName, customPath),
    saveFile: (fileName, data, customPath) => {
      console.log('Invoking save-database-file with:', { fileName, data: typeof data, customPath });
      return ipcRenderer.invoke('save-database-file', { fileName, data, customPath });
    },
    getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
    resetAppSettings: () => ipcRenderer.invoke('reset-app-settings')
  },
  
  // Printing and system dialog API
  print: {
    printToPDF: async (options = {}) => {
      try {
        // Always use the IPC approach since remote module is deprecated
        // and may not be available in newer Electron versions
        return await ipcRenderer.invoke('print-to-pdf', options);
      } catch (error) {
        // Fallback to browser print
        console.error('PDF export error:', error);
        window.print();
        return { success: false, error: error.message, fallback: true };
      }
    }
  },
  
  // Window control
  closeWindow: () => ipcRenderer.send('window-control', 'close')
});