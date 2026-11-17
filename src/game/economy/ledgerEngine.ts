/**
 * src/game/economy/ledgerEngine.ts
 *
 * Authoritative Centralized Double-Entry Ledger Engine for CHAOS MONOPOLY.
 * Enforces non-negative cash invariant, strict money conservation, audit replay,
 * and isolated financial statistics attribution.
 */

import {
  LedgerEntry,
  LedgerParty,
  LedgerResult,
  PlayerId,
  PlayerState,
  TileId,
  TransactionCategory,
} from '../types';

export interface ExecuteTransactionParams {
  category: TransactionCategory;
  from: LedgerParty;
  to: LedgerParty;
  amount: number;
  roundNumber: number;
  tileId?: TileId;
  memo: string;
  allowPartial?: boolean;
  debtCategory?: TransactionCategory;
}

let globalTxSequence = 1;

/**
 * Resets internal global sequence counter (useful for deterministic testing).
 */
export function resetLedgerSequence(startSeq: number = 1): void {
  globalTxSequence = startSeq;
}

/**
 * Returns available liquid cash for a player, clamped to minimum 0.
 */
export function getPlayerLiquidCash(player: PlayerState): number {
  if (player.isBankrupt) return 0;
  return Math.max(0, player.cash);
}

/**
 * Validates money conservation across a double-entry transaction.
 * Throws an Error if delta sum of player balances does not match Bank transaction direction.
 */
export function assertMoneyConservation(
  before: PlayerState[],
  after: PlayerState[],
  entry: LedgerEntry
): void {
  const sumBefore = before.reduce((acc, p) => acc + (p.isBankrupt ? 0 : p.cash), 0);
  const sumAfter = after.reduce((acc, p) => acc + (p.isBankrupt ? 0 : p.cash), 0);
  const delta = sumAfter - sumBefore;

  if (entry.fromPlayerId !== 'BANK' && entry.toPlayerId !== 'BANK') {
    // Peer-to-Peer: Total cash across all players must remain constant
    if (delta !== 0) {
      throw new Error(`[MONEY CONSERVATION VIOLATION] P2P tx ${entry.id} altered total cash by ${delta}!`);
    }
  } else if (entry.fromPlayerId === 'BANK' && entry.toPlayerId !== 'BANK') {
    // Bank payout: Total player cash must increase by exactly entry.amount
    if (delta !== entry.amount) {
      throw new Error(`[MONEY CONSERVATION VIOLATION] Bank payout tx ${entry.id} expected delta +${entry.amount}, got ${delta}!`);
    }
  } else if (entry.fromPlayerId !== 'BANK' && entry.toPlayerId === 'BANK') {
    // Bank deposit: Total player cash must decrease by exactly entry.amount
    if (delta !== -entry.amount) {
      throw new Error(`[MONEY CONSERVATION VIOLATION] Bank deposit tx ${entry.id} expected delta -${entry.amount}, got ${delta}!`);
    }
  }
}

/**
 * Executes an atomic, double-entry financial transaction:
 * - Enforces non-negative cash invariant (payer cash >= 0)
 * - Enforces money conservation
 * - Updates player financial stats with zero cross-category pollution
 * - Emits an immutable LedgerEntry
 */
export function executeLedgerTransaction(
  players: PlayerState[],
  params: ExecuteTransactionParams,
  ledgerHistory: LedgerEntry[] = []
): LedgerResult {
  const { category, from, to, roundNumber, tileId, memo, allowPartial, debtCategory } = params;
  const requestedAmount = Math.floor(params.amount);

  // 1. Validation checks
  if (requestedAmount < 0 || !Number.isFinite(requestedAmount)) {
    return {
      success: false,
      entry: null,
      error: 'INVALID_AMOUNT',
      newPlayers: players,
      actualPaid: 0,
      shortfall: 0,
    };
  }

  if (from === to) {
    return {
      success: false,
      entry: null,
      error: 'IDENTICAL_PARTIES',
      newPlayers: players,
      actualPaid: 0,
      shortfall: 0,
    };
  }

  // 2. Identify and check payer
  let fromPlayer: PlayerState | undefined;
  let fromBalanceBefore: number | undefined;

  if (from !== 'BANK') {
    fromPlayer = players.find(p => p.id === from);
    if (!fromPlayer) {
      return {
        success: false,
        entry: null,
        error: 'PLAYER_NOT_FOUND',
        newPlayers: players,
        actualPaid: 0,
        shortfall: requestedAmount,
      };
    }
    if (fromPlayer.isBankrupt) {
      return {
        success: false,
        entry: null,
        error: 'PLAYER_BANKRUPT',
        newPlayers: players,
        actualPaid: 0,
        shortfall: requestedAmount,
      };
    }
    fromBalanceBefore = fromPlayer.cash;
  }

  // 3. Identify and check recipient
  let toPlayer: PlayerState | undefined;
  let toBalanceBefore: number | undefined;

  if (to !== 'BANK') {
    toPlayer = players.find(p => p.id === to);
    if (!toPlayer) {
      return {
        success: false,
        entry: null,
        error: 'PLAYER_NOT_FOUND',
        newPlayers: players,
        actualPaid: 0,
        shortfall: requestedAmount,
      };
    }
    if (toPlayer.isBankrupt) {
      return {
        success: false,
        entry: null,
        error: 'PLAYER_BANKRUPT',
        newPlayers: players,
        actualPaid: 0,
        shortfall: requestedAmount,
      };
    }
    toBalanceBefore = toPlayer.cash;
  }

  // 4. Compute actualPaid & shortfall
  let actualPaid = requestedAmount;
  let shortfall = 0;

  if (fromPlayer) {
    if (fromPlayer.cash < requestedAmount) {
      if (!allowPartial) {
        return {
          success: false,
          entry: null,
          error: 'INSUFFICIENT_FUNDS',
          newPlayers: players,
          actualPaid: 0,
          shortfall: requestedAmount - fromPlayer.cash,
        };
      }
      actualPaid = Math.max(0, fromPlayer.cash);
      shortfall = requestedAmount - actualPaid;
    }
  }

  // 5. Build immutable updated player array
  const fromBalanceAfter = fromPlayer !== undefined ? fromPlayer.cash - actualPaid : undefined;
  const toBalanceAfter = toPlayer !== undefined ? toPlayer.cash + actualPaid : undefined;

  // Stats attribution condition: ONLY rent or debt-settling-rent increments rentPaid / rentCollected
  const isRentAttributable =
    category === 'RENT_PAYMENT' ||
    (category === 'DEBT_SETTLEMENT' && debtCategory === 'RENT_PAYMENT') ||
    (category === 'DEBT_SETTLEMENT' && debtCategory !== 'TAX_PAYMENT' && from !== 'BANK' && to !== 'BANK');

  const newPlayers = players.map(p => {
    if (p.id === from) {
      const updatedRentPaid = isRentAttributable ? p.stats.rentPaid + actualPaid : p.stats.rentPaid;
      return {
        ...p,
        cash: Math.max(0, p.cash - actualPaid),
        stats: {
          ...p.stats,
          rentPaid: updatedRentPaid,
        },
      };
    }
    if (p.id === to) {
      const updatedRentCollected = isRentAttributable ? p.stats.rentCollected + actualPaid : p.stats.rentCollected;
      return {
        ...p,
        cash: p.cash + actualPaid,
        stats: {
          ...p.stats,
          rentCollected: updatedRentCollected,
        },
      };
    }
    return p;
  });

  // 6. Generate LedgerEntry
  const nextSeq = ledgerHistory.length > 0 ? ledgerHistory[ledgerHistory.length - 1].sequence + 1 : globalTxSequence++;
  const entry: LedgerEntry = {
    id: `tx-${Date.now()}-${nextSeq}`,
    sequence: nextSeq,
    timestamp: Date.now(),
    roundNumber,
    category,
    fromPlayerId: from,
    toPlayerId: to,
    amount: actualPaid,
    tileId,
    balanceBefore: { from: fromBalanceBefore, to: toBalanceBefore },
    balanceAfter: { from: fromBalanceAfter, to: toBalanceAfter },
    memo,
  };

  // 7. Verify conservation invariant
  assertMoneyConservation(players, newPlayers, entry);

  return {
    success: true,
    entry,
    newPlayers,
    actualPaid,
    shortfall,
  };
}

/**
 * Forensically verifies the entire match ledger against initial cash and current balances.
 */
export function verifyLedgerAudit(
  initialCash: number,
  currentPlayers: PlayerState[],
  ledger: LedgerEntry[]
): {
  isValid: boolean;
  discrepancies: string[];
} {
  const discrepancies: string[] = [];

  // Track expected balances starting from initial cash
  const expectedBalances: Record<PlayerId, number> = {};
  for (const p of currentPlayers) {
    expectedBalances[p.id] = initialCash;
  }

  // Replay all transactions sequentially
  for (const entry of ledger) {
    if (entry.fromPlayerId !== 'BANK') {
      if (expectedBalances[entry.fromPlayerId] !== undefined) {
        expectedBalances[entry.fromPlayerId] -= entry.amount;
        if (expectedBalances[entry.fromPlayerId] < 0) {
          discrepancies.push(
            `Tx #${entry.sequence} (${entry.category}): Player ${entry.fromPlayerId} balance dropped below zero (${expectedBalances[entry.fromPlayerId]})`
          );
        }
      }
    }

    if (entry.toPlayerId !== 'BANK') {
      if (expectedBalances[entry.toPlayerId] !== undefined) {
        expectedBalances[entry.toPlayerId] += entry.amount;
      }
    }
  }

  // Compare expected balances with current player balances
  for (const p of currentPlayers) {
    const expected = expectedBalances[p.id] ?? 0;
    if (!p.isBankrupt && p.cash !== expected) {
      discrepancies.push(
        `Player ${p.name} (${p.id}): balance mismatch! Current=${p.cash}, Expected=${expected}, Discrepancy=${p.cash - expected}`
      );
    }
  }

  return {
    isValid: discrepancies.length === 0,
    discrepancies,
  };
}
