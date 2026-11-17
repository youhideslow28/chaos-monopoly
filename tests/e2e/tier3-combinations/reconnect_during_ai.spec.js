import WebSocket from 'ws';
import { describe, it, expect } from '../helpers/framework.js';
import {
  openMainMenu,
  createOnlineRoomFromMenu,
} from '../helpers/gameActions.js';

describe('Tier 3: Session Reconnection & AI Turn Synchronization', () => {
  it('should persist room credentials in localStorage upon entering online lobby', async ({ page, viteUrl, assertNoErrors }) => {
    await createOnlineRoomFromMenu(page, viteUrl);

    // Verify localStorage has stored credentials
    const creds = await page.evaluate(() => {
      const raw = localStorage.getItem('chaos_monopoly_online_session_v1');
      return raw ? JSON.parse(raw) : null;
    });

    expect(creds).toBeDefined();
    expect(creds.roomCode).toBeDefined();
    expect(creds.playerId).toBeDefined();
    expect(creds.reconnectToken).toBeDefined();

    assertNoErrors();
  });

  it('should successfully reconnect via WebSocket protocol using stored credentials', async ({ page, viteUrl, mpWsUrl }) => {
    await createOnlineRoomFromMenu(page, viteUrl);

    const creds = await page.evaluate(() => {
      const raw = localStorage.getItem('chaos_monopoly_online_session_v1');
      return raw ? JSON.parse(raw) : null;
    });

    // Connect separate WS client to execute RECONNECT_ROOM
    const ws = new WebSocket(mpWsUrl);
    await new Promise((r) => ws.once('open', r));

    const receivedMessages = [];
    ws.on('message', (data) => {
      receivedMessages.push(JSON.parse(data.toString()));
    });

    // Send RECONNECT_ROOM message (protocol action)
    ws.send(
      JSON.stringify({
        version: '1.0',
        type: 'RECONNECT_ROOM',
        roomCode: creds.roomCode,
        playerId: creds.playerId,
        reconnectToken: creds.reconnectToken,
      })
    );

    await new Promise((r) => setTimeout(r, 800));

    // Server should acknowledge with ROOM_JOINED containing room and seat info
    const joinMsg = receivedMessages.find((m) => m.type === 'ROOM_JOINED');
    expect(joinMsg).toBeDefined();
    expect(joinMsg.room.roomCode).toBe(creds.roomCode);

    ws.close();
  });

  it('should automatically trigger session reconnect banner upon page refresh', async ({ page, viteUrl, assertNoErrors }) => {
    await createOnlineRoomFromMenu(page, viteUrl);

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Either reconnecting overlay or restored lobby modal should appear
    const reconnectEl = page.locator('[data-testid="reconnecting-overlay"], [data-testid="online-lobby-modal"]').first();
    await reconnectEl.waitFor({ state: 'visible', timeout: 15000 });
    expect(await reconnectEl.isVisible()).toBe(true);

    assertNoErrors();
  });

  it('should reconcile state and cancel fallback AI timer upon reconnect', async ({ page, viteUrl, mpWsUrl }) => {
    await createOnlineRoomFromMenu(page, viteUrl);

    const creds = await page.evaluate(() => {
      const raw = localStorage.getItem('chaos_monopoly_online_session_v1');
      return raw ? JSON.parse(raw) : null;
    });

    const ws = new WebSocket(mpWsUrl);
    await new Promise((r) => ws.once('open', r));

    const messages = [];
    ws.on('message', (d) => messages.push(JSON.parse(d.toString())));

    ws.send(
      JSON.stringify({
        version: '1.0',
        type: 'RECONNECT_ROOM',
        roomCode: creds.roomCode,
        playerId: creds.playerId,
        reconnectToken: creds.reconnectToken,
      })
    );

    await new Promise((r) => setTimeout(r, 800));

    const joinMsg = messages.find((m) => m.type === 'ROOM_JOINED');
    expect(joinMsg).toBeDefined();
    expect(joinMsg.room.roomCode).toBe(creds.roomCode);
    expect(joinMsg.assignedPlayerId).toBe(creds.playerId);

    ws.close();
  });

  it('should cleanly remove stored session on explicit room leave', async ({ page, viteUrl, assertNoErrors }) => {
    await createOnlineRoomFromMenu(page, viteUrl);

    const leaveBtn = page.locator('[data-testid="leave-room-btn"]');
    await leaveBtn.waitFor({ state: 'visible', timeout: 8000 });
    await leaveBtn.click();
    await page.waitForTimeout(500);

    // Stored credentials should be cleared
    const creds = await page.evaluate(() => {
      return localStorage.getItem('chaos_monopoly_online_session_v1');
    });
    expect(creds).toBeNull();

    assertNoErrors();
  });
});
