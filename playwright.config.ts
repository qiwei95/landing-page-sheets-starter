import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:8787', headless: true, trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:8787/api/config',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
