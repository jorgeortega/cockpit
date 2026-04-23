import { test, expect } from '@playwright/test';

// Integration test: at 500% zoom each hotspot's center must lie within the
// displayed image rectangle (not in the surrounding letterbox/background).
// This ensures hotspots map correctly to the image even when object-fit: contain
// introduces letterboxing.
test('hotspots remain inside image at 500% zoom', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cockpit-scene', { timeout: 10000 });

  const zoomIn = page.locator('[aria-label="Zoom in"]').first();
  // Click until zoom reaches 500% or the control becomes disabled. Use a
  // capped number of attempts to avoid infinite loops.
  for (let i = 0; i < 40; i++) {
    if (await zoomIn.isDisabled()) break;
    await zoomIn.click();
    await page.waitForTimeout(40);

    const status = (await page.locator('.zoom-status').textContent()) || '';
    if (status.includes('500')) break;
  }

  // Center viewport on image
  await page.evaluate(() => {
    const cockpit = document.querySelector('.cockpit-viewport') as HTMLElement | null;
    if (!cockpit) return;
    cockpit.scrollTop = Math.floor((cockpit.scrollHeight - cockpit.clientHeight) / 2);
    cockpit.scrollLeft = Math.floor((cockpit.scrollWidth - cockpit.clientWidth) / 2);
  });

  // Gather image bounding rect and all hotspots
  const result = await page.evaluate(() => {
    const img = document.querySelector('.cockpit-img') as HTMLElement | null;
    const hotspots = Array.from(document.querySelectorAll('.hotspot')) as HTMLElement[];
    if (!img) return { ok: false, reason: 'no img' };
    const imgRect = img.getBoundingClientRect();
    const checks = hotspots.map((h) => {
      const r = h.getBoundingClientRect();
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      return {
        id: h.textContent?.trim() ?? '(no-label)',
        centerX,
        centerY,
        inside: centerX >= imgRect.left - 0.5 && centerX <= imgRect.right + 0.5 && centerY >= imgRect.top - 0.5 && centerY <= imgRect.bottom + 0.5,
      };
    });
    const outside = checks.filter((c) => !c.inside);
    return { ok: outside.length === 0, outside, imgRect: { left: imgRect.left, top: imgRect.top, right: imgRect.right, bottom: imgRect.bottom } };
  });

  if (!result.ok) {
    console.log('Hotspots outside image:', JSON.stringify(result.outside, null, 2));
  }
  expect(result.ok).toBe(true);
});
