import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/playwright',
  timeout: 30_000,
  retries: 0,
  use: {
    headless: false, // run headed so controls are visible
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    launchOptions: { slowMo: 50 },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120_000,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
