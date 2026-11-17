const { chromium } = require('../.agents/skills/playwright-e2e/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4173');
  await page.waitForLoadState('networkidle');

  const quickPlay = await page.waitForSelector('button:has-text("Chơi Nhanh")');
  await quickPlay.click();
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const canvas = document.querySelector('canvas[data-testid="three-board-canvas"]');
    const rect = canvas ? canvas.getBoundingClientRect() : null;
    return {
      clientWidth: canvas ? canvas.clientWidth : null,
      clientHeight: canvas ? canvas.clientHeight : null,
      width: canvas ? canvas.width : null,
      height: canvas ? canvas.height : null,
      rect,
    };
  });
  console.log('Canvas layout info:', info);

  // Now let's test raycasting by trying clicks across different points on the canvas
  const canvas = page.locator('canvas[data-testid="three-board-canvas"]');
  const box = await canvas.boundingBox();
  console.log('Canvas boundingBox:', box);

  // Let's test dispatching clicks at points across the canvas
  for (let fx of [0.5, 0.25, 0.75, 0.15, 0.85]) {
    for (let fy of [0.5, 0.25, 0.75, 0.15, 0.85]) {
      await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(200);
      const modal = await page.$('[data-testid="property-detail-modal"]');
      if (modal) {
        const title = await modal.$eval('h2', (el) => el.textContent);
        console.log(`Hit tile at fx=${fx}, fy=${fy}! Modal title: ${title}`);
        await page.click('[data-testid="property-detail-modal"] button');
        await page.waitForTimeout(200);
        break;
      }
    }
  }

  await browser.close();
})();
