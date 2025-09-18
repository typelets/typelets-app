const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getAppName: () => ipcRenderer.invoke('app-name'),

  // Platform info
  platform: process.platform,

  // Window controls (future features)
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // File operations (future features)
  openFile: () => ipcRenderer.invoke('dialog-open-file'),
  saveFile: (data) => ipcRenderer.invoke('dialog-save-file', data),

  // Theme detection
  isDarkMode: () => ipcRenderer.invoke('theme-is-dark'),

  // Event listeners
  onThemeChange: (callback) => {
    ipcRenderer.on('theme-changed', (event, isDark) => callback(isDark));
  }
});