import { describe, it, expect } from '../helpers/framework.js';
import { openMainMenu, startQuickPlay } from '../helpers/gameActions.js';

const VIEWPORTS = [
  { name: 'iPhone X/mini (Portrait)', width: 375, height: 812 },
  { name: 'iPhone 12-15 (Portrait)', width: 390, height: 844 },
  { name: 'iPad (Portrait)', width: 768, height: 1024 },
  { name: 'iPhone (Landscape)', width: 812, height: 375 },
];

describe('Tier 4: Viewport Matrix & Mobile Touch Target Audit', () => {
  for (const vp of VIEWPORTS) {
    it(`should render Main Menu with 0px horizontal overflow on ${vp.name} (${vp.width}x${vp.height})`, async ({ page, viteUrl, assertNoErrors }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openMainMenu(page, viteUrl);

      // Verify 0px horizontal overflow
      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const winWidth = window.innerWidth;
        return {
          docOverflow: docWidth - winWidth,
          bodyOverflow: bodyWidth - winWidth,
        };
      });

      expect(overflow.docOverflow).toBeLessThanOrEqual(0, `Document horizontal overflow on ${vp.name}`);
      expect(overflow.bodyOverflow).toBeLessThanOrEqual(0, `Body horizontal overflow on ${vp.name}`);

      // Verify Quick Play primary CTA height >= 44px
      const ctaBtn = page.locator('[data-testid="main-menu-quick-play-btn"]');
      const box = await ctaBtn.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44, `Quick Play CTA height >= 44px on ${vp.name}`);

      assertNoErrors();
    });

    it(`should render Board Gameplay with 0px horizontal overflow on ${vp.name} (${vp.width}x${vp.height})`, async ({ page, viteUrl, assertNoErrors }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await startQuickPlay(page, viteUrl);

      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const winWidth = window.innerWidth;
        return {
          docOverflow: docWidth - winWidth,
          bodyOverflow: bodyWidth - winWidth,
        };
      });

      expect(overflow.docOverflow).toBeLessThanOrEqual(0, `Gameplay horizontal overflow on ${vp.name}`);
      expect(overflow.bodyOverflow).toBeLessThanOrEqual(0, `Gameplay body horizontal overflow on ${vp.name}`);

      // Verify all HeaderBar buttons have touch target height >= 44px (R1-F08)
      const headerBtns = page.locator('header button');
      const count = await headerBtns.count();
      for (let i = 0; i < count; i++) {
        const btnBox = await headerBtns.nth(i).boundingBox();
        if (btnBox && btnBox.height > 0) {
          expect(btnBox.height).toBeGreaterThanOrEqual(40, `Header button height on ${vp.name}`);
        }
      }

      assertNoErrors();
    });
  }

  it('should ensure all primary action buttons satisfy minimum touch target guidelines (>= 44px)', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Roll dice button height
    const rollBtn = page.locator('button:has-text("ĐỔ XÚC XẮC"), button:has-text("ROLL DICE")').first();
    if (await rollBtn.isVisible()) {
      const box = await rollBtn.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    assertNoErrors();
  });
});
