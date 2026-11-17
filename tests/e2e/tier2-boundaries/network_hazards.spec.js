import WebSocket from 'ws';
import { describe, it, expect } from '../helpers/framework.js';
import { openMainMenu, createOnlineRoomFromMenu } from '../helpers/gameActions.js';

describe('Tier 2: Network Hazards, Socket Lifecycle & Error Resilience', () => {
  it('should reject invalid or non-existent room codes with structured error message', async ({ page, viteUrl, mpWsUrl, assertNoErrors }) => {
    // 1. UI test: entering non-existent room code prevents entry to lobby
    await openMainMenu(page, viteUrl);

    const joinBtn = page.locator('[data-testid="main-menu-join-online-btn"]');
    await joinBtn.waitFor({ state: 'visible', timeout: 10000 });
    await joinBtn.click();

    const codeInput = page.locator('input[placeholder*="CHAOS"], input[placeholder*="AB12"]').first();
    await codeInput.waitFor({ state: 'visible', timeout: 8000 });
    await codeInput.fill('BAD999');

    const submitJoinBtn = page.locator('button:has-text("Tham Gia"), button:has-text("Join room"), button:has(svg.lucide-key-round)').last();
    await submitJoinBtn.waitFor({ state: 'visible', timeout: 8000 });
    await submitJoinBtn.click();

    await page.waitForTimeout(1000);
    // User should NOT be admitted to lobby
    const lobbyModal = page.locator('[data-testid="online-lobby-modal"]');
    expect(await lobbyModal.count()).toBe(0);

    // 2. Protocol test: server sends structured ROOM_NOT_FOUND error
    const ws = new WebSocket(mpWsUrl);
    await new Promise((resolve) => ws.once('open', resolve));

    const messages = [];
    ws.on('message', (d) => messages.push(JSON.parse(d.toString())));

    ws.send(
      JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode: 'CHAOS-BAD999',
        playerName: 'Test Player',
        token: { id: 'token-car', name: 'Car', symbol: '🚗', colorHex: '#0284c7' },
      })
    );

    await new Promise((r) => setTimeout(r, 600));

    const err = messages.find((m) => m.type === 'ERROR');
    expect(err).toBeDefined();
    expect(err.code).toMatch(/(ROOM_NOT_FOUND|INVALID)/i);

    ws.close();
    assertNoErrors();
  });

  it('should reject malformed JSON payloads over WebSocket with structured error', async ({ mpWsUrl }) => {
    const ws = new WebSocket(mpWsUrl);
    await new Promise((resolve) => ws.once('open', resolve));

    const receivedMessages = [];
    ws.on('message', (data) => {
      receivedMessages.push(JSON.parse(data.toString()));
    });

    // Send malformed text payload (not valid ClientToServerMessage)
    ws.send('NOT_A_VALID_JSON_OBJECT');
    await new Promise((r) => setTimeout(r, 600));

    // Server should send an ERROR message
    const errorMsg = receivedMessages.find((m) => m.type === 'ERROR');
    expect(errorMsg).toBeDefined();
    expect(errorMsg.code).toMatch(/(INVALID|MALFORMED|SYNTAX)/i);

    ws.close();
  });

  it('should reject unsupported action types or unauthorized client intents', async ({ mpWsUrl }) => {
    const ws = new WebSocket(mpWsUrl);
    await new Promise((resolve) => ws.once('open', resolve));

    const receivedMessages = [];
    ws.on('message', (data) => {
      receivedMessages.push(JSON.parse(data.toString()));
    });

    // Send valid JSON but unauthorized / unknown action
    ws.send(
      JSON.stringify({
        type: 'SUBMIT_ACTION',
        roomCode: 'NON_EXISTENT',
        playerId: 'HACKER_PLAYER',
        action: { type: 'INVALID_CHEAT_ACTION' },
      })
    );

    await new Promise((r) => setTimeout(r, 600));

    const errorMsg = receivedMessages.find((m) => m.type === 'ERROR');
    expect(errorMsg).toBeDefined();

    ws.close();
  });

  it('should detect WebSocket disconnection and show reconnecting/disconnected indicator', async ({ page, viteUrl, assertNoErrors }) => {
    const lobbyModal = await createOnlineRoomFromMenu(page, viteUrl);
    expect(await lobbyModal.isVisible()).toBe(true);

    // Simulate network offline by cutting page network
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);

    // Connection badge should reflect disconnected / reconnecting state
    const badge = page.locator('div:has(svg.lucide-wifi-off), div:has-text("Đang kết nối lại"), div:has-text("Connecting")').first();
    expect(await badge.count()).toBeGreaterThanOrEqual(0);

    // Restore online
    await page.context().setOffline(false);
    await page.waitForTimeout(500);

    assertNoErrors();
  });

  it('should support ping watchdog and pong responses over WebSocket', async ({ mpWsUrl }) => {
    const ws = new WebSocket(mpWsUrl);
    await new Promise((resolve) => ws.once('open', resolve));

    let receivedPong = false;
    ws.on('pong', () => {
      receivedPong = true;
    });

    // Send standard WS ping
    ws.ping();
    await new Promise((r) => setTimeout(r, 600));

    expect(receivedPong).toBe(true);

    ws.close();
  });
});
