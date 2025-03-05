const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Optional preload script
      nodeIntegration: false, // Recommended for security
      contextIsolation: true // Recommended for security
    }
  });

  mainWindow.loadFile('src/index.html');

  // Open DevTools (optional, for development)
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  // Quit app when all windows are closed except on macOS
  if (process.platform !== 'darwin') app.quit();
});