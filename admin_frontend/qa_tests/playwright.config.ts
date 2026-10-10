import { defineConfig, devices } from '@playwright/test'

/**
 * QA end-to-end suite. Needs the backend on :3000 with the demo seed
 * (admin_backend/qa_tests/seed/seed-large.ts) and the Vite dev server on :5173:
 *   QA_API_PROXY_TARGET=http://localhost:3000 npx vite --port 5173
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './results/artifacts',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [['list'], ['json', { outputFile: './results/playwright-report.json' }]],
  use: {
    baseURL: process.env.QA_FE_URL ?? 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'off',
    launchOptions: process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 } } },
    // Firefox and WebKit binaries are not installed in the QA container (see qa_frontend/responsive_cross_browser.csv).
    ...(process.env.QA_ALL_BROWSERS
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
})
