import { describe, it, expect } from 'vitest';
import { createPRNG } from '../chaos-engine/prng';
import {
  CHAOS_CARDS,
  getChaosCardById,
  getChaosCardsByCategory,
  LEGACY_CARD_ALIASES,
} from '../chaos-engine/chaosCards';
import {
  evaluateTileChaosTrigger,
  applyChaosCard,
} from '../chaos-engine/chaosEngine';
import * as chaosEngineModule from '../chaos-engine/chaosEngine';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { GameState, PlayerState, ChaosCategory } from '../types';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';

function createMilestone2State(playerCount: number = 2): GameState {
  const players: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      token: DEFAULT_PLAYER_TOKENS[i % DEFAULT_PLAYER_TOKENS.length],
      cash: 1500,
      position: 0,
      inDetention: false,
      detentionTurns: 0,
      isBankrupt: false,
      consecutiveDoubles: 0,
      stats: {
        rentPaid: 0,
        rentCollected: 0,
        chaosTriggered: 0,
        tilesTraveled: 0,
        propertiesOwned: 0,
      },
    });
  }

  return {
    ...INITIAL_GAME_STATE,
    status: 'PLAYING',
    players,
    activePlayerIndex: 0,
    turnPhase: 'ACTION_MENU',
    properties: {},
  };
}

describe('Milestone 2: Chaos Engine & 36 Vietnamese Cards Verification', () => {
  // =========================================================================
  // 1. DETERMINISTIC MULBERRY32 PRNG
  // =========================================================================
  describe('1. Deterministic Mulberry32 PRNG', () => {
    it('produces identical sequences given identical seeds', () => {
      const prng1 = createPRNG(98765);
      const prng2 = createPRNG(98765);

      const seq1 = Array.from({ length: 10 }, () => prng1.nextFloat());
      const seq2 = Array.from({ length: 10 }, () => prng2.nextFloat());

      expect(seq1).toEqual(seq2);
    });

    it('generates integers uniformly within inclusive bounds [min, max]', () => {
      const prng = createPRNG(12345);
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

      for (let i = 0; i < 6000; i++) {
        const val = prng.nextInt(1, 6);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
        counts[val]++;
      }

      // Check rough uniform distribution (each value ~1000 times ± 250)
      for (let num = 1; num <= 6; num++) {
        expect(counts[num]).toBeGreaterThan(700);
        expect(counts[num]).toBeLessThan(1300);
      }
    });

    it('shuffles arrays deterministically using Fisher-Yates algorithm', () => {
      const items = ['A', 'B', 'C', 'D', 'E', 'F'];
      const prng1 = createPRNG(42);
      const prng2 = createPRNG(42);

      const shuffled1 = prng1.shuffle(items);
      const shuffled2 = prng2.shuffle(items);

      expect(shuffled1).toEqual(shuffled2);
      expect(shuffled1).toHaveLength(items.length);
      expect(new Set(shuffled1)).toEqual(new Set(items));
    });

    it('correctly picks items and handles reset seeds', () => {
      const prng = createPRNG(999);
      const items = ['Hà Nội', 'Đà Nẵng', 'TP.HCM', 'Huế'];

      const pick1 = prng.pickOne(items);
      expect(items).toContain(pick1);

      prng.setSeed(999);
      const pick2 = prng.pickOne(items);
      expect(pick1).toBe(pick2);
    });
  });

  // =========================================================================
  // 2. 36 VIETNAMESE CHAOS CARDS CATALOG INTEGRITY
  // =========================================================================
  // Count updated: 36 original + 24 roadmap-C cards = 60, in 10 categories.
  // The Chaos insurance feature was later dropped, removing 2 JURIDICAL cards → 58 total.
  describe('2. 58 Vietnamese Chaos Cards Catalog Integrity', () => {
    it('contains strictly 58 cards across 10 categories', () => {
      expect(CHAOS_CARDS).toHaveLength(58);

      const categories: ChaosCategory[] = [
        'POSITIVE',
        'NEGATIVE',
        'PERSONAL',
        'GLOBAL',
        'ECONOMIC',
        'LEGENDARY',
        'SOCIAL',
        'ENVIRONMENT',
        'TECH',
        'JURIDICAL',
      ];

      for (const cat of categories) {
        const cardsInCat = getChaosCardsByCategory(cat);
        // JURIDICAL lost its insurance and counter cards; every other group still has 6.
        expect(cardsInCat, cat).toHaveLength(cat === 'JURIDICAL' ? 4 : 6);
      }
    });

    it('verifies all 36 cards possess valid Vietnamese localization and unique IDs', () => {
      const seenIds = new Set<string>();

      for (const card of CHAOS_CARDS) {
        expect(seenIds.has(card.id)).toBe(false);
        seenIds.add(card.id);

        expect(card.title).toBeTruthy();
        expect(card.nameVi).toBe(card.title);
        expect(card.flavorText).toBeTruthy();
        expect(card.descriptionVi).toBe(card.flavorText);
        expect(card.tagline).toBeTruthy();
        expect(card.iconName).toBeTruthy();
        expect(card.effectType).toBeTruthy();
        expect(typeof card.value).toBe('number');
      }
    });

    it('resolves cards by ID and via legacy aliases', () => {
      const vietlott = getChaosCardById('pos-vietlott-jackpot');
      expect(vietlott).toBeDefined();
      expect(vietlott?.category).toBe('POSITIVE');

      // Test legacy aliases
      for (const [legacyId, canonicalId] of Object.entries(LEGACY_CARD_ALIASES)) {
        const resolved = getChaosCardById(legacyId);
        expect(resolved).toBeDefined();
        expect(resolved?.id).toBe(canonicalId);
      }
    });
  });

  // =========================================================================
  // 3. 4 CHAOS TRIGGER PATHWAYS
  // =========================================================================
  describe('3. 4 Chaos Trigger Pathways', () => {
    it('Pathway 1 (TILE_LANDED): selects appropriate card rarity by tile portal', () => {
      const prng = createPRNG(777);

      // Tile 7: Alpha α (Common & Uncommon)
      for (let i = 0; i < 15; i++) {
        const cardAlpha = evaluateTileChaosTrigger(7, prng);
        expect(['COMMON', 'UNCOMMON']).toContain(cardAlpha.rarity);
      }

      // Tile 22: Beta β (Uncommon & Rare)
      for (let i = 0; i < 15; i++) {
        const cardBeta = evaluateTileChaosTrigger(22, prng);
        expect(['UNCOMMON', 'RARE']).toContain(cardBeta.rarity);
      }

      // Tile 36: Omega Ω (Rare, Calamity & Legendary)
      for (let i = 0; i < 15; i++) {
        const cardOmega = evaluateTileChaosTrigger(36, prng);
        expect(['RARE', 'CALAMITY', 'LEGENDARY']).toContain(cardOmega.rarity);
      }
    });

    /**
     * The former Pathway 2/3/4 triggers (double dice, round interval, crisis desperation) were
     * removed: Chaos now only happens when a player lands on a Chaos tile. These assertions used
     * to cover the removed functions; they now pin the tile-only rule instead.
     */
    it('only the tile-landed pathway remains exported from the chaos engine', () => {
      const engine = chaosEngineModule as unknown as Record<string, unknown>;
      expect(typeof engine.evaluateTileChaosTrigger).toBe('function');
      expect(engine.evaluateDoubleDiceChaosTrigger).toBeUndefined();
      expect(engine.evaluateRoundIntervalChaosTrigger).toBeUndefined();
      expect(engine.evaluateCrisisDesperationTrigger).toBeUndefined();
      expect(engine.evaluateChaosEventChainTrigger).toBeUndefined();
    });

    it('still draws a tiered card on each Chaos gate tile', () => {
      const prng = createPRNG(909);
      for (const tileId of [7, 22, 36]) {
        const card = evaluateTileChaosTrigger(tileId, prng);
        expect(card, `tile ${tileId}`).toBeTruthy();
        expect(CHAOS_CARDS.some(c => c.id === card.id), `tile ${tileId} draws a real card`).toBe(true);
      }
    });
  });

  // =========================================================================
  // 4. EFFECT RESOLVERS & REDUCER INTEGRATION
  // =========================================================================
  describe('4. Effect Resolvers & Reducer Integration', () => {
    it('resolves CASH_SELF positively and preserves non-negative solvency when negative', () => {
      let state = createMilestone2State(2);
      const prng = createPRNG(1);

      // Positive cash
      const grantCard = getChaosCardById('pos-vietlott-jackpot')!;
      state = applyChaosCard(state, grantCard, prng);
      expect(state.players[0].cash).toBe(1500 + 400);

      // Negative cash with sufficient funds
      const fineCard = getChaosCardById('neg-traffic-fine')!;
      state = applyChaosCard(state, fineCard, prng);
      expect(state.players[0].cash).toBe(1900 - 80);

      // Roadmap C damage cap: a big fine takes at most 25% of cash (50 -> 12), so it cannot
      // push the player into debt; cash stays non-negative and no bankruptcy check is opened.
      state.players[0].cash = 50;
      const bigFineCard = getChaosCardById('neg-cyber-scam')!; // -150
      state = applyChaosCard(state, bigFineCard, prng);
      expect(state.players[0].cash).toBe(38);
      expect(state.turnPhase).not.toBe('BANKRUPTCY_CHECK');
      expect(state.pendingDebt).toBeFalsy();
    });

    it('resolves CASH_STEAL and transfers funds between active player and opponents', () => {
      let state = createMilestone2State(3);
      const prng = createPRNG(2);

      const stealCard = getChaosCardById('per-robin-hack')!; // Steal 60 from each
      state = applyChaosCard(state, stealCard, prng);

      // Active player (player 1) gains 60 * 2 = 120
      expect(state.players[0].cash).toBe(1500 + 120);
      expect(state.players[1].cash).toBe(1500 - 60);
      expect(state.players[2].cash).toBe(1500 - 60);
    });

    it('resolves TELEPORT, GO_TO_DETENTION, and DOWNGRADE_PROPERTY (Earthquake)', () => {
      let state = createMilestone2State(2);
      const prng = createPRNG(3);

      // Detention card
      const detentionCard = getChaosCardById('neg-quarantine-order')!;
      state = applyChaosCard(state, detentionCard, prng);
      expect(state.players[0].position).toBe(10);
      expect(state.players[0].inDetention).toBe(true);

      // Earthquake card
      state.properties[1] = { ownerId: 'player-1', level: 3, isMortgaged: false };
      state.properties[3] = { ownerId: 'player-2', level: 1, isMortgaged: false };

      const quakeCard = getChaosCardById('leg-mega-earthquake')!;
      state = applyChaosCard(state, quakeCard, prng);
      expect(state.properties[1].level).toBe(2);
      expect(state.properties[3].level).toBe(0);
    });

    it('resolves REDISTRIBUTE_WEALTH from wealthiest to poorest player', () => {
      let state = createMilestone2State(2);
      const prng = createPRNG(4);

      state.players[0].cash = 2000;
      state.players[1].cash = 400;

      const robinHoodCard = getChaosCardById('leg-robin-hood')!;
      state = applyChaosCard(state, robinHoodCard, prng);

      // Richest transfers 25% of 2000 = 500
      expect(state.players[0].cash).toBe(1500);
      expect(state.players[1].cash).toBe(400 + 500);
    });

    it('resolves DEBT_JUBILEE and clears all mortgaged properties across board', () => {
      let state = createMilestone2State(2);
      const prng = createPRNG(5);

      state.properties[1] = { ownerId: 'player-1', level: 0, isMortgaged: true };
      state.properties[6] = { ownerId: 'player-2', level: 0, isMortgaged: true };

      const jubileeCard = getChaosCardById('leg-national-jubilee')!;
      state = applyChaosCard(state, jubileeCard, prng);

      expect(state.properties[1].isMortgaged).toBe(false);
      expect(state.properties[6].isMortgaged).toBe(false);
    });

    it('dispatches APPLY_CHAOS_EFFECT via gameReducer and tracks modifier decay', () => {
      let state = createMilestone2State(2);

      const inflationCard = getChaosCardById('glo-hyper-inflation')!;
      state = gameReducer(state, {
        type: 'APPLY_CHAOS_EFFECT',
        payload: inflationCard,
      });

      expect(state.rentModifier).toBe(2);
      expect(state.activeChaosCard?.id).toBe('glo-hyper-inflation');
      expect(state.chaosModifiers?.reverseDirectionTurns).toBe(0);

      // Reverse direction event
      const reverseCard = getChaosCardById('glo-reverse-dimension')!;
      state = gameReducer(state, {
        type: 'APPLY_CHAOS_EFFECT',
        payload: reverseCard,
      });

      expect(state.chaosModifiers?.reverseDirectionTurns).toBe(3);

      // Completing round decrements modifiers
      state = { ...state, roundNumber: 1, activePlayerIndex: 1 };
      state = gameReducer(state, { type: 'END_TURN' });

      // Round 1 completed, new round is 2
      expect(state.roundNumber).toBe(2);
      expect(state.chaosModifiers?.reverseDirectionTurns).toBe(2);
    });
  });
});
