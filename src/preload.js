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
    const validChannels = ['fromMain', 'dataResult', 'error', 'window-state-change', 'trigger-open-database', 'save-products-result'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // Platform info
  platform: process.platform,
  
  // Database path operations
  database: {
    selectPath: () => ipcRenderer.invoke('select-database-path'),
    getPath: () => ipcRenderer.invoke('get-database-path'),
    listFiles: (fileType) => ipcRenderer.invoke('list-database-files', fileType),
    readFile: (fileName) => ipcRenderer.invoke('read-database-file', fileName),
    saveFile: (fileName, data) => {
      console.log('Invoking save-database-file with:', { fileName, data: typeof data });
      return ipcRenderer.invoke('save-database-file', { fileName, data });
    }
  }
});