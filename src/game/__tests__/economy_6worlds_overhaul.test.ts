import { describe, expect, it, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { DEFAULT_PLAYER_TOKENS, BOARD_TILES } from '../board/boardData';
import { gameReducer, INITIAL_GAME_CONFIG, INITIAL_GAME_STATE } from '../gameReducer';
import {
  canDowngradeProperty,
  canSellProperty,
  calculateRent,
  getBuyPrice,
  getLandSellValue,
  getMarketLandValue,
  getMortgageValue,
  getRoundPriceMultiplier,
  getUpgradeCost,
} from '../property/propertyEngine';
import {
  calculateEffectiveMortgageValue,
  calculateSalary,
  DEFAULT_CHAOS_MODIFIERS,
  DEFAULT_MORTGAGE_RATIO,
  getRoundSalaryMultiplier,
  START_SALARY_GROWTH_MAX,
  START_SALARY_GROWTH_PER_ROUND,
} from '../economy/economicModifiers';
import { calculateMaxLiquidationValue, calculatePlayerNetWorth } from '../economy/economyEngine';
import {
  getWorldEconomicProfile,
  inflationRatePerRound,
  landMultiplier,
  landSellRate,
  maxRoundMultiplier,
  mortgageRate,
  rentMultiplier,
  salaryMultiplier,
  sellRate,
} from '../world-rules/worldRules';
import { verifyLedgerAudit } from '../economy/ledgerEngine';
import { GameState } from '../types';
import { PROTOCOL_VERSION, ServerToClientMessage } from '../../multiplayer/protocol';
import { ChaosMultiplayerServer } from '../../server/multiplayerServer';

class LocalWsClient {
  public ws!: WebSocket;
  public messages: ServerToClientMessage[] = [];
  private waiters: Array<{
    predicate: (msg: ServerToClientMessage) => boolean;
    resolve: (msg: ServerToClientMessage) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    this.ws = new WebSocket(this.url);
    this.ws.on('message', (data: Buffer | string) => {
      const msg = JSON.parse(data.toString()) as ServerToClientMessage;
      const idx = this.waiters.findIndex(w => w.predicate(msg));
      if (idx >= 0) {
        const [waiter] = this.waiters.splice(idx, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(msg);
        return;
      }
      this.messages.push(msg);
    });
    await new Promise<void>((resolve, reject) => {
      this.ws.once('open', () => resolve());
      this.ws.once('error', reject);
    });
    await this.waitForMessage(m => m.type === 'WELCOME');
  }

  send(payload: Record<string, unknown>): void {
    this.ws.send(JSON.stringify({ version: PROTOCOL_VERSION, ...payload }));
  }

  async waitForMessage<T extends ServerToClientMessage = ServerToClientMessage>(
    predicate: (msg: ServerToClientMessage) => boolean,
    timeoutMs: number = 3000
  ): Promise<T> {
    const idx = this.messages.findIndex(predicate);
    if (idx >= 0) {
      const [found] = this.messages.splice(idx, 1);
      return found as T;
    }
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        const wIdx = this.waiters.findIndex(w => w.timer === timer);
        if (wIdx >= 0) this.waiters.splice(wIdx, 1);
        reject(new Error(`Timed out waiting for message (${timeoutMs}ms)`));
      }, timeoutMs);
      this.waiters.push({ predicate, resolve: msg => resolve(msg as T), timer });
    });
  }

  close(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

function startWorld(worldId: string, cash = 5000): GameState {
  const started = gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    actionId: `start-${worldId}`,
    players: [
      { name: 'P1', token: DEFAULT_PLAYER_TOKENS[0], isAI: false },
      { name: 'P2', token: DEFAULT_PLAYER_TOKENS[1], isAI: false },
    ],
    config: { ...INITIAL_GAME_CONFIG, worldId, seed: 101, startingCash: cash },
  } as any);
  return { ...started, turnPhase: 'ACTION_MENU' };
}

describe('6-World Economic Overhaul & Bank Land Sale', () => {
  it('1. Per-world round inflation multipliers increase by world rate and obey maxRoundMultiplier cap', () => {
    const metropolis = startWorld('modern-metropolis');
    const cyberpunk = startWorld('cyberpunk-city');
    const mekong = startWorld('mekong-delta');
    const quangTri = startWorld('quang-tri-highlands');
    const northwest = startWorld('northwest-vietnam');
    const space = startWorld('space-colony');

    expect(maxRoundMultiplier(metropolis)).toBe(2.4);
    expect(maxRoundMultiplier(quangTri)).toBe(2.4);
    expect(maxRoundMultiplier(cyberpunk)).toBe(2.5);
    expect(maxRoundMultiplier(mekong)).toBe(2.1);
    expect(maxRoundMultiplier(northwest)).toBe(2.2);
    expect(maxRoundMultiplier(space)).toBe(2.2);

    expect(inflationRatePerRound(cyberpunk)).toBeCloseTo(0.035, 5);
    expect(getRoundPriceMultiplier(1, cyberpunk)).toBe(1);
    expect(getRoundPriceMultiplier(11, cyberpunk)).toBeCloseTo(1 + 10 * 0.035, 5);

    // At extreme late rounds (Round 999), multiplier never explodes past cap
    expect(getRoundPriceMultiplier(999, metropolis)).toBe(2.4);
    expect(getRoundPriceMultiplier(999, cyberpunk)).toBe(2.5);
    expect(getRoundPriceMultiplier(999, mekong)).toBe(2.1);
    expect(getRoundPriceMultiplier(999, northwest)).toBe(2.2);
    expect(getRoundPriceMultiplier(999, space)).toBe(2.2);

    // Prices reflect the cap
    expect(getBuyPrice(39, 999, metropolis)).toBe(getBuyPrice(39, 100, metropolis));
    expect(getUpgradeCost(39, 999, metropolis)).toBe(getUpgradeCost(39, 100, metropolis));
  });

  it('2. Start salary scales +1.5%/round up to 1.6x, applies Mekong (+15%) and Northwest (+5%), and Golden Hour (2x)', () => {
    const base = startWorld('modern-metropolis');
    const mekong = startWorld('mekong-delta');
    const northwest = startWorld('northwest-vietnam');
    const modsNone = { ...DEFAULT_CHAOS_MODIFIERS };
    const modsGolden = { ...DEFAULT_CHAOS_MODIFIERS, goldenHourTurns: 2 };

    expect(START_SALARY_GROWTH_PER_ROUND).toBe(0.015);
    expect(START_SALARY_GROWTH_MAX).toBe(1.6);
    expect(salaryMultiplier(mekong)).toBe(1.15);
    expect(salaryMultiplier(northwest)).toBe(1.05);
    expect(salaryMultiplier(base)).toBe(1);

    expect(getRoundSalaryMultiplier(1)).toBe(1);
    expect(getRoundSalaryMultiplier(21)).toBeCloseTo(1 + 20 * 0.015, 5);
    expect(getRoundSalaryMultiplier(999)).toBe(1.6);

    expect(calculateSalary(200, modsNone, 1, base)).toBe(200);
    expect(calculateSalary(200, modsNone, 1, mekong)).toBe(230);
    expect(calculateSalary(200, modsNone, 1, northwest)).toBe(210);
    expect(calculateSalary(200, modsNone, 999, base)).toBe(Math.round(200 * 1.6));
    expect(calculateSalary(200, modsGolden, 999, mekong)).toBe(
      Math.round(200 * 1.6 * 1.15 * 2)
    );
  });

  it('3. Market-indexed Downgrade refund scales with current market upgrade cost & world sellRate (even at late rounds)', () => {
    const base = startWorld('modern-metropolis');
    const openMarket = { ...startWorld('northwest-vietnam'), worldState: { marketOpen: true } };
    const tileId = 39; // Landmark 81
    const baseUpgradeR1 = getUpgradeCost(tileId, 1, base);
    const baseUpgradeR34 = getUpgradeCost(tileId, 34, base);
    expect(baseUpgradeR34).toBeGreaterThan(baseUpgradeR1 * 1.7);

    const properties = {
      [tileId]: { ownerId: 'player-1', level: 2 as const, isMortgaged: false },
    };

    const downR34 = canDowngradeProperty(tileId, 'player-1', properties, 34, base);
    expect(downR34.canDowngrade).toBe(true);
    expect(downR34.refundAmount).toBe(Math.round(baseUpgradeR34 * sellRate(base)));

    // Market day Tây Bắc refunds 100% of current market upgrade cost
    const downMarketR34 = canDowngradeProperty(
      tileId,
      'player-1',
      properties,
      34,
      { ...openMarket, roundNumber: 34 }
    );
    expect(downMarketR34.canDowngrade).toBe(true);
    expect(downMarketR34.refundAmount).toBe(getUpgradeCost(tileId, 34, openMarket));

    // Reducer DOWNGRADE_PROPERTY credits the exact market-indexed refund
    const withHouse: GameState = {
      ...base,
      roundNumber: 34,
      properties: {
        ...base.properties,
        [tileId]: { ownerId: 'player-1', level: 1, isMortgaged: false },
      },
      players: base.players,
    };
    const afterDown = gameReducer(withHouse, {
      type: 'DOWNGRADE_PROPERTY',
      tileId,
      actionId: 'down-r34',
    });
    expect(afterDown.players[0].cash).toBe(5000 + Math.round(baseUpgradeR34 * sellRate(base)));
    expect(afterDown.properties[tileId].level).toBe(0);
    expect(verifyLedgerAudit(afterDown.config.startingCash, afterDown.players, afterDown.ledger ?? []).isValid).toBe(true);
  });

  it('4. Mortgage is 60% of market land value, immune to Quảng Trị Wet-season dip, and syncs with liquidation & net worth', () => {
    const dry = startWorld('quang-tri-highlands');
    const wet: GameState = { ...dry, worldState: { seasonPhase: 'WET' } };
    const modsNone = { ...DEFAULT_CHAOS_MODIFIERS };
    const modsSub = { ...DEFAULT_CHAOS_MODIFIERS, subsidizedMortgageTurns: 2 };
    const tileId = 11;

    expect(DEFAULT_MORTGAGE_RATIO).toBe(0.6);
    expect(mortgageRate(dry)).toBe(0.6);
    expect(calculateEffectiveMortgageValue(100, modsNone)).toBe(60);
    expect(calculateEffectiveMortgageValue(100, modsSub)).toBe(75);

    const dryMarketLand = getMarketLandValue(tileId, 1, dry);
    const wetMarketLand = getMarketLandValue(tileId, 1, wet);
    expect(wetMarketLand).toBe(dryMarketLand);
    expect(getMortgageValue(tileId, modsNone, dry, 1)).toBe(Math.floor(dryMarketLand * 0.6));
    expect(getMortgageValue(tileId, modsNone, wet, 1)).toBe(
      getMortgageValue(tileId, modsNone, dry, 1)
    );

    // Later rounds increase market land value and mortgage proceeds
    const r20Mortgage = getMortgageValue(tileId, modsNone, dry, 20);
    expect(r20Mortgage).toBeGreaterThan(getMortgageValue(tileId, modsNone, dry, 1));
  });

  it('5. SELL_PROPERTY: sells vacant land back to Bank, enforces district-building guard, handles mortgaged net equity safely, and respects Tây Bắc Market Day', () => {
    const base = startWorld('modern-metropolis', 1000);
    const tileA = 1; // Bùi Viện (group G1)
    const tileB = 3; // Đồng Khởi (group G1)

    // Cannot sell land while another tile in the same color group has buildings
    const stateWithBuilding: GameState = {
      ...base,
      roundNumber: 10,
      properties: {
        ...base.properties,
        [tileA]: { ownerId: 'player-1', level: 0, isMortgaged: false },
        [tileB]: { ownerId: 'player-1', level: 1, isMortgaged: false },
      },
      players: base.players.map((p, i) =>
        i === 0 ? { ...p, stats: { ...p.stats, propertiesOwned: 2 } } : p
      ),
    };
    expect(
      canSellProperty(
        tileA,
        'player-1',
        stateWithBuilding.properties,
        DEFAULT_CHAOS_MODIFIERS,
        10,
        stateWithBuilding
      ).canSell
    ).toBe(false);

    // Clear building on tileB -> player-1 can sell tileA back to Bank
    const stateReady: GameState = {
      ...stateWithBuilding,
      properties: {
        ...stateWithBuilding.properties,
        [tileB]: { ownerId: 'player-1', level: 0, isMortgaged: false },
      },
    };
    const sellCheck = canSellProperty(
      tileA,
      'player-1',
      stateReady.properties,
      DEFAULT_CHAOS_MODIFIERS,
      10,
      stateReady
    );
    expect(sellCheck.canSell).toBe(true);
    const expectedSale = Math.round(
      getMarketLandValue(tileA, 10, stateReady) * landSellRate(stateReady)
    );
    expect(sellCheck.sellValue).toBe(expectedSale);
    expect(expectedSale).toBeGreaterThan(0);

    const afterSell = gameReducer(stateReady, {
      type: 'SELL_PROPERTY',
      tileId: tileA,
      actionId: 'sell-a',
    });
    expect(afterSell.properties[tileA].ownerId).toBeNull();
    expect(afterSell.properties[tileA].level).toBe(0);
    expect(afterSell.properties[tileA].isMortgaged).toBe(false);
    expect(afterSell.players[0].cash).toBe(1000 + expectedSale);
    expect(afterSell.players[0].stats.propertiesOwned).toBe(1);
    expect(afterSell.ledger?.[0]?.category).toBe('PROPERTY_SALE');
    expect(verifyLedgerAudit(afterSell.config.startingCash, afterSell.players, afterSell.ledger ?? []).isValid).toBe(true);
    expect(afterSell.ledger?.[0]?.amount).toBe(expectedSale);

    // Mortgaged property net equity deduction prevents infinite mortgage -> sell loop
    const mortgagedState: GameState = {
      ...stateReady,
      properties: {
        ...stateReady.properties,
        [tileA]: { ownerId: 'player-1', level: 0, isMortgaged: true },
      },
    };
    const mortgagedSale = canSellProperty(
      tileA,
      'player-1',
      mortgagedState.properties,
      DEFAULT_CHAOS_MODIFIERS,
      10,
      mortgagedState
    );
    expect(mortgagedSale.canSell).toBe(true);
    expect(mortgagedSale.sellValue).toBeLessThan(expectedSale);
    const mortgageProceeds = getMortgageValue(tileA, DEFAULT_CHAOS_MODIFIERS, mortgagedState, 10);
    expect(mortgageProceeds + mortgagedSale.sellValue).toBeLessThanOrEqual(expectedSale);

    // Tây Bắc Market Day allows non-active player P2 to sell their land anytime, blocked off-market
    const northwest = startWorld('northwest-vietnam', 1000);
    const marketOpenState: GameState = {
      ...northwest,
      worldState: { marketOpen: true },
      properties: {
        ...northwest.properties,
        [tileA]: { ownerId: 'player-2', level: 0, isMortgaged: false },
      },
      players: northwest.players.map((p, i) =>
        i === 1 ? { ...p, stats: { ...p.stats, propertiesOwned: 1 } } : p
      ),
    };
    const marketClosedState: GameState = {
      ...marketOpenState,
      worldState: { marketOpen: false },
    };

    const deniedOffMarket = gameReducer(marketClosedState, {
      type: 'SELL_PROPERTY',
      tileId: tileA,
      senderPlayerId: 'player-2',
      actionId: 'sell-p2-closed',
    });
    expect(deniedOffMarket.properties[tileA].ownerId).toBe('player-2');

    const soldOnMarket = gameReducer(marketOpenState, {
      type: 'SELL_PROPERTY',
      tileId: tileA,
      senderPlayerId: 'player-2',
      actionId: 'sell-p2-open',
    });
    expect(soldOnMarket.properties[tileA].ownerId).toBeNull();
    expect(soldOnMarket.players[1].cash).toBe(
      1000 + getLandSellValue(tileA, marketOpenState.properties, 1, marketOpenState)
    );
    expect(soldOnMarket.ledger?.[0]?.category).toBe('PROPERTY_SALE');
  });

  it('6. Liquidation max value & Net Worth reflect market-indexed downgrade, land sale, and world sellRate', () => {
    const base = startWorld('modern-metropolis', 200);
    const marketOpen = {
      ...startWorld('northwest-vietnam', 200),
      worldState: { marketOpen: true },
    };
    const tileId = 37;
    const baseProps = {
      ...base.properties,
      [tileId]: { ownerId: 'player-1', level: 1 as const, isMortgaged: false },
    };
    const liqBaseR20 = calculateMaxLiquidationValue(
      base.players[0],
      baseProps,
      DEFAULT_CHAOS_MODIFIERS,
      20,
      base
    );
    const liqOpenR20 = calculateMaxLiquidationValue(
      marketOpen.players[0],
      baseProps,
      DEFAULT_CHAOS_MODIFIERS,
      20,
      { ...marketOpen, roundNumber: 20 }
    );
    expect(liqOpenR20).toBeGreaterThan(liqBaseR20);

    const nwR1 = calculatePlayerNetWorth(base.players[0], baseProps, DEFAULT_CHAOS_MODIFIERS, 1, base);
    const nwR20 = calculatePlayerNetWorth(
      base.players[0],
      baseProps,
      DEFAULT_CHAOS_MODIFIERS,
      20,
      base
    );
    expect(nwR20).toBeGreaterThan(nwR1);
  });

  it('7. Distinct 6-world physics: Cyberpunk 3★–5★ (+15% rent), Space Colony 4★–5★ & TRANSPORT (+20% rent, +15% build), Mekong (-10% land)', () => {
    const base = startWorld('modern-metropolis');
    const cyberpunk = startWorld('cyberpunk-city');
    const space = startWorld('space-colony');
    const mekong = startWorld('mekong-delta');

    // Mekong cheaper land
    expect(landMultiplier(mekong)).toBe(0.9);
    expect(getBuyPrice(11, 1, mekong)).toBe(Math.round(getBuyPrice(11, 1, base) * 0.9));

    // Cyberpunk 1★ vs 3★ rent multiplier
    expect(rentMultiplier(cyberpunk, 1, 'PROPERTY')).toBe(1);
    expect(rentMultiplier(cyberpunk, 3, 'PROPERTY')).toBe(1.15);

    // Space Colony 1★ vs 4★ & TRANSPORT rent multiplier + build multiplier
    expect(rentMultiplier(space, 1, 'PROPERTY')).toBe(1);
    expect(rentMultiplier(space, 4, 'PROPERTY')).toBe(1.2);
    expect(rentMultiplier(space, 0, 'TRANSPORT')).toBe(1.2);
    expect(getUpgradeCost(11, 1, space)).toBe(Math.round(getUpgradeCost(11, 1, base) * 1.15));

    // Verify all 6 world IDs resolve valid profiles
    for (const wid of [
      'modern-metropolis',
      'cyberpunk-city',
      'mekong-delta',
      'quang-tri-highlands',
      'northwest-vietnam',
      'space-colony',
    ]) {
      const profile = getWorldEconomicProfile({
        config: { ...INITIAL_GAME_CONFIG, worldId: wid },
        worldState: null,
      });
      expect(profile.maxRoundMultiplier).toBeGreaterThanOrEqual(2);
      expect(profile.mortgageRate).toBe(0.6);
    }

    // Sanity check rent calculation uses rentMultiplier properly
    const props = { [39]: { ownerId: 'player-2', level: 4 as const, isMortgaged: false } };
    const baseRent = calculateRent(39, props as any, 1, 7).rentAmount;
    const spaceRent = calculateRent(
      39,
      props as any,
      rentMultiplier(space, 4, BOARD_TILES[39].type),
      7
    ).rentAmount;
    expect(spaceRent).toBe(Math.round(baseRent * 1.2));
  });
});

describe('6-World Overhaul — Multiplayer Server SELL_PROPERTY execution', () => {
  const servers: ChaosMultiplayerServer[] = [];
  const clients: LocalWsClient[] = [];

  afterEach(async () => {
    for (const c of clients) c.close();
    clients.length = 0;
    for (const s of servers) await s.close();
    servers.length = 0;
  });

  it('8. RoomManager validates and broadcasts SELL_PROPERTY via WebSocket CLIENT_INTENT', async () => {
    const server = new ChaosMultiplayerServer({
      port: 0,
      host: '127.0.0.1',
      dbFilePath: ':memory:',
      aiActionDelayMs: 30,
      defaultReconnectGraceMs: 2000,
      deterministicTestSeed: 555666,
      silentLogs: true,
    });
    servers.push(server);
    const port = await server.listen(0, '127.0.0.1');
    const wsUrl = `ws://127.0.0.1:${port}/ws`;

    const c1 = new LocalWsClient(wsUrl);
    const c2 = new LocalWsClient(wsUrl);
    clients.push(c1, c2);
    await c1.connect();
    await c2.connect();

    c1.send({ type: 'CREATE_ROOM', requestId: 'r1', playerName: 'HostOne', capacity: 2 });
    const created = await c1.waitForMessage(m => m.type === 'ROOM_JOINED');
    if (created.type !== 'ROOM_JOINED') throw new Error('Expected ROOM_JOINED');
    const roomCode = created.room.roomCode;

    c2.send({ type: 'JOIN_ROOM', requestId: 'r2', roomCode, playerName: 'GuestTwo' });
    await c2.waitForMessage(m => m.type === 'ROOM_JOINED');

    c1.send({ type: 'START_MATCH', requestId: 'r3', roomCode });
    const started = await c1.waitForMessage(m => m.type === 'MATCH_STARTED');
    await c2.waitForMessage(m => m.type === 'MATCH_STARTED');
    if (started.type !== 'MATCH_STARTED') throw new Error('Expected MATCH_STARTED');

    // Inject ownership of tile 1 to player-1 in server authoritative room state
    const room = (server as any).roomManager.rooms.get(roomCode);
    room.gameState = {
      ...room.gameState,
      turnPhase: 'ACTION_MENU',
      properties: {
        ...room.gameState.properties,
        1: { ownerId: 'player-1', level: 0, isMortgaged: false },
      },
      players: room.gameState.players.map((p: any, idx: number) =>
        idx === 0 ? { ...p, stats: { ...p.stats, propertiesOwned: 1 } } : p
      ),
    };

    const cashBefore = room.gameState.players[0].cash;
    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'sell-ws-1',
      roomCode,
      actionId: 'act-sell-ws-1',
      intent: { type: 'SELL_PROPERTY', tileId: 1 },
    });

    const sync1 = await c1.waitForMessage(
      m => m.type === 'STATE_SYNC' && m.actionId === 'act-sell-ws-1'
    );
    const sync2 = await c2.waitForMessage(
      m => m.type === 'STATE_SYNC' && m.actionId === 'act-sell-ws-1'
    );
    if (sync1.type !== 'STATE_SYNC' || sync2.type !== 'STATE_SYNC') {
      throw new Error('Expected STATE_SYNC');
    }

    expect(sync1.gameState.properties[1].ownerId).toBeNull();
    expect(sync2.gameState.properties[1].ownerId).toBeNull();
    expect(sync1.gameState.players[0].cash).toBeGreaterThan(cashBefore);
    expect(sync1.gameState.players[0].cash).toBe(sync2.gameState.players[0].cash);
    expect(sync1.gameState.ledger?.[0]?.category).toBe('PROPERTY_SALE');
    expect(verifyLedgerAudit(sync1.gameState.config.startingCash, sync1.gameState.players, sync1.gameState.ledger ?? []).isValid).toBe(true);
  });
});
