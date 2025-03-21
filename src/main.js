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
  
  // Try to load from saved settings first
  const settings = loadSettings();
  if (settings && settings.databasePath) {
    app.databasePath = settings.databasePath;
    console.log('Loaded database path from settings:', app.databasePath);
  } else {
    app.databasePath = dataDir;
    console.log('No saved database path, using default:', app.databasePath);
  }
  
  // Load projects database path from settings
  if (settings && settings.projectsDatabasePath) {
    app.projectsDatabasePath = settings.projectsDatabasePath;
    console.log('Loaded projects database path from settings:', app.projectsDatabasePath);
  } else {
    app.projectsDatabasePath = dataDir;
    console.log('No saved projects database path, using default:', app.projectsDatabasePath);
  }
  
  // Check if FORCE_LOCAL_STORAGE file exists - this overrides any saved settings
  const forceLocalPath = path.join(__dirname, '..', 'FORCE_LOCAL_STORAGE');
  if (fs.existsSync(forceLocalPath)) {
    console.log('FORCE_LOCAL_STORAGE file detected - will always use local data directory');
    app.databasePath = dataDir;
    app.projectsDatabasePath = dataDir;
    // Save this setting to ensure it persists
    saveSettings({ 
      databasePath: dataDir, 
      projectsDatabasePath: dataDir,
      forceLocalStorage: true 
    });
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
  
  // When window is created, send the initial database paths to the renderer
  // Use setTimeout to ensure the window has fully rendered
  setTimeout(() => {
    if (mainWindow && app.databasePath) {
      console.log('Sending initial database path to renderer:', app.databasePath);
      mainWindow.webContents.send('sync-database-path', app.databasePath);
    }
    
    if (mainWindow && app.projectsDatabasePath) {
      console.log('Sending initial projects database path to renderer:', app.projectsDatabasePath);
      mainWindow.webContents.send('sync-projects-database-path', app.projectsDatabasePath);
    }
  }, 500); // Short delay to ensure renderer is ready
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
  
  // IPC handler for saving data
  ipcMain.on('saveData', (event, data) => {
    console.log('Data to save:', data);
    
    // Handle different types of data
    if (data.type === 'database-path') {
      console.log('Saving database path:', data.path);
      app.databasePath = data.path;
      // Save to persistent settings
      saveSettings({ databasePath: data.path });
    } 
    else if (data.type === 'projects-database-path') {
      console.log('Saving projects database path:', data.path);
      app.projectsDatabasePath = data.path;
      // Save to persistent settings
      saveSettings({ projectsDatabasePath: data.path });
    }
    else {
      // For other types of data (like projects)
      console.log('Project data to save:', data);
    }
    
    // Send back success
    event.reply('fromMain', { success: true, message: 'Data saved successfully' });
  });
  
  // Save handler for products.json
  ipcMain.on('save-products', (event, productsData) => {
    try {
      console.log('Save products request received');
      
      // Use the user-selected database path if it exists
      let savePath;
      
      if (app.databasePath) {
        // Use the user-selected path for saving
        savePath = path.join(app.databasePath, 'products.json');
        console.log('Using user-selected database path for saving:', savePath);
      } else {
        // Fallback to the app's data directory if no user path is set
        savePath = path.join(__dirname, '..', 'data', 'products.json');
        console.log('No database path set, using app data directory for saving:', savePath);
      }
      
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
  
  // Add an IPC handler to get the settings file content
  ipcMain.handle('get-app-settings', async (event) => {
    try {
      const settings = loadSettings();
      return { 
        settings, 
        settingsPath: getSettingsPath(),
        appDatabasePath: app.databasePath,
        projectsDatabasePath: app.projectsDatabasePath 
      };
    } catch (err) {
      console.error('Error getting app settings:', err);
      return { error: err.message };
    }
  });
  
  // Add an IPC handler to reset settings
  ipcMain.handle('reset-app-settings', async (event) => {
    try {
      const settingsPath = getSettingsPath();
      console.log('Resetting settings file at:', settingsPath);
      
      // Create a basic settings file with default path
      const defaultPath = path.join(__dirname, '..', 'data');
      const defaultSettings = {
        databasePath: defaultPath,
        projectsDatabasePath: defaultPath,
        useLocalDirectory: true,
        resetAt: new Date().toISOString()
      };
      
      // Write settings
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
      
      // Update in-memory paths
      app.databasePath = defaultPath;
      app.projectsDatabasePath = defaultPath;
      
      // Send updated paths to renderer
      if (mainWindow) {
        console.log('Sending reset database paths to renderer');
        mainWindow.webContents.send('sync-database-path', defaultPath);
        mainWindow.webContents.send('sync-projects-database-path', defaultPath);
      }
      
      return { 
        success: true, 
        message: 'Settings reset successfully',
        settings: defaultSettings
      };
    } catch (err) {
      console.error('Error resetting app settings:', err);
      return { error: err.message };
    }
  });
  
  // Database path handlers
  ipcMain.handle('select-database-path', async (event, customPath, isProjectsPath) => {
    // If a custom path is provided, use it directly (this is for restoring from localStorage)
    if (customPath) {
      console.log('Using provided custom path:', customPath, isProjectsPath ? '(for projects)' : '(for products)');
      
      // Skip validation if this is the special "Local data directory" value
      if (customPath === 'Local data directory') {
        console.log('Using local data directory');
        const dataDir = path.join(__dirname, '..', 'data');
        
        // Update the appropriate path based on whether this is for projects
        if (isProjectsPath) {
          app.projectsDatabasePath = dataDir;
          // Save it to settings
          saveSettings({ projectsDatabasePath: dataDir, useLocalDirectory: true });
          // Broadcast the selected path to all renderers
          mainWindow.webContents.send('sync-projects-database-path', customPath);
        } else {
          app.databasePath = dataDir;
          // Save it to settings
          saveSettings({ databasePath: dataDir, useLocalDirectory: true });
          // Broadcast the selected path to all renderers
          mainWindow.webContents.send('sync-database-path', customPath);
        }
        
        // Also broadcast through the selected-path event for backward compatibility
        mainWindow.webContents.send('selected-path', customPath);
        
        return customPath;
      }
      
      // Validate the path exists for normal paths
      if (fs.existsSync(customPath)) {
        console.log('Path exists, setting as database path');
        
        // Update the appropriate path based on whether this is for projects
        if (isProjectsPath) {
          app.projectsDatabasePath = customPath;
          // Save it to settings
          saveSettings({ projectsDatabasePath: customPath, useLocalDirectory: false });
          // Broadcast the selected path to all renderers
          mainWindow.webContents.send('sync-projects-database-path', customPath);
        } else {
          app.databasePath = customPath;
          // Save it to settings
          saveSettings({ databasePath: customPath, useLocalDirectory: false });
          // Broadcast the selected path to all renderers
          mainWindow.webContents.send('sync-database-path', customPath);
        }
        
        // Also broadcast through the selected-path event for backward compatibility
        mainWindow.webContents.send('selected-path', customPath);
        
        return customPath;
      } else {
        console.error('Custom path does not exist:', customPath);
        return { error: 'Path does not exist', requested_path: customPath };
      }
    }
    
    // Otherwise show a dialog to select
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: isProjectsPath ? 'Select Projects Database Directory' : 'Select Products Database Directory',
      buttonLabel: 'Select Folder'
    });
    
    if (canceled) {
      return null;
    }
    
    // Store the selected path in app settings
    const dbPath = filePaths[0];
    
    // Update the appropriate path based on whether this is for projects
    if (isProjectsPath) {
      app.projectsDatabasePath = dbPath;
      // Save it to settings
      saveSettings({ projectsDatabasePath: dbPath, useLocalDirectory: false });
      // Broadcast the selected path to all renderers
      mainWindow.webContents.send('sync-projects-database-path', dbPath);
    } else {
      app.databasePath = dbPath;
      // Save it to settings
      saveSettings({ databasePath: dbPath, useLocalDirectory: false });
      // Broadcast the selected path to all renderers
      mainWindow.webContents.send('sync-database-path', dbPath);
    }
    
    // Also broadcast through the selected-path event for backward compatibility
    mainWindow.webContents.send('selected-path', dbPath);
    
    return dbPath;
  });
  
  ipcMain.handle('get-database-path', (event, isProjectsPath) => {
    // Determine which path to return based on the isProjectsPath flag
    if (isProjectsPath) {
      // We're asking for the projects database path
      
      // If we already have it in memory
      if (app.projectsDatabasePath) {
        console.log('Returning projects database path from memory:', app.projectsDatabasePath);
        return app.projectsDatabasePath;
      }
      
      // Otherwise try to load from saved settings
      const settings = loadSettings();
      if (settings && settings.projectsDatabasePath) {
        app.projectsDatabasePath = settings.projectsDatabasePath;
        console.log('Returning projects database path from settings:', app.projectsDatabasePath);
        
        // Broadcast the path to renderer to ensure localStorage is updated
        if (mainWindow) {
          mainWindow.webContents.send('sync-projects-database-path', app.projectsDatabasePath);
        }
        
        return settings.projectsDatabasePath;
      }
      
      // Last resort - use the app's data directory
      const dataDir = path.join(__dirname, '..', 'data');
      app.projectsDatabasePath = dataDir;
      console.log('No projects database path found, defaulting to:', app.projectsDatabasePath);
      return app.projectsDatabasePath;
    } else {
      // We're asking for the regular products database path
      
      // If we already have it in memory
      if (app.databasePath) {
        console.log('Returning products database path from memory:', app.databasePath);
        return app.databasePath;
      }
      
      // Otherwise try to load from saved settings
      const settings = loadSettings();
      if (settings && settings.databasePath) {
        app.databasePath = settings.databasePath;
        console.log('Returning products database path from settings:', app.databasePath);
        
        // Broadcast the path to renderer to ensure localStorage is updated
        if (mainWindow) {
          mainWindow.webContents.send('sync-database-path', app.databasePath);
        }
        
        return settings.databasePath;
      }
      
      // Last resort - use the app's data directory
      const dataDir = path.join(__dirname, '..', 'data');
      app.databasePath = dataDir;
      console.log('No products database path found, defaulting to:', app.databasePath);
      return app.databasePath;
    }
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
  
  ipcMain.handle('read-database-file', async (event, fileName, customPath) => {
    console.log(`Reading database file: ${fileName}`);
    
    // Special case for app settings - always load from app data directory
    if (fileName === '__app_settings__.json') {
      try {
        const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
        console.log(`Checking for app settings at: ${settingsPath}`);
        
        if (fs.existsSync(settingsPath)) {
          const data = await fs.promises.readFile(settingsPath, 'utf8');
          const stats = fs.statSync(settingsPath);
          console.log(`Successfully read app settings from: ${settingsPath}`);
          console.log(`File size: ${stats.size} bytes, Last modified: ${stats.mtime}`);
          return { data: JSON.parse(data) };
        } else {
          console.log('App settings file not found');
          return { error: 'App settings file not found' };
        }
      } catch (err) {
        console.error('Error reading app settings:', err);
        return { error: err.message };
      }
    }
    
    // Check if we have a user-selected path first for normal files
    if (app.databasePath && app.databasePath !== path.join(__dirname, '..', 'data')) {
      try {
        const userPath = path.join(effectivePath, fileName);
        console.log(`Checking for ${fileName} in user-selected directory: ${userPath}`);
        
        if (fs.existsSync(userPath)) {
          const data = await fs.promises.readFile(userPath, 'utf8');
          const stats = fs.statSync(userPath);
          console.log(`Successfully read ${fileName} from user-selected path: ${userPath}`);
          console.log(`File size: ${stats.size} bytes, Last modified: ${stats.mtime}`);
          return { data: JSON.parse(data), path: userPath };
        } else {
          console.log(`${fileName} not found in user-selected path: ${userPath}`);
          
          // Only fall back to default directory if user path is not working
          // AND the user path isn't already the default data directory
          if (effectivePath !== path.join(__dirname, '..', 'data')) {
            console.log('Will try default location as fallback.');
            
            // Try the default data directory as a fallback
            const dataPath = path.join(__dirname, '..', 'data', fileName);
            console.log(`Checking for ${fileName} in app data directory: ${dataPath}`);
            
            if (fs.existsSync(dataPath)) {
              const data = await fs.promises.readFile(dataPath, 'utf8');
              const stats = fs.statSync(dataPath);
              console.log(`Successfully read ${fileName} from app data directory: ${dataPath}`);
              console.log(`File size: ${stats.size} bytes, Last modified: ${stats.mtime}`);
              return { data: JSON.parse(data), path: dataPath };
            } else {
              console.log(`${fileName} not found in app data directory either`);
              return { error: `File ${fileName} not found in any location` };
            }
          } else {
            // We're already looking at the default directory and it failed
            return { error: `File ${fileName} not found in data directory` };
          }
        }
      } catch (err) {
        console.error(`Error reading ${fileName} from path ${effectivePath}:`, err);
        return { error: err.message };
      }
    } else {
      // No path is set at all, try default location
      console.log('No database path set, trying default location');
      try {
        const dataPath = path.join(__dirname, '..', 'data', fileName);
        console.log(`Checking for ${fileName} in app data directory: ${dataPath}`);
        
        if (fs.existsSync(dataPath)) {
          const data = await fs.promises.readFile(dataPath, 'utf8');
          const stats = fs.statSync(dataPath);
          console.log(`Successfully read ${fileName} from app data directory: ${dataPath}`);
          console.log(`File size: ${stats.size} bytes, Last modified: ${stats.mtime}`);
          return { data: JSON.parse(data), path: dataPath };
        } else {
          console.log(`${fileName} not found in app data directory`);
          return { error: `File ${fileName} not found in default location` };
        }
      } catch (err) {
        console.error(`Error reading ${fileName} from app data directory:`, err);
        return { error: err.message };
      }
    }
  
    // We've already checked both user-selected path and app data directory
    // If we reach here, the file was not found in either location
    
    // Load settings as a last resort
    if (!app.databasePath) {
      const settings = loadSettings();
      if (settings && settings.databasePath) {
        app.databasePath = settings.databasePath;
        console.log(`Set app.databasePath from settings: ${app.databasePath}`);
        
        // Try the path from settings
        try {
          const filePath = path.join(app.databasePath, fileName);
          console.log(`Trying path from settings: ${filePath}`);
          
          if (fs.existsSync(filePath)) {
            const data = await fs.promises.readFile(filePath, 'utf8');
            console.log(`Successfully read ${fileName} from settings path: ${filePath}`);
            return { data: JSON.parse(data) };
          }
        } catch (err) {
          console.error(`Error reading from settings path:`, err);
        }
      }
    }
    
    // If we've tried everything and still no success, return an error
    console.error(`File ${fileName} not found in any location`);
    return { error: `File ${fileName} not found in any location` };
  });
  
  // Handler to save data to a file
  // Register save-database-file handler
  console.log('Registering save-database-file handler');
  ipcMain.handle('save-database-file', async (event, params) => {
    const { fileName, data, customPath } = params;
    console.log('Saving file:', fileName);
    
    // Special case for app settings - always save to app data directory
    if (fileName === '__app_settings__.json') {
      try {
        // Always save app settings to the app's data directory
        const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
        console.log('Saving app settings to:', settingsPath);
        
        // Ensure data directory exists
        const dataDir = path.dirname(settingsPath);
        if (!fs.existsSync(dataDir)) {
          await fs.promises.mkdir(dataDir, { recursive: true });
        }
        
        await fs.promises.writeFile(settingsPath, JSON.stringify(data, null, 2), 'utf8');
        return { success: true };
      } catch (err) {
        console.error('Error saving app settings:', err);
        return { error: err.message };
      }
    }
    
    // Special case for saving products to local data directory
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
  
    // If no path is set, try to load from settings
    if (!effectivePath) {
      const settings = loadSettings();
      if (settings && settings.databasePath) {
        effectivePath = settings.databasePath;
      } else {
        return { error: 'No database path set' };
      }
    }
    
    try {
      const filePath = path.join(effectivePath, fileName);
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