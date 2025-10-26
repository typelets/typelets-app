import { contextBridge, ipcRenderer } from 'electron';

interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getAppName: () => Promise<string>;
  platform: NodeJS.Platform;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  openFile: () => Promise<string | null>;
  saveFile: (data: string) => Promise<boolean>;
  isDarkMode: () => Promise<boolean>;
  onThemeChange: (callback: (isDark: boolean) => void) => void;
}

const electronAPI: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getAppName: () => ipcRenderer.invoke('app-name'),
  platform: process.platform,
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  openFile: () => ipcRenderer.invoke('dialog-open-file'),
  saveFile: (data: string) => ipcRenderer.invoke('dialog-save-file', data),
  isDarkMode: () => ipcRenderer.invoke('theme-is-dark'),
  onThemeChange: (callback: (isDark: boolean) => void) => {
    ipcRenderer.on('theme-changed', (event, isDark: boolean) => callback(isDark));
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type { ElectronAPI };