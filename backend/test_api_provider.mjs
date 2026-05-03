import Fastify from 'fastify';
import cors from '@fastify/cors';
import fs from 'fs';
import path from 'path';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'papyrus-api-test-' + Date.now());
fs.mkdirSync(testDir, { recursive: true });
process.env.PAPYRUS_DATA_DIR = testDir;

const app = Fastify({ logger: false });
await app.register(cors, { origin: true, credentials: true });

// Import routes
const { default: providersRoutes } = await import('./dist/api/routes/providers.js');
app.register(providersRoutes, { prefix: '/api/providers' });

// Simulate test sequence
console.log('--- Step 1: GET providers ---');
const get1 = await app.inject({ method: 'GET', url: '/api/providers' });
console.log('GET result:', JSON.parse(get1.body));

console.log('--- Step 2: POST FullProvider ---');
const post1 = await app.inject({
  method: 'POST',
  url: '/api/providers',
  payload: { type: 'openai', name: 'FullProvider', baseUrl: 'http://localhost', enabled: false, apiKeys: [{ name: 'key1', key: 'sk-1' }], models: [{ name: 'Model1', modelId: 'm1', port: 'openai' }] },
});
console.log('POST FullProvider:', post1.statusCode, JSON.parse(post1.body));

console.log('--- Step 3: POST Before ---');
const post2 = await app.inject({
  method: 'POST',
  url: '/api/providers',
  payload: { type: 'openai', name: 'Before', baseUrl: '', enabled: false },
});
console.log('POST Before:', post2.statusCode, JSON.parse(post2.body));

const providerId = JSON.parse(post2.body).provider?.id;
console.log('Provider ID:', providerId);

console.log('--- Step 4: PUT After ---');
const put1 = await app.inject({
  method: 'PUT',
  url: `/api/providers/${providerId}`,
  payload: { type: 'openai', name: 'After', baseUrl: '', enabled: false },
});
console.log('PUT After:', put1.statusCode, JSON.parse(put1.body));

console.log('--- Final GET ---');
const get2 = await app.inject({ method: 'GET', url: '/api/providers' });
console.log('Final providers:', JSON.parse(get2.body));

fs.rmSync(testDir, { recursive: true, force: true });
