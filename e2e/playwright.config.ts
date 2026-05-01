import { defineConfig, devices } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';

const TEST_DATA_DIR = join(tmpdir(), 'papyrus-e2e-test-data');
const AUTH_TOKEN = process.env.PAPYRUS_AUTH_TOKEN || 'e2e-test-token-e2e-test-token-32chars';

// Clean up any leftover test data from previous runs
try { rmSync(TEST_DATA_DIR, { recursive: true }); } catch {}

// Forward env vars so the backend uses a temp database instead of production data
process.env.PAPYRUS_AUTH_TOKEN = AUTH_TOKEN;
process.env.PAPYRUS_DATA_DIR = TEST_DATA_DIR;

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      'x-papyrus-token': AUTH_TOKEN,
    },
  },

  webServer: {
    command: 'npx --prefix ../backend tsx ../backend/src/api/server.ts',
    url: 'http://127.0.0.1:8000/api/health',
    reuseExistingServer: false,
    timeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
