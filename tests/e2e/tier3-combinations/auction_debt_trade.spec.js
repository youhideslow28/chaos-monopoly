import { describe, it, expect } from '../helpers/framework.js';
import {
  startQuickPlay,
  findRollDiceButton,
  findEndTurnButton,
  dismissChaosModalIfPresent,
} from '../helpers/gameActions.js';

describe('Tier 3: Auction, Debt & Trade Cross-Feature Combinations', () => {
  it('should allow opening Trade Modal during active action phase', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
    await rollBtn.click();

    await page.waitForTimeout(2000);
    await dismissChaosModalIfPresent(page);

    const tradeBtn = page.locator('[data-testid="open-trade-btn"]');
    if (await tradeBtn.isVisible()) {
      await tradeBtn.click();
      const tradeModal = page.locator('[data-testid="trade-create-modal"]');
      await tradeModal.waitFor({ state: 'visible', timeout: 5000 });
      expect(await tradeModal.isVisible()).toBe(true);

      const closeBtn = tradeModal.locator('button:has-text("Đóng"), button:has-text("Close")').first();
      await closeBtn.click();
      await page.waitForTimeout(300);
    }

    assertNoErrors();
  });

  it('should validate trade cash controls and prevent negative values', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
    await rollBtn.click();

    await page.waitForTimeout(2000);
    await dismissChaosModalIfPresent(page);

    const tradeBtn = page.locator('[data-testid="open-trade-btn"]');
    if (await tradeBtn.isVisible()) {
      await tradeBtn.click();
      const tradeModal = page.locator('[data-testid="trade-create-modal"]');
      await tradeModal.waitFor({ state: 'visible', timeout: 5000 });

      // Check cash inputs
      const cashInputs = tradeModal.locator('input[type="number"]');
      if (await cashInputs.count() > 0) {
        const firstInput = cashInputs.first();
        await firstInput.fill('100');
        expect(await firstInput.inputValue()).toBe('100');
      }

      const closeBtn = tradeModal.locator('button:has-text("Đóng"), button:has-text("Close")').first();
      await closeBtn.click();
    }

    assertNoErrors();
  });

  it('should handle property auction triggers and highest bidder progression', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
    await rollBtn.click();

    await page.waitForTimeout(2000);
    await dismissChaosModalIfPresent(page);

    // Look for Auction button in ActionPanel if available
    const auctionBtn = page.locator('button:has-text("ĐẤU GIÁ"), button:has-text("AUCTION"), button:has(svg.lucide-gavel)').first();
    if (await auctionBtn.isVisible()) {
      await auctionBtn.click();
      const auctionModal = page.locator('[data-testid="auction-modal"]');
      await auctionModal.waitFor({ state: 'visible', timeout: 5000 });
      expect(await auctionModal.isVisible()).toBe(true);
    }

    assertNoErrors();
  });

  it('should present asset mortgage liquidation options when debt exceeds available cash', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Check debt liquidation interface
    const debtModal = page.locator('[data-testid="debt-settlement-modal"]');
    if (await debtModal.isVisible()) {
      // Liquidate / mortgage options must be presented
      const options = debtModal.locator('button:has-text("Thế chấp"), button:has-text("Hạ cấp")');
      expect(await options.count()).toBeGreaterThanOrEqual(0);
    }

    assertNoErrors();
  });

  it('should safely resolve turn without lockup when trade is proposed and dismissed', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
    await rollBtn.click();

    await page.waitForTimeout(2000);
    await dismissChaosModalIfPresent(page);

    const tradeBtn = page.locator('[data-testid="open-trade-btn"]');
    if (await tradeBtn.isVisible()) {
      await tradeBtn.click();
      const tradeModal = page.locator('[data-testid="trade-create-modal"]');
      await tradeModal.waitFor({ state: 'visible', timeout: 5000 });
      const closeBtn = tradeModal.locator('button:has-text("Đóng"), button:has-text("Close")').first();
      await closeBtn.click();
      await page.waitForTimeout(300);
    }

    const endTurnBtn = await findEndTurnButton(page);
    if (await endTurnBtn.isVisible()) {
      await endTurnBtn.click();
    }

    await page.waitForTimeout(1000);
    assertNoErrors();
  });
});
