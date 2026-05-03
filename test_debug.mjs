import fs from 'fs';
import path from 'path';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'papyrus-debug-test-' + Date.now());
fs.mkdirSync(testDir, { recursive: true });
process.env.PAPYRUS_DATA_DIR = testDir;

// Import server
const { app, initApp } = await import('./backend/dist/api/server.js');
await initApp();

// Check initial providers
const get1 = await app.inject({ method: 'GET', url: '/api/providers' });
console.log('Initial providers:', JSON.parse(get1.body));

// Simulate the PUT test
const post1 = await app.inject({
  method: 'POST',
  url: '/api/providers',
  payload: { type: 'openai', name: 'Before', baseUrl: '', enabled: false },
});
console.log('POST Before:', post1.statusCode, JSON.parse(post1.body));

const providerId = JSON.parse(post1.body).provider?.id;

const put1 = await app.inject({
  method: 'PUT',
  url: `/api/providers/${providerId}`,
  payload: { type: 'openai', name: 'After', baseUrl: '', enabled: false },
});
console.log('PUT After:', put1.statusCode, JSON.parse(put1.body));

fs.rmSync(testDir, { recursive: true, force: true });
