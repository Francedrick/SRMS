const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadFile('index.html');
    
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
}

// Handle navigation requests from renderer process
ipcMain.on('navigate', (event, page) => {
    console.log('Navigation request received:', page);
    if (mainWindow) {
        mainWindow.loadFile(page);
        console.log('Navigating to:', page);
    } else {
        console.error('mainWindow is not defined');
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});