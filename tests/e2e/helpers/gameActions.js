/**
 * High-level Playwright automation helpers for CHAOS MONOPOLY
 */

export async function openMainMenu(page, url = 'http://localhost:3000') {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('[data-testid="main-menu"]', { timeout: 15000 });
}

export async function startQuickPlay(page, url = 'http://localhost:3000') {
  await openMainMenu(page, url);
  const quickPlayBtn = page.locator('[data-testid="main-menu-quick-play-btn"]');
  await quickPlayBtn.waitFor({ state: 'visible', timeout: 10000 });
  await quickPlayBtn.click();
  // Wait for board and game UI to mount
  await page.waitForSelector('[data-testid="board-camera-stage"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="players-strip"]', { timeout: 15000 });
}

export async function createOnlineRoomFromMenu(page, url = 'http://localhost:3000') {
  await openMainMenu(page, url);
  const createBtn = page.locator('[data-testid="main-menu-create-online-btn"]');
  await createBtn.waitFor({ state: 'visible', timeout: 10000 });
  await createBtn.click();

  const submitBtn = page.locator('button:has-text("Vào Lobby"), button:has-text("enter lobby")').first();
  await submitBtn.waitFor({ state: 'visible', timeout: 8000 });
  await submitBtn.click();

  const lobbyModal = page.locator('[data-testid="online-lobby-modal"]');
  await lobbyModal.waitFor({ state: 'visible', timeout: 15000 });
  return lobbyModal;
}

export async function joinOnlineRoomFromMenu(page, roomCode, url = 'http://localhost:3000') {
  await openMainMenu(page, url);
  const joinBtn = page.locator('[data-testid="main-menu-join-online-btn"]');
  await joinBtn.waitFor({ state: 'visible', timeout: 10000 });
  await joinBtn.click();

  const codeInput = page.locator('input[placeholder*="CHAOS"], input[placeholder*="AB12"]').first();
  await codeInput.waitFor({ state: 'visible', timeout: 8000 });
  await codeInput.fill(roomCode);

  const submitJoinBtn = page.locator('button:has-text("Tham Gia"), button:has-text("Join room"), button:has(svg.lucide-key-round)').last();
  await submitJoinBtn.waitFor({ state: 'visible', timeout: 8000 });
  await submitJoinBtn.click();

  const lobbyModal = page.locator('[data-testid="online-lobby-modal"]');
  await lobbyModal.waitFor({ state: 'visible', timeout: 15000 });
  return lobbyModal;
}

export async function dismissChaosModalIfPresent(page) {
  try {
    const continueBtn = page
      .locator('[data-testid="chaos-modal"] button, button:has-text("TIẾP TỤC"), button:has-text("CONTINUE")')
      .first();
    if (await continueBtn.count() > 0 && await continueBtn.isVisible()) {
      await continueBtn.click({ force: true });
      await page.waitForTimeout(400);
    }
  } catch {
    // Ignore
  }
}

export async function waitForTurnActionPhase(page, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await dismissChaosModalIfPresent(page);

    const endTurnBtn = page
      .locator(
        'button:has(svg.lucide-check-circle), button:has-text("KẾT THÚC LƯỢT"), button:has-text("END TURN"), button:has-text("LẮC TIẾP"), button:has-text("ROLL AGAIN")'
      )
      .first();
    const buyBtn = page
      .locator(
        'button:has-text("MUA ĐẤT"), button:has-text("MUA Ô ĐẤT"), button:has-text("BUY TILE"), button:has-text("BUY PROPERTY"), button:has(svg.lucide-shopping-cart)'
      )
      .first();

    if (
      (await endTurnBtn.count() > 0 && await endTurnBtn.isVisible()) ||
      (await buyBtn.count() > 0 && await buyBtn.isVisible())
    ) {
      return { endTurnBtn, buyBtn };
    }

    await page.waitForTimeout(300);
  }

  await dismissChaosModalIfPresent(page);
  return {
    endTurnBtn: page
      .locator(
        'button:has(svg.lucide-check-circle), button:has-text("KẾT THÚC LƯỢT"), button:has-text("END TURN"), button:has-text("LẮC TIẾP"), button:has-text("ROLL AGAIN")'
      )
      .first(),
    buyBtn: page
      .locator(
        'button:has-text("MUA ĐẤT"), button:has-text("MUA Ô ĐẤT"), button:has-text("BUY TILE"), button:has-text("BUY PROPERTY"), button:has(svg.lucide-shopping-cart)'
      )
      .first(),
  };
}

export async function findRollDiceButton(page) {
  await dismissChaosModalIfPresent(page);
  return page.locator('button:has(svg.lucide-dices), button:has-text("ĐỔ XÚC XẮC"), button:has-text("ROLL DICE")').first();
}

export async function findEndTurnButton(page) {
  await dismissChaosModalIfPresent(page);
  return page.locator('button:has(svg.lucide-check-circle), button:has-text("KẾT THÚC LƯỢT"), button:has-text("END TURN"), button:has-text("LẮC TIẾP"), button:has-text("ROLL AGAIN")').first();
}

export async function findBuyButton(page) {
  await dismissChaosModalIfPresent(page);
  return page.locator('button:has-text("MUA ĐẤT"), button:has-text("MUA Ô ĐẤT"), button:has-text("BUY TILE"), button:has-text("BUY PROPERTY"), button:has(svg.lucide-shopping-cart)').first();
}

export async function getActivePlayerInfo(page) {
  const activeChip = page.locator('[data-testid="players-strip"] button.border-slate-900, [data-testid="players-strip"] button:has-text("Lượt hiện tại"), [data-testid="players-strip"] button:has-text("Current Turn")').first();
  if (await activeChip.count() > 0) {
    const text = await activeChip.innerText();
    const testId = await activeChip.getAttribute('data-testid');
    return { testId, text };
  }
  return null;
}

export async function getRoundNumber(page) {
  const roundEl = page.locator('[data-testid="round-indicator"]');
  if (await roundEl.count() > 0) {
    const text = await roundEl.innerText();
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  }
  return 1;
}
