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

  // Roll
  const rollBtn = await page.waitForSelector('button:has-text("LẮC XÚC XẮC")');
  await rollBtn.click();
  await page.waitForTimeout(2500);

  // Buy if available
  const buyBtn = await page.$('button:has-text("MUA")');
  if (buyBtn) {
    await buyBtn.click();
    await page.waitForTimeout(1000);
  }

  // Check what's in DOM now
  const domInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas[data-testid="three-board-canvas"]');
    const allCanvases = Array.from(document.querySelectorAll('canvas')).map((c) => ({
      testId: c.getAttribute('data-testid'),
      w: c.width,
      h: c.height,
      cw: c.clientWidth,
      ch: c.clientHeight,
    }));
    const modals = Array.from(document.querySelectorAll('[data-testid*="modal"]')).map((m) => m.getAttribute('data-testid'));
    const saved = localStorage.getItem('chaos_monopoly_saved_match_v2');
    const parsed = saved ? JSON.parse(saved) : null;

    return {
      canvasFound: !!canvas,
      allCanvases,
      modals,
      activePlayer: parsed?.state?.players[parsed?.state?.activePlayerIndex]?.name,
      turnPhase: parsed?.state?.turnPhase,
      status: parsed?.state?.status,
    };
  });

  console.log('Post-buy DOM Info:', domInfo);
  await browser.close();
})();
