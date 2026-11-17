import { formatMoney } from '../../utils/money';
import {
  ChaosCard,
  ChaosCategory,
  ChaosEventHistoryEntry,
  ChaosEventPayload,
  ChaosRarity,
  ChaosTriggerType,
  GameState,
  LedgerParty,
  TransactionCategory,
} from '../types';
import {
  CHAOS_CARDS,
  getChaosCardById,
  getChaosCardsByCategory,
  getChaosCardsByRarity,
} from './chaosCards';
import { SeededPRNG, createPRNG, defaultPRNG } from './prng';
import { calculatePlayerNetWorth } from '../economy/economyEngine';
import { calculateSalary } from '../economy/economicModifiers';
import { executeLedgerTransaction } from '../economy/ledgerEngine';
import { BOARD_TILES } from '../board/boardData';
import { emitSound } from '../sound/soundEmitter';

/** A Chaos card never takes more than this share of the victim's cash in one hit. */
export const CHAOS_LOSS_CAP_RATIO = 0.25;

export function capChaosLoss(cash: number, amount: number): number {
  if (amount <= 0 || cash <= 0) return 0;
  return Math.min(amount, Math.floor(cash * CHAOS_LOSS_CAP_RATIO));
}

export function isHarmfulCard(card: ChaosCard): boolean {
  return card.harmful === true || card.category === 'NEGATIVE';
}

/**
 * Draw a Chaos card based on landing tile or random selection.
 * Seedable for 100% deterministic testing and replays.
 */
export function drawRandomChaosCard(
  tileId?: number,
  prng?: SeededPRNG,
  state?: GameState
): ChaosCard {
  return drawChaosCard({ tileId, prng, state });
}

export interface DrawChaosCardOptions {
  prng?: SeededPRNG;
  tileId?: number;
  category?: ChaosCategory;
  rarity?: ChaosRarity;
  pool?: readonly ChaosCard[];
  state?: GameState;
}

/**
 * Context-Sensitive Strategic Chaos Card Selector:
 * Evaluates current match phase (early/mid/late), player wealth disparity (Gini),
 * active player distress, and recent Chaos history to prevent immediate duplicate/contradictory
 * cards while preserving 100% deterministic Mulberry32 PRNG behavior.
 */
export function selectContextWeightedChaosCard(
  candidates: readonly ChaosCard[],
  rng: SeededPRNG,
  state?: GameState
): ChaosCard {
  if (candidates.length === 0) {
    return rng.pickOne(CHAOS_CARDS);
  }
  if (!state || candidates.length === 1) {
    return rng.pickOne(candidates);
  }

  // Only activate context-sensitive weighting when state.config.seed is explicitly configured or chaosHistory has entries
  const hasHistory = (state.chaosHistory?.length || 0) > 0;
  if (!state.config?.seed && !hasHistory) {
    return rng.pickOne(candidates);
  }

  // 1. Cooldown anti-repetition filter: avoid repeating the exact last 2 cards if alternatives exist
  const recentCardIds = (state.chaosHistory || []).slice(0, 2).map(h => h.cardId);
  const nonRepeated = candidates.filter(c => !recentCardIds.includes(c.id));
  const effectivePool = nonRepeated.length > 0 ? nonRepeated : candidates;

  // 2. Analyze match context
  const round = state.roundNumber || 1;
  const activePlayer = state.players[state.activePlayerIndex];
  const solventPlayers = state.players.filter(p => !p.isBankrupt);

  let maxWorth = 0;
  let minWorth = Infinity;
  for (const p of solventPlayers) {
    const w = calculatePlayerNetWorth(p, state.properties, state.chaosModifiers, state.roundNumber, state);
    if (w > maxWorth) maxWorth = w;
    if (w < minWorth) minWorth = w;
  }
  const wealthGapRatio = minWorth > 0 ? maxWorth / minWorth : 2;
  const totalBuildings = Object.values(state.properties).reduce(
    (sum, prop) => sum + (prop.level || 0),
    0
  );
  const totalMortgaged = Object.values(state.properties).filter(
    prop => prop.isMortgaged
  ).length;

  // 3. Compute deterministic integer weights (base weight = 10)
  const weights: number[] = effectivePool.map(card => {
    let w = 10;

    // Early game (Rounds 1-8): down-weight cards that require existing buildings/mortgages if none exist
    if (round <= 6) {
      if (
        (card.effectType === 'DOWNGRADE_PROPERTY' ||
          card.effectType === 'PROPERTY_TAX') &&
        totalBuildings === 0
      ) {
        w = 2;
      }
      if (card.effectType === 'DEBT_JUBILEE' && totalMortgaged === 0) {
        w = 2;
      }
      if (card.category === 'POSITIVE' || card.effectType === 'GOLDEN_HOUR') {
        w += 5;
      }
    }

    // High wealth inequality (Rubber-banding intelligence): boost wealth redistribution & comeback cards
    if (wealthGapRatio >= 2.2) {
      if (
        card.effectType === 'REDISTRIBUTE_WEALTH' ||
        card.effectType === 'DEBT_JUBILEE' ||
        card.effectType === 'SUBSIDIZED_MORTGAGE'
      ) {
        w += 12;
      }
    }

    // Distressed active player (< $200M cash): boost recovery / desperation / stimulus opportunities
    if (activePlayer && activePlayer.cash < 200) {
      if (
        card.category === 'POSITIVE' ||
        card.effectType === 'DESPERATION_GAMBLE' ||
        card.effectType === 'SUBSIDIZED_MORTGAGE'
      ) {
        w += 8;
      }
    }

    // Late game with many buildings: boost economic & high-stakes events
    if (totalBuildings >= 6) {
      if (
        card.category === 'ECONOMIC' ||
        card.effectType === 'DISTRICT_BOOM' ||
        card.effectType === 'PROPERTY_TAX'
      ) {
        w += 6;
      }
    }

    return Math.max(1, w);
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = rng.nextFloat() * totalWeight;
  for (let i = 0; i < effectivePool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      return effectivePool[i];
    }
  }

  return effectivePool[effectivePool.length - 1];
}

/**
 * Filtered & deterministic card drawer respecting tile tiers:
 * - Tile 7 (Alpha α): High Common / Uncommon tier
 * - Tile 22 (Beta β): High Uncommon / Rare tier
 * - Tile 36 (Omega Ω): High Rare / Calamity / Legendary tier
 */
export function drawChaosCard(options: DrawChaosCardOptions = {}): ChaosCard {
  const rng = options.prng || defaultPRNG;
  const isClassic = options.state?.config?.gameMode === 'CLASSIC';

  const filterForClassic = (pool: readonly ChaosCard[]) => {
    if (!isClassic) return pool;
    const filtered = pool.filter(
      c =>
        c.rarity !== 'CALAMITY' &&
        c.category !== 'GLOBAL' &&
        c.effectType !== 'REVERSE_DIRECTION' &&
        c.effectType !== 'SWAP_POSITIONS' &&
        c.effectType !== 'CURFEW' &&
        c.effectType !== 'ALIEN_ABDUCTION'
    );
    return filtered.length > 0 ? filtered : pool;
  };

  if (options.pool && options.pool.length > 0) {
    return selectContextWeightedChaosCard(filterForClassic(options.pool), rng, options.state);
  }

  if (options.category) {
    const pool = getChaosCardsByCategory(options.category);
    if (pool.length > 0) return selectContextWeightedChaosCard(filterForClassic(pool), rng, options.state);
  }

  if (options.rarity) {
    const pool = getChaosCardsByRarity(options.rarity);
    if (pool.length > 0) return selectContextWeightedChaosCard(filterForClassic(pool), rng, options.state);
  }

  if (options.tileId !== undefined) {
    return evaluateTileChaosTrigger(options.tileId, rng, options.state);
  }

  return selectContextWeightedChaosCard(filterForClassic(CHAOS_CARDS), rng, options.state);
}

/**
 * Pathway 1: Tile Landed Trigger (Tile 7, 22, 36)
 *
 * This is the only Chaos trigger the game uses: Chaos happens when a player lands on a
 * Chaos tile (and the same card pipeline serves Chest/Chance tiles and world events).
 * The former round-interval, double-dice, crisis and event-chain pathways were removed.
 */
export function evaluateTileChaosTrigger(
  tileId: number,
  prng?: SeededPRNG,
  state?: GameState
): ChaosCard {
  const rng = prng || defaultPRNG;
  const isClassic = state?.config?.gameMode === 'CLASSIC';

  const filterPool = (pool: readonly ChaosCard[]) => {
    if (!isClassic) return pool;
    const filtered = pool.filter(
      c =>
        c.rarity !== 'CALAMITY' &&
        c.category !== 'GLOBAL' &&
        c.effectType !== 'REVERSE_DIRECTION' &&
        c.effectType !== 'SWAP_POSITIONS' &&
        c.effectType !== 'CURFEW' &&
        c.effectType !== 'ALIEN_ABDUCTION'
    );
    return filtered.length > 0 ? filtered : pool;
  };

  if (tileId === 7) {
    // Chaos Alpha (α) — Tỷ lệ thẻ Common / Uncommon cao
    const alphaCards = filterPool(
      CHAOS_CARDS.filter(
        c => (c.rarity === 'COMMON' || c.rarity === 'UNCOMMON') && c.effectType !== 'TELEPORT'
      )
    );
    if (alphaCards.length > 0) {
      return selectContextWeightedChaosCard(alphaCards, rng, state);
    }
  } else if (tileId === 22) {
    // Chaos Beta (β) — Tỷ lệ thẻ Uncommon / Rare cao
    const betaCards = filterPool(
      CHAOS_CARDS.filter(
        c => c.rarity === 'UNCOMMON' || c.rarity === 'RARE'
      )
    );
    if (betaCards.length > 0) {
      return selectContextWeightedChaosCard(betaCards, rng, state);
    }
  } else if (tileId === 36) {
    // Chaos Omega (Ω) — Tỷ lệ thẻ Rare / Calamity / Legendary cao nhất
    const omegaCards = filterPool(
      CHAOS_CARDS.filter(
        c => c.rarity === 'RARE' || c.rarity === 'CALAMITY' || c.rarity === 'LEGENDARY'
      )
    );
    if (omegaCards.length > 0) {
      return selectContextWeightedChaosCard(omegaCards, rng, state);
    }
  }

  return selectContextWeightedChaosCard(filterPool(CHAOS_CARDS), rng, state);
}

/**
 * Pure state reducer applying a Chaos event effect.
 * Guarantees state invariants: non-negative cash, proper property ownership,
 * deterministic outcomes, and clear Vietnamese logging.
 */
export function applyChaosCard(
  state: GameState,
  rawCard: ChaosCard | ChaosEventPayload,
  prng?: SeededPRNG
): GameState {
  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer || activePlayer.isBankrupt) return state;

  const rng = prng || (state.config.seed ? createPRNG(state.config.seed) : defaultPRNG);

  // Normalize card properties across ChaosCard and ChaosEventPayload interfaces
  const cardId = rawCard.id;
  const canonicalCard = getChaosCardById(cardId) || (rawCard as ChaosCard);
  const title = (rawCard as any).title || (rawCard as any).nameVi || canonicalCard.title;
  const flavorText =
    (rawCard as any).flavorText || (rawCard as any).descriptionVi || canonicalCard.flavorText;
  const effectType = rawCard.effectType;
  const value =
    (rawCard as any).value !== undefined
      ? (rawCard as any).value
      : (rawCard as any).magnitude ?? canonicalCard.value;
  const durationInTurns =
    (rawCard as any).durationInTurns !== undefined
      ? (rawCard as any).durationInTurns
      : canonicalCard.durationInTurns || 0;

  let updatedPlayers = [...state.players];
  let updatedProperties = { ...state.properties };
  let currentLedger = [...(state.ledgerHistory || state.ledger || [])];
  let newRentModifier = state.rentModifier;
  let newTurnPhase = state.turnPhase === 'CHAOS_EVENT' ? 'ACTION_MENU' : state.turnPhase;
  let pendingDebt = state.pendingDebt || null;
  let logMsg = `[CHAOS] ${activePlayer.name} kích hoạt "${title}": ${flavorText}`;

  const recordChaosTx = (
    from: LedgerParty,
    to: LedgerParty,
    amount: number,
    memo: string,
    category: TransactionCategory = 'CHAOS_EFFECT',
    allowPartial: boolean = false
  ) => {
    const res = executeLedgerTransaction(
      updatedPlayers,
      {
        category,
        from,
        to,
        amount,
        roundNumber: state.roundNumber,
        memo,
        allowPartial,
      },
      currentLedger
    );
    if (res.success) {
      updatedPlayers = res.newPlayers;
      if (res.entry) {
        currentLedger = [...currentLedger, res.entry];
      }
    }
    return res;
  };

  // Update chaosModifiers if present in state
  const updatedModifiers = {
    reverseDirectionTurns: state.chaosModifiers?.reverseDirectionTurns || 0,
    marketFrozenTurns: state.chaosModifiers?.marketFrozenTurns || 0,
    goldenHourTurns: state.chaosModifiers?.goldenHourTurns || 0,
    curfewTurns: state.chaosModifiers?.curfewTurns || 0,
    transportBoomTurns: state.chaosModifiers?.transportBoomTurns || 0,
    utilityBoomTurns: state.chaosModifiers?.utilityBoomTurns || 0,
    districtBoomTurns: state.chaosModifiers?.districtBoomTurns || 0,
    alienMothershipTurns: state.chaosModifiers?.alienMothershipTurns || 0,
    interestHikeTurns: state.chaosModifiers?.interestHikeTurns || 0,
    subsidizedMortgageTurns: state.chaosModifiers?.subsidizedMortgageTurns || 0,
  };

  emitSound('chaosTrigger');

  switch (effectType) {
    case 'CASH_SELF': {
      if (value >= 0) {
        recordChaosTx('BANK', activePlayer.id, value, `Thưởng Chaos: ${title}`);
        logMsg += ` -> Nhận được +${formatMoney(value)}!`;
      } else {
        const penalty = capChaosLoss(activePlayer.cash, Math.abs(value));
        if (activePlayer.cash >= penalty) {
          recordChaosTx(activePlayer.id, 'BANK', penalty, `Phạt Chaos: ${title}`);
          logMsg += ` -> Bị phạt trừ -${formatMoney(penalty)}!`;
        } else {
          // Solvency preservation: consume available cash via partial ledger tx, enter debt check
          const res = recordChaosTx(activePlayer.id, 'BANK', penalty, `Phạt biến cố (một phần): ${title}`, 'CHAOS_EFFECT', true);
          const remainingDebt = res.shortfall;
          newTurnPhase = 'BANKRUPTCY_CHECK';
          pendingDebt = {
            creditorPlayerId: null,
            amount: remainingDebt,
            reason: `Phạt biến cố: ${title}`,
            category: 'CHAOS_EFFECT',
          };
          logMsg += ` -> Không đủ tiền trả phạt, ghi nhận nợ ${formatMoney(remainingDebt)} khẩn cấp!`;
        }
      }
      break;
    }

    case 'CASH_ALL': {
      if (value >= 0) {
        for (const p of [...updatedPlayers]) {
          if (!p.isBankrupt) {
            recordChaosTx('BANK', p.id, value, `Trợ cấp toàn dân: ${title}`);
          }
        }
        logMsg += ` -> Tất cả người chơi nhận trợ cấp +${formatMoney(value)}!`;
      } else {
        const penalty = Math.abs(value);
        for (const p of [...updatedPlayers]) {
          if (!p.isBankrupt) {
            recordChaosTx(p.id, 'BANK', capChaosLoss(p.cash, penalty), `Đóng góp quỹ: ${title}`, 'CHAOS_EFFECT', true);
          }
        }
        logMsg += ` -> Tất cả người chơi đóng góp quỹ -${formatMoney(penalty)}!`;
      }
      break;
    }

    case 'CASH_STEAL': {
      if (value > 0) {
        let totalStolen = 0;
        for (const p of [...updatedPlayers]) {
          if (p.id !== activePlayer.id && !p.isBankrupt) {
            const res = recordChaosTx(p.id, activePlayer.id, capChaosLoss(p.cash, value), `Thu hút từ ${p.name}: ${title}`, 'CHAOS_EFFECT', true);
            totalStolen += res.actualPaid;
          }
        }
        logMsg += ` -> Thu hút thành công tổng cộng ${formatMoney(totalStolen)} từ các đối thủ!`;
      } else {
        const giftAmount = Math.abs(value);
        const recipients = updatedPlayers.filter((p, idx) => idx !== state.activePlayerIndex && !p.isBankrupt);
        for (const p of recipients) {
          const senderNow = updatedPlayers.find(pl => pl.id === activePlayer.id);
          const available = senderNow ? senderNow.cash : 0;
          if (available > 0) {
            const toGive = Math.min(available, giftAmount);
            recordChaosTx(activePlayer.id, p.id, toGive, `Tặng quà cho ${p.name}: ${title}`, 'CHAOS_EFFECT', true);
          }
        }
        logMsg += ` -> Hào phóng tặng mỗi đối thủ ${formatMoney(giftAmount)}!`;
      }
      break;
    }

    case 'TELEPORT': {
      const target = (rawCard as any).targetTileId;
      if (target !== undefined) {
        updatedPlayers[state.activePlayerIndex] = {
          ...updatedPlayers[state.activePlayerIndex],
          position: target,
        };
        if (target === 0) {
          const salary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
          recordChaosTx('BANK', activePlayer.id, salary, `Lương Cổng Khởi Hành (Dịch chuyển)`, 'SALARY_START');
          logMsg += ` -> Dịch chuyển về Cổng Khởi Hành, nhận lương +${formatMoney(salary)}!`;
        } else {
          logMsg += ` -> Dịch chuyển trực tiếp đến ô #${target}!`;
        }
      } else if (value > 0) {
        // Step forward by value (e.g. quantum leap +6 steps)
        const oldPos = activePlayer.position;
        const newPos = (oldPos + value) % 40;
        let passSalary = 0;
        if (newPos < oldPos) {
          passSalary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
          recordChaosTx('BANK', activePlayer.id, passSalary, `Lương qua Cổng Khởi Hành (Nhảy vọt)`, 'SALARY_START');
        }
        updatedPlayers[state.activePlayerIndex] = {
          ...updatedPlayers[state.activePlayerIndex],
          position: newPos,
        };
        logMsg += ` -> Nhảy vọt +${value} bước đến ô #${newPos}!${passSalary > 0 ? ` (Nhận lương +${formatMoney(passSalary)})` : ''}`;
      }
      break;
    }

    case 'TELEPORT_ALL': {
      // Find property with highest upgrade level / rent
      let maxTileId = 39;
      let maxLevel = -1;
      for (const [tIdStr, prop] of Object.entries(updatedProperties)) {
        if (prop.ownerId && prop.level > maxLevel) {
          maxLevel = prop.level;
          maxTileId = Number(tIdStr);
        }
      }
      updatedPlayers = updatedPlayers.map(p => {
        if (p.isBankrupt) return p;
        return { ...p, position: maxTileId };
      });
      logMsg += ` -> Lỗ đen không gian hút toàn bộ người chơi về ô đất #${maxTileId}!`;
      break;
    }

    case 'GO_TO_DETENTION': {
      updatedPlayers[state.activePlayerIndex] = {
        ...activePlayer,
        position: 10, // Tile 10 Khu Cách Ly Tạm Giam
        inDetention: true,
        detentionTurns: durationInTurns || value || 2,
        consecutiveDoubles: 0,
      };
      logMsg += ` -> Bị áp giải vào Khu Cách Ly Tạm Giam (Tile 10) trong 2 lượt!`;
      break;
    }

    case 'RENT_MULTIPLIER': {
      newRentModifier = value;
      logMsg += ` -> Hệ số tiền thuê toàn sàn điều chỉnh thành x${value}!`;
      break;
    }

    case 'PROPERTY_TAX': {
      let count = 0;
      for (const ownership of Object.values(updatedProperties)) {
        if (ownership.ownerId === activePlayer.id) {
          count += 1 + ownership.level;
        }
      }
      const totalTax = capChaosLoss(activePlayer.cash, count * value);
      if (activePlayer.cash >= totalTax) {
        recordChaosTx(activePlayer.id, 'BANK', totalTax, `Thuế công trình: ${title}`, 'CHAOS_EFFECT');
        logMsg += ` -> Nộp thuế ${formatMoney(value)} x ${count} hạng mục = -${formatMoney(totalTax)}!`;
      } else {
        const res = recordChaosTx(activePlayer.id, 'BANK', totalTax, `Thuế công trình (một phần): ${title}`, 'CHAOS_EFFECT', true);
        const remainingDebt = res.shortfall;
        newTurnPhase = 'BANKRUPTCY_CHECK';
        pendingDebt = {
          creditorPlayerId: null,
          amount: remainingDebt,
          reason: `Thuế công trình: ${title}`,
          category: 'CHAOS_EFFECT',
        };
        logMsg += ` -> Thiếu tiền đóng thuế, ghi nhận nợ ${formatMoney(remainingDebt)}!`;
      }
      break;
    }

    case 'FREE_UPGRADE':
    case 'PROPERTY_UPGRADE': {
      const ownedTileIds = Object.keys(updatedProperties)
        .map(Number)
        .filter(
          tid =>
            updatedProperties[tid]?.ownerId === activePlayer.id &&
            !updatedProperties[tid]?.isMortgaged &&
            updatedProperties[tid]?.level < 5
        );

      if (ownedTileIds.length > 0) {
        const chosenTileId = rng.pickOne(ownedTileIds);
        updatedProperties[chosenTileId] = {
          ...updatedProperties[chosenTileId],
          level: updatedProperties[chosenTileId].level + 1,
        };
        logMsg += ` -> Nâng cấp miễn phí +1★ cho ô đất #${chosenTileId} (Cấp hiện tại: ${updatedProperties[chosenTileId].level}★)!`;
      } else {
        // Cash compensation if no eligible properties
        const comp = value || 150;
        recordChaosTx('BANK', activePlayer.id, comp, `Trợ cấp nâng cấp: ${title}`);
        logMsg += ` -> Không có công trình phù hợp, nhận bù +${formatMoney(comp)} tiền mặt!`;
      }
      break;
    }

    case 'DOWNGRADE_PROPERTY':
    case 'EARTHQUAKE': {
      let count = 0;
      for (const [tIdStr, ownership] of Object.entries(updatedProperties)) {
        const tId = Number(tIdStr);
        if (ownership.ownerId && ownership.level > 0) {
          updatedProperties[tId] = {
            ...ownership,
            level: Math.max(0, ownership.level - 1),
          };
          count++;
        }
      }
      logMsg += ` -> Động đất làm sập 1 cấp sao của ${count} công trình trên toàn bàn cờ!`;
      break;
    }

    case 'REVERSE_DIRECTION': {
      updatedModifiers.reverseDirectionTurns = durationInTurns || 3;
      logMsg += ` -> Toàn bộ người chơi di chuyển ngược chiều kim đồng hồ trong ${updatedModifiers.reverseDirectionTurns} vòng!`;
      break;
    }

    case 'SWAP_POSITIONS': {
      const solventPlayers = updatedPlayers.filter(p => !p.isBankrupt);
      if (solventPlayers.length >= 2) {
        const originalPositions = solventPlayers.map(p => p.position);
        // Shift positions by 1 (or shuffle)
        const shiftedPositions = [...originalPositions.slice(1), originalPositions[0]];
        let sIdx = 0;
        updatedPlayers = updatedPlayers.map(p => {
          if (p.isBankrupt) return p;
          const newPos = shiftedPositions[sIdx++];
          return { ...p, position: newPos };
        });
        logMsg += ` -> Hoán đổi vị trí di chuyển của toàn bộ người chơi trên bàn cờ!`;
      }
      break;
    }

    case 'REDISTRIBUTE_WEALTH': {
      const solventPlayers = updatedPlayers.filter(p => !p.isBankrupt);
      if (solventPlayers.length >= 2) {
        let richest = solventPlayers[0];
        let poorest = solventPlayers[0];
        let maxWorth = calculatePlayerNetWorth(richest, updatedProperties, state.chaosModifiers, state.roundNumber, state);
        let minWorth = maxWorth;

        for (const p of solventPlayers) {
          const w = calculatePlayerNetWorth(p, updatedProperties, state.chaosModifiers, state.roundNumber, state);
          if (w > maxWorth) {
            maxWorth = w;
            richest = p;
          }
          if (w < minWorth) {
            minWorth = w;
            poorest = p;
          }
        }

        if (richest.id !== poorest.id && richest.cash > 0) {
          const transferAmount = Math.floor(richest.cash * 0.25);
          recordChaosTx(richest.id, poorest.id, transferAmount, `Tái phân phối tài sản: ${title}`);
          logMsg += ` -> ${richest.name} (giàu nhất) chuyển ${formatMoney(transferAmount)} (25% tiền mặt) cho ${poorest.name} (nghèo nhất)!`;
        }
      }
      break;
    }

    case 'DETENTION_IMMUNITY':
    case 'DETENTION_RELEASE': {
      const newCardCount = (activePlayer.jailFreeCards || 0) + 1;
      updatedPlayers[state.activePlayerIndex] = {
        ...updatedPlayers[state.activePlayerIndex],
        jailFreeCards: newCardCount,
      };
      logMsg += ` -> Nhận 1 Thẻ Miễn Trừ Giam Giữ đặc quyền! (Tổng số thẻ sở hữu: ${newCardCount})`;
      break;
    }

    case 'DESPERATION_GAMBLE':
    case 'CASINO_GAMBLE': {
      const gambleAmount = value || 100;
      const isWin = rng.nextFloat() >= 0.5;
      if (isWin) {
        const winAmount = gambleAmount * 2;
        recordChaosTx('BANK', activePlayer.id, winAmount, `Thắng cược Casino: ${title}`);
        logMsg += ` -> Thắng cược sòng bạc! Nhân đôi số tiền nhận +${formatMoney(winAmount)}!`;
      } else {
        const actualLost = capChaosLoss(activePlayer.cash, gambleAmount);
        if (actualLost > 0) {
          recordChaosTx(activePlayer.id, 'BANK', actualLost, `Thua cược Casino: ${title}`);
        }
        logMsg += ` -> Thua cược! Mất -${formatMoney(actualLost)} (tối đa 25% tiền mặt)!`;
      }
      break;
    }

    case 'DEBT_JUBILEE': {
      let jubileeCount = 0;
      for (const [tIdStr, ownership] of Object.entries(updatedProperties)) {
        const tId = Number(tIdStr);
        if (ownership.ownerId && ownership.isMortgaged) {
          updatedProperties[tId] = {
            ...ownership,
            isMortgaged: false,
          };
          jubileeCount++;
        }
      }
      logMsg += ` -> Đại ân xá quốc gia! Giải chấp miễn phí cho ${jubileeCount} bất động sản!`;
      break;
    }

    case 'HOSTILE_TAKEOVER': {
      // Find opponent's unbuilt property (level 0) with lowest base price
      let candidateTileId: number | null = null;
      let minPrice = Infinity;
      let opponentOwnerId: string | null = null;

      for (const [tIdStr, ownership] of Object.entries(updatedProperties)) {
        const tId = Number(tIdStr);
        if (ownership.ownerId && ownership.ownerId !== activePlayer.id && ownership.level === 0) {
          const tile = BOARD_TILES.find(t => t.id === tId);
          const price = tile?.property?.basePrice || 100;
          if (price < minPrice) {
            minPrice = price;
            candidateTileId = tId;
            opponentOwnerId = ownership.ownerId;
          }
        }
      }

      const takeoverCost = Math.floor(minPrice * 1.5);
      if (candidateTileId !== null && opponentOwnerId && activePlayer.cash >= takeoverCost) {
        // Execute takeover
        updatedProperties[candidateTileId] = {
          ...updatedProperties[candidateTileId],
          ownerId: activePlayer.id,
        };
        recordChaosTx(activePlayer.id, opponentOwnerId, takeoverCost, `Thâu tóm ô đất #${candidateTileId}: ${title}`);
        logMsg += ` -> Thâu tóm ô đất #${candidateTileId} của đối thủ với giá 1.5x (${formatMoney(takeoverCost)})!`;
      } else {
        // Fallback grant
        recordChaosTx('BANK', activePlayer.id, 150, `Trợ cấp đầu tư: ${title}`);
        logMsg += ` -> Không có ô đất phù hợp để thâu tóm, nhận trợ cấp đầu tư +$150M!`;
      }
      break;
    }

    case 'FREEZE_MARKET': {
      updatedModifiers.marketFrozenTurns = durationInTurns || 1;
      logMsg += ` -> Đóng băng thị trường mua bán & nâng cấp trên toàn thành phố trong 1 vòng!`;
      break;
    }

    case 'GOLDEN_HOUR': {
      updatedModifiers.goldenHourTurns = durationInTurns || 1;
      logMsg += ` -> Giờ vàng đô thị! Lương Cổng Khởi Hành tăng gấp đôi ($400M) trong 1 vòng!`;
      break;
    }

    case 'TRANSPORT_BOOM': {
      updatedModifiers.transportBoomTurns = durationInTurns || 3;
      logMsg += ` -> Đại lễ đường sắt tốc độ cao! Tiền thuê 4 Trạm Vận Tải tăng gấp đôi (x2) trong 3 vòng!`;
      break;
    }

    case 'UTILITY_BOOM': {
      updatedModifiers.utilityBoomTurns = durationInTurns || 2;
      logMsg += ` -> Điều chỉnh giá điện & nước! Tiền thuê SAWACO và EVN tăng gấp đôi (x2) trong 2 vòng!`;
      break;
    }

    case 'DISTRICT_BOOM': {
      updatedModifiers.districtBoomTurns = durationInTurns || 3;
      logMsg += ` -> Sóng sốt đất Hà Nội & TP.HCM! Tiền thuê tăng 1.5x trong 3 vòng!`;
      break;
    }

    case 'INTEREST_HIKE': {
      updatedModifiers.interestHikeTurns = durationInTurns || 3;
      updatedModifiers.subsidizedMortgageTurns = 0; // Mutual exclusion: hiking interest cancels mortgage subsidy
      logMsg += ` -> Ngân hàng tăng lãi suất giải chấp thêm 10% trong 3 vòng!`;
      break;
    }

    case 'SUBSIDIZED_MORTGAGE': {
      updatedModifiers.subsidizedMortgageTurns = durationInTurns || 2;
      updatedModifiers.interestHikeTurns = 0; // Mutual exclusion: credit subsidy cancels interest hike
      logMsg += ` -> Hỗ trợ tín dụng! Cầm cố bất động sản nhận ngay 75% giá gốc trong 2 vòng!`;
      break;
    }

    case 'CURFEW': {
      updatedModifiers.curfewTurns = durationInTurns || 1;
      logMsg += ` -> Giới nghiêm toàn thành phố! Xúc xắc bị giới hạn tối đa 4 bước đi trong 1 vòng!`;
      break;
    }

    case 'ALIEN_MOTHERSHIP': {
      updatedModifiers.alienMothershipTurns = durationInTurns || 5;
      logMsg += ` -> Tàu mẹ vũ trụ phong tỏa Landmark 81 (Tile 39) thành Cổng Chaos không thu tiền thuê trong 5 vòng!`;
      break;
    }

    case 'VISION_SHIFT': {
      logMsg += ` -> Tầm nhìn thành phố thay đổi trong ${durationInTurns || 1} vòng. Không ai mất hay nhận tiền.`;
      break;
    }

    default:
      logMsg += ` -> Đã kích hoạt hiệu ứng thành công!`;
      break;
  }

  // Update chaos statistics for active player
  updatedPlayers[state.activePlayerIndex] = {
    ...updatedPlayers[state.activePlayerIndex],
    stats: {
      ...updatedPlayers[state.activePlayerIndex].stats,
      chaosTriggered: (updatedPlayers[state.activePlayerIndex].stats.chaosTriggered || 0) + 1,
    },
  };

  // Record structured ChaosEventHistoryEntry
  const historyEntry: ChaosEventHistoryEntry = {
    id: `chaos-hist-${Date.now()}-${ (state.chaosHistory?.length || 0) + 1 }`,
    cardId: canonicalCard.id,
    title,
    category: (canonicalCard.category || 'PERSONAL') as ChaosCategory,
    rarity: canonicalCard.rarity || 'COMMON',
    effectType: String(effectType),
    roundNumber: state.roundNumber,
    triggeredByPlayerId: activePlayer.id,
    triggeredByPlayerName: activePlayer.name,
    triggerType: (canonicalCard.triggerType || 'TILE_LANDED') as ChaosTriggerType,
    summaryVi: logMsg,
    timestamp: Date.now(),
  };

  const updatedChaosHistory = [historyEntry, ...(state.chaosHistory || [])].slice(0, 60);

  return {
    ...state,
    players: updatedPlayers,
    properties: updatedProperties,
    activeChaosCard: canonicalCard,
    rentModifier: newRentModifier,
    turnPhase: newTurnPhase,
    pendingDebt,
    chaosModifiers: updatedModifiers,
    chaosHistory: updatedChaosHistory,
    ledger: currentLedger,
    ledgerHistory: currentLedger,
    logs: [
      {
        id: `chaos-log-${Date.now()}-${rng.nextInt(1000, 9999)}`,
        timestamp: Date.now(),
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        message: logMsg,
        type: 'CHAOS',
      },
      ...state.logs,
    ],
  };
}
