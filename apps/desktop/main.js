const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron');
const { join } = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Enable live reload for development
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: require(join(__dirname, '/node_modules/.bin/electron')),
      hardResetMethod: 'exit'
    });
  } catch (error) {
    console.log('Electron reload disabled:', error.message);
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: join(__dirname, 'preload.js')
    },
    icon: join(__dirname, 'assets', 'icon.png'), // You'll need to add an icon
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Load the app
  if (isDev) {
    // Clear cache in development
    mainWindow.webContents.session.clearCache();

    // Add console logging for WebSocket debugging
    mainWindow.webContents.on('console-message', (event, level, message) => {
      if (message.includes('WebSocket') || message.includes('WEBSOCKET')) {
        console.log('WebSocket Debug:', message);
      }
    });

    mainWindow.loadURL('https://app.typelets.com');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== 'https://app.typlets.com' && !isDev) {
      event.preventDefault();
    }
  });
}

// App event handlers
app.whenReady().then(() => {
  // Remove the default menu bar
  Menu.setApplicationMenu(null);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// IPC handlers for desktop-specific features
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('app-name', () => {
  return app.getName();
});