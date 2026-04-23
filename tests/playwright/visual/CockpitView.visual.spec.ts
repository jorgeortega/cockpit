import { test, expect } from "@playwright/test";

test.describe("Visual E2E - Cockpit", () => {
  test("initial cockpit layout matches snapshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".cockpit-scene", { timeout: 10000 });
    // allow image and UI to stabilise
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("cockpit-initial.png", {
      fullPage: true,
    });
  });

  test("150% zoom cockpit layout matches snapshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".cockpit-scene", { timeout: 10000 });
    await page.waitForTimeout(200);
    await page.locator('[aria-label="Zoom in"]').first().click();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("cockpit-150-zoom.png", {
      fullPage: true,
    });
  });

  test("200% zoom cockpit layout matches snapshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".cockpit-scene", { timeout: 10000 });
    await page.waitForTimeout(200);
    await page.locator('[aria-label="Zoom in"]').first().click();
    await page.waitForTimeout(300);
    await page.locator('[aria-label="Zoom in"]').first().click();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("cockpit-200-zoom.png", {
      fullPage: true,
    });
  });
});
