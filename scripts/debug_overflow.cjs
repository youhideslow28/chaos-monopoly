const { chromium } = require('../.agents/skills/playwright-e2e/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('http://localhost:4173');
  await page.waitForLoadState('networkidle');
  const quickPlay = await page.waitForSelector('button:has-text("Chơi Nhanh")');
  await quickPlay.click();
  await page.waitForTimeout(1000);

  const offenders = await page.evaluate(() => {
    const docW = window.innerWidth;
    const list = [];
    document.querySelectorAll('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docW + 2 || el.scrollWidth > docW + 2) {
        list.push({
          tag: el.tagName,
          id: el.id,
          class: el.className && typeof el.className === 'string' ? el.className.slice(0, 80) : '',
          right: Math.round(rect.right),
          scrollWidth: el.scrollWidth,
        });
      }
    });
    return list;
  });

  console.log(`Found ${offenders.length} overflowing elements on 375px viewport:`);
  console.log(offenders.slice(0, 15));
  await browser.close();
})();
