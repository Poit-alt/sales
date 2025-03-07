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
  console.log('Electron app ready, creating window and setting up IPC...');
  
  // Always set a default database path to the app's data directory
  // This ensures we have a consistent location for saving and loading
  const dataDir = path.join(__dirname, '..', 'data');
  app.databasePath = dataDir;
  console.log('Setting default databasePath to:', app.databasePath);
  
  // Check if FORCE_LOCAL_STORAGE file exists
  const forceLocalPath = path.join(__dirname, '..', 'FORCE_LOCAL_STORAGE');
  if (fs.existsSync(forceLocalPath)) {
    console.log('FORCE_LOCAL_STORAGE file detected - will always use local data directory');
    // Save this setting to ensure it persists
    saveSettings({ databasePath: dataDir, forceLocalStorage: true });
  }
  
  // Check if products.json exists in the data directory
  const productsPath = path.join(dataDir, 'products.json');
  
  console.log('Checking for products.json at:', productsPath);
  if (fs.existsSync(productsPath)) {
    console.log('products.json found in data directory');
    try {
      const stats = fs.statSync(productsPath);
      console.log('File size:', stats.size, 'bytes');
      console.log('Last modified:', stats.mtime);
    } catch (err) {
      console.error('Error getting file stats:', err);
    }
  } else {
    console.log('products.json NOT found in data directory');
  }
  
  createWindow();
  
  // Set up IPC communication
  setupIPC();
  
  // Create the application menu
  setupAppMenu();
});

// Setup IPC communication between main and renderer processes
function setupIPC() {
  console.log('Setting up IPC handlers...');
  
  // Handle print-to-pdf requests
  ipcMain.handle('print-to-pdf', async (event, options) => {
    try {
      // Create a new hidden BrowserWindow for printing
      const win = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      
      // Load the options.url or a data URL
      if (options.html) {
        // Load HTML directly
        await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(options.html)}`);
      } else if (options.url) {
        // Load from URL
        await win.loadURL(options.url);
      } else {
        throw new Error('Either html or url must be provided');
      }
      
      // Wait for page to fully load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the web contents
      const webContents = win.webContents;
      
      // Print to PDF
      const data = await webContents.printToPDF({
        marginsType: 0,
        printBackground: true,
        printSelectionOnly: false,
        landscape: false,
        pageSize: 'A4',
        scaleFactor: 100,
        ...options.printOptions
      });
      
      // If a path is provided, save the PDF to disk
      if (options.path) {
        await fs.promises.writeFile(options.path, data);
        
        // Open the saved PDF
        if (options.openFile) {
          const { shell } = require('electron');
          shell.openPath(options.path);
        }
        
        return { success: true, path: options.path };
      }
      
      // Otherwise prompt the user to save the PDF
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save PDF',
        defaultPath: options.defaultPath || path.join(app.getPath('documents'), 'print.pdf'),
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] }
        ]
      });
      
      if (canceled) {
        return { success: false, canceled: true };
      }
      
      // Save the PDF to the selected path
      await fs.promises.writeFile(filePath, data);
      
      // Close the window
      win.close();
      
      return { success: true, path: filePath };
    } catch (error) {
      console.error('Error printing to PDF:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Handle window control commands
  ipcMain.on('window-control', (event, command) => {
    switch (command) {
      case 'close':
        BrowserWindow.fromWebContents(event.sender).close();
        break;
      case 'minimize':
        BrowserWindow.fromWebContents(event.sender).minimize();
        break;
      case 'maximize':
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
        break;
    }
  });
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
  
  // Save handler for products.json
  ipcMain.on('save-products', (event, productsData) => {
    try {
      console.log('Save products request received');
      
      // ALWAYS use the app's data directory first
      const defaultSavePath = path.join(__dirname, '..', 'data', 'products.json');
      let savePath = defaultSavePath;
      
      console.log('HARDCODED: Using app data directory for saving:', savePath);
      
      // Ensure the directory exists
      const saveDir = path.dirname(savePath);
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }
      
      // Save the file
      fs.writeFileSync(savePath, JSON.stringify(productsData, null, 2), 'utf8');
      console.log('Products saved successfully to:', savePath);
      
      // Make sure we also copy this file to sample-products.json if it exists
      try {
        const samplePath = path.join(__dirname, '..', 'sample-products.json');
        if (fs.existsSync(samplePath)) {
          console.log('Copying updated products to sample-products.json');
          fs.copyFileSync(savePath, samplePath);
        }
      } catch (copyErr) {
        console.error('Error copying to sample-products.json:', copyErr);
      }
      
      // Send success response back
      event.reply('save-products-result', { 
        success: true,
        path: savePath
      });
    } catch (err) {
      console.error('Error saving products:', err);
      event.reply('save-products-result', { 
        success: false, 
        error: err.message 
      });
    }
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
      console.log('Returning database path from memory:', app.databasePath);
      return app.databasePath;
    }
    
    // Otherwise try to load from saved settings
    const settings = loadSettings();
    if (settings && settings.databasePath) {
      app.databasePath = settings.databasePath;
      console.log('Returning database path from settings:', app.databasePath);
      return settings.databasePath;
    }
    
    // Last resort - use the app's data directory
    const dataDir = path.join(__dirname, '..', 'data');
    app.databasePath = dataDir;
    console.log('No database path found, defaulting to:', app.databasePath);
    return app.databasePath;
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
    console.log(`Reading database file: ${fileName}`);
    
    // Always check the data directory for products.json first, regardless of other settings
    try {
      const dataPath = path.join(__dirname, '..', 'data', fileName);
      console.log(`First checking for ${fileName} in app data directory: ${dataPath}`);
      
      if (fs.existsSync(dataPath)) {
        const data = await fs.promises.readFile(dataPath, 'utf8');
        const stats = fs.statSync(dataPath);
        console.log(`Successfully read ${fileName} from app data directory: ${dataPath}`);
        console.log(`File size: ${stats.size} bytes, Last modified: ${stats.mtime}`);
        return { data: JSON.parse(data) };
      } else {
        console.log(`${fileName} not found in app data directory`);
      }
    } catch (err) {
      console.error(`Error reading ${fileName} from app data directory:`, err);
    }
  
    if (!app.databasePath) {
      const settings = loadSettings();
      if (settings && settings.databasePath) {
        app.databasePath = settings.databasePath;
        console.log(`Set app.databasePath from settings: ${app.databasePath}`);
      } else {
        console.log('No database path in settings, trying local data directory as a last resort');
        
        // Try local data directory as a last resort
        try {
          const dataPath = path.join(__dirname, '..', 'data', 'products.json');
          if (fs.existsSync(dataPath)) {
            const data = await fs.promises.readFile(dataPath, 'utf8');
            console.log(`Successfully read products.json from fallback path: ${dataPath}`);
            return { data: JSON.parse(data) };
          }
        } catch (err) {
          console.error('Error reading from fallback path:', err);
        }
        
        return { error: 'No database path set' };
      }
    }
    
    try {
      const filePath = path.join(app.databasePath, fileName);
      console.log(`Reading file from database path: ${filePath}`);
      
      if (fs.existsSync(filePath)) {
        const data = await fs.promises.readFile(filePath, 'utf8');
        console.log(`Successfully read ${fileName} from: ${filePath}`);
        return { data: JSON.parse(data) };
      } else {
        // If file doesn't exist in database path, try app data directory
        const dataPath = path.join(__dirname, '..', 'data', fileName);
        console.log(`File not found at database path, trying app data directory: ${dataPath}`);
        
        if (fs.existsSync(dataPath)) {
          const data = await fs.promises.readFile(dataPath, 'utf8');
          console.log(`Successfully read ${fileName} from app data directory: ${dataPath}`);
          return { data: JSON.parse(data) };
        } else {
          return { error: `File ${fileName} not found in database or app data directory` };
        }
      }
    } catch (err) {
      console.error(`Error reading file ${fileName}:`, err);
      return { error: err.message };
    }
  });
  
  // Handler to save data to a file
  // Register save-database-file handler
  console.log('Registering save-database-file handler');
  ipcMain.handle('save-database-file', async (event, params) => {
    const { fileName, data } = params;
    console.log('Saving file:', fileName);
    
    // Special case for saving to local data directory
    if (fileName === 'products.json' && !app.databasePath) {
      try {
        // Try to save to the app's data directory
        const dataPath = path.join(__dirname, '..', 'data', 'products.json');
        console.log('Saving to local path:', dataPath);
        
        // Ensure data directory exists
        const dataDir = path.dirname(dataPath);
        if (!fs.existsSync(dataDir)) {
          await fs.promises.mkdir(dataDir, { recursive: true });
        }
        
        await fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
        return { success: true };
      } catch (err) {
        console.error('Error saving local products.json:', err);
        return { error: err.message };
      }
    }
  
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
      console.log('Saving to path:', filePath);
      
      // Ensure directory exists
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        await fs.promises.mkdir(fileDir, { recursive: true });
      }
      
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return { success: true };
    } catch (err) {
      console.error('Error saving file:', err);
      return { error: err.message };
    }
  });
}

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