import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

describe('Server Auth Hook', () => {
  const testDir = path.join(os.tmpdir(), `papyrus-server-auth-test-${Date.now()}`);
  let originalEnv: string | undefined;
  let app: unknown;

  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });
    originalEnv = process.env.PAPYRUS_DATA_DIR;
    process.env.PAPYRUS_DATA_DIR = testDir;
    process.env.PAPYRUS_AUTH_TOKEN = 'test-auth-token-' + 'x'.repeat(32);

    const serverModule = await import('../../src/api/server.js');
    await serverModule.initApp();
    app = serverModule.app;
  });

  afterAll(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors on Windows
    }
    if (originalEnv !== undefined) {
      process.env.PAPYRUS_DATA_DIR = originalEnv;
    } else {
      delete process.env.PAPYRUS_DATA_DIR;
    }
    delete process.env.PAPYRUS_AUTH_TOKEN;
  });

  it('should allow GET without auth token', async () => {
    const response = await (app as { inject: (opts: unknown) => Promise<{ statusCode: number }> }).inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
  });

  it('should reject mutating request without auth token', async () => {
    const response = await (app as { inject: (opts: unknown) => Promise<{ statusCode: number }> }).inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'Test' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should allow mutating request with valid auth token', async () => {
    const response = await (app as { inject: (opts: unknown) => Promise<{ statusCode: number }> }).inject({
      method: 'POST',
      url: '/api/notes',
      headers: { 'x-papyrus-token': process.env.PAPYRUS_AUTH_TOKEN! },
      payload: { title: 'Test' },
    });

    expect(response.statusCode).toBe(200);
  });
});
