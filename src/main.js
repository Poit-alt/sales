const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false, // Security: disabled for security reasons
      contextIsolation: true, // Security: protects against prototype pollution
      preload: path.join(__dirname, 'preload.js'), // Use preload script
    },
    backgroundColor: '#111827', // Default to dark theme
    // Use native frame but with custom-styled titlebar
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Enable remote content loading for Font Awesome (for development)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['default-src * self blob: data: gap:; style-src * self \'unsafe-inline\' blob: data: gap:; script-src * \'self\' \'unsafe-eval\' \'unsafe-inline\' blob: data: gap:; object-src * \'self\' blob: data: gap:; img-src * self \'unsafe-inline\' blob: data: gap:; connect-src self * \'unsafe-inline\' blob: data: gap:; frame-src * self blob: data: gap:;']
      }
    });
  });

  // Open the DevTools in development if needed
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Set app menu
  setupAppMenu();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();
  
    // Set up IPC communication
  setupIPC();
  
  // Create the application menu
  setupAppMenu();
});

// Setup IPC communication between main and renderer processes
function setupIPC() {
  // Example IPC handler for data requests
  ipcMain.on('getData', (event, args) => {
    // Here you would fetch data from database or files
    const mockData = {
      // Mock project data
      projects: {
        activeProjects: 12,
        upcomingProjects: 5,
        completedProjects: 24,
        overdueProjects: 3,
        
        // List of active projects with details
        activeProjectsList: [
          {
            id: 'proj-001',
            title: 'Website Redesign',
            client: 'Acme Corp',
            priority: 'high',
            completion: 75,
            deadline: '2023-06-15',
            teamMembers: 5,
            tasks: { completed: 18, total: 24 },
            comments: 12,
            attachments: 5
          },
          {
            id: 'proj-002',
            title: 'Mobile App Development',
            client: 'TechSolutions',
            priority: 'medium',
            completion: 45,
            deadline: '2023-07-30',
            teamMembers: 3,
            tasks: { completed: 24, total: 53 },
            comments: 28,
            attachments: 12
          },
          {
            id: 'proj-003',
            title: 'CRM Integration',
            client: 'TechNova',
            priority: 'high',
            completion: 30,
            deadline: '2023-06-25',
            teamMembers: 3,
            tasks: { completed: 12, total: 40 },
            comments: 15,
            attachments: 8
          },
          {
            id: 'proj-004',
            title: 'Content Strategy',
            client: 'GlobeCorp',
            priority: 'low',
            completion: 85,
            deadline: '2023-06-10',
            teamMembers: 2,
            tasks: { completed: 17, total: 20 },
            comments: 7,
            attachments: 3
          }
        ]
      }
    };
    
    // Send back to renderer
    event.reply('dataResult', mockData);
  });
  
  // Example IPC handler for saving data
  ipcMain.on('saveData', (event, data) => {
    // Here you would save data to database or files
    console.log('Project data to save:', data);
    
    // For demo purposes, we're just sending back success
    event.reply('fromMain', { success: true, message: 'Project data saved successfully' });
  });
  
  // Database path handlers
ipcMain.handle('select-database-path', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Database Directory',
    buttonLabel: 'Select Folder'
  });
  
  if (canceled) {
    return null;
  }
  
  // Store the selected path in app settings
  const dbPath = filePaths[0];
  app.databasePath = dbPath;
  
  // Save the path to user preferences
  saveSettings({ databasePath: dbPath });
  
  return dbPath;
});

ipcMain.handle('get-database-path', () => {
  // If we already have it in memory
  if (app.databasePath) {
    return app.databasePath;
  }
  
  // Otherwise try to load from saved settings
  const settings = loadSettings();
  if (settings && settings.databasePath) {
    app.databasePath = settings.databasePath;
    return settings.databasePath;
  }
  
  return null;
});

ipcMain.handle('list-database-files', async (event, fileType) => {
  if (!app.databasePath) {
    const settings = loadSettings();
    if (settings && settings.databasePath) {
      app.databasePath = settings.databasePath;
    } else {
      return { error: 'No database path set' };
    }
  }
  
  try {
    const files = await fs.promises.readdir(app.databasePath);
    // Filter for JSON files or specific file types
    const jsonFiles = files.filter(file => {
      if (fileType) {
        return file.endsWith('.json') && file.includes(fileType);
      }
      return file.endsWith('.json');
    });
    
    return {
      path: app.databasePath,
      files: jsonFiles
    };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('read-database-file', async (event, fileName) => {
  if (!app.databasePath) {
    const settings = loadSettings();
    if (settings && settings.databasePath) {
      app.databasePath = settings.databasePath;
    } else {
      return { error: 'No database path set' };
    }
  }
  
  try {
    const filePath = path.join(app.databasePath, fileName);
    const data = await fs.promises.readFile(filePath, 'utf8');
    return { data: JSON.parse(data) };
  } catch (err) {
    return { error: err.message };
  }
});

// Settings helpers
function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function saveSettings(settings) {
  try {
    const settingsPath = getSettingsPath();
    const currentSettings = loadSettings() || {};
    const newSettings = { ...currentSettings, ...settings };
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to save settings:', err);
    return false;
  }
}

function loadSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    console.error('Failed to load settings:', err);
    return null;
  }
}

// Setup the application menu with DevTools option
function setupAppMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Database',
          click: () => {
            mainWindow.webContents.send('trigger-open-database');
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    
    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://projecthub.com');
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
}

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});