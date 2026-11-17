import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeLedgerTransaction,
  assertMoneyConservation,
  verifyLedgerAudit,
  resetLedgerSequence,
} from '../economy/ledgerEngine';
import { PlayerState, LedgerEntry } from '../types';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';

function createMockPlayer(id: string, cash: number, name = `Player ${id}`): PlayerState {
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

describe('Milestone 1: Central Ledger Engine & Solvency Architecture', () => {
  let p1: PlayerState;
  let p2: PlayerState;
  let players: PlayerState[];

  beforeEach(() => {
    resetLedgerSequence(1);
    p1 = createMockPlayer('p1', 1500, 'Alice');
    p2 = createMockPlayer('p2', 1500, 'Bob');
    players = [p1, p2];
  });

  describe('1. Double-Entry Accounting & Money Conservation', () => {
    it('executes atomic P2P transaction conserving total money supply', () => {
      const res = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: 300,
        roundNumber: 1,
        memo: 'Test rent',
      });

      expect(res.success).toBe(true);
      expect(res.actualPaid).toBe(300);
      expect(res.newPlayers[0].cash).toBe(1200);
      expect(res.newPlayers[1].cash).toBe(1800);
      expect(res.entry?.balanceBefore).toEqual({ from: 1500, to: 1500 });
      expect(res.entry?.balanceAfter).toEqual({ from: 1200, to: 1800 });
      expect(res.newPlayers[0].cash + res.newPlayers[1].cash).toBe(3000);
    });

    it('executes Bank payout (SALARY_START) with proper delta accounting', () => {
      const res = executeLedgerTransaction(players, {
        category: 'SALARY_START',
        from: 'BANK',
        to: 'p1',
        amount: 200,
        roundNumber: 1,
        memo: 'Salary GO',
      });

      expect(res.success).toBe(true);
      expect(res.newPlayers[0].cash).toBe(1700);
      expect(res.newPlayers[1].cash).toBe(1500);
      expect(res.entry?.balanceBefore.from).toBeUndefined();
      expect(res.entry?.balanceBefore.to).toBe(1500);
      expect(res.entry?.balanceAfter.to).toBe(1700);
    });

    it('executes Bank deposit (TAX_PAYMENT) with proper delta accounting', () => {
      const res = executeLedgerTransaction(players, {
        category: 'TAX_PAYMENT',
        from: 'p1',
        to: 'BANK',
        amount: 200,
        roundNumber: 1,
        memo: 'Luxury Tax',
      });

      expect(res.success).toBe(true);
      expect(res.newPlayers[0].cash).toBe(1300);
      expect(res.entry?.balanceBefore.from).toBe(1500);
      expect(res.entry?.balanceAfter.to).toBeUndefined();
    });

    it('throws error when money conservation is violated', () => {
      const corruptedEntry = {
        id: 'tx-bad',
        sequence: 99,
        timestamp: Date.now(),
        roundNumber: 1,
        category: 'RENT_PAYMENT' as const,
        fromPlayerId: 'p1',
        toPlayerId: 'p2',
        amount: 300,
        balanceBefore: { from: 1500, to: 1500 },
        balanceAfter: { from: 1200, to: 1900 }, // extra 100 created out of thin air!
        memo: 'Corrupted',
      };
      const badAfter = [createMockPlayer('p1', 1200), createMockPlayer('p2', 1900)];
      expect(() => assertMoneyConservation(players, badAfter, corruptedEntry)).toThrow(
        /MONEY CONSERVATION VIOLATION/
      );
    });
  });

  describe('2. Non-Negative Cash Invariant Enforcement', () => {
    it('rejects transaction when payer is insolvent and allowPartial is false', () => {
      const poorPlayer = createMockPlayer('p1', 100);
      const res = executeLedgerTransaction([poorPlayer, p2], {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: 250,
        roundNumber: 1,
        memo: 'Too expensive rent',
        allowPartial: false,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('INSUFFICIENT_FUNDS');
      expect(res.shortfall).toBe(150);
      expect(res.newPlayers[0].cash).toBe(100); // Balance untouched
    });

    it('allows partial payment when allowPartial is true without making cash negative', () => {
      const poorPlayer = createMockPlayer('p1', 100);
      const res = executeLedgerTransaction([poorPlayer, p2], {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: 250,
        roundNumber: 1,
        memo: 'Partial rent',
        allowPartial: true,
      });

      expect(res.success).toBe(true);
      expect(res.actualPaid).toBe(100);
      expect(res.shortfall).toBe(150);
      expect(res.newPlayers[0].cash).toBe(0); // Zeroed, never negative!
      expect(res.newPlayers[1].cash).toBe(1600);
    });

    it('rejects transaction with invalid or negative amounts', () => {
      const res = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: -50,
        roundNumber: 1,
        memo: 'Negative amount',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('INVALID_AMOUNT');
    });

    it('rejects transaction where sender and receiver are identical', () => {
      const res = executeLedgerTransaction(players, {
        category: 'TRADE_CASH',
        from: 'p1',
        to: 'p1',
        amount: 100,
        roundNumber: 1,
        memo: 'Self transfer',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('IDENTICAL_PARTIES');
    });
  });

  describe('3. Statistics Isolation & Integrity', () => {
    it('increments rentPaid and rentCollected ONLY on RENT_PAYMENT', () => {
      const res = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: 200,
        roundNumber: 1,
        memo: 'Rent',
      });

      expect(res.newPlayers[0].stats.rentPaid).toBe(200);
      expect(res.newPlayers[1].stats.rentCollected).toBe(200);
    });

    it('DOES NOT increment rentPaid or rentCollected on TRADE_CASH', () => {
      const res = executeLedgerTransaction(players, {
        category: 'TRADE_CASH',
        from: 'p1',
        to: 'p2',
        amount: 500,
        roundNumber: 2,
        memo: 'Trade payment',
      });

      expect(res.newPlayers[0].cash).toBe(1000);
      expect(res.newPlayers[1].cash).toBe(2000);
      expect(res.newPlayers[0].stats.rentPaid).toBe(0);
      expect(res.newPlayers[1].stats.rentCollected).toBe(0);
    });

    it('DOES NOT increment rentPaid on TAX_PAYMENT or BAIL_PAYMENT', () => {
      const taxRes = executeLedgerTransaction(players, {
        category: 'TAX_PAYMENT',
        from: 'p1',
        to: 'BANK',
        amount: 150,
        roundNumber: 1,
        memo: 'Income tax',
      });
      expect(taxRes.newPlayers[0].stats.rentPaid).toBe(0);

      const bailRes = executeLedgerTransaction(players, {
        category: 'BAIL_PAYMENT',
        from: 'p1',
        to: 'BANK',
        amount: 100,
        roundNumber: 1,
        memo: 'Bail',
      });
      expect(bailRes.newPlayers[0].stats.rentPaid).toBe(0);
    });

    it('properly attributes DEBT_SETTLEMENT to rent stats only if debtCategory is RENT_PAYMENT', () => {
      const rentDebtRes = executeLedgerTransaction(players, {
        category: 'DEBT_SETTLEMENT',
        from: 'p1',
        to: 'p2',
        amount: 300,
        roundNumber: 3,
        memo: 'Settling rent debt',
        debtCategory: 'RENT_PAYMENT',
      });
      expect(rentDebtRes.newPlayers[0].stats.rentPaid).toBe(300);
      expect(rentDebtRes.newPlayers[1].stats.rentCollected).toBe(300);

      const taxDebtRes = executeLedgerTransaction(players, {
        category: 'DEBT_SETTLEMENT',
        from: 'p1',
        to: 'BANK',
        amount: 300,
        roundNumber: 3,
        memo: 'Settling tax debt',
        debtCategory: 'TAX_PAYMENT',
      });
      expect(taxDebtRes.newPlayers[0].stats.rentPaid).toBe(0);
    });
  });

  describe('4. Ledger Audit Replay Verification', () => {
    it('successfully audits sequence of transactions against initial balances', () => {
      let statePlayers = [createMockPlayer('p1', 1500), createMockPlayer('p2', 1500)];
      const history: LedgerEntry[] = [];

      // 1. p1 buys property ($300k)
      const t1 = executeLedgerTransaction(statePlayers, {
        category: 'PROPERTY_PURCHASE',
        from: 'p1',
        to: 'BANK',
        amount: 300,
        roundNumber: 1,
        memo: 'Buy',
      }, history);
      statePlayers = t1.newPlayers;
      if (t1.entry) history.push(t1.entry);

      // 2. p2 pays rent to p1 ($100k)
      const t2 = executeLedgerTransaction(statePlayers, {
        category: 'RENT_PAYMENT',
        from: 'p2',
        to: 'p1',
        amount: 100,
        roundNumber: 1,
        memo: 'Rent',
      }, history);
      statePlayers = t2.newPlayers;
      if (t2.entry) history.push(t2.entry);

      // 3. p1 upgrades ($150k)
      const t3 = executeLedgerTransaction(statePlayers, {
        category: 'PROPERTY_UPGRADE',
        from: 'p1',
        to: 'BANK',
        amount: 150,
        roundNumber: 2,
        memo: 'Upgrade',
      }, history);
      statePlayers = t3.newPlayers;
      if (t3.entry) history.push(t3.entry);

      // Verify audit
      const audit = verifyLedgerAudit(1500, statePlayers, history);
      expect(audit.isValid).toBe(true);
      expect(audit.discrepancies).toHaveLength(0);
    });
  });
});
