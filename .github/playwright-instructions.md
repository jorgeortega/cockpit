Playwright setup and usage

1) Install Playwright test runner and browsers:

   npm install -D @playwright/test
   npx playwright install chromium

2) Start the dev server in one terminal:

   npm run dev

3) Run Playwright tests in headed mode (so you can see the UI):

   npx playwright test --headed

Or run the single CockpitView spec:

   npx playwright test tests/playwright/CockpitView.spec.ts --headed

Notes:
- The config file playwright.config.ts sets baseURL to http://localhost:5173 (Vite default).
- Tests save a screenshot to playwright-screenshots/cockpit-zoom.png for visual inspection.
- If you prefer an npm script, add one to package.json (example):

  "scripts": {
    "playwright:install": "npx playwright install chromium",
    "test:playwright": "npx playwright test --headed"
  }

Run npm run playwright:install once after installing the package.
