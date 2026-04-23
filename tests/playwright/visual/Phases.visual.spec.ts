import { test, expect } from "@playwright/test";
import { flightChecklists } from "../../../src/data/checklist";

test.describe("Visual E2E - Checklist Phases", () => {
  for (const phase of flightChecklists) {
    test(`phase "${phase.label}" matches snapshot`, async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector(".cockpit-scene", { timeout: 10000 });
      
      // Click the tab for this phase
      const tabSelector = `.tab:has-text("${phase.label}")`;
      await page.waitForSelector(tabSelector);
      await page.click(tabSelector);
      
      // Allow image and UI to stabilise
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot(`phase-${phase.id}.png`, {
        fullPage: true,
      });
    });
  }
});
