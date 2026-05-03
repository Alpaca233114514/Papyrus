const { getDb, closeDb, loadAllProviders, saveProvider } = require('./dist/db/database.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const testDir = path.join(os.tmpdir(), 'papyrus-test-' + Date.now());
fs.mkdirSync(testDir, { recursive: true });
process.env.PAPYRUS_DATA_DIR = testDir;

// Initialize DB
getDb();

console.log('Initial providers:', loadAllProviders().map(p => ({ type: p.type, name: p.name, baseUrl: p.baseUrl })));

// Create first provider
const id1 = saveProvider({ type: 'openai', name: 'Before', baseUrl: '', enabled: false });
console.log('Created Before:', id1);

// Update to After
try {
  saveProvider({ id: id1, type: 'openai', name: 'After', baseUrl: '', enabled: false });
  console.log('Updated to After successfully');
} catch (e) {
  console.error('Update failed:', e.message);
}

console.log('Final providers:', loadAllProviders().map(p => ({ type: p.type, name: p.name, baseUrl: p.baseUrl })));

closeDb();
fs.rmSync(testDir, { recursive: true, force: true });
