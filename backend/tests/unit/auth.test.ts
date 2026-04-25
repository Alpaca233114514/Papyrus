import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('auth', () => {
  const testDir = path.join(os.tmpdir(), `papyrus-auth-test-${Date.now()}`);
  let originalEnv: string | undefined;
  let getOrCreateAuthToken: () => string;
  let getAuthToken: () => string | null;
  let isAuthEnabled: () => boolean;
  let validateRequestToken: (token?: string) => boolean;

  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.PAPYRUS_DATA_DIR = testDir;
    originalEnv = process.env.PAPYRUS_AUTH_TOKEN;
    delete process.env.PAPYRUS_AUTH_TOKEN;

    const authModule = await import('../../src/utils/auth.js');
    getOrCreateAuthToken = authModule.getOrCreateAuthToken;
    getAuthToken = authModule.getAuthToken;
    isAuthEnabled = authModule.isAuthEnabled;
    validateRequestToken = authModule.validateRequestToken;
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    delete process.env.PAPYRUS_DATA_DIR;
    if (originalEnv !== undefined) {
      process.env.PAPYRUS_AUTH_TOKEN = originalEnv;
    } else {
      delete process.env.PAPYRUS_AUTH_TOKEN;
    }
  });

  beforeEach(() => {
    delete process.env.PAPYRUS_AUTH_TOKEN;
    const tokenFile = path.join(testDir, '.api_token');
    if (fs.existsSync(tokenFile)) {
      fs.rmSync(tokenFile, { force: true });
    }
  });

  it('should create token from env', () => {
    process.env.PAPYRUS_AUTH_TOKEN = 'a'.repeat(32);
    expect(getOrCreateAuthToken()).toBe('a'.repeat(32));
    expect(isAuthEnabled()).toBe(true);
    expect(validateRequestToken('a'.repeat(32))).toBe(true);
    expect(validateRequestToken('wrong')).toBe(false);
    expect(getAuthToken()).toBe('a'.repeat(32));
  });

  it('should create new token when no env or file', () => {
    const token = getOrCreateAuthToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(isAuthEnabled()).toBe(true);
    expect(validateRequestToken(token)).toBe(true);
  });

  it('should read existing token from file', () => {
    const first = getOrCreateAuthToken();
    // getAuthToken should read same token from file
    expect(getAuthToken()).toBe(first);
    expect(getOrCreateAuthToken()).toBe(first);
  });

  it('should return null when auth disabled', () => {
    expect(getAuthToken()).toBeNull();
    expect(isAuthEnabled()).toBe(false);
    expect(validateRequestToken()).toBe(true);
    expect(validateRequestToken('anything')).toBe(true);
  });

  it('should reject short env token', () => {
    process.env.PAPYRUS_AUTH_TOKEN = 'short';
    const token = getOrCreateAuthToken();
    expect(token).not.toBe('short');
    expect(token.length).toBeGreaterThanOrEqual(32);
  });
});
