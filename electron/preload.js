/**
 * Electron Preload Script
 * 
 * Securely exposes API to the renderer process.
 * All communication between main and renderer goes through here.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  isDev: () => ipcRenderer.invoke('app:isDev'),
  // SECURITY: getAuthToken is exposed to renderer. If XSS occurs in renderer,
  // an attacker could steal this token. Consider proxying API calls through
  // ipcRenderer instead of exposing the raw token.
  getAuthToken: () => ipcRenderer.invoke('app:getAuthToken'),

  // Shell operations
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  openDataFolder: () => ipcRenderer.invoke('shell:openDataFolder'),
  openFolder: (folderPath) => ipcRenderer.invoke('shell:openFolder', folderPath),

  // Window operations
  minimizeToTray: () => ipcRenderer.invoke('window:minimizeToTray'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  
  // Backend operations
  checkBackendHealth: () => ipcRenderer.invoke('backend:checkHealth'),
  restartBackend: () => ipcRenderer.invoke('backend:restart'),
  
  // Dialog operations
  selectFolder: (defaultPath) => ipcRenderer.invoke('dialog:selectFolder', defaultPath),
});

// Expose environment info
contextBridge.exposeInMainWorld('electronEnv', {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PLATFORM: process.platform,
});

// Log that preload script has loaded
console.log('[Preload] Electron API exposed successfully');
