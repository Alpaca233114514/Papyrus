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
    shell: false,
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

// Build Node.js backend
function buildBackend() {
  logSection('Building Node.js Backend');

  const backendPath = path.join('backend');
  if (!fs.existsSync(backendPath)) {
    error('Backend directory not found. Please ensure backend/ exists.');
  }

  // Check if backend dependencies are installed
  const backendNodeModules = path.join('backend', 'node_modules');
  if (!fs.existsSync(backendNodeModules)) {
    log('Backend dependencies not found. Installing...', 'yellow');
    exec('cd backend && npm install');
  }

  // Clean previous build
  const distBackendPath = path.join('backend', 'dist');
  if (fs.existsSync(distBackendPath)) {
    log('Cleaning previous backend build...', 'dim');
    fs.rmSync(distBackendPath, { recursive: true, force: true });
  }

  // Build TypeScript
  log('Compiling TypeScript backend...');
  exec('cd backend && npm run build');

  // Verify build output
  const serverJsPath = path.join(distBackendPath, 'api', 'server.js');
  if (!fs.existsSync(serverJsPath)) {
    error(`Backend build failed: server.js not found in ${distBackendPath}`);
  }

  success('Node.js backend built successfully');
  return true;
}

// Kill process on port (cross-platform)
function killPort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    log(`Invalid port: ${port}`, 'red');
    return;
  }
  try {
    if (process.platform === 'win32') {
      // Windows: find PID using netstat and kill with taskkill
      const { spawnSync } = require('child_process');
      const netstatResult = spawnSync('netstat', ['-ano'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const findstrResult = spawnSync('findstr', [`:${port}`], { encoding: 'utf8', input: netstatResult.stdout, stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = (findstrResult.stdout || '').trim().split('\n');
      for (const line of lines) {
        if (!line.includes('LISTENING')) continue;
        const match = line.trim().match(/\s+(\d+)\s*$/);
        if (match) {
          const pid = match[1];
          try {
            spawnSync('taskkill', ['/PID', pid, '/F'], { stdio: 'ignore' });
            log(`Released port ${port} (PID: ${pid})`, 'green');
          } catch (e) {
            log(`Failed to kill process ${pid}`, 'yellow');
          }
        }
      }
    } else {
      // macOS/Linux: use lsof to find and kill processes
      const { spawnSync } = require('child_process');
      try {
        const lsofResult = spawnSync('lsof', ['-ti', `:${port}`], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const pids = (lsofResult.stdout || '').trim().split('\n');
        for (const pid of pids) {
          if (pid) {
            spawnSync('kill', ['-9', pid], { stdio: 'ignore' });
            log(`Released port ${port} (PID: ${pid})`, 'green');
          }
        }
      } catch (e) {
        // Port not in use, ignore
      }
    }
  } catch (e) {
    // Port not in use or error, ignore
  }
}

// Development mode
function devMode() {
  logSection('Starting Development Mode');
  
  const waitOn = require('wait-on');

  // Release ports before starting
  log('Checking port usage...');
  killPort(8000);
  killPort(5173);
  
  // Wait a moment for ports to be fully released
  log('Waiting for ports to be released...', 'dim');
  exec('sleep 1 || timeout 1 >nul', { stdio: 'ignore', ignoreError: true });
  
  // Start frontend
  log('Starting frontend...');
  const frontend = spawn('npm', ['run', 'dev:frontend'], {
    cwd: path.join(process.cwd(), 'frontend'),
    stdio: 'inherit',
    shell: true
  });
  
  // Start Node.js backend
  log('Starting backend...');
  const backend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(process.cwd(), 'backend'),
    stdio: 'inherit',
    shell: true,
    env: process.env
  });
  
  // Wait for both services to be ready
  log('Waiting for services to be ready...');
  waitOn({
    resources: ['http://localhost:5173', 'http://localhost:8000/api/health'],
    timeout: 60000,
    interval: 1000
  }, (err) => {
    if (err) {
      log('Services failed to start in time', 'red');
      frontend.kill();
      backend.kill();
      process.exit(1);
    }
    
    log('Services ready, starting Electron...');
    
    // Get electron executable path
    const electronModulePath = require.resolve('electron');
    const electronPath = process.platform === 'win32'
      ? require('path').join(require('path').dirname(electronModulePath), 'dist', 'electron.exe')
      : require('path').join(require('path').dirname(electronModulePath), 'dist', 'electron');

    const electronEnv = { ...process.env };
    delete electronEnv.ELECTRON_RUN_AS_NODE;

    const electron = spawn(electronPath, ['.'], {
      stdio: 'inherit',
      shell: false,
      cwd: process.cwd(),
      env: electronEnv
    });
    
    // Handle cleanup
    process.on('SIGINT', () => {
      electron.kill();
      frontend.kill();
      backend.kill();
      process.exit(0);
    });
    
    electron.on('close', () => {
      frontend.kill();
      backend.kill();
      process.exit(0);
    });
  });
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

// Sync version before building
function syncVersion() {
  log('Syncing version...', 'dim');
  const syncScript = path.join(__dirname, 'sync-version.js');
  if (fs.existsSync(syncScript)) {
    try {
      execSync('node "' + syncScript + '"', { stdio: 'inherit', shell: true });
    } catch (e) {
      log('Version sync failed, continuing build...', 'yellow');
    }
  }
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
      syncVersion();
      devMode();
      break;

    case 'build':
      checkPrerequisites();
      syncVersion();
      buildFrontend();
      buildBackend();
      buildElectron();
      break;

    case 'build:win':
    case 'build:windows':
      checkPrerequisites();
      syncVersion();
      buildFrontend();
      buildBackend();
      buildElectron('win');
      break;

    case 'build:mac':
    case 'build:macos':
    case 'build:darwin':
      checkPrerequisites();
      syncVersion();
      buildFrontend();
      buildBackend();
      buildElectron('mac');
      break;

    case 'build:linux':
      checkPrerequisites();
      syncVersion();
      buildFrontend();
      buildBackend();
      buildElectron('linux');
      break;

    case 'build:all':
      checkPrerequisites();
      syncVersion();
      buildFrontend();
      buildBackend();
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
