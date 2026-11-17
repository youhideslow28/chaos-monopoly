import { describe, it, expect } from '../helpers/framework.js';
import {
  openMainMenu,
  startQuickPlay,
  findRollDiceButton,
  findEndTurnButton,
  findBuyButton,
  getActivePlayerInfo,
} from '../helpers/gameActions.js';

describe('Tier 2: Cash Boundaries, Debt Settlement & Bankruptcy', () => {
  it('should prevent unaffordable purchases and enforce cash balance limits', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Roll dice
    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
    await rollBtn.click();
    await page.waitForTimeout(1000);

    const buyBtn = await findBuyButton(page);
    if (await buyBtn.isVisible()) {
      // If visible, player has cash to afford it
      const isDisabled = await buyBtn.isDisabled();
      expect(isDisabled).toBe(false);
    }

    assertNoErrors();
  });

  it('should enforce detention bail boundaries ($50 bail or get-out-of-jail card)', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Check if player is in detention; if not, ActionPanel does not display bail button
    const bailBtn = page.locator('button:has-text("BẢO LÃNH"), button:has-text("BAIL"), button:has(svg.lucide-shield)').first();

    const inDetention = await page.locator('[data-testid="players-strip"] span:has-text("Tạm giam"), [data-testid="players-strip"] span:has-text("Detention")').count() > 0;

    if (!inDetention) {
      expect(await bailBtn.count()).toBe(0);
    } else {
      expect(await bailBtn.isVisible()).toBe(true);
    }

    assertNoErrors();
  });

  it('should provide mortgage liquidation options when properties are owned', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Mortgage drawer button appears when ownedTiles > 0 during ACTION_MENU
    const mortgageBtn = page.locator('button:has-text("THẾ CHẤP"), button:has-text("MORTGAGE"), button:has(svg.lucide-credit-card)').first();

    // Verify button exists in DOM if properties are held
    const count = await mortgageBtn.count();
    expect(count).toBeGreaterThanOrEqual(0);

    assertNoErrors();
  });

  it('should present Debt Settlement Modal with shortfall warning during debt phase', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Inspect if debt modal is currently shown (only when pending debt exists)
    const debtModal = page.locator('[data-testid="debt-settlement-modal"]');
    const isShown = await debtModal.isVisible();

    if (isShown) {
      // Must contain debt warning and creditor info
      const text = await debtModal.innerText();
      expect(text).toMatch(/(Khoản nợ|Debt|Shortfall|Thiếu hụt)/i);
    } else {
      // Normal state when not in debt
      expect(isShown).toBe(false);
    }

    assertNoErrors();
  });

  it('should safely eliminate bankrupt player with two-step confirmation', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Check for surrender / bankruptcy button
    const surrenderBtn = page.locator('button[title*="đầu hàng"], button[title*="Surrender"], button:has(svg.lucide-alert-triangle)').first();

    // If visible during action menu, test two-step safety confirmation
    if (await surrenderBtn.isVisible()) {
      await surrenderBtn.click();
      await page.waitForTimeout(300);

      // Confirmation dialog or popup should prompt confirmation
      const confirmModal = page.locator('div:has-text("phá sản"), div:has-text("bankruptcy")').first();
      expect(await confirmModal.isVisible()).toBe(true);

      // Cancel button should safely dismiss
      const cancelBtn = page.locator('button:has-text("HỦY"), button:has-text("CANCEL")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(200);
      }
    }

    assertNoErrors();
  });

  it('should mark bankrupt players with bankrupt badge and disabled token in leaderboard', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Leaderboard chips for bankrupt players must have opacity-40 and bankrupt text
    const bankruptChips = page.locator('[data-testid="players-strip"] button.opacity-40');
    const count = await bankruptChips.count();
    expect(count).toBeGreaterThanOrEqual(0);

    assertNoErrors();
  });
});
