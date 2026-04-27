import { test, expect, devices } from "@playwright/test";

test.use({
  ...devices["Pixel 5"],
});

// Helper to perform a single-finger swipe on the cockpit to open/close the
// mobile checklist. Positive dy (startY > endY) swipes up (open); negative
// swipes down (close).
async function swipeOnCockpit(page: any, startY: number, endY: number, steps = 8) {
  await page.evaluate(({ startY, endY, steps }) => {
    const el = document.querySelector('.cockpit-section');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;

    const dispatch = (type: string, touches: Touch[]) => {
      const ev = new TouchEvent(type, { touches, targetTouches: touches, changedTouches: touches, bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
    };

    const makeTouch = (clientY: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY, pageX: x, pageY: clientY });

    const start = startY;
    const end = endY;

    dispatch('touchstart', [makeTouch(start)]);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const y = start + (end - start) * t;
      dispatch('touchmove', [makeTouch(y)]);
    }

    dispatch('touchend', []);
  }, { startY, endY, steps });
}

test.describe("Mobile Drawer and Hotspot Centering", () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log(`BROWSER: ${msg.text()}`));
    await page.goto("/");
    await page.waitForSelector(".cockpit-scene", { timeout: 10000 });
    // Allow image and UI to stabilize
    await page.waitForTimeout(500);
  });

  test("mobile sheet opens via swipe and stays open on item click", async ({ page }) => {
    const drawer = page.locator('#checklist-drawer');
    await expect(drawer).not.toHaveClass(/open/);

    // There is no drawer toggle on mobile — open with a swipe up gesture
    const rect = await page.locator('.cockpit-section').boundingBox();
    if (!rect) throw new Error('cockpit-section not found');

    // Swipe up from near bottom of viewport to near top
    await swipeOnCockpit(page, rect.y + rect.height - 50, rect.y + 120, 6);
    await page.waitForTimeout(300);

    await expect(drawer).toHaveClass(/open/);

    // Click a checklist item (e.g. Fuel Quantity)
    const item = page.locator('.checklist-item', { hasText: 'Fuel Quantity' }).first();
    await item.click();

    // Drawer should STILL be open
    await expect(drawer).toHaveClass(/open/);
  });

  test("clicking item centers the cockpit on the hotspot", async ({ page }) => {
    const rect = await page.locator('.cockpit-section').boundingBox();
    if (!rect) throw new Error('cockpit-section not found');

    // Open sheet via swipe up
    await swipeOnCockpit(page, rect.y + rect.height - 50, rect.y + 120, 6);
    await page.waitForTimeout(300);

    // Click "Fuel Quantity" (cp2 in data)
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
