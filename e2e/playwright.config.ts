import { defineConfig, devices } from '@playwright/test';

const AUTH_TOKEN = process.env.PAPYRUS_AUTH_TOKEN || 'e2e-test-token-e2e-test-token-32chars';

// Forward the auth token env var so the backend process uses the same token
process.env.PAPYRUS_AUTH_TOKEN = AUTH_TOKEN;

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
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
