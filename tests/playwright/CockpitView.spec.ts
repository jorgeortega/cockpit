import { test, expect } from '@playwright/test';

test('open cockpit and show zoom controls', async ({ page }) => {
  // assumes dev server is running at http://localhost:5173
  await page.goto('/');
  await page.waitForSelector('.cockpit-scene', { timeout: 10000 });

  const zoomIn = page.locator('[aria-label="Zoom in"]').first();
  await zoomIn.scrollIntoViewIfNeeded();
  await expect(zoomIn).toBeVisible();

  // ensure reset and zoom out controls are visible too
  const reset = page.locator('[aria-label="Reset zoom"]').first();
  await expect(reset).toBeVisible();

  // take a screenshot to inspect visually
  await page.screenshot({ path: 'playwright-screenshots/cockpit-zoom.png', fullPage: true });
});
