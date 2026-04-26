import { test, expect } from "@playwright/test";

test.describe("Visual E2E - Mobile Zoom", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".cockpit-scene", { timeout: 10000 });
    // Allow image and UI to stabilize
    await page.waitForTimeout(500);
  });

  test("initial mobile cockpit layout (100%)", async ({ page }) => {
    await expect(page).toHaveScreenshot("mobile-zoom-100.png", {
      fullPage: true,
    });
  });

  test("mobile zoom at 400%", async ({ page }) => {
    const zoomIn = page.locator('[aria-label="Zoom in"]');

    for (let i = 0; i < 6; i++) {
      await zoomIn.click();
      await page.waitForTimeout(200);
    }

    // Verify zoom status text
    await expect(page.locator(".zoom-status")).toHaveText("400%");

    await expect(page).toHaveScreenshot("mobile-zoom-400.png", {
      fullPage: true,
    });
  });

  test("mobile zoom at 500%", async ({ page }) => {
    const zoomIn = page.locator('[aria-label="Zoom in"]');

    while (await zoomIn.isEnabled()) {
      await zoomIn.click();
      await page.waitForTimeout(100);
    }

    await expect(page.locator(".zoom-status")).toHaveText("500%");

    await expect(page).toHaveScreenshot("mobile-zoom-500.png", {
      fullPage: true,
    });
  });
});
