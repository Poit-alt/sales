const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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

  // Set app menu (if needed)
  // setupAppMenu();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();
  
  // Set up IPC communication
  setupIPC();
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
  
  // We've removed custom window controls in favor of native ones
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