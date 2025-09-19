import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron';
import { join } from 'path';

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('electron-reload')(join(__dirname, '..'), {
      electron: join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (error) {
    console.warn('Electron reload disabled:', (error as Error).message);
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    icon: join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    show: true
  });

  // Always clear cache to ensure latest version
  mainWindow.webContents.session.clearCache();

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadURL('https://app.typelets.com');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('app-name', () => {
  return app.getName();
});