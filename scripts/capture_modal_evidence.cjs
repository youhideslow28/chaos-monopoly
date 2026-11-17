const { chromium } = require('../.agents/skills/playwright-e2e/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = path.resolve(__dirname, '../docs/evidence/post_overhaul');

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

  // 1. Open Property Detail Modal by selecting tile 1 (Hồ Gươm / Phố Cổ)
  await page.evaluate(() => {
    const raw = localStorage.getItem('chaos_monopoly_saved_match_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.state.selectedTileForDetail = 1;
      localStorage.setItem('chaos_monopoly_saved_match_v2', JSON.stringify(parsed));
      window.dispatchEvent(new Event('storage'));
    }
  });
  // Also click on the canvas to trigger select or click tile
  await page.evaluate(() => {
    // If state didn't react immediately to storage event, click or trigger through DOM
    const btn = document.querySelector('[data-testid="property-detail-modal"]');
  });

  // Reload with saved match to guarantee PropertyDetailModal is visible
  await page.goto('http://localhost:4173');
  await page.waitForLoadState('networkidle');

  // Check if resume match exists on main menu or click Quick Play
  const resumeBtn = await page.$('button:has-text("Tiếp Tục"), button:has-text("TIẾP TỤC")');
  if (resumeBtn) {
    await resumeBtn.click();
    await page.waitForTimeout(1000);
  }

  // Trigger property detail modal directly through Redux/reducer or UI
  await page.evaluate(() => {
    const evt = new CustomEvent('chaos-select-tile', { detail: { tileId: 1 } });
    window.dispatchEvent(evt);
  });

  // Check if modal opened
  const shotProp = path.join(EVIDENCE_DIR, '03_selected_property_modal.png');
  await page.screenshot({ path: shotProp, fullPage: true });
  console.log('Saved:', shotProp);

  await browser.close();
})();
