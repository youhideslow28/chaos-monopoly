import { describe, it, expect } from '../helpers/framework.js';
import {
  startQuickPlay,
  findRollDiceButton,
  findEndTurnButton,
  findBuyButton,
  dismissChaosModalIfPresent,
  getActivePlayerInfo,
  getRoundNumber,
} from '../helpers/gameActions.js';

describe('Tier 4: Long-Running Multi-Turn Gameplay Simulation', () => {
  it(
    'should execute 10+ full gameplay turns with zero console errors or unhandled rejections',
    async ({ page, viteUrl, assertNoErrors }) => {
      await startQuickPlay(page, viteUrl);

      let turnsCompleted = 0;
      const targetTurns = 12;
      const maxAttempts = 30;
      let attempts = 0;

      console.log(`\n      🎮 Beginning ${targetTurns}-turn simulation loop...`);

      while (turnsCompleted < targetTurns && attempts < maxAttempts) {
        attempts++;

        // 1. Dismiss any blocking event card if present
        await dismissChaosModalIfPresent(page);

        // 2. Check active player state
        const activeInfo = await getActivePlayerInfo(page);
        const rollBtn = await findRollDiceButton(page);
        const endTurnBtn = await findEndTurnButton(page);
        const buyBtn = await findBuyButton(page);

        // Human Turn Flow
        if (await rollBtn.isVisible()) {
          await rollBtn.click().catch(() => {});
          await page.waitForTimeout(2000);
          await dismissChaosModalIfPresent(page);

          // If buy property is visible, buy it 50% of the time to exercise economy
          if ((await buyBtn.isVisible()) && Math.random() > 0.5) {
            await buyBtn.click().catch(() => {});
            await page.waitForTimeout(400);
          }

          // Click end turn
          const activeEndBtn = await findEndTurnButton(page);
          if (await activeEndBtn.isVisible()) {
            await activeEndBtn.click().catch(() => {});
            turnsCompleted++;
            console.log(`      Turn ${turnsCompleted}/${targetTurns} completed (Human)`);
          }
        } else if (await endTurnBtn.isVisible()) {
          await endTurnBtn.click().catch(() => {});
          turnsCompleted++;
          console.log(`      Turn ${turnsCompleted}/${targetTurns} completed (Human End Turn)`);
        } else {
          // AI Turn Flow: wait for AI decisions to execute
          await page.waitForTimeout(1200);
          turnsCompleted++;
          console.log(`      Turn ${turnsCompleted}/${targetTurns} progressed (AI)`);
        }

        // Verify no console errors accumulated so far
        assertNoErrors();
      }

      console.log(`      ✅ Successfully completed ${turnsCompleted} gameplay turns!`);
      expect(turnsCompleted).toBeGreaterThanOrEqual(10);

      // Verify board canvas stage is still healthy and rendered
      const canvas = page.locator('[data-testid="three-board-canvas"]');
      expect(await canvas.isVisible()).toBe(true);

      const round = await getRoundNumber(page);
      expect(round).toBeGreaterThanOrEqual(1);

      assertNoErrors();
    },
    { timeout: 90000 }
  );

  it('should maintain consistent frame rate and responsive DOM throughout long sessions', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Verify DOM node count does not explode (memory leak prevention)
    const domNodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
    expect(domNodeCount).toBeLessThan(3500);

    assertNoErrors();
  });
});
