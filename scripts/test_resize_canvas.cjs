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

  let box = await page.evaluate(() => {
    const c = document.querySelector('canvas[data-testid="three-board-canvas"]');
    return c ? { clientWidth: c.clientWidth, clientHeight: c.clientHeight, rect: c.getBoundingClientRect() } : null;
  });
  console.log('1440x900 canvas box:', box);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);

  box = await page.evaluate(() => {
    const c = document.querySelector('canvas[data-testid="three-board-canvas"]');
    return c ? { clientWidth: c.clientWidth, clientHeight: c.clientHeight, rect: c.getBoundingClientRect() } : null;
  });
  console.log('375x812 canvas box:', box);

  await browser.close();
})();
