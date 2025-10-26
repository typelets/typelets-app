// Global type definitions for Electron API in renderer process

export interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<string>;
  getAppName: () => Promise<string>;

  // Platform info
  platform: NodeJS.Platform;

  // Window controls (future features)
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;

  // File operations (future features)
  openFile: () => Promise<string | null>;
  saveFile: (data: string) => Promise<boolean>;

  // Theme detection
  isDarkMode: () => Promise<boolean>;

  // Event listeners
  onThemeChange: (callback: (isDark: boolean) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}