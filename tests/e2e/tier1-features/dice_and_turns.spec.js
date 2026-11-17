import { describe, it, expect } from '../helpers/framework.js';
import {
  openMainMenu,
  startQuickPlay,
  findRollDiceButton,
  findEndTurnButton,
  getActivePlayerInfo,
  getRoundNumber,
  dismissChaosModalIfPresent,
  waitForTurnActionPhase,
} from '../helpers/gameActions.js';

describe('Tier 1: Dice Rolling, Doubles & Turn Progression', () => {
  it('should launch game from Main Menu and render board and player HUD', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Verify 3D board canvas stage and canvas mount
    const boardStage = page.locator('[data-testid="board-camera-stage"]');
    await expect(await boardStage.count()).toBeGreaterThanOrEqual(1);

    const canvas = page.locator('[data-testid="three-board-canvas"]');
    await expect(await canvas.count()).toBeGreaterThanOrEqual(1);

    // Verify player leaderboard strip
    const playerStrip = page.locator('[data-testid="players-strip"]');
    await expect(await playerStrip.count()).toBe(1);

    assertNoErrors();
  });

  it('should display Roll Dice action button for active human player', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
    const isVisible = await rollBtn.isVisible();
    expect(isVisible).toBe(true);

    const text = await rollBtn.innerText();
    expect(text.length).toBeGreaterThan(0);

    assertNoErrors();
  });

  it('should roll dice and transition from WAITING_FOR_ROLL to ACTION_MENU', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
    await rollBtn.click();

    // Wait for roll, hop animation and any chaos event to conclude
    const { endTurnBtn } = await waitForTurnActionPhase(page);
    await endTurnBtn.waitFor({ state: 'visible', timeout: 15000 });
    expect(await endTurnBtn.isVisible()).toBe(true);

    assertNoErrors();
  });

  it('should correctly indicate active player chip on leaderboard', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const activeInfo = await getActivePlayerInfo(page);
    expect(activeInfo).toBeDefined();
    expect(activeInfo.testId).toMatch(/^leaderboard-player-/);

    // The active chip should have distinct highlighted border and current turn text
    const chip = page.locator(`[data-testid="${activeInfo.testId}"]`);
    const classes = await chip.getAttribute('class');
    expect(classes).toContain('border-slate-900');

    assertNoErrors();
  });

  it('should progress turn to next player upon clicking End Turn', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const initialActive = await getActivePlayerInfo(page);
    expect(initialActive).toBeDefined();

    // Roll dice
    const rollBtn = await findRollDiceButton(page);
    await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
    await rollBtn.click();

    // Wait for end turn button
    const { endTurnBtn } = await waitForTurnActionPhase(page);
    await endTurnBtn.waitFor({ state: 'visible', timeout: 15000 });
    await endTurnBtn.click();

    // Turn should progress to AI or next player within a reasonable delay
    await page.waitForTimeout(1000);

    const nextActive = await getActivePlayerInfo(page);
    expect(nextActive).toBeDefined();

    assertNoErrors();
  });

  it('should track and display round indicator throughout turn execution', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    const roundNum = await getRoundNumber(page);
    expect(roundNum).toBeGreaterThanOrEqual(1);

    const roundIndicator = page.locator('[data-testid="round-indicator"]');
    expect(await roundIndicator.isVisible()).toBe(true);
    const roundText = await roundIndicator.innerText();
    expect(roundText).toMatch(/(Vòng|Round)/i);

    assertNoErrors();
  });
});
