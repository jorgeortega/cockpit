import { test, expect, devices } from "@playwright/test";

// Run these scenarios using a real mobile device profile so page.touch works
test.use({ ...devices["iPhone 12"] });

// Helper to dispatch a pinch gesture using Chrome DevTools Protocol touch
// events. This is more reliable in headless environments than constructing
// TouchEvent instances in page context.
async function pinchZoom(
  page: any,
  startDist: number,
  endDist: number,
  steps = 8,
) {
  // Compute center and touch points in page coordinates
  const box = await page.locator(".cockpit-viewport").boundingBox();
  if (!box) return;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  // Try CDP session to send touch events (Chromium). If not available,
  // fall back to constructing TouchEvents in the page context.
  let client: any = null;
  const contextAny = page.context() as any;
  if (typeof contextAny.newCDPSession === "function") {
    try {
      client = await contextAny.newCDPSession(page);
      /* eslint-disable @typescript-eslint/no-unused-vars */
    } catch (e) {
      // Fall back to non-CDP implementation if CDP session fails
      // (e.g. in non-chromium browsers or certain emulated contexts)
      client = null;
    }
  }
  const half = (d: number) => d / 2;

  if (client) {
    // Helper to send a touch event via CDP
    const send = async (
      type: string,
      points: { x: number; y: number; id: number }[],
    ) => {
      await client.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: points.map((p) => ({
          x: Math.round(p.x),
          y: Math.round(p.y),
          radiusX: 1,
          radiusY: 1,
          force: 1,
          id: p.id,
        })),
      });
    };

    const startA = { x: centerX - half(startDist), y: centerY };
    const startB = { x: centerX + half(startDist), y: centerY };
    const endA = { x: centerX - half(endDist), y: centerY };
    const endB = { x: centerX + half(endDist), y: centerY };

    // touchStart
    await send("touchStart", [
      { ...startA, id: 1 },
      { ...startB, id: 2 },
    ]);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ax = startA.x + (endA.x - startA.x) * t;
      const bx = startB.x + (endB.x - startB.x) * t;
      await send("touchMove", [
        { x: ax, y: centerY, id: 1 },
        { x: bx, y: centerY, id: 2 },
      ]);
      await page.waitForTimeout(16);
    }

    // touchEnd
    await send("touchEnd", []);
  } else {
    // Fallback: construct TouchEvents inside the page. Less reliable in some
    // headless setups but works where CDP is not available.
    await page.evaluate(
      async ({ startDist, endDist, steps }) => {
        const el = document.querySelector(".cockpit-viewport");
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const half = (d: number) => d / 2;
        const startA = { x: centerX - half(startDist), y: centerY };
        const startB = { x: centerX + half(startDist), y: centerY };
        const endA = { x: centerX - half(endDist), y: centerY };
        const endB = { x: centerX + half(endDist), y: centerY };

        const makeTouchLike = (x, y, id) => ({
          identifier: id,
          target: el,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
        });

        const dispatchLike = (type, touchesArray) => {
          const ev = document.createEvent("Event");
          ev.initEvent(type, true, true);
          // Attach touch lists as plain arrays (duck-typed). Handlers that read
          // event.touches will see these.
          ev.touches = touchesArray;
          ev.targetTouches = touchesArray;
          ev.changedTouches = touchesArray;
          el.dispatchEvent(ev);
        };

        dispatchLike("touchstart", [
          makeTouchLike(startA.x, startA.y, 1),
          makeTouchLike(startB.x, startB.y, 2),
        ]);
        await new Promise((r) => setTimeout(r, 16));

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const ax = startA.x + (endA.x - startA.x) * t;
          const bx = startB.x + (endB.x - startB.x) * t;
          dispatchLike("touchmove", [
            makeTouchLike(ax, startA.y, 1),
            makeTouchLike(bx, startB.y, 2),
          ]);
          await new Promise((r) => setTimeout(r, 16));
        }

        dispatchLike("touchend", []);
      },
      { startDist, endDist, steps },
    );
  }
}

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

  test("mobile zoom at 200% (pinch)", async ({ page }) => {
    // Pinch from 40px -> 80px (~2x)
    await pinchZoom(page, 40, 80, 6);
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("mobile-zoom-200.png", {
      fullPage: true,
    });
  });

  test("mobile zoom at 400% (pinch)", async ({ page }) => {
    // Pinch from 40px -> 160px (~4x)
    await pinchZoom(page, 40, 160, 8);
    // allow UI to settle
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("mobile-zoom-400.png", {
      fullPage: true,
    });
  });

  test("mobile zoom at 500% (pinch)", async ({ page }) => {
    // Pinch to a larger scale, e.g., 50px -> 250px (5x)
    await pinchZoom(page, 50, 250, 10);
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("mobile-zoom-500.png", {
      fullPage: true,
    });
  });

  test("mobile zoom at 1000% (pinch)", async ({ page }) => {
    // Large pinch: 40px -> 400px (~10x)
    await pinchZoom(page, 40, 400, 12);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("mobile-zoom-1000.png", {
      fullPage: true,
    });
  });
});
