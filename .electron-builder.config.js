/**
 * Electron Builder Configuration (JavaScript version)
 * Alternative to electron-builder.json for more dynamic configuration
 */

const path = require('path');

module.exports = {
  appId: 'com.papyrus.app',
  productName: 'Papyrus',
  copyright: 'Copyright © 2026 Papyrus Team',
  
  directories: {
    output: 'dist-electron',
    buildResources: 'build',
  },
  
  files: [
    'electron/**/*',
    'frontend/dist/**/*',
    '!frontend/node_modules/**/*',
    '!**/*.map',
    '!**/.*',
  ],
  
  extraResources: [
    {
      from: 'dist-python',
      to: 'python',
      filter: ['**/*'],
    },
    {
      from: 'assets',
      to: 'assets',
      filter: ['**/*'],
    },
  ],
  
  asar: true,
  asarUnpack: [
    '**/python/**/*',
    '**/*.exe',
    '**/*.dll',
    '**/*.so',
    '**/*.dylib',
  ],
  
  // Windows configuration - 仅 NSIS 安装器
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
    ],
    icon: 'assets/icon.ico',
    publisherName: 'Papyrus Team',
    verifyUpdateCodeSignature: false,
    certificateFile: 'build/code-signing.pfx',
    certificatePassword: 'papyrus123',
  },
  
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Papyrus',
    include: 'build/installer.nsh',
    deleteAppDataOnUninstall: false,
    artifactName: '${productName}-Setup-${version}.${ext}',
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
    artifactName: '${productName}-Apple Silicon-${arch}.${ext}',
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
      Name: 'Papyrus',
      Comment: 'Note-taking and learning application',
      Categories: 'Office;Education;',
      StartupWMClass: 'Papyrus',
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
