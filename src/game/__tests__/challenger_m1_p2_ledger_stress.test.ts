/**
 * src/game/__tests__/challenger_m1_p2_ledger_stress.test.ts
 *
 * Empirical Challenger M1-1 Stress Test Suite for Phase 02 Milestone 1:
 * Comprehensive stress testing, adversarial boundary probing, invariant oracles,
 * and forensic audit verification for the Centralized Ledger Engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeLedgerTransaction,
  assertMoneyConservation,
  verifyLedgerAudit,
  resetLedgerSequence,
  getPlayerLiquidCash,
} from '../economy/ledgerEngine';
import { PlayerState, LedgerEntry, TransactionCategory } from '../types';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';

/**
 * Deterministic PRNG (Mulberry32) for 100% reproducible adversarial generation.
 */
function createMulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createPlayer(id: string, cash: number, name = `Player ${id}`): PlayerState {
  return {
    id,
    name,
    token: DEFAULT_PLAYER_TOKENS[0],
    cash,
    position: 0,
    inDetention: false,
    detentionTurns: 0,
    jailFreeCards: 0,
    isBankrupt: false,
    consecutiveDoubles: 0,
    stats: {
      rentPaid: 0,
      rentCollected: 0,
      chaosTriggered: 0,
      tilesTraveled: 0,
      propertiesOwned: 0,
    },
  };
}

describe('Challenger M1-1: Empirical Ledger Stress & Invariant Verification', () => {
  beforeEach(() => {
    resetLedgerSequence(1);
  });

  describe('Suite 1: High-Volume Randomized Sequential Transactions (100+ & 500+ Runs)', () => {
    it('executes 500 sequential random transactions without money leakage or negative cash', () => {
      const rng = createMulberry32(133742);
      const INITIAL_CASH = 2000;
      let players: PlayerState[] = [
        createPlayer('p1', INITIAL_CASH, 'Alice'),
        createPlayer('p2', INITIAL_CASH, 'Bob'),
        createPlayer('p3', INITIAL_CASH, 'Charlie'),
        createPlayer('p4', INITIAL_CASH, 'Diana'),
      ];
      const history: LedgerEntry[] = [];

      const categories: TransactionCategory[] = [
        'RENT_PAYMENT',
        'SALARY_START',
        'TAX_PAYMENT',
        'PROPERTY_PURCHASE',
        'PROPERTY_UPGRADE',
        'PROPERTY_DOWNGRADE',
        'PROPERTY_MORTGAGE',
        'PROPERTY_UNMORTGAGE',
        'BAIL_PAYMENT',
        'AUCTION_WIN',
        'CHAOS_EFFECT',
        'DEBT_SETTLEMENT',
        'TRADE_CASH',
      ];

      let bankPayoutSum = 0;
      let bankDepositSum = 0;

      for (let i = 0; i < 500; i++) {
        const roundNumber = Math.floor(i / 10) + 1;
        const cat = categories[Math.floor(rng() * categories.length)];
        const allowPartial = rng() > 0.5;
        const rawAmount = Math.floor(rng() * 400); // 0 to 399

        let from: string | 'BANK';
        let to: string | 'BANK';

        // Direct parties appropriately based on category
        if (cat === 'SALARY_START' || cat === 'PROPERTY_MORTGAGE' || cat === 'PROPERTY_DOWNGRADE') {
          from = 'BANK';
          to = players[Math.floor(rng() * players.length)].id;
        } else if (
          cat === 'TAX_PAYMENT' ||
          cat === 'BAIL_PAYMENT' ||
          cat === 'PROPERTY_PURCHASE' ||
          cat === 'PROPERTY_UPGRADE' ||
          cat === 'PROPERTY_UNMORTGAGE' ||
          cat === 'AUCTION_WIN'
        ) {
          from = players[Math.floor(rng() * players.length)].id;
          to = 'BANK';
        } else if (cat === 'CHAOS_EFFECT') {
          if (rng() > 0.5) {
            from = 'BANK';
            to = players[Math.floor(rng() * players.length)].id;
          } else {
            from = players[Math.floor(rng() * players.length)].id;
            to = 'BANK';
          }
        } else {
          // P2P: RENT_PAYMENT, TRADE_CASH, DEBT_SETTLEMENT
          const pIdx1 = Math.floor(rng() * players.length);
          let pIdx2 = Math.floor(rng() * players.length);
          if (pIdx1 === pIdx2) {
            pIdx2 = (pIdx1 + 1) % players.length;
          }
          from = players[pIdx1].id;
          to = players[pIdx2].id;
        }

        const res = executeLedgerTransaction(
          players,
          {
            category: cat,
            from,
            to,
            amount: rawAmount,
            roundNumber,
            memo: `Stress Tx #${i + 1} (${cat})`,
            allowPartial,
            debtCategory: cat === 'DEBT_SETTLEMENT' ? 'RENT_PAYMENT' : undefined,
          },
          history
        );

        if (res.success && res.entry) {
          players = res.newPlayers;
          history.push(res.entry);

          // Update expected bank flow
          if (from === 'BANK') bankPayoutSum += res.entry.amount;
          if (to === 'BANK') bankDepositSum += res.entry.amount;

          // Invariant Check A: Strictly non-negative cash balances
          for (const p of players) {
            expect(p.cash).toBeGreaterThanOrEqual(0);
          }

          // Invariant Check B: Monotonic sequence numbering
          expect(res.entry.sequence).toBe(history.length);
        } else {
          // If transaction was rejected, balances must remain identical
          expect(res.newPlayers).toBe(players);
          expect(res.actualPaid).toBe(0);
        }

        // Invariant Check C: Global money conservation across players & bank
        const currentTotalCash = players.reduce((sum, p) => sum + p.cash, 0);
        const expectedTotalCash = 4 * INITIAL_CASH + bankPayoutSum - bankDepositSum;
        expect(currentTotalCash).toBe(expectedTotalCash);
      }

      // Replay Audit Verification
      expect(history.length).toBeGreaterThan(150);
      const audit = verifyLedgerAudit(INITIAL_CASH, players, history);
      expect(audit.isValid).toBe(true);
      expect(audit.discrepancies).toHaveLength(0);
    });

    it('survives high-concurrency stress test with 1,000 rapid transactions', () => {
      const rng = createMulberry32(987654);
      const INITIAL_CASH = 5000;
      let players: PlayerState[] = [
        createPlayer('p1', INITIAL_CASH, 'Player 1'),
        createPlayer('p2', INITIAL_CASH, 'Player 2'),
        createPlayer('p3', INITIAL_CASH, 'Player 3'),
      ];
      const history: LedgerEntry[] = [];

      for (let i = 0; i < 1000; i++) {
        const fromIdx = Math.floor(rng() * 4); // 0-2: players, 3: Bank
        const toIdx = Math.floor(rng() * 4);
        const from = fromIdx === 3 ? 'BANK' : players[fromIdx].id;
        const to = toIdx === 3 ? 'BANK' : players[toIdx].id;

        if (from === to) continue;

        const amount = Math.floor(rng() * 300);
        const allowPartial = rng() > 0.4;

        const res = executeLedgerTransaction(
          players,
          {
            category: from === 'BANK' ? 'SALARY_START' : to === 'BANK' ? 'TAX_PAYMENT' : 'RENT_PAYMENT',
            from,
            to,
            amount,
            roundNumber: 1,
            memo: `Rapid Tx ${i}`,
            allowPartial,
          },
          history
        );

        if (res.success && res.entry) {
          players = res.newPlayers;
          history.push(res.entry);
        }
      }

      for (const p of players) {
        expect(p.cash).toBeGreaterThanOrEqual(0);
      }

      const audit = verifyLedgerAudit(INITIAL_CASH, players, history);
      expect(audit.isValid).toBe(true);
      expect(audit.discrepancies).toHaveLength(0);
    });
  });

  describe('Suite 2: Boundary Cases, Overdrafts, and $0 Balance Behavior', () => {
    it('handles $0 balance payments correctly with both allowPartial true and false', () => {
      const pZero = createPlayer('pZero', 0, 'Zero Cash');
      const pBob = createPlayer('pBob', 1000, 'Bob');
      const players = [pZero, pBob];

      // 1. $0 balance attempts to pay $0 (allowPartial = false) -> should succeed cleanly
      const res0 = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'pZero',
        to: 'pBob',
        amount: 0,
        roundNumber: 1,
        memo: 'Pay $0 rent',
        allowPartial: false,
      });
      expect(res0.success).toBe(true);
      expect(res0.actualPaid).toBe(0);
      expect(res0.shortfall).toBe(0);
      expect(res0.newPlayers[0].cash).toBe(0);
      expect(res0.newPlayers[1].cash).toBe(1000);

      // 2. $0 balance attempts to pay $100 with allowPartial = false -> fails with INSUFFICIENT_FUNDS
      const resInsolvent = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'pZero',
        to: 'pBob',
        amount: 100,
        roundNumber: 1,
        memo: 'Insolvent rent',
        allowPartial: false,
      });
      expect(resInsolvent.success).toBe(false);
      expect(resInsolvent.error).toBe('INSUFFICIENT_FUNDS');
      expect(resInsolvent.actualPaid).toBe(0);
      expect(resInsolvent.shortfall).toBe(100);
      expect(resInsolvent.newPlayers[0].cash).toBe(0);

      // 3. $0 balance attempts to pay $100 with allowPartial = true -> succeeds with actualPaid 0 & shortfall 100
      const resPartial = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'pZero',
        to: 'pBob',
        amount: 100,
        roundNumber: 1,
        memo: 'Partial $0 rent',
        allowPartial: true,
      });
      expect(resPartial.success).toBe(true);
      expect(resPartial.actualPaid).toBe(0);
      expect(resPartial.shortfall).toBe(100);
      expect(resPartial.newPlayers[0].cash).toBe(0);
      expect(resPartial.newPlayers[1].cash).toBe(1000); // Bob gets $0
      expect(resPartial.entry?.amount).toBe(0);
    });

    it('handles exact-balance payments without overdraft', () => {
      const p1 = createPlayer('p1', 250);
      const p2 = createPlayer('p2', 100);
      const players = [p1, p2];

      const res = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: 250,
        roundNumber: 1,
        memo: 'Exact rent',
        allowPartial: false,
      });

      expect(res.success).toBe(true);
      expect(res.actualPaid).toBe(250);
      expect(res.shortfall).toBe(0);
      expect(res.newPlayers[0].cash).toBe(0);
      expect(res.newPlayers[1].cash).toBe(350);
    });

    it('rejects overdraft attempt by 1 unit ($251 requested on $250 balance)', () => {
      const p1 = createPlayer('p1', 250);
      const p2 = createPlayer('p2', 100);
      const players = [p1, p2];

      const res = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: 251,
        roundNumber: 1,
        memo: 'Overdraft by 1',
        allowPartial: false,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('INSUFFICIENT_FUNDS');
      expect(res.actualPaid).toBe(0);
      expect(res.shortfall).toBe(1);
      expect(res.newPlayers[0].cash).toBe(250);
    });

    it('executes multi-step partial debt settlement with stats tracking', () => {
      let statePlayers = [createPlayer('p1', 300, 'Debtor'), createPlayer('p2', 500, 'Creditor')];
      const history: LedgerEntry[] = [];

      // Step 1: Debtor owes $1,000 rent debt, pays available $300
      const t1 = executeLedgerTransaction(
        statePlayers,
        {
          category: 'DEBT_SETTLEMENT',
          from: 'p1',
          to: 'p2',
          amount: 1000,
          roundNumber: 1,
          memo: 'Partial debt tranche 1',
          allowPartial: true,
          debtCategory: 'RENT_PAYMENT',
        },
        history
      );

      expect(t1.success).toBe(true);
      expect(t1.actualPaid).toBe(300);
      expect(t1.shortfall).toBe(700);
      expect(t1.newPlayers[0].cash).toBe(0);
      expect(t1.newPlayers[1].cash).toBe(800);
      expect(t1.newPlayers[0].stats.rentPaid).toBe(300);
      expect(t1.newPlayers[1].stats.rentCollected).toBe(300);

      statePlayers = t1.newPlayers;
      if (t1.entry) history.push(t1.entry);

      // Step 2: Debtor receives $400 from Bank mortgage
      const t2 = executeLedgerTransaction(
        statePlayers,
        {
          category: 'PROPERTY_MORTGAGE',
          from: 'BANK',
          to: 'p1',
          amount: 400,
          roundNumber: 2,
          memo: 'Mortgage payout',
        },
        history
      );
      statePlayers = t2.newPlayers;
      if (t2.entry) history.push(t2.entry);
      expect(statePlayers[0].cash).toBe(400);

      // Step 3: Debtor settles remaining $700 debt tranche with available $400
      const t3 = executeLedgerTransaction(
        statePlayers,
        {
          category: 'DEBT_SETTLEMENT',
          from: 'p1',
          to: 'p2',
          amount: 700,
          roundNumber: 2,
          memo: 'Partial debt tranche 2',
          allowPartial: true,
          debtCategory: 'RENT_PAYMENT',
        },
        history
      );

      expect(t3.success).toBe(true);
      expect(t3.actualPaid).toBe(400);
      expect(t3.shortfall).toBe(300);
      expect(t3.newPlayers[0].cash).toBe(0);
      expect(t3.newPlayers[1].cash).toBe(1200);
      expect(t3.newPlayers[0].stats.rentPaid).toBe(700); // 300 + 400
      expect(t3.newPlayers[1].stats.rentCollected).toBe(700);

      statePlayers = t3.newPlayers;
      if (t3.entry) history.push(t3.entry);

      // Verify audit replay of this partial debt lifecycle
      const audit = verifyLedgerAudit(300, [statePlayers[0]], [history[0], history[1], history[2]]);
      expect(audit.isValid).toBe(true);
      expect(statePlayers[0].cash).toBe(0);
    });

    it('rejects transactions on bankrupt players', () => {
      const p1 = createPlayer('p1', 500);
      const bankruptP2: PlayerState = { ...createPlayer('p2', 0), isBankrupt: true };
      const players = [p1, bankruptP2];

      // Debit from bankrupt player
      const debitRes = executeLedgerTransaction(players, {
        category: 'TAX_PAYMENT',
        from: 'p2',
        to: 'BANK',
        amount: 50,
        roundNumber: 1,
        memo: 'Tax on bankrupt player',
      });
      expect(debitRes.success).toBe(false);
      expect(debitRes.error).toBe('PLAYER_BANKRUPT');

      // Credit to bankrupt player
      const creditRes = executeLedgerTransaction(players, {
        category: 'SALARY_START',
        from: 'BANK',
        to: 'p2',
        amount: 200,
        roundNumber: 1,
        memo: 'Salary on bankrupt player',
      });
      expect(creditRes.success).toBe(false);
      expect(creditRes.error).toBe('PLAYER_BANKRUPT');
    });

    it('rejects invalid amounts: negative, NaN, and non-finite values', () => {
      const players = [createPlayer('p1', 1000), createPlayer('p2', 1000)];

      for (const badAmount of [-1, -0.001, -100, NaN, Infinity, -Infinity]) {
        const res = executeLedgerTransaction(players, {
          category: 'TRADE_CASH',
          from: 'p1',
          to: 'p2',
          amount: badAmount,
          roundNumber: 1,
          memo: `Bad amount: ${badAmount}`,
        });
        expect(res.success).toBe(false);
        expect(res.error).toBe('INVALID_AMOUNT');
      }
    });

    it('floors floating-point transaction amounts to eliminate fraction leaks', () => {
      const players = [createPlayer('p1', 1000), createPlayer('p2', 1000)];

      const res = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: 99.87,
        roundNumber: 1,
        memo: 'Float amount',
      });

      expect(res.success).toBe(true);
      expect(res.actualPaid).toBe(99);
      expect(res.entry?.amount).toBe(99);
      expect(res.newPlayers[0].cash).toBe(901);
      expect(res.newPlayers[1].cash).toBe(1099);
      expect(res.newPlayers[0].cash + res.newPlayers[1].cash).toBe(2000);
    });

    it('rejects transaction when payer or recipient ID is not found', () => {
      const players = [createPlayer('p1', 1000)];

      const res1 = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'ghost_payer',
        to: 'p1',
        amount: 50,
        roundNumber: 1,
        memo: 'Ghost',
      });
      expect(res1.success).toBe(false);
      expect(res1.error).toBe('PLAYER_NOT_FOUND');

      const res2 = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'ghost_recipient',
        amount: 50,
        roundNumber: 1,
        memo: 'Ghost',
      });
      expect(res2.success).toBe(false);
      expect(res2.error).toBe('PLAYER_NOT_FOUND');
    });

    it('getPlayerLiquidCash returns 0 for bankrupt or negative balances', () => {
      expect(getPlayerLiquidCash(createPlayer('p1', 500))).toBe(500);
      expect(getPlayerLiquidCash(createPlayer('p1', 0))).toBe(0);
      expect(getPlayerLiquidCash(createPlayer('p1', -100))).toBe(0);

      const bankrupt = { ...createPlayer('p1', 300), isBankrupt: true };
      expect(getPlayerLiquidCash(bankrupt)).toBe(0);
    });
  });

  describe('Suite 3: Conservation Invariant & Adversarial Oracle Testing', () => {
    it('assertMoneyConservation verifies legitimate P2P and Bank transfers without throwing', () => {
      const before = [createPlayer('p1', 1000), createPlayer('p2', 1000)];

      // 1. Valid P2P
      const afterP2P = [createPlayer('p1', 800), createPlayer('p2', 1200)];
      const entryP2P: LedgerEntry = {
        id: 'tx-1',
        sequence: 1,
        timestamp: Date.now(),
        roundNumber: 1,
        category: 'RENT_PAYMENT',
        fromPlayerId: 'p1',
        toPlayerId: 'p2',
        amount: 200,
        balanceBefore: { from: 1000, to: 1000 },
        balanceAfter: { from: 800, to: 1200 },
        memo: 'Valid P2P',
      };
      expect(() => assertMoneyConservation(before, afterP2P, entryP2P)).not.toThrow();

      // 2. Valid Bank Payout
      const afterPayout = [createPlayer('p1', 1200), createPlayer('p2', 1000)];
      const entryPayout: LedgerEntry = {
        id: 'tx-2',
        sequence: 2,
        timestamp: Date.now(),
        roundNumber: 1,
        category: 'SALARY_START',
        fromPlayerId: 'BANK',
        toPlayerId: 'p1',
        amount: 200,
        balanceBefore: { to: 1000 },
        balanceAfter: { to: 1200 },
        memo: 'Salary',
      };
      expect(() => assertMoneyConservation(before, afterPayout, entryPayout)).not.toThrow();

      // 3. Valid Bank Deposit
      const afterDeposit = [createPlayer('p1', 800), createPlayer('p2', 1000)];
      const entryDeposit: LedgerEntry = {
        id: 'tx-3',
        sequence: 3,
        timestamp: Date.now(),
        roundNumber: 1,
        category: 'TAX_PAYMENT',
        fromPlayerId: 'p1',
        toPlayerId: 'BANK',
        amount: 200,
        balanceBefore: { from: 1000 },
        balanceAfter: { from: 800 },
        memo: 'Tax',
      };
      expect(() => assertMoneyConservation(before, afterDeposit, entryDeposit)).not.toThrow();
    });

    it('assertMoneyConservation catches even a single $1 artificial money leak or destruction', () => {
      const before = [createPlayer('p1', 1000), createPlayer('p2', 1000)];
      const baseEntry: LedgerEntry = {
        id: 'tx-test',
        sequence: 1,
        timestamp: Date.now(),
        roundNumber: 1,
        category: 'RENT_PAYMENT',
        fromPlayerId: 'p1',
        toPlayerId: 'p2',
        amount: 100,
        balanceBefore: { from: 1000, to: 1000 },
        balanceAfter: { from: 900, to: 1100 },
        memo: 'P2P rent',
      };

      // Scenario A: P2P +$1 creation
      const badAfterPlus1 = [createPlayer('p1', 900), createPlayer('p2', 1101)];
      expect(() => assertMoneyConservation(before, badAfterPlus1, baseEntry)).toThrow(
        /MONEY CONSERVATION VIOLATION.*altered total cash by 1/
      );

      // Scenario B: P2P -$1 destruction
      const badAfterMinus1 = [createPlayer('p1', 900), createPlayer('p2', 1099)];
      expect(() => assertMoneyConservation(before, badAfterMinus1, baseEntry)).toThrow(
        /MONEY CONSERVATION VIOLATION.*altered total cash by -1/
      );

      // Scenario C: Bank payout mismatch
      const bankPayoutEntry: LedgerEntry = {
        ...baseEntry,
        fromPlayerId: 'BANK',
        toPlayerId: 'p1',
        amount: 200,
      };
      const badPayoutDelta = [createPlayer('p1', 1199), createPlayer('p2', 1000)]; // expected +200, got +199
      expect(() => assertMoneyConservation(before, badPayoutDelta, bankPayoutEntry)).toThrow(
        /Bank payout tx tx-test expected delta \+200, got 199/
      );

      // Scenario D: Bank deposit mismatch
      const bankDepositEntry: LedgerEntry = {
        ...baseEntry,
        fromPlayerId: 'p1',
        toPlayerId: 'BANK',
        amount: 200,
      };
      const badDepositDelta = [createPlayer('p1', 801), createPlayer('p2', 1000)]; // expected -200, got -199
      expect(() => assertMoneyConservation(before, badDepositDelta, bankDepositEntry)).toThrow(
        /Bank deposit tx tx-test expected delta -200, got -199/
      );
    });
  });

  describe('Suite 4: Replay Audit Forensic Verification & Tamper Detection', () => {
    it('accurately reproduces player cash balances from full ledger audit history', () => {
      let players = [createPlayer('p1', 1500, 'Alice'), createPlayer('p2', 1500, 'Bob')];
      const history: LedgerEntry[] = [];

      // Sequence of realistic game operations
      const ops = [
        { cat: 'SALARY_START', from: 'BANK', to: 'p1', amt: 200 },
        { cat: 'PROPERTY_PURCHASE', from: 'p1', to: 'BANK', amt: 400 },
        { cat: 'RENT_PAYMENT', from: 'p2', to: 'p1', amt: 150 },
        { cat: 'PROPERTY_UPGRADE', from: 'p1', to: 'BANK', amt: 200 },
        { cat: 'TAX_PAYMENT', from: 'p2', to: 'BANK', amt: 100 },
        { cat: 'PROPERTY_MORTGAGE', from: 'BANK', to: 'p2', amt: 250 },
        { cat: 'BAIL_PAYMENT', from: 'p2', to: 'BANK', amt: 50 },
      ] as const;

      for (const op of ops) {
        const res = executeLedgerTransaction(
          players,
          {
            category: op.cat,
            from: op.from,
            to: op.to,
            amount: op.amt,
            roundNumber: 1,
            memo: op.cat,
          },
          history
        );
        expect(res.success).toBe(true);
        players = res.newPlayers;
        if (res.entry) history.push(res.entry);
      }

      const audit = verifyLedgerAudit(1500, players, history);
      expect(audit.isValid).toBe(true);
      expect(audit.discrepancies).toHaveLength(0);
    });

    it('detects state tampering: $1 manual balance alteration triggers audit failure', () => {
      let players = [createPlayer('p1', 1000), createPlayer('p2', 1000)];
      const history: LedgerEntry[] = [];

      const res = executeLedgerTransaction(
        players,
        {
          category: 'RENT_PAYMENT',
          from: 'p1',
          to: 'p2',
          amount: 200,
          roundNumber: 1,
          memo: 'Rent',
        },
        history
      );
      players = res.newPlayers;
      if (res.entry) history.push(res.entry);

      // Tamper with Player 2's cash (+ $1)
      const tamperedPlayers: PlayerState[] = [players[0], { ...players[1], cash: players[1].cash + 1 }];

      const audit = verifyLedgerAudit(1000, tamperedPlayers, history);
      expect(audit.isValid).toBe(false);
      expect(audit.discrepancies.length).toBeGreaterThan(0);
      expect(audit.discrepancies[0]).toMatch(/balance mismatch! Current=1201, Expected=1200, Discrepancy=1/);
    });

    it('detects dropped/skipped transactions in history replay', () => {
      let players = [createPlayer('p1', 1000), createPlayer('p2', 1000)];
      const history: LedgerEntry[] = [];

      // Tx 1: p1 pays p2 100
      const res1 = executeLedgerTransaction(
        players,
        { category: 'RENT_PAYMENT', from: 'p1', to: 'p2', amount: 100, roundNumber: 1, memo: '1' },
        history
      );
      players = res1.newPlayers;
      if (res1.entry) history.push(res1.entry);

      // Tx 2: p1 pays p2 200
      const res2 = executeLedgerTransaction(
        players,
        { category: 'RENT_PAYMENT', from: 'p1', to: 'p2', amount: 200, roundNumber: 1, memo: '2' },
        history
      );
      players = res2.newPlayers;
      if (res2.entry) history.push(res2.entry);

      // Drop Tx 2 from history
      const incompleteHistory = [history[0]];

      const audit = verifyLedgerAudit(1000, players, incompleteHistory);
      expect(audit.isValid).toBe(false);
      expect(audit.discrepancies).toHaveLength(2); // Both p1 and p2 mismatch
    });

    it('detects fraudulent negative balance in replayed history', () => {
      const players = [createPlayer('p1', 1000)];
      // Fabricate history where p1 pays 1200 on 1000 starting cash
      const fakeHistory: LedgerEntry[] = [
        {
          id: 'tx-fake',
          sequence: 1,
          timestamp: Date.now(),
          roundNumber: 1,
          category: 'TAX_PAYMENT',
          fromPlayerId: 'p1',
          toPlayerId: 'BANK',
          amount: 1200,
          balanceBefore: { from: 1000 },
          balanceAfter: { from: -200 },
          memo: 'Fake tax',
        },
      ];

      const audit = verifyLedgerAudit(1000, players, fakeHistory);
      expect(audit.isValid).toBe(false);
      expect(audit.discrepancies.some(d => d.includes('balance dropped below zero (-200)'))).toBe(true);
    });
  });

  describe('Suite 5: Complex State Interaction, Reducer Idempotency & Extreme Invariants', () => {
    it('maintains audit integrity across multi-player matches with bankruptcies', () => {
      const INITIAL_CASH = 1500;
      let players: PlayerState[] = [
        createPlayer('p1', INITIAL_CASH, 'Alice'),
        createPlayer('p2', INITIAL_CASH, 'Bob'),
        createPlayer('p3', INITIAL_CASH, 'Charlie'),
        createPlayer('p4', INITIAL_CASH, 'Dave'),
      ];
      const history: LedgerEntry[] = [];

      // Phase 1: Normal rounds
      const t1 = executeLedgerTransaction(
        players,
        { category: 'SALARY_START', from: 'BANK', to: 'p4', amount: 200, roundNumber: 1, memo: 'Dave Go' },
        history
      );
      players = t1.newPlayers;
      if (t1.entry) history.push(t1.entry);

      const t2 = executeLedgerTransaction(
        players,
        { category: 'RENT_PAYMENT', from: 'p4', to: 'p1', amount: 1500, roundNumber: 1, memo: 'Huge rent' },
        history
      );
      players = t2.newPlayers;
      if (t2.entry) history.push(t2.entry);
      // Dave now has 1700 - 1500 = 200 cash

      // Phase 2: Dave incurs debt exceeding remaining cash and declares bankruptcy
      const t3 = executeLedgerTransaction(
        players,
        {
          category: 'DEBT_SETTLEMENT',
          from: 'p4',
          to: 'p1',
          amount: 500, // Dave owes 500 but only has 200
          roundNumber: 2,
          memo: 'Bankruptcy cash liquidation',
          allowPartial: true,
          debtCategory: 'RENT_PAYMENT',
        },
        history
      );
      expect(t3.success).toBe(true);
      expect(t3.actualPaid).toBe(200);
      expect(t3.shortfall).toBe(300);
      players = t3.newPlayers;
      if (t3.entry) history.push(t3.entry);

      // Dave is marked bankrupt
      players = players.map(p => (p.id === 'p4' ? { ...p, isBankrupt: true, cash: 0 } : p));

      // Phase 3: Continuing 50 transactions between remaining solvent players
      const rng = createMulberry32(54321);
      const solventIds = ['p1', 'p2', 'p3'];

      for (let i = 0; i < 50; i++) {
        const fromIdx = Math.floor(rng() * 4); // 0-2: solvent, 3: Bank
        const toIdx = Math.floor(rng() * 4);
        const from = fromIdx === 3 ? 'BANK' : solventIds[fromIdx];
        const to = toIdx === 3 ? 'BANK' : solventIds[toIdx];

        if (from === to) continue;

        const res = executeLedgerTransaction(
          players,
          {
            category: from === 'BANK' ? 'SALARY_START' : to === 'BANK' ? 'TAX_PAYMENT' : 'RENT_PAYMENT',
            from,
            to,
            amount: Math.floor(rng() * 150) + 10,
            roundNumber: 3,
            memo: `Post-bankruptcy tx ${i}`,
            allowPartial: true,
          },
          history
        );

        if (res.success && res.entry) {
          players = res.newPlayers;
          history.push(res.entry);
        }
      }

      // Verify that audit correctly verifies all solvent players without false alarm on bankrupt Dave
      const audit = verifyLedgerAudit(INITIAL_CASH, players, history);
      expect(audit.isValid).toBe(true);
      expect(audit.discrepancies).toHaveLength(0);
    });

    it('enforces reducer action idempotency, preventing double-debits on duplicate actionId', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      const initialAliceCash = state.players[0].cash;
      const initialLedgerLen = state.ledger?.length || 0;

      // Position Alice on tile 1 (Ninh Kieu, price $60k)
      state = {
        ...state,
        turnPhase: 'ACTION_MENU',
        players: state.players.map((p, idx) => (idx === 0 ? { ...p, position: 1 } : p)),
      };

      const buyAction = {
        type: 'BUY_PROPERTY' as const,
        tileId: 1,
        actionId: 'unique-idempotent-action-101',
        senderPlayerId: state.players[0].id,
      };

      // First dispatch: should succeed and debit $60k
      const stateAfterFirst = gameReducer(state, buyAction);
      expect(stateAfterFirst.players[0].cash).toBe(initialAliceCash - 60);
      expect(stateAfterFirst.ledger?.length).toBe(initialLedgerLen + 1);
      expect(stateAfterFirst.processedActionIds).toContain('unique-idempotent-action-101');

      // Second dispatch with duplicate actionId: must be silently dropped
      const stateAfterSecond = gameReducer(stateAfterFirst, buyAction);
      expect(stateAfterSecond.players[0].cash).toBe(initialAliceCash - 60); // Not debited again!
      expect(stateAfterSecond.ledger?.length).toBe(initialLedgerLen + 1); // No duplicate ledger entry!
      expect(stateAfterSecond).toBe(stateAfterFirst); // Exact state reference preserved
    });

    it('rejects unauthorized financial actions from non-turn players', () => {
      let state = gameReducer(INITIAL_GAME_STATE, {
        type: 'START_GAME',
        players: [
          { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
          { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
        ],
      });

      // Alice is active player (activePlayerIndex = 0)
      expect(state.activePlayerIndex).toBe(0);
      const bob = state.players[1];
      const initialBobCash = bob.cash;

      // Bob tries to act out of turn with his senderPlayerId
      const unauthorizedAction = {
        type: 'BUY_PROPERTY' as const,
        tileId: 1,
        actionId: 'unauthorized-tx-999',
        senderPlayerId: bob.id,
      };

      const resultState = gameReducer(state, unauthorizedAction);
      // State should be completely untouched
      expect(resultState.players[1].cash).toBe(initialBobCash);
      expect(resultState.ledger?.length || 0).toBe(0);
      expect(resultState).toBe(state);
    });

    it('handles extreme magnitude transactions (up to 10^12) with zero floating-point drift', () => {
      const p1 = createPlayer('p1', 0);
      const p2 = createPlayer('p2', 0);
      let players = [p1, p2];
      const history: LedgerEntry[] = [];

      const TRILLION = 1_000_000_000_000;
      const FOUR_HUNDRED_BILLION = 400_000_000_000;

      // Bank credits 1 Trillion to p1
      const t1 = executeLedgerTransaction(
        players,
        {
          category: 'SALARY_START',
          from: 'BANK',
          to: 'p1',
          amount: TRILLION,
          roundNumber: 1,
          memo: 'Trillion bailout',
        },
        history
      );
      expect(t1.success).toBe(true);
      expect(t1.newPlayers[0].cash).toBe(TRILLION);
      players = t1.newPlayers;
      if (t1.entry) history.push(t1.entry);

      // p1 transfers 400 Billion to p2
      const t2 = executeLedgerTransaction(
        players,
        {
          category: 'TRADE_CASH',
          from: 'p1',
          to: 'p2',
          amount: FOUR_HUNDRED_BILLION,
          roundNumber: 1,
          memo: 'Megadeal',
        },
        history
      );
      expect(t2.success).toBe(true);
      expect(t2.newPlayers[0].cash).toBe(600_000_000_000);
      expect(t2.newPlayers[1].cash).toBe(FOUR_HUNDRED_BILLION);
      players = t2.newPlayers;
      if (t2.entry) history.push(t2.entry);

      const audit = verifyLedgerAudit(0, players, history);
      expect(audit.isValid).toBe(true);
      expect(audit.discrepancies).toHaveLength(0);
    });
  });
});
