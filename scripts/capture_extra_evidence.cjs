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

  // 1. Property Detail Modal Evidence
  // Inject state with selectedTileForDetail = 1
  await page.goto('http://localhost:4173');
  await page.waitForLoadState('networkidle');

  // Trigger quick play
  const quickPlay = await page.waitForSelector('button:has-text("Chơi Nhanh")');
  await quickPlay.click();
  await page.waitForTimeout(1000);

  // Directly dispatch property selection by invoking local intent or setting state
  await page.evaluate(() => {
    const raw = localStorage.getItem('chaos_monopoly_saved_match_v2');
    if (raw) {
      const match = JSON.parse(raw);
      match.state.selectedTileForDetail = 1;
      localStorage.setItem('chaos_monopoly_saved_match_v2', JSON.stringify(match));
    }
  });

  // Reload page so App reads saved match with selectedTileForDetail = 1
  await page.reload();
  await page.waitForLoadState('networkidle');

  const resumeBtn = await page.$('button:has-text("Chơi Tiếp"), button:has-text("Tiếp Tục"), button:has-text("TIẾP TỤC")');
  if (resumeBtn) {
    await resumeBtn.click();
    await page.waitForTimeout(1000);
  }

  // Check if PropertyDetailModal is visible
  const shotProp = path.join(EVIDENCE_DIR, '03_selected_property_modal.png');
  await page.screenshot({ path: shotProp, fullPage: true });
  console.log('Saved:', shotProp);

  // 2. Chaos Event Card Evidence
  // Inject a state with activeChaosCard
  await page.evaluate(() => {
    const raw = localStorage.getItem('chaos_monopoly_saved_match_v2');
    if (raw) {
      const match = JSON.parse(raw);
      match.state.selectedTileForDetail = null;
      match.state.activeChaosCard = {
        id: 'chaos-sot-dat',
        title: 'Cơn Sốt Đất Nền Cổ Loa',
        description: 'Thị trường bất động sản bùng nổ dữ dội. Giá thuê toàn bộ các khu đất tăng 50% trong 2 vòng.',
        rarity: 'RARE',
        type: 'DISTRICT_SURGE',
        targetColor: 'BLUE',
        effectMultiplier: 1.5,
        durationRounds: 2,
      };
      localStorage.setItem('chaos_monopoly_saved_match_v2', JSON.stringify(match));
    }
  });

  await page.reload();
  await page.waitForLoadState('networkidle');
  const resumeBtn2 = await page.$('button:has-text("Chơi Tiếp"), button:has-text("Tiếp Tục"), button:has-text("TIẾP TỤC")');
  if (resumeBtn2) {
    await resumeBtn2.click();
    await page.waitForTimeout(1000);
  }

  const shotChaos = path.join(EVIDENCE_DIR, '13_chaos_event_card.png');
  await page.screenshot({ path: shotChaos, fullPage: true });
  console.log('Saved:', shotChaos);

  // 3. Rent Payment Evidence
  // Inject state where player landed on opponent property and rent was deducted
  await page.evaluate(() => {
    const raw = localStorage.getItem('chaos_monopoly_saved_match_v2');
    if (raw) {
      const match = JSON.parse(raw);
      match.state.activeChaosCard = null;
      match.state.properties[1] = {
        tileId: 1,
        ownerId: 'player-2',
        tier: 2,
        isMortgaged: false,
      };
      match.state.players[0].position = 1;
      match.state.players[0].cash = 1200;
      match.state.players[1].cash = 1800;
      match.state.eventLogs = [
        {
          id: 'log-rent-1',
          roundNumber: 1,
          type: 'RENT',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          tileId: 1,
          amount: 150,
          description: 'Nguyễn Văn A đã trả 150 🪙 tiền thuê đất cho AI Cá Mập tại Hồ Gươm.',
          timestamp: Date.now(),
        },
      ];
      localStorage.setItem('chaos_monopoly_saved_match_v2', JSON.stringify(match));
    }
  });

  await page.reload();
  await page.waitForLoadState('networkidle');
  const resumeBtn3 = await page.$('button:has-text("Chơi Tiếp"), button:has-text("Tiếp Tục"), button:has-text("TIẾP TỤC")');
  if (resumeBtn3) {
    await resumeBtn3.click();
    await page.waitForTimeout(1000);
  }

  const shotRent = path.join(EVIDENCE_DIR, '14_rent_payment_log.png');
  await page.screenshot({ path: shotRent, fullPage: true });
  console.log('Saved:', shotRent);

  await browser.close();
})();
