import { describe, expect, it } from 'vitest';
import { CHAOS_CARDS, getChaosCardById } from '../chaos-engine/chaosCards';
import { CHAOS_CARDS_M2 } from '../chaos-engine/chaosCardsM2';
import {
  applyChaosCard,
  CHAOS_LOSS_CAP_RATIO,
  capChaosLoss,
  isHarmfulCard,
} from '../chaos-engine/chaosEngine';
import { createPRNG } from '../chaos-engine/prng';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';
import { gameReducer, INITIAL_GAME_CONFIG, INITIAL_GAME_STATE } from '../gameReducer';
import { GameState } from '../types';

function startState(cashes: number[] = [1000, 1000], seed = 2026): GameState {
  const players = cashes.map((_, i) => ({
    name: `P${i + 1}`,
    token: DEFAULT_PLAYER_TOKENS[i],
    isAI: false,
  }));
  const started = gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    actionId: 'test-start',
    players,
    config: { ...INITIAL_GAME_CONFIG, seed },
  } as any);
  return {
    ...started,
    turnPhase: 'ACTION_MENU',
    players: started.players.map((p, i) => ({ ...p, cash: cashes[i] })),
  };
}

describe('Chaos is tile-triggered only (client requirement)', () => {
  it('draws and applies exactly one card when landing on a Chaos gate tile', () => {
    const base = startState([1500, 1500]);
    const onTile1: GameState = {
      ...base,
      turnPhase: 'WAITING_FOR_ROLL',
      players: base.players.map((p, i) => (i === base.activePlayerIndex ? { ...p, position: 1 } : p)),
    };
    // Dice [3,3] = 6 moves tile 1 -> tile 7, a Chaos gate.
    const after = gameReducer(onTile1, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
    expect(after.players[after.activePlayerIndex].position).toBe(7);
    expect(after.activeChaosCard).toBeTruthy();
  });

  it('applies no chaos card on an ordinary property tile', () => {
    const base = startState([1500, 1500]);
    const onTile1: GameState = {
      ...base,
      turnPhase: 'WAITING_FOR_ROLL',
      players: base.players.map((p, i) => (i === base.activePlayerIndex ? { ...p, position: 1 } : p)),
    };
    // Dice [1,1] = 2 moves tile 1 -> tile 3 (a property), no chaos draw.
    const after = gameReducer(onTile1, { type: 'ROLL_DICE_RESULT', dice: [1, 1] });
    expect(after.players[after.activePlayerIndex].position).toBe(3);
    expect(after.activeChaosCard).toBeFalsy();
  });
});

describe('Roadmap D — every Chaos card carries English copy', () => {
  it('has nameEn, taglineEn, flavorTextEn and descriptionEn on all 58 cards', () => {
    const missing: string[] = [];
    for (const card of CHAOS_CARDS) {
      if (!card.nameEn || !card.taglineEn || !card.flavorTextEn || !card.descriptionEn) {
        missing.push(card.id);
      }
    }
    expect(missing).toEqual([]);
  });

  it('keeps the English copy distinct from the Vietnamese copy', () => {
    const identical: string[] = [];
    for (const card of CHAOS_CARDS) {
      if (card.nameEn === card.nameVi) identical.push(card.id);
    }
    expect(identical).toEqual([]);
  });
});

describe('Roadmap C phase 1 — 22 new Chaos cards', () => {
  it('ships 58 cards in total with unique ids', () => {
    // 60 minus the two removed insurance/counter cards (client: drop the insurance feature).
    expect(CHAOS_CARDS.length).toBe(58);
    expect(new Set(CHAOS_CARDS.map(c => c.id)).size).toBe(58);
  });

  it('keeps 6 cards in each of the first three new categories and 4 in JURIDICAL', () => {
    // JURIDICAL lost its insurance and counter cards; the other three groups are untouched.
    expect(CHAOS_CARDS_M2.length).toBe(22);
    for (const category of ['SOCIAL', 'ENVIRONMENT', 'TECH'] as const) {
      expect(CHAOS_CARDS_M2.filter(c => c.category === category).length, category).toBe(6);
    }
    expect(CHAOS_CARDS_M2.filter(c => c.category === 'JURIDICAL').length).toBe(4);
  });

  it('gives every new card Vietnamese and English copy', () => {
    for (const card of CHAOS_CARDS_M2) {
      expect(card.nameVi, card.id).toBeTruthy();
      expect(card.taglineVi, card.id).toBeTruthy();
      expect(card.descriptionVi, card.id).toBeTruthy();
      expect(card.nameEn, card.id).toBeTruthy();
      expect(card.taglineEn, card.id).toBeTruthy();
      expect(card.flavorTextEn, card.id).toBeTruthy();
      expect(card.descriptionEn, card.id).toBeTruthy();
    }
  });

  it('resolves legacy-free lookups for every new card', () => {
    for (const card of CHAOS_CARDS_M2) {
      expect(getChaosCardById(card.id)?.id).toBe(card.id);
    }
  });
});

describe('Roadmap C phase 1 — damage cap (no harmful card takes more than 25% of cash)', () => {
  it('caps losses at 25% of the victim cash and never below zero', () => {
    expect(CHAOS_LOSS_CAP_RATIO).toBe(0.25);
    expect(capChaosLoss(1000, 900)).toBe(250);
    expect(capChaosLoss(1000, 100)).toBe(100);
    expect(capChaosLoss(0, 100)).toBe(0);
    expect(capChaosLoss(1000, -50)).toBe(0);
  });

  it('holds for every harmful card in the deck, across several cash levels', () => {
    const harmful = CHAOS_CARDS.filter(isHarmfulCard);
    expect(harmful.length).toBeGreaterThan(0);

    for (const cash of [40, 400, 1000, 5000]) {
      for (const card of harmful) {
        const state = startState([cash, cash]);
        const after = applyChaosCard(state, card, createPRNG(7));
        const cap = Math.floor(cash * CHAOS_LOSS_CAP_RATIO);

        for (let i = 0; i < state.players.length; i++) {
          const lost = state.players[i].cash - after.players[i].cash;
          expect(lost, `${card.id} @${cash} player ${i}`).toBeLessThanOrEqual(cap);
          expect(after.players[i].cash, `${card.id} @${cash} player ${i}`).toBeGreaterThanOrEqual(0);
        }
        expect(after.pendingDebt, `${card.id} @${cash}`).toBeFalsy();
      }
    }
  });
});

describe('Chaos has no protection layer (insurance and counters removed)', () => {
  /**
   * The client asked to drop the Chaos insurance feature. The counter charge existed only as
   * insurance's partner mechanic, so both are gone: harmful cards now always land, and the
   * only protection is the 25% damage cap asserted above.
   */
  it('no longer ships insurance or counter cards in the deck', () => {
    expect(getChaosCardById('jur-insurance-policy')).toBeUndefined();
    expect(getChaosCardById('jur-counter-suit')).toBeUndefined();
  });

  it('harmful cards always apply now that nothing blocks them', () => {
    const base = startState([1000, 1000]);
    const cashHit = getChaosCardById('soc-flood-donation')!;
    const after = applyChaosCard(base, cashHit, createPRNG(3));
    expect(after.players[after.activePlayerIndex].cash).toBeLessThan(1000);
  });

  it('exposes no insurance fields on players or actions', () => {
    const state = startState([1000, 1000]);
    const actor = state.players[state.activePlayerIndex] as unknown as Record<string, unknown>;
    expect(actor.insuranceTurns).toBeUndefined();
    expect(actor.counterCharges).toBeUndefined();
  });
});

describe('Roadmap C phase 1 — new effect types', () => {
  it('visual-only environment cards move no money', () => {
    const state = startState([1000, 1000]);
    for (const card of CHAOS_CARDS_M2.filter(c => c.effectType === 'VISION_SHIFT')) {
      const after = applyChaosCard(state, card, createPRNG(1));
      expect(after.players.map(p => p.cash)).toEqual([1000, 1000]);
    }
  });
});
