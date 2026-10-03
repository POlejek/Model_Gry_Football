import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}/Model_Gry_Football/`;
// Lets the tests use a preinstalled Chromium (e.g. in sandboxes without `playwright install`).
const launchOptions = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'laptop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 }, launchOptions },
      testIgnore: /mobile\.spec/,
    },
    {
      name: 'telefon',
      use: { ...devices['Pixel 7'], launchOptions },
      testMatch: /mobile\.spec/,
    },
    // Safari on iPhone — needs WebKit (`npx playwright install webkit`); always on in CI.
    ...(process.env.CI || process.env.PW_WEBKIT ? [{
      name: 'iphone',
      use: { ...devices['iPhone 13'] },
      testMatch: /mobile\.spec/,
    }] : []),
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
