import { test, expect } from '@playwright/test';

test('zoom jumps debug', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cockpit-scene', { timeout: 10000 });
  const zoomIn = page.locator('[aria-label="Zoom in"]').first();

  const metrics: any[] = [];
  // click until zoom reaches ~1.8 or control disabled
  for (let i = 0; i < 40; i++) {
    const status = (await page.locator('.zoom-status').textContent())?.trim() || '';
    const zoomVal = parseFloat(status.replace('%',''))/100 || null;
    // collect metrics before click
    const before = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(s);
      const cockpit = q('.cockpit-viewport') as HTMLElement | null;
      const scene = q('.cockpit-scene') as HTMLElement | null;
      const wrapper = q('.image-wrapper') as HTMLElement | null;
      const img = q('.cockpit-img') as HTMLImageElement | null;
      return {
        cockpit: cockpit ? { scrollWidth: cockpit.scrollWidth, clientWidth: cockpit.clientWidth, scrollLeft: cockpit.scrollLeft } : null,
        scene: scene ? { width: scene.getBoundingClientRect().width, height: scene.getBoundingClientRect().height } : null,
        wrapper: wrapper ? { width: wrapper.getBoundingClientRect().width, height: wrapper.getBoundingClientRect().height } : null,
        img: img ? { width: img.getBoundingClientRect().width, height: img.getBoundingClientRect().height, computed: getComputedStyle(img).cssText, src: img.getAttribute('src') } : null
      };
    });
    metrics.push({ step: i, status, zoomVal, before });

    if (await zoomIn.isDisabled()) break;
    await zoomIn.click();
    await page.waitForTimeout(120);

    const afterStatus = (await page.locator('.zoom-status').textContent())?.trim() || '';
    const afterZoomVal = parseFloat(afterStatus.replace('%',''))/100 || null;
    const after = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(s);
      const cockpit = q('.cockpit-viewport') as HTMLElement | null;
      const scene = q('.cockpit-scene') as HTMLElement | null;
      const wrapper = q('.image-wrapper') as HTMLElement | null;
      const img = q('.cockpit-img') as HTMLImageElement | null;
      return {
        cockpit: cockpit ? { scrollWidth: cockpit.scrollWidth, clientWidth: cockpit.clientWidth, scrollLeft: cockpit.scrollLeft } : null,
        scene: scene ? { width: scene.getBoundingClientRect().width, height: scene.getBoundingClientRect().height, style: getComputedStyle(scene).cssText } : null,
        wrapper: wrapper ? { width: wrapper.getBoundingClientRect().width, height: wrapper.getBoundingClientRect().height } : null,
        img: img ? { width: img.getBoundingClientRect().width, height: img.getBoundingClientRect().height, computed: getComputedStyle(img).cssText } : null
      };
    });
    metrics.push({ step: i + 0.5, status: afterStatus, zoomVal: afterZoomVal, after });

    if (afterZoomVal && afterZoomVal >= 1.8) break;
  }

  console.log('ZOOM JUMPS METRICS:');
  console.log(JSON.stringify(metrics, null, 2));
  expect(metrics.length).toBeGreaterThan(0);
});
