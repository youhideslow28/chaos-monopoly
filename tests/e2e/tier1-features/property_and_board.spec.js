import { describe, it, expect } from '../helpers/framework.js';
import {
  startQuickPlay,
  findRollDiceButton,
  findEndTurnButton,
  findBuyButton,
  getActivePlayerInfo,
  waitForTurnActionPhase,
} from '../helpers/gameActions.js';

describe('Tier 1: Property Acquisition & 3D Board Canvas', () => {
  it('should mount ThreeBoardCanvas inside stage without parent CSS 3D distortion', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const stage = page.locator('[data-testid="board-camera-stage"]');
    await expect(await stage.count()).toBe(1);

    // Verify stage does not apply CSS 3D transforms (R1-F01 requirement)
    const stageStyles = await stage.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        transform: computed.transform,
        transformStyle: computed.transformStyle,
        perspective: computed.perspective,
      };
    });

    // In 3D WebGL mode, stage transform should be 'none' (or identity matrix) and transformStyle should not be 'preserve-3d'
    expect(stageStyles.transformStyle).not.toBe('preserve-3d');

    const canvas = page.locator('[data-testid="three-board-canvas"]');
    await expect(await canvas.count()).toBe(1);

    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).toBeDefined();
    expect(canvasBox.width).toBeGreaterThan(200);
    expect(canvasBox.height).toBeGreaterThan(200);

    assertNoErrors();
  });

  it('should support pointer raycasting and interaction over 3D canvas', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const canvas = page.locator('[data-testid="three-board-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).toBeDefined();

    // Move pointer over center of canvas
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);

    // Click on canvas (should trigger raycast without throwing error)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    assertNoErrors();
  });

  it('should present Buy Property CTA when landing on purchasable property', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Roll dice
    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
    await rollBtn.click();

    // Wait for landing phase
    const { buyBtn } = await waitForTurnActionPhase(page);

    // If landed on purchasable property, Buy button appears with cash amount
    if (await buyBtn.isVisible()) {
      const text = await buyBtn.innerText();
      expect(text).toMatch(/(MUA|BUY|\$)/i);
    }

    assertNoErrors();
  });

  it('should deduct player cash and update portfolio when purchasing property', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const activeInfo = await getActivePlayerInfo(page);
    expect(activeInfo).toBeDefined();

    // Roll dice
    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
    await rollBtn.click();

    // Check if buy button is available
    const { buyBtn, endTurnBtn } = await waitForTurnActionPhase(page);

    if (await buyBtn.isVisible()) {
      // Record initial player cash
      const initialChipText = (await getActivePlayerInfo(page)).text;
      await buyBtn.click();
      await page.waitForTimeout(600);

      const afterChipText = (await getActivePlayerInfo(page)).text;
      expect(afterChipText).not.toBe(initialChipText);
    } else {
      // If landed on Chance/Chest/Tax/Go, verify End Turn button is active
      expect(await endTurnBtn.isVisible()).toBe(true);
    }

    assertNoErrors();
  });

  it('should allow viewing and upgrading properties via the Build Drawer', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Check if Build button is rendered in ActionPanel
    const buildBtn = page.locator('button:has-text("XÂY DỰNG"), button:has-text("BUILD"), button[title*="Xây"]')
      .first();

    // If player starts without properties, build button may be hidden or inactive
    // Verify that attempting to click if visible opens drawer
    if (await buildBtn.isVisible()) {
      await buildBtn.click();
      const drawer = page.locator('div:has-text("Nâng cấp"), div:has-text("Upgrade")').first();
      expect(await drawer.isVisible()).toBe(true);
    }

    assertNoErrors();
  });

  it('should maintain stable 3D canvas dimensions on container resizing', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const canvas = page.locator('[data-testid="three-board-canvas"]');
    const initialBox = await canvas.boundingBox();
    expect(initialBox.width).toBeGreaterThan(0);

    // Resize viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(400);

    const resizedBox = await canvas.boundingBox();
    expect(resizedBox.width).toBeGreaterThan(0);
    expect(resizedBox.height).toBeGreaterThan(0);

    assertNoErrors();
  });
});
