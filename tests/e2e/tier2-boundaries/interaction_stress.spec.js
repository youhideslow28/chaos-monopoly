import { describe, it, expect } from '../helpers/framework.js';
import {
  openMainMenu,
  startQuickPlay,
  findRollDiceButton,
  findEndTurnButton,
  dismissChaosModalIfPresent,
} from '../helpers/gameActions.js';

describe('Tier 2: Interaction Stress & Rapid Action Verification', () => {
  it('should handle rapid roll dice button clicks without race conditions', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });

    // Spam click 8 times in quick succession
    for (let i = 0; i < 8; i++) {
      try {
        if (await rollBtn.isVisible()) {
          await rollBtn.click().catch(() => {});
        }
      } catch {
        // Ignored
      }
    }

    // Wait for roll animation to conclude
    await page.waitForTimeout(2000);
    await dismissChaosModalIfPresent(page);

    const endTurnBtn = await findEndTurnButton(page);
    expect(await endTurnBtn.isVisible()).toBe(true);

    assertNoErrors();
  });

  it('should handle rapid modal opening and closing without orphaned backdrops', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const rulesBtn = page.locator('header button[aria-label*="Luật"], header button[aria-label*="Rules"]').first();

    for (let i = 0; i < 5; i++) {
      await rulesBtn.click();
      const rulesModal = page.locator('[data-testid="rules-modal"]');
      await rulesModal.waitFor({ state: 'visible', timeout: 3000 });

      const closeBtn = rulesModal.locator('button:has(svg.lucide-x)').first();
      await closeBtn.click();
      await page.waitForTimeout(150);
    }

    // No modal should remain visible
    const remainingModals = page.locator('[data-testid="rules-modal"]');
    expect(await remainingModals.count()).toBe(0);

    assertNoErrors();
  });

  it('should handle rapid language switcher toggles in MainMenu without crashes', async ({ page, viteUrl, assertNoErrors }) => {
    await openMainMenu(page, viteUrl);

    const langBtn = page.locator('[data-testid="main-menu-lang-btn"]');
    await langBtn.waitFor({ state: 'visible', timeout: 8000 });

    for (let i = 0; i < 6; i++) {
      await langBtn.click();
      await page.waitForTimeout(80);
    }

    // MainMenu should still be fully functional and mounted
    const mainMenu = page.locator('[data-testid="main-menu"]');
    expect(await mainMenu.isVisible()).toBe(true);

    assertNoErrors();
  });

  it('should handle rapid camera controls zoom and preset clicks without WebGL crash', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Camera preset and zoom controls in HUD
    const zoomInBtn = page.locator('button[title*="Phóng to"], button[title*="Zoom in"], button:has(svg.lucide-zoom-in)').first();
    const zoomOutBtn = page.locator('button[title*="Thu nhỏ"], button[title*="Zoom out"], button:has(svg.lucide-zoom-out)').first();

    for (let i = 0; i < 4; i++) {
      if (await zoomInBtn.isVisible()) {
        await zoomInBtn.click().catch(() => {});
      }
      if (await zoomOutBtn.isVisible()) {
        await zoomOutBtn.click().catch(() => {});
      }
    }

    const canvas = page.locator('[data-testid="three-board-canvas"]');
    expect(await canvas.isVisible()).toBe(true);

    assertNoErrors();
  });

  it('should maintain zero console errors under continuous interactive load', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Perform interactive flow: roll dice, open rules modal, close modal, click end turn
    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
    await rollBtn.click();

    await page.waitForTimeout(2000);
    await dismissChaosModalIfPresent(page);

    const rulesBtn = page.locator('header button[aria-label*="Luật"], header button[aria-label*="Rules"]').first();
    await rulesBtn.click();

    const rulesModal = page.locator('[data-testid="rules-modal"]');
    await rulesModal.waitFor({ state: 'visible', timeout: 3000 });

    const closeBtn = rulesModal.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();

    await page.waitForTimeout(400);

    const endTurnBtn = await findEndTurnButton(page);
    if (await endTurnBtn.isVisible()) {
      await endTurnBtn.click();
    }

    await page.waitForTimeout(1000);

    // Explicitly assert zero console errors and zero unhandled rejections
    assertNoErrors();
  });
});
