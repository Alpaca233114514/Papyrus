#!/usr/bin/env node
/**
 * Electron Build Script for Papyrus
 * 
 * Usage:
 *   node scripts/build-electron.js dev          - Development mode
 *   node scripts/build-electron.js build        - Build for current platform
 *   node scripts/build-electron.js build:win    - Build for Windows
 *   node scripts/build-electron.js build:mac    - Build for macOS
 *   node scripts/build-electron.js build:linux  - Build for Linux
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('='.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
  console.log('');
}

function error(message) {
  log(`❌ ERROR: ${message}`, 'red');
  process.exit(1);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

// Check if a command exists
function commandExists(command) {
  try {
    const cmd = process.platform === 'win32' ? `where ${command}` : `which ${command}`;
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Execute a command with proper error handling
function exec(command, options = {}) {
  const defaultOptions = {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  };
  
  try {
    execSync(command, { ...defaultOptions, ...options });
    return true;
  } catch (e) {
    if (!options.ignoreError) {
      error(`Command failed: ${command}\n${e.message}`);
    }
    return false;
  }
}

// Get platform-specific build command
function getBuildCommand(target) {
  const baseCommand = 'npx electron-builder';
  
  switch (target) {
    case 'win':
    case 'windows':
      return `${baseCommand} --win`;
    case 'mac':
    case 'macos':
    case 'darwin':
      return `${baseCommand} --mac`;
    case 'linux':
      return `${baseCommand} --linux`;
    case 'all':
      return `${baseCommand} --win --mac --linux`;
    default:
      return baseCommand;
  }
}

// Check prerequisites
function checkPrerequisites() {
  logSection('Checking Prerequisites');
  
  // Check Node.js
  const nodeVersion = process.version;
  log(`Node.js version: ${nodeVersion}`, 'dim');
  
  // Check if frontend dependencies are installed
  const frontendNodeModules = path.join('frontend', 'node_modules');
  if (!fs.existsSync(frontendNodeModules)) {
    log('Frontend dependencies not found. Installing...', 'yellow');
    exec('cd frontend && npm install');
  }
  
  // Check if root dependencies are installed
  const rootNodeModules = path.join('node_modules');
  if (!fs.existsSync(rootNodeModules)) {
    log('Root dependencies not found. Installing...', 'yellow');
    exec('npm install');
  }
  
  success('Prerequisites check passed');
}

// Build frontend
function buildFrontend() {
  logSection('Building Frontend');
  
  // Clean previous build
  const distPath = path.join('frontend', 'dist');
  if (fs.existsSync(distPath)) {
    log('Cleaning previous frontend build...', 'dim');
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  
  // Build frontend
  exec('cd frontend && npm run build');
  
  if (!fs.existsSync(distPath)) {
    error('Frontend build failed: dist folder not found');
  }
  
  success('Frontend built successfully');
}

// Check Python dependencies
function checkPythonDependencies() {
  const pythonCmd = commandExists('python') ? 'python' : (commandExists('python3') ? 'python3' : null);
  if (!pythonCmd) {
    return false;
  }
  
  const requiredModules = ['fastapi', 'uvicorn', 'watchdog', 'requests', 'pydantic'];
  const missing = [];
  
  for (const mod of requiredModules) {
    try {
      execSync(`${pythonCmd} -c "import ${mod}"`, { stdio: 'ignore' });
    } catch {
      missing.push(mod);
    }
  }
  
  if (missing.length > 0) {
    log(`Missing Python modules: ${missing.join(', ')}`, 'yellow');
    log('Installing requirements...', 'dim');
    exec(`${pythonCmd} -m pip install -r requirements.txt`);
  }
  
  return true;
}

// Build Python backend (optional)
function buildPython() {
  logSection('Building Python Backend');
  
  // Check if PyInstaller is available
  const hasPyInstaller = commandExists('pyinstaller');
  
  if (!hasPyInstaller) {
    log('PyInstaller not found. Skipping Python build.', 'yellow');
    log('The app will use Python source directly in development.', 'dim');
    return false;
  }
  
  // Check if Python is available
  const pythonCmd = commandExists('python') ? 'python' : (commandExists('python3') ? 'python3' : null);
  if (!pythonCmd) {
    log('Python not found. Skipping Python build.', 'yellow');
    return false;
  }
  
  // Check Python dependencies
  checkPythonDependencies();
  
  // Clean previous build
  const distPythonPath = path.join('dist-python');
  if (fs.existsSync(distPythonPath)) {
    log('Cleaning previous Python build...', 'dim');
    fs.rmSync(distPythonPath, { recursive: true, force: true });
  }
  
  const buildPath = path.join('build');
  if (fs.existsSync(buildPath)) {
    fs.rmSync(buildPath, { recursive: true, force: true });
  }
  
  // Build with PyInstaller
  log('Building Python executable with PyInstaller...');
  exec(`${pythonCmd} -m PyInstaller PapyrusAPI.spec --clean --distpath dist-python`);
  
  // Verify build output (one-dir mode)
  const executableName = process.platform === 'win32' ? 'Papyrus.exe' : 'Papyrus';
  const executablePath = path.join(distPythonPath, 'Papyrus', executableName);
  
  if (!fs.existsSync(executablePath)) {
    error(`Python build failed: ${executableName} not found in dist-python/Papyrus`);
  }
  
  // Verify executable size (should be > 10MB)
  const stats = fs.statSync(executablePath);
  const sizeMB = stats.size / 1024 / 1024;
  if (sizeMB < 10) {
    error(`Python build seems incomplete: ${executableName} is only ${sizeMB.toFixed(2)} MB (expected > 10 MB)`);
  }
  
  success(`Python backend built successfully (${sizeMB.toFixed(2)} MB)`);
  return true;
}

// Development mode
function devMode() {
  logSection('Starting Development Mode');
  
  // Check if concurrently is available
  const hasConcurrently = commandExists('concurrently');
  
  if (hasConcurrently) {
    log('Starting frontend and backend concurrently...');
    exec('npx concurrently -k -n "FRONTEND,BACKEND,ELECTRON" -c "cyan,green,magenta" '
      + '"cd frontend && npm run dev:frontend" '
      + '"python -m uvicorn src.papyrus_api.main:app --reload --port 8000" '
      + '"wait-on http://localhost:5173 http://localhost:8000/api/health && npx electron ."');
  } else {
    // Manual mode - just start Electron
    log('Starting Electron...');
    log('Please make sure frontend (npm run dev:frontend) and backend (python -m uvicorn src.papyrus_api.main:app --reload --port 8000) are running separately.', 'yellow');
    exec('npx electron .');
  }
}

// Build Electron app
function buildElectron(target) {
  logSection(`Building Electron App (${target || 'current platform'})`);
  
  const command = getBuildCommand(target);
  
  log(`Running: ${command}`, 'dim');
  exec(command);
  
  success(`Electron app built successfully!`);
  log(`Output location: ${path.join('dist-electron')}`, 'dim');
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'build';
  
  log('', 'reset');
  log('╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║           Papyrus Electron Build Script                ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');
  
  switch (command) {
    case 'dev':
      checkPrerequisites();
      devMode();
      break;
      
    case 'build':
      checkPrerequisites();
      buildFrontend();
      buildPython();
      buildElectron();
      break;
      
    case 'build:win':
    case 'build:windows':
      checkPrerequisites();
      buildFrontend();
      buildPython();
      buildElectron('win');
      break;
      
    case 'build:mac':
    case 'build:macos':
    case 'build:darwin':
      checkPrerequisites();
      buildFrontend();
      buildPython();
      buildElectron('mac');
      break;
      
    case 'build:linux':
      checkPrerequisites();
      buildFrontend();
      buildPython();
      buildElectron('linux');
      break;
      
    case 'build:all':
      checkPrerequisites();
      buildFrontend();
      buildPython();
      buildElectron('all');
      break;
      
    case 'help':
    case '-h':
    case '--help':
      console.log(`
Usage: node scripts/build-electron.js [command]

Commands:
  dev                    Start development mode
  build                  Build for current platform
  build:win              Build for Windows (x64)
  build:mac              Build for macOS (arm64, x64)
  build:linux            Build for Linux (x64)
  build:all              Build for all platforms
  help                   Show this help message

Examples:
  node scripts/build-electron.js dev
  node scripts/build-electron.js build:win
      `);
      break;
      
    default:
      error(`Unknown command: ${command}\nRun 'node scripts/build-electron.js help' for usage information.`);
  }
}

// Run main function
main();
