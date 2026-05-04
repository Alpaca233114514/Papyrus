/**
 * Electron Builder Configuration (JavaScript version)
 * Alternative to electron-builder.json for more dynamic configuration
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Check if running in CI environment
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

// Certificate configuration (only for local builds, stored outside project dir)
const certificateFile = path.join(os.homedir(), '.papyrus-certs', 'code-signing.pfx');
const hasCertificate = fs.existsSync(certificateFile);

module.exports = {
  appId: 'com.papyrus.desktop',
  productName: 'Papyrus Desktop',
  copyright: 'Copyright © 2026 Papyrus Team',
  
  directories: {
    output: 'dist-electron',
    buildResources: 'build',
  },
  
  files: [
    'electron/**/*',
    'frontend/dist/**/*',
    'backend/dist/**/*',
    'backend/package.json',
    {
      from: 'backend/node_modules',
      to: 'backend/node_modules',
      filter: ['**/*'],
    },
    '!frontend/node_modules/**/*',
    '!**/*.map',
  ],

  extraResources: [
    {
      from: 'assets',
      to: 'assets',
      filter: ['**/*'],
    },
  ],

  asar: true,
  asarUnpack: [
    'backend/dist',
    'backend/package.json',
    'backend/node_modules',
  ],
  
  // Windows configuration - 仅 NSIS 安装器
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
    ],
    icon: 'assets/icon.ico',
    publisherName: 'Papyrus Team',
    verifyUpdateCodeSignature: true,
    executableName: 'Papyrus Desktop',
    // Only sign locally (CI builds are unsigned)
    ...(hasCertificate && !isCI ? {
      certificateFile: certificateFile,
      certificatePassword: process.env.CERTIFICATE_PASSWORD,
    } : {}),
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Papyrus Desktop',
    uninstallDisplayName: 'Papyrus Desktop',
    include: 'build/installer.nsh',
    deleteAppDataOnUninstall: false,
    artifactName: '${productName}-Setup.${ext}',
  },
  
  // macOS configuration
  mac: {
    target: [
      { target: 'dmg', arch: ['arm64'] },
      { target: 'zip', arch: ['arm64'] },
    ],
    icon: 'assets/icon.icns',
    category: 'public.app-category.productivity',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    minimumSystemVersion: '10.15',
  },
  
  dmg: {
    sign: false,
    artifactName: '${productName}-Apple-Silicon-${arch}.${ext}',
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: 'link', path: '/Applications' },
    ],
    window: {
      width: 540,
      height: 380,
    },
  },
  
  // Linux configuration
  linux: {
    target: [
      { target: 'AppImage', arch: ['x64'] },
      { target: 'deb', arch: ['x64'] },
      { target: 'tar.gz', arch: ['x64'] },
    ],
    artifactName: '${productName}-Linux-${arch}.${ext}',
    icon: 'assets/icon.png',
    category: 'Office',
    maintainer: 'Papyrus Team',
    vendor: 'Papyrus Team',
    synopsis: 'Modern note-taking and learning application',
    description: 'Papyrus is a modern note-taking and learning application with AI integration and spaced repetition.',
    desktop: {
      Name: 'Papyrus Desktop',
      Comment: 'Note-taking and learning application',
      Categories: 'Office;Education;',
      StartupWMClass: 'Papyrus Desktop',
    },
  },
  
  // Publish configuration
  publish: {
    provider: 'github',
    owner: 'papyrus-team',
    repo: 'papyrus',
    releaseType: 'release',
  },
};
