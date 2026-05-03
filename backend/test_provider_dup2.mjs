import { getDb, closeDb, loadAllProviders, saveProvider } from './dist/db/database.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'papyrus-test-' + Date.now());
fs.mkdirSync(testDir, { recursive: true });
process.env.PAPYRUS_DATA_DIR = testDir;

getDb();

// Simulate what happens in the integration test sequence
// 1. Direct saveProvider call (line 776 in api.test.ts)
const id1 = saveProvider({ id: 'p-openai', type: 'openai', name: 'OpenAI', baseUrl: 'http://192.168.1.1/v1', enabled: true, isDefault: false });
console.log('1. Direct OpenAI:', id1);

// 2. POST /api/providers with FullProvider
const id2 = saveProvider({ type: 'openai', name: 'FullProvider', baseUrl: 'http://localhost', enabled: false });
console.log('2. FullProvider:', id2);

// 3. POST /api/providers with Before
const id3 = saveProvider({ type: 'openai', name: 'Before', baseUrl: '', enabled: false });
console.log('3. Before:', id3);

// 4. PUT to After
try {
  saveProvider({ id: id3, type: 'openai', name: 'After', baseUrl: '', enabled: false });
  console.log('4. Updated Before to After: SUCCESS');
} catch (e) {
  console.error('4. Updated Before to After: FAILED -', e.message);
}

console.log('All providers:', loadAllProviders().map(p => ({ id: p.id, type: p.type, name: p.name, baseUrl: p.baseUrl })));

closeDb();
fs.rmSync(testDir, { recursive: true, force: true });
