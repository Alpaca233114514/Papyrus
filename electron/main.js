/**
 * Electron Main Process for Papyrus
 * 
 * Handles:
 * - Window creation and management
 * - Python backend process spawning
 * - System tray integration
 * - Platform-specific adaptations
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec, execSync } = require('child_process');
const os = require('os');
const { createDiagnosticWindow } = require('./diagnostic-window');

// In-memory log storage for diagnostics
const startupLogs = [];
const originalLog = console.log;
const originalError = console.error;

// Configuration
const CONFIG = {
  frontendDevUrl: 'http://localhost:5173',
  backendPort: 8000,
  backendHost: '127.0.0.1',
  healthCheckInterval: 2000,
  backendStartupTimeout: 60000,
};

// Global state
let mainWindow = null;
let tray = null;
let backendProcess = null;
let isQuitting = false;
let isDevMode = !app.isPackaged;

// Paths
const getPaths = () => {
  const resourcesPath = isDevMode 
    ? path.join(__dirname, '..') 
    : process.resourcesPath;
  
  // In production, extraResources are placed directly in resources directory
  // In development, python is in dist-python
  const pythonDistPath = isDevMode
    ? path.join(__dirname, '..', 'dist-python')
    : path.join(process.resourcesPath, 'python');

  return {
    resourcesPath,
    pythonDistPath,
    assetsPath: path.join(resourcesPath, 'assets'),
    frontendDistPath: isDevMode 
      ? path.join(__dirname, '..', 'frontend', 'dist')
      // In production, frontend files are in app.asar or unpacked next to main.js
      : path.join(__dirname, '..', 'frontend', 'dist'),
    iconPath: path.join(resourcesPath, 'assets', getIconName()),
  };
};

// Get platform-specific icon name
function getIconName() {
  switch (process.platform) {
    case 'win32': return 'icon.ico';
    case 'darwin': return 'icon.icns';
    default: return 'icon.png';
  }
}

// Get Python executable info (PyInstaller one-dir mode)
function getPythonExecutableInfo(pythonDistPath) {
  const executableName = process.platform === 'win32' ? 'Papyrus.exe' : 'Papyrus';
  // PyInstaller one-dir mode: executable is in Papyrus/ subdirectory
  const executableDir = path.join(pythonDistPath, 'Papyrus');
  const executablePath = path.join(executableDir, executableName);
  return { executablePath, executableDir };
}

// Logging utility
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console.log(logMessage);
  
  // Store in memory for diagnostics
  startupLogs.push({ timestamp, message, level });
  
  // Also log to file in production
  if (!isDevMode) {
    try {
      const logDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = path.join(logDir, `main-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, logMessage + '\n');
    } catch (e) {
      // If file logging fails, at least we have console
      console.error('Failed to write to log file:', e);
    }
  }
}

// Check if backend is ready
async function checkBackendHealth() {
  return new Promise((resolve) => {
    const http = require('http');
    const options = {
      hostname: CONFIG.backendHost,
      port: CONFIG.backendPort,
      path: '/api/health',
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Wait for backend to be ready
async function waitForBackend(timeout = CONFIG.backendStartupTimeout) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const isReady = await checkBackendHealth();
    if (isReady) {
      log('Backend is ready');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, CONFIG.healthCheckInterval));
  }
  
  throw new Error('Backend failed to start within timeout');
}

// Start Python backend
async function startBackend() {
  const paths = getPaths();
  
  // Log environment info for debugging
  log(`Environment Info:`);
  log(`  isDevMode: ${isDevMode}`);
  log(`  resourcesPath: ${paths.resourcesPath}`);
  log(`  pythonDistPath: ${paths.pythonDistPath}`);
  log(`  userData: ${app.getPath('userData')}`);
  
  if (isDevMode) {
    // Development mode: use Python directly
    log('Starting backend in development mode...');
    
    // Try python first, then python3
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const cwd = path.join(__dirname, '..');
    log(`Python command: ${pythonCmd}, cwd: ${cwd}`);
    
    backendProcess = spawn(pythonCmd, [
      '-m', 'uvicorn',
      'src.papyrus_api.main:app',
      '--host', CONFIG.backendHost,
      '--port', CONFIG.backendPort.toString()
    ], {
      cwd: cwd,
      stdio: 'pipe',
      shell: false,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONPATH: path.join(cwd, 'src'),
      }
    });
  } else {
    // Production mode: use PyInstaller executable (one-dir mode)
    const { executablePath, executableDir } = getPythonExecutableInfo(paths.pythonDistPath);
    
    log(`Production mode paths:`);
    log(`  executablePath: ${executablePath}`);
    log(`  executableDir: ${executableDir}`);
    log(`  __dirname: ${__dirname}`);
    log(`  process.resourcesPath: ${process.resourcesPath}`);
    
    // Check if executable exists - try alternative paths if not found
    let finalExecutablePath = executablePath;
    let finalExecutableDir = executableDir;
    
    if (!fs.existsSync(executablePath)) {
      log(`Primary executable not found, trying alternative paths...`);
      
      // Try alternative paths
      const alternativePaths = [
        path.join(paths.pythonDistPath, 'Papyrus.exe'),
        path.join(paths.pythonDistPath, 'Papyrus'),
        path.join(process.resourcesPath, 'python', 'Papyrus', 'Papyrus.exe'),
        path.join(process.resourcesPath, 'python', 'Papyrus.exe'),
      ];
      
      for (const altPath of alternativePaths) {
        log(`Checking: ${altPath}`);
        if (fs.existsSync(altPath)) {
          finalExecutablePath = altPath;
          finalExecutableDir = path.dirname(altPath);
          log(`Found executable at: ${altPath}`);
          break;
        }
      }
      
      if (!fs.existsSync(finalExecutablePath)) {
        log(`ERROR: Python executable not found at: ${executablePath}`, 'error');
        
        // Try to list what's in the directory for debugging
        try {
          log(`Contents of ${paths.pythonDistPath}:`, 'error');
          if (fs.existsSync(paths.pythonDistPath)) {
            fs.readdirSync(paths.pythonDistPath).forEach(file => {
              log(`  - ${file}`, 'error');
            });
          } else {
            log(`  Directory does not exist`, 'error');
          }
        } catch (e) {
          log(`Failed to list directory: ${e.message}`, 'error');
        }
        
        throw new Error(`后端程序未找到。请确保程序完整安装。路径: ${executablePath}`);
      }
    }

    log(`Starting backend from: ${finalExecutablePath}`);
    
    // Set data directory to Electron's userData (writable location)
    const env = {
      ...process.env,
      PAPYRUS_DATA_DIR: app.getPath('userData'),
    };
    
    log(`Backend env PAPYRUS_DATA_DIR: ${env.PAPYRUS_DATA_DIR}`);
    
    // Note: In one-dir mode, cwd must be the directory containing the executable
    // so it can find the _internal folder
    backendProcess = spawn(finalExecutablePath, [], {
      cwd: finalExecutableDir,
      stdio: 'pipe',
      detached: false,
      env: env,
    });
  }

  // Handle backend output
  backendProcess.stdout?.on('data', (data) => {
    log(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    log(`[Backend Error] ${data.toString().trim()}`, 'error');
  });

  backendProcess.on('error', (error) => {
    log(`Backend process error: ${error.message}`, 'error');
    if (!isQuitting) {
      dialog.showErrorBox('后端启动错误', `无法启动后端服务: ${error.message}\n\n请检查程序是否完整安装。`);
    }
  });

  backendProcess.on('exit', (code, signal) => {
    log(`Backend process exited with code ${code}, signal ${signal}`);
    if (!isQuitting && code !== 0) {
      log('Backend crashed unexpectedly', 'error');
      // Don't quit immediately - let user see the error and try to restart
      if (mainWindow) {
        mainWindow.webContents.send('backend-crashed');
      }
    }
  });

  // Wait for backend to be ready
  try {
    await waitForBackend();
    log('Backend started successfully');
  } catch (error) {
    log(`Backend failed to start: ${error.message}`, 'error');
    // Kill the process if it's still running
    if (backendProcess) {
      backendProcess.kill();
      backendProcess = null;
    }
    throw new Error(`后端服务启动失败: ${error.message}`);
  }
}

// Stop Python backend
function stopBackend() {
  if (backendProcess) {
    log('Stopping backend...');
    
    if (process.platform === 'win32') {
      // On Windows, we need to kill the process tree
      try {
        exec(`taskkill /pid ${backendProcess.pid} /T /F`);
      } catch (e) {
        backendProcess.kill('SIGTERM');
      }
    } else {
      backendProcess.kill('SIGTERM');
    }
    
    backendProcess = null;
  }
}

// Create main window
function createWindow() {
  const paths = getPaths();
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false, // Don't show until ready
    icon: paths.iconPath,
    title: 'Papyrus',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDevMode, // Disable in dev for local development
    },
    // Frameless window - hide native title bar on all platforms
    frame: false,
    titleBarStyle: 'hidden',
    // Disable system caption buttons overlay (use custom TitleBar instead)
    titleBarOverlay: false,
    // Show DevTools in production for debugging (remove this in stable release)
    ...(process.env.DEBUG_PROD ? { 
      webPreferences: { 
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: !isDevMode,
        devTools: true 
      }
    } : {}),
  });

  // Load content
  if (isDevMode) {
    log(`Loading development URL: ${CONFIG.frontendDevUrl}`);
    mainWindow.loadURL(CONFIG.frontendDevUrl);
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(paths.frontendDistPath, 'index.html');
    log(`Loading production file: ${indexPath}`);
    mainWindow.loadFile(indexPath);
  }

  // Remove default menu bar
  mainWindow.setMenu(null);
  
  // Window event handlers
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDevMode) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow.hide();
      
      if (tray) {
        tray.displayBalloon({
          iconType: 'info',
          title: 'Papyrus',
          content: 'Papyrus is running in the background. Click the tray icon to restore.',
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create system tray
function createTray() {
  const paths = getPaths();
  
  try {
    tray = new Tray(paths.iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Papyrus',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Open Data Folder',
        click: () => {
          const dataPath = app.getPath('userData');
          shell.openPath(dataPath);
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('Papyrus');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        createWindow();
      }
    });

    log('Tray created successfully');
  } catch (error) {
    log(`Failed to create tray: ${error.message}`, 'error');
  }
}

// IPC handlers
function setupIPC() {
  // Get app version
  ipcMain.handle('app:getVersion', () => app.getVersion());
  
  // Get platform info
  ipcMain.handle('app:getPlatform', () => process.platform);
  
  // Check if development mode
  ipcMain.handle('app:isDev', () => isDevMode);
  
  // Open external link
  ipcMain.handle('shell:openExternal', async (event, url) => {
    await shell.openExternal(url);
  });
  
  // Open data folder
  ipcMain.handle('shell:openDataFolder', () => {
    const dataPath = app.getPath('userData');
    shell.openPath(dataPath);
  });
  
  // Minimize to tray
  ipcMain.handle('window:minimizeToTray', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });
  
  // Window controls
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });
  
  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  
  ipcMain.handle('window:close', () => {
    if (mainWindow) {
      // Trigger the close event which will handle tray logic
      mainWindow.close();
    }
  });
  
  ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });
  
  // Check backend health
  ipcMain.handle('backend:checkHealth', async () => {
    return await checkBackendHealth();
  });
  
  // Restart backend
  ipcMain.handle('backend:restart', async () => {
    stopBackend();
    await startBackend();
    return true;
  });
  
  // Select folder dialog
  ipcMain.handle('dialog:selectFolder', async (event, defaultPath) => {
    if (!mainWindow) return { canceled: true };
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      defaultPath: defaultPath || app.getPath('userData'),
    });
    
    return result;
  });
}

// Certificate installation messages
const CERT_MESSAGES = {
  dialogTitle: 'Install Root Certificate',
  dialogMessage: 'Install Papyrus Root Certificate?',
  dialogDetail: "This will install the Papyrus root certificate to your system's Trusted Root Certification Authorities. This is required to verify the application's self-signed signature and avoid security warnings. Administrator rights are required.",
  successTitle: 'Certificate Installed',
  successMessage: 'Root certificate installed successfully.',
  successDetail: "The Papyrus root certificate has been added to your system's Trusted Root Certification Authorities.",
  errorTitle: 'Certificate Installation Failed',
  errorMessage: (errorMsg) => `Failed to install the root certificate. Please run the application as administrator and try again.\n\nError: ${errorMsg}`,
};

// Certificate installation for Windows
async function installRootCertificate() {
  if (process.platform !== 'win32') return;
  
  const paths = getPaths();
  const certPath = path.join(paths.resourcesPath, 'certs', 'root-ca.cer');
  
  // Check if certificate file exists
  if (!fs.existsSync(certPath)) {
    log('Root certificate not found in resources, skipping installation');
    log(`Expected cert path: ${certPath}`);
    return;
  }
  
  log(`Found certificate at: ${certPath}`);
  
  // Check if already installed (by thumbprint)
  try {
    const result = execSync('certutil -store Root "9EE5C13E206DC5DDAC254213E9A45798FE92C303"', { encoding: 'utf-8', stdio: 'pipe' });
    if (result.includes('Papyrus Self-Signed Root CA')) {
      log('Root certificate already installed');
      return;
    }
  } catch (e) {
    // Certificate not found, proceed with installation
    log('Certificate not found in store, will attempt installation');
  }
  
  // Check if running as administrator
  let isAdmin = false;
  try {
    execSync('net session', { stdio: 'pipe' });
    isAdmin = true;
  } catch (e) {
    isAdmin = false;
  }
  
  if (!isAdmin) {
    log('Running without administrator privileges, skipping certificate installation');
    // Silently skip - certificate is optional for app functionality
    return;
  }
  
  // Ask user for permission
  const response = dialog.showMessageBoxSync({
    type: 'question',
    buttons: ['Install', 'Skip'],
    defaultId: 0,
    title: CERT_MESSAGES.dialogTitle,
    message: CERT_MESSAGES.dialogMessage,
    detail: CERT_MESSAGES.dialogDetail,
  });
  
  if (response !== 0) {
    log('User skipped certificate installation');
    return;
  }
  
  // Install certificate
  try {
    execSync(`certutil -addstore -f Root "${certPath}"`, { encoding: 'utf-8' });
    dialog.showMessageBox({
      type: 'info',
      title: CERT_MESSAGES.successTitle,
      message: CERT_MESSAGES.successMessage,
      detail: CERT_MESSAGES.successDetail,
    });
    log('Root certificate installed successfully');
  } catch (error) {
    log(`Failed to install root certificate: ${error.message}`, 'error');
    // Don't show error dialog - certificate is optional
    log('Certificate installation failed but continuing app startup');
  }
}

// App event handlers
app.whenReady().then(async () => {
  log('App is ready');
  
  try {
    // Check and install root certificate (Windows only)
    await installRootCertificate();
    
    // Check if backend is already running (e.g., started by start-dev.bat)
    const isBackendAlreadyRunning = await checkBackendHealth();
    
    if (isBackendAlreadyRunning) {
      log('Backend is already running (likely started by dev script), skipping backend startup');
    } else {
      // Start backend only if not already running
      await startBackend();
    }
    
    // Create window and tray
    createWindow();
    createTray();
    setupIPC();
    
  } catch (error) {
    log(`Failed to initialize: ${error.message}`, 'error');
    log(`Stack trace: ${error.stack}`, 'error');
    
    // Gather diagnostic information
    const paths = getPaths();
    const { executablePath, executableDir } = getPythonExecutableInfo(paths.pythonDistPath);
    
    const diagnosticPaths = {
      resourcesPath: paths.resourcesPath,
      pythonDistPath: paths.pythonDistPath,
      pythonExecutable: executablePath,
      pythonExecutableDir: executableDir,
      userData: app.getPath('userData'),
      __dirname: __dirname,
      processResourcesPath: process.resourcesPath,
    };
    
    // Show diagnostic window
    createDiagnosticWindow(startupLogs, diagnosticPaths, error);
    
    // Also show simple error dialog
    dialog.showErrorBox(
      'Initialization Error', 
      `Failed to start: ${error.message}\n\nDiagnostic window opened with details.`
    );
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On Windows/Linux, keep app running in tray
    // Don't quit unless explicitly requested
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  stopBackend();
});

app.on('quit', () => {
  log('App is quitting');
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle certificate errors in development
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDevMode) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Kill all Papyrus processes (for Windows installer/updater)
// WARNING: This function should ONLY be called by the installer/updater, not by the app itself
// Calling this during app startup will kill the app itself
function killAllPapyrusProcesses() {
  if (process.platform !== 'win32') return;
  
  try {
    log('Killing any existing Papyrus processes...');
    // Kill Papyrus.exe (main app)
    try {
      execSync('taskkill /F /IM Papyrus.exe 2>nul', { stdio: 'pipe' });
      log('Killed Papyrus.exe processes');
    } catch (e) {
      // No processes found or already killed
    }
    // Kill PapyrusAPI.exe (backend)
    try {
      execSync('taskkill /F /IM PapyrusAPI.exe 2>nul', { stdio: 'pipe' });
      log('Killed PapyrusAPI.exe processes');
    } catch (e) {
      // No processes found or already killed
    }
    // Kill any python processes spawned by Papyrus (by window title or check parent)
    // Wait a bit for processes to fully terminate
    execSync('timeout /t 1 /nobreak >nul 2>&1', { stdio: 'pipe' });
  } catch (error) {
    log(`Error killing processes: ${error.message}`, 'error');
  }
}

// NOTE: killAllPapyrusProcesses() is intentionally NOT called here.
// It should only be called by the installer/updater to avoid the app killing itself.
// See: https://github.com/electron/electron/issues/36554

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log('Another instance is already running, quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    log('Second instance detected, focusing window');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Error handling
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'error');
  log(error.stack, 'error');
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'error');
});
