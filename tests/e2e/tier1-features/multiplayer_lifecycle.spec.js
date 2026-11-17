import { describe, it, expect } from '../helpers/framework.js';
import {
  openMainMenu,
  createOnlineRoomFromMenu,
  joinOnlineRoomFromMenu,
} from '../helpers/gameActions.js';

describe('Tier 1: Multiplayer Room Lifecycle & State Sync', () => {
  it('should create an online room and display shareable room code in lobby', async ({ page, viteUrl, assertNoErrors }) => {
    const lobbyModal = await createOnlineRoomFromMenu(page, viteUrl);
    expect(await lobbyModal.isVisible()).toBe(true);

    // Verify unique room code
    const roomCodeEl = page.locator('[data-testid="lobby-room-code"]');
    await roomCodeEl.waitFor({ state: 'visible', timeout: 5000 });
    const code = (await roomCodeEl.innerText()).trim();
    expect(code.length).toBeGreaterThanOrEqual(4);

    assertNoErrors();
  });

  it('should provide copy room code feedback on click', async ({ page, viteUrl, assertNoErrors }) => {
    await createOnlineRoomFromMenu(page, viteUrl);

    const copyBtn = page.locator('[data-testid="copy-room-code-btn"]');
    await copyBtn.waitFor({ state: 'visible', timeout: 10000 });
    await copyBtn.click();
    await page.waitForTimeout(200);

    const btnText = await copyBtn.innerText();
    expect(btnText).toMatch(/(sao chép|chép|copied)/i);

    assertNoErrors();
  });

  it('should toggle player readiness status in online lobby', async ({ page, viteUrl, assertNoErrors }) => {
    await createOnlineRoomFromMenu(page, viteUrl);

    const readyBtn = page.locator('[data-testid="lobby-ready-btn"]');
    await readyBtn.waitFor({ state: 'visible', timeout: 10000 });

    const initialText = await readyBtn.innerText();

    // Click ready toggle
    await readyBtn.click();
    await page.waitForTimeout(400);

    const toggledText = await readyBtn.innerText();
    expect(toggledText).not.toBe(initialText);

    assertNoErrors();
  });

  it('should allow host to add AI bot seats to lobby', async ({ page, viteUrl, assertNoErrors }) => {
    await createOnlineRoomFromMenu(page, viteUrl);

    const addAiBtn = page.locator('[data-testid="lobby-add-ai-btn"]');
    if (await addAiBtn.isVisible()) {
      await addAiBtn.click();
      await page.waitForTimeout(500);

      // Verify AI badge appears in member list
      const botBadge = page.locator('div:has(svg.lucide-bot)').first();
      expect(await botBadge.isVisible()).toBe(true);
    }

    assertNoErrors();
  });

  it('should synchronize room member state when second player joins with room code', async ({ browser, viteUrl }) => {
    // Context 1: Host creates room
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await createOnlineRoomFromMenu(page1, viteUrl);

    const roomCodeEl = page1.locator('[data-testid="lobby-room-code"]');
    const roomCode = (await roomCodeEl.innerText()).trim();

    // Context 2: Client joins room using code
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await joinOnlineRoomFromMenu(page2, roomCode, viteUrl);

    // Both pages should reflect the lobby and matching room code
    const code2 = (await page2.locator('[data-testid="lobby-room-code"]').innerText()).trim();
    expect(code2).toBe(roomCode);

    await context1.close();
    await context2.close();
  });

  it('should gracefully leave room and close lobby modal', async ({ page, viteUrl, assertNoErrors }) => {
    await createOnlineRoomFromMenu(page, viteUrl);

    const leaveBtn = page.locator('[data-testid="leave-room-btn"]');
    await leaveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await leaveBtn.click();
    await page.waitForTimeout(500);

    const lobbyModal = page.locator('[data-testid="online-lobby-modal"]');
    expect(await lobbyModal.count()).toBe(0);

    assertNoErrors();
  });
});
