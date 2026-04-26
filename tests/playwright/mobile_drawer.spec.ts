import { test, expect, devices } from "@playwright/test";

test.use({ 
  ...devices['Pixel 5'],
});

test.describe("Mobile Drawer and Hotspot Centering", () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
    await page.goto("/");
    await page.waitForSelector(".cockpit-scene", { timeout: 10000 });
    // Allow image and UI to stabilize
    await page.waitForTimeout(500);
  });

  test("drawer toggle button has '^' and stays open on item click", async ({ page }) => {
    // Check if drawer is closed initially on mobile
    const drawer = page.locator('#checklist-drawer');
    await expect(drawer).not.toHaveClass(/open/);

    // Check toggle button content (closed state)
    const toggle = page.locator('.drawer-toggle');
    await expect(toggle).toHaveText('▴');

    // Open drawer
    await toggle.click();
    await expect(drawer).toHaveClass(/open/);
    
    // Check toggle button content (open state)
    await expect(toggle).toHaveText('▾');

    // Click a checklist item (e.g. Fuel Quantity)
    const item = page.locator('.checklist-item', { hasText: 'Fuel Quantity' }).first();
    await item.click();

    // Drawer should STILL be open
    await expect(drawer).toHaveClass(/open/);
  });

  test("clicking item centers the cockpit on the hotspot", async ({ page }) => {
    const toggle = page.locator('.drawer-toggle');
    await toggle.click();

    // Click "Fuel Quantity" (cp2 in data)
    // We need to wait for the scroll to finish (it uses "smooth")
    const item = page.locator('.checklist-item', { hasText: 'Fuel Quantity' }).first();
    await item.click();
    await page.waitForTimeout(1000); // Wait for smooth scroll

    // Verify centering
    const isCentered = await page.evaluate(() => {
      const viewport = document.querySelector('.cockpit-viewport');
      const activeHotspot = document.querySelector('.hotspot.active');
      
      if (!viewport) {
        console.log('Centering check FAILED: .cockpit-viewport not found');
        return false;
      }
      if (!activeHotspot) {
        console.log('Centering check FAILED: .hotspot.active not found');
        return false;
      }

      const vRect = viewport.getBoundingClientRect();
      const hRect = activeHotspot.getBoundingClientRect();

      const vCenter = { x: vRect.left + vRect.width / 2, y: vRect.top + vRect.height / 2 };
      const hCenter = { x: hRect.left + hRect.width / 2, y: hRect.top + hRect.height / 2 };

      const diffX = Math.abs(vCenter.x - hCenter.x);
      const diffY = Math.abs(vCenter.y - hCenter.y);
      
      console.log(`Centering check. Viewport: ${vRect.width}x${vRect.height} at ${vRect.left},${vRect.top}. Viewport center: ${vCenter.x},${vCenter.y}. Hotspot center: ${hCenter.x},${hCenter.y}. Diff: ${diffX},${diffY}`);
      
      return diffX < 150 && diffY < 150;
    });

    expect(isCentered).toBe(true);
  });
});
