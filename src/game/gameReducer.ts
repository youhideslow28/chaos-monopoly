import { formatMoney } from '../utils/money';
import {
  GameAction,
  GameState,
  PlayerState,
  PropertyOwnership,
  GameLogEntry,
  GameConfig,
  SeasonPhase,
} from './types';
import { BOARD_SIZE, BOARD_TILES, DEFAULT_PLAYER_TOKENS } from './board/boardData';
import { isTileBlocked, marketOpenForRound, rentMultiplier, seasonForRound, sellRate, tradeAnytime } from './world-rules/worldRules';
import { rollTwoDice } from './dice/diceEngine';
import {
  canBuyProperty,
  canUpgradeProperty,
  canDowngradeProperty,
  canSellProperty,
  canMortgageProperty,
  canUnmortgageProperty,
  calculateRent,
  getTileById,
  getBuyPrice,
  getUpgradeCost,
  getRentEscalationMultiplier,
} from './property/propertyEngine';
import { liquidateBankruptPlayer } from './economy/economyEngine';
import { executeLedgerTransaction } from './economy/ledgerEngine';
import {
  calculateEffectiveMovement,
  calculateSalary,
} from './economy/economicModifiers';
import { applyChaosCard, drawRandomChaosCard } from './chaos-engine/chaosEngine';
import { createPRNG } from './chaos-engine/prng';
import { advanceTurn } from './turn-manager/turnManager';
import { evaluateWinCondition } from './win-condition/winCondition';
import { emitSound } from './sound/soundEmitter';
import { initiateAuction, placeAuctionBid, passAuctionBid } from './auction/auctionEngine';
import { proposeTrade, counterTrade, acceptTrade, rejectTrade, cancelTrade } from './trade/tradeEngine';
import { isWorldSelectable, getCatalogEntry } from '../worlds/catalog';
import { pickWorldEventCard } from '../worlds/worldEvents';
import {
  getValidNextNodes,
  stepTraverse,
  hasBranchIntersections,
} from './graph/spatialGraphEngine';
import {
  checkUnlockTriggers,
  unlockZone,
  createInitialFogOfWarState,
} from './graph/urbanFogOfWarEngine';
import { LEGACY_RING_GRAPH } from './graph/legacyRingAdapter';
import { getSpatialGraphForMapId, KOWLOON_MAP_ID } from './maps';
import { createInitialChaosMeter, applyChaosDelta } from './chaos-engine/chaosMeter';
import { processGameEvent } from './chaos-engine/chaosEventBus';
import { canPlaceTrap, triggerTrapAtNode, PlacedTrap } from './chaos-engine/trapEngine';
import { checkPatrolInterception, resolvePatrolPenalty } from './chaos-engine/patrolEngine';
import { calculateDynamicBusinessRent } from './business/businessSynergyEngine';
import { BUSINESS_CATALOG } from './business/businessCatalog';

export const INITIAL_GAME_CONFIG: GameConfig = {
  startingCash: 1500,
  salaryOnStart: 200,
  maxRounds: 0,
  detentionBailCost: 100,
  fastMode: false,
  gameMode: 'CHAOS',
};

export const INITIAL_GAME_STATE: GameState = {
  config: INITIAL_GAME_CONFIG,
  status: 'SETUP',
  players: [],
  activePlayerIndex: 0,
  turnPhase: 'WAITING_FOR_ROLL',
  roundNumber: 1,
  dice: [1, 1],
  isDouble: false,
  properties: {},
  activeChaosCard: null,
  pendingDebt: null,
  logs: [],
  winner: null,
  selectedTileForDetail: null,
  rentModifier: 1,
  chaosModifiers: {
    reverseDirectionTurns: 0,
    marketFrozenTurns: 0,
    goldenHourTurns: 0,
    curfewTurns: 0,
    transportBoomTurns: 0,
    utilityBoomTurns: 0,
    districtBoomTurns: 0,
    alienMothershipTurns: 0,
    interestHikeTurns: 0,
    subsidizedMortgageTurns: 0,
  },
  ledger: [],
  ledgerHistory: [],
  chaosHistory: [],
  processedActionIds: [],
  lastSoundEffect: null,
  activeAuction: null,
  activeTrade: null,
  lastAIDecision: null,
  worldState: null,
  spatialGraph: LEGACY_RING_GRAPH,
  fogOfWarState: createInitialFogOfWarState(LEGACY_RING_GRAPH),
  movementState: null,
  chaosMeter: createInitialChaosMeter(),
  placedTraps: [],
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (
    (state.status === 'ENDED' || state.turnPhase === 'GAME_OVER') &&
    action.type !== 'RESTART_GAME' &&
    action.type !== 'LOAD_SAVED_MATCH'
  ) {
    return state;
  }

  // 1. Action Idempotency Guard (Ring Buffer max 50)
  if (action.actionId && state.processedActionIds && state.processedActionIds.includes(action.actionId)) {
    return state;
  }

  // 2. Sender Authorization Guard
  if (action.senderPlayerId) {
    const sender = state.players.find(p => p.id === action.senderPlayerId);
    if (sender && sender.isBankrupt) {
      return state;
    }

    const activePlayer = state.players[state.activePlayerIndex];
    const isMultiPlayerAction =
      action.type === 'START_GAME' ||
      action.type === 'RESTART_GAME' ||
      action.type === 'LOAD_SAVED_MATCH' ||
      action.type === 'SELECT_TILE_DETAIL' ||
      action.type === 'RESOLVE_CHAOS' ||
      action.type === 'PLACE_AUCTION_BID' ||
      action.type === 'PASS_AUCTION_BID' ||
      action.type === 'PROPOSE_TRADE' ||
      action.type === 'ACCEPT_TRADE' ||
      action.type === 'REJECT_TRADE' ||
      action.type === 'CANCEL_TRADE' ||
      action.type === 'COUNTER_TRADE' ||
      // Tây Bắc: trading, downgrading, selling and mortgaging are allowed outside the active turn on market days.
      action.type === 'DOWNGRADE_PROPERTY' ||
      action.type === 'SELL_PROPERTY' ||
      action.type === 'MORTGAGE_PROPERTY' ||
      action.type === 'DECLARE_BANKRUPTCY' ||
      action.type === 'UNLOCK_ZONE' ||
      action.type === 'RECORD_AI_DECISION';

    if (!isMultiPlayerAction && activePlayer && action.senderPlayerId !== activePlayer.id) {
      return state;
    }
  }

  const nextState = reduceAction(state, action);

  // Maintain 50-item idempotency ring buffer
  if (action.actionId && nextState !== state) {
    const existingIds = state.processedActionIds || [];
    nextState.processedActionIds = [...existingIds.slice(-49), action.actionId];
  }

  return nextState;
}

function reduceAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const initialProperties: Record<number, PropertyOwnership> = {};
      BOARD_TILES.forEach(tile => {
        if (tile.type === 'PROPERTY' || tile.type === 'TRANSPORT' || tile.type === 'UTILITY') {
          initialProperties[tile.id] = {
            ownerId: null,
            level: 0,
            isMortgaged: false,
          };
        }
      });

      const config = { ...INITIAL_GAME_CONFIG, ...action.config };
      // Phase 05: a World may only be used if it exists and is AVAILABLE (reject, never silently substitute).
      if (config.worldId !== undefined && config.worldId !== KOWLOON_MAP_ID) {
        if (!isWorldSelectable(config.worldId)) return state;
        config.worldVersion = getCatalogEntry(config.worldId)?.version;
      }

      const selectedGraph = getSpatialGraphForMapId(config.mapId || config.worldId);
      const startNodeId = selectedGraph.startNodeId;
      // Also initialize properties for any graph node numericIds not in BOARD_TILES
      for (const node of Object.values(selectedGraph.nodes)) {
        if (
          node.numericId !== undefined &&
          (node.type === 'PROPERTY' || node.type === 'TRANSPORT' || node.type === 'UTILITY') &&
          !initialProperties[node.numericId]
        ) {
          initialProperties[node.numericId] = {
            ownerId: null,
            level: 0,
            isMortgaged: false,
          };
        }
      }

      const players: PlayerState[] = action.players.map((p, idx) => ({
        id: `player-${idx + 1}`,
        name: p.name.trim() || `Người chơi ${idx + 1}`,
        token: p.token || DEFAULT_PLAYER_TOKENS[idx % DEFAULT_PLAYER_TOKENS.length],
        cash: config.startingCash,
        position: 0,
        positionNodeId: selectedGraph.mapId !== 'legacy-ring-40' ? startNodeId : undefined,
        inDetention: false,
        detentionTurns: 0,
        jailFreeCards: 0,
        isBankrupt: false,
        isAI: !!p.isAI,
        aiPersonality: p.aiPersonality || (p.isAI ? 'STRATEGIST' : undefined),
        aiDifficulty: p.aiDifficulty || (p.isAI ? 'NORMAL' : undefined),
        consecutiveDoubles: 0,
        stats: {
          rentPaid: 0,
          rentCollected: 0,
          chaosTriggered: 0,
          tilesTraveled: 0,
          propertiesOwned: 0,
        },
      }));

      emitSound('buyProperty');

      const worldId = config.worldId ?? '';
      const startWorldState =
        worldId === 'quang-tri-highlands'
          ? { seasonPhase: seasonForRound(1) as SeasonPhase, blockedTiles: [] as number[] }
          : worldId === 'northwest-vietnam'
            ? { marketOpen: marketOpenForRound(1) }
            : null;

      return {
        ...INITIAL_GAME_STATE,
        config,
        status: 'PLAYING',
        players,
        worldState: startWorldState,
        properties: initialProperties,
        spatialGraph: selectedGraph,
        fogOfWarState: createInitialFogOfWarState(selectedGraph),
        activePlayerIndex: 0,
        turnPhase: 'WAITING_FOR_ROLL',
        ledger: [],
        ledgerHistory: [],
        processedActionIds: [],
        lastSoundEffect: 'buyProperty',
        logs: [
          {
            id: `start-${Date.now()}`,
            timestamp: Date.now(),
            message: `Trò chơi bắt đầu với ${players.length} người chơi trên Bàn cờ Đô Thị Việt Nam 40 ô. Chúc các nhà tài phiệt may mắn!`,
            type: 'INFO',
          },
        ],
      };
    }

    case 'ROLL_DICE_START': {
      if (state.turnPhase !== 'WAITING_FOR_ROLL') return state;
      const activePlayer = state.players[state.activePlayerIndex];
      if (activePlayer && activePlayer.turnLockTurns && activePlayer.turnLockTurns > 0) {
        // Stunned: cannot roll, skips turn immediately
        const clearedPlayer: PlayerState = { ...activePlayer, turnLockTurns: activePlayer.turnLockTurns - 1 };
        const updatedPlayers = state.players.map(p => (p.id === activePlayer.id ? clearedPlayer : p));
        const nextState: GameState = {
          ...state,
          players: updatedPlayers,
          logs: [
            {
              id: `stun-skip-${Date.now()}`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `⛓️ [CHOÁNG] ${activePlayer.name} đang bị choáng bởi bẫy Lockdown! Mất lượt lắc xí ngầu.`,
              type: 'CHAOS' as const,
            },
            ...state.logs,
          ],
        };
        return advanceTurn(nextState);
      }
      emitSound('diceRoll');
      return {
        ...state,
        turnPhase: 'ROLLING',
        lastSoundEffect: 'diceRoll',
      };
    }

    case 'ROLL_DICE_RESULT': {
      const activePlayer = state.players[state.activePlayerIndex];
      if (!activePlayer || activePlayer.isBankrupt) return state;

      const dice = action.dice || rollTwoDice().dice;
      const [d1, d2] = dice;
      const sum = d1 + d2;
      const isDouble = d1 === d2;

      // Case 1: Player is currently in Detention
      if (activePlayer.inDetention) {
        if (isDouble) {
          // Free on doubles: move by sum, no extra roll
          emitSound('diceRoll');
          const movement = calculateEffectiveMovement(activePlayer.position, sum, state.chaosModifiers, BOARD_SIZE);
          const newPosition = movement.newPosition;
          const passedStart = movement.passedStart;

          let currentPlayers = state.players;
          let currentLedger = state.ledger || [];

          let earnedSalary = 0;
          let salaryLog = '';
          if (passedStart || newPosition === 0) {
            earnedSalary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
            const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
            salaryLog = ` và nhận ${formatMoney(earnedSalary)} trợ cấp Cổng Khởi Hành${isGoldenHour ? ' (x2 Giờ Vàng)!' : '!'}`;
          }

          if (earnedSalary > 0) {
            const salaryRes = executeLedgerTransaction(currentPlayers, {
              category: 'SALARY_START',
              from: 'BANK',
              to: activePlayer.id,
              amount: earnedSalary,
              roundNumber: state.roundNumber,
              memo: `Lương Cổng Khởi Hành (GO)`,
            }, currentLedger);
            if (salaryRes.success && salaryRes.entry) {
              currentPlayers = salaryRes.newPlayers;
              currentLedger = [...currentLedger, salaryRes.entry];
            }
          }

          const updatedPlayer: PlayerState = {
            ...(currentPlayers.find(p => p.id === activePlayer.id) || activePlayer),
            position: newPosition,
            inDetention: false,
            detentionTurns: 0,
            consecutiveDoubles: 0,
            stats: {
              ...activePlayer.stats,
              tilesTraveled: activePlayer.stats.tilesTraveled + movement.effectiveSteps,
            },
          };

          const updatedPlayers = currentPlayers.map(p => p.id === activePlayer.id ? updatedPlayer : p);
          const landingTile = getTileById(newPosition);

          const escapeLog: GameLogEntry = {
            id: `log-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[THOÁT GIAM] ${activePlayer.name} lắc được đôi ${d1}-${d2}! Tự do và tiến ${sum} ô đến [${landingTile?.name || newPosition}]${salaryLog}.`,
            type: 'INFO',
          };

          const stateAfterEscape: GameState = {
            ...state,
            players: updatedPlayers,
            dice,
            isDouble: false, // Invariant: Escaping via doubles does NOT grant an extra roll
            turnPhase: 'ACTION_MENU',
            ledger: currentLedger,
            ledgerHistory: currentLedger,
            lastSoundEffect: 'diceRoll',
            logs: [escapeLog, ...state.logs],
          };

          return resolveLandingTile(stateAfterEscape, newPosition, sum);
        } else {
          // Non-doubles while detained
          if (activePlayer.detentionTurns > 0) {
            // Turns remaining: Remain detained, decrement counter (2 -> 1 -> 0)
            const remainingTurns = activePlayer.detentionTurns - 1;
            const updatedPlayer: PlayerState = {
              ...activePlayer,
              detentionTurns: remainingTurns,
            };
            const updatedPlayers = state.players.map(p => p.id === activePlayer.id ? updatedPlayer : p);

            return {
              ...state,
              players: updatedPlayers,
              dice,
              isDouble: false,
              turnPhase: 'ACTION_MENU',
              logs: [
                {
                  id: `log-${Date.now()}`,
                  timestamp: Date.now(),
                  playerId: activePlayer.id,
                  playerName: activePlayer.name,
                  message: `${activePlayer.name} lắc được ${d1}-${d2} (không phải đôi), tiếp tục ở lại Khu Cách Ly.`,
                  type: 'INFO',
                },
                ...state.logs,
              ],
            };
          } else {
            // Final attempt failed (detentionTurns <= 0) -> FREE RELEASE
            // Client request: serving the full sentence releases the player at no cost.
            // Paying bail is still available, but only as an optional early exit.
            emitSound('buyProperty');
            let currentPlayers = state.players;
            let currentLedger = state.ledger || [];

            const movement = calculateEffectiveMovement(activePlayer.position, sum, state.chaosModifiers, BOARD_SIZE);
            const newPosition = movement.newPosition;
            const passedStart = movement.passedStart;

            let earnedSalary = 0;
            let salaryLog = '';
            if (newPosition === 0) {
              earnedSalary = calculateSalary(state.config.salaryOnStart * 2, state.chaosModifiers, state.roundNumber, state);
              const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
              salaryLog = ` và đáp trúng Cổng Khởi Hành nhận thưởng ${formatMoney(earnedSalary)}${isGoldenHour ? ' (x2 Giờ Vàng)!' : '!'}`;
            } else if (passedStart) {
              earnedSalary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
              const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
              salaryLog = ` và nhận ${formatMoney(earnedSalary)} trợ cấp Cổng Khởi Hành${isGoldenHour ? ' (x2 Giờ Vàng)!' : '!'}`;
            }

            if (earnedSalary > 0) {
              const salaryRes = executeLedgerTransaction(currentPlayers, {
                category: 'SALARY_START',
                from: 'BANK',
                to: activePlayer.id,
                amount: earnedSalary,
                roundNumber: state.roundNumber,
                memo: `Lương Cổng Khởi Hành (GO)`,
              }, currentLedger);
              if (salaryRes.success && salaryRes.entry) {
                currentPlayers = salaryRes.newPlayers;
                currentLedger = [...currentLedger, salaryRes.entry];
              }
            }

            const updatedPlayer: PlayerState = {
              ...(currentPlayers.find(p => p.id === activePlayer.id) || activePlayer),
              position: newPosition,
              inDetention: false,
              detentionTurns: 0,
              consecutiveDoubles: 0,
              stats: {
                ...activePlayer.stats,
                tilesTraveled: activePlayer.stats.tilesTraveled + movement.effectiveSteps,
              },
            };

            const updatedPlayers = currentPlayers.map(p => p.id === activePlayer.id ? updatedPlayer : p);
            const landingTile = getTileById(newPosition);

            const forcedReleaseLog: GameLogEntry = {
              id: `log-forced-release-${Date.now()}`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `[HẾT HẠN TẠM GIAM] Đã thụ án xong. ${activePlayer.name} được phóng thích miễn phí và di chuyển ${sum} ô đến [${landingTile?.name || newPosition}]${salaryLog}.`,
              type: 'INFO',
            };

            const stateAfterForcedBail: GameState = {
              ...state,
              players: updatedPlayers,
              dice,
              isDouble: false,
              turnPhase: 'ACTION_MENU',
              ledger: currentLedger,
              ledgerHistory: currentLedger,
              lastSoundEffect: 'buyProperty',
              logs: [forcedReleaseLog, ...state.logs],
            };

            return resolveLandingTile(stateAfterForcedBail, newPosition, sum);
          }
        }
      }

      // Case 2: Consecutive doubles speeding jail check
      const consecutiveDoubles = isDouble ? activePlayer.consecutiveDoubles + 1 : 0;
      if (consecutiveDoubles >= 3) {
        emitSound('payRent');
        const updatedPlayer: PlayerState = {
          ...activePlayer,
          position: 10,
          inDetention: true,
          detentionTurns: 2,
          consecutiveDoubles: 0,
        };
        const updatedPlayers = state.players.map(p => p.id === activePlayer.id ? updatedPlayer : p);

        return {
          ...state,
          players: updatedPlayers,
          dice,
          isDouble: false,
          turnPhase: 'ACTION_MENU',
          lastSoundEffect: 'payRent',
          logs: [
            {
              id: `log-${Date.now()}`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `[CẢNH BÁO] ${activePlayer.name} lắc 3 lần đôi liên tiếp! Bị áp giải tới Khu Cách Ly An Ninh.`,
              type: 'WARNING',
            },
            ...state.logs,
          ],
        };
      }

      // Case 3: Normal board movement with active Chaos Modifiers
      const graph = state.spatialGraph;

      // FAST PATH: Legacy 1-Cycle Ring (or spatialGraph has no branching)
      if (!graph || graph.mapId === 'legacy-ring-40' || !hasBranchIntersections(graph)) {
        const movement = calculateEffectiveMovement(activePlayer.position, sum, state.chaosModifiers, BOARD_SIZE);
        const newPosition = movement.newPosition;
        const passedStart = movement.passedStart;

        let currentPlayers = state.players;
        let currentLedger = state.ledger || [];

        let earnedSalary = 0;
        let salaryLog = '';
        if (passedStart || newPosition === 0) {
          earnedSalary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
          const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
          salaryLog = ` Đi qua Cổng Khởi Hành nhận ${formatMoney(earnedSalary)} trợ cấp${isGoldenHour ? ' (x2 Giờ Vàng)!' : '!'}`;
        }

        if (earnedSalary > 0) {
          const salaryRes = executeLedgerTransaction(currentPlayers, {
            category: 'SALARY_START',
            from: 'BANK',
            to: activePlayer.id,
            amount: earnedSalary,
            roundNumber: state.roundNumber,
            memo: `Lương Cổng Khởi Hành (GO)`,
          }, currentLedger);
          if (salaryRes.success && salaryRes.entry) {
            currentPlayers = salaryRes.newPlayers;
            currentLedger = [...currentLedger, salaryRes.entry];
          }
        }

        const updatedPlayer: PlayerState = {
          ...(currentPlayers.find(p => p.id === activePlayer.id) || activePlayer),
          position: newPosition,
          positionNodeId: `node-${newPosition}`,
          consecutiveDoubles,
          stats: {
            ...activePlayer.stats,
            tilesTraveled: activePlayer.stats.tilesTraveled + movement.effectiveSteps,
          },
        };

        const updatedPlayers = currentPlayers.map(p => p.id === activePlayer.id ? updatedPlayer : p);
        const landingTile = getTileById(newPosition);
        const newLogs = [...state.logs];

        let diceLog = `${activePlayer.name} lắc được ${d1} + ${d2} = ${sum} điểm`;
        if (movement.isCapped) {
          diceLog += ` (Giới Nghiêm! Tối đa 4 bước)`;
        }
        if (movement.isReverse) {
          diceLog += ` (Đi ngược chiều!)`;
        }
        diceLog += `, di chuyển đến [${landingTile?.name || newPosition}].`;

        if (isDouble) {
          diceLog += ` (Được ĐÔI! Sẽ được lắc thêm lượt)`;
        }
        if (salaryLog) {
          diceLog += salaryLog;
        }

        newLogs.unshift({
          id: `dice-${Date.now()}`,
          timestamp: Date.now(),
          playerId: activePlayer.id,
          playerName: activePlayer.name,
          message: diceLog,
          type: 'DICE',
        });

        const nextState: GameState = {
          ...state,
          players: updatedPlayers,
          dice,
          isDouble,
          turnPhase: 'ACTION_MENU',
          ledger: currentLedger,
          ledgerHistory: currentLedger,
          logs: newLogs,
        };

        return resolveLandingTile(nextState, newPosition, sum);
      }

      // SPATIAL GRAPH TRAVERSAL PATH (Branching & Multi-floor Maps)
      let currentNodeId = activePlayer.positionNodeId || (activePlayer.position !== undefined ? `node-${activePlayer.position}` : graph.startNodeId);
      if (!graph.nodes[currentNodeId]) {
        currentNodeId = graph.startNodeId;
      }
      let remainingSteps = state.chaosModifiers?.curfewTurns && state.chaosModifiers.curfewTurns > 0 ? Math.min(sum, 4) : sum;

      let currentPlayers = state.players;
      let currentLedger = state.ledger || [];
      let previousNodeId: string | undefined = undefined;

      while (remainingSteps > 0) {
        const currentCash = currentPlayers.find(p => p.id === activePlayer.id)?.cash ?? activePlayer.cash;
        const validCandidates = getValidNextNodes(graph, currentNodeId, currentCash, previousNodeId);
        const unlockedCandidates = validCandidates.filter(
          node => !node.isLocked && (!state.fogOfWarState || state.fogOfWarState.unlockedNodes[node.id] !== false)
        );

        if (unlockedCandidates.length === 0) {
          break;
        }

        if (unlockedCandidates.length > 1) {
          // INTERSECTION ENCOUNTERED: Pause in BRANCH_DECISION
          const updatedPlayer: PlayerState = {
            ...(currentPlayers.find(p => p.id === activePlayer.id) || activePlayer),
            positionNodeId: currentNodeId,
            position: graph.nodes[currentNodeId]?.numericId ?? activePlayer.position,
            consecutiveDoubles,
          };
          return {
            ...state,
            players: currentPlayers.map(p => p.id === activePlayer.id ? updatedPlayer : p),
            dice,
            isDouble,
            turnPhase: 'BRANCH_DECISION',
            movementState: {
              remainingSteps,
              diceSum: sum,
              currentNodeId,
              availableNextNodes: unlockedCandidates.map(n => n.id),
            },
            ledger: currentLedger,
            ledgerHistory: currentLedger,
            logs: [
              {
                id: `branch-${Date.now()}`,
                timestamp: Date.now(),
                playerId: activePlayer.id,
                playerName: activePlayer.name,
                message: `${activePlayer.name} tới ngã rẽ [${graph.nodes[currentNodeId]?.name || currentNodeId}]. Còn ${remainingSteps} bước. Hãy chọn hướng tiếp theo!`,
                type: 'INFO',
              },
              ...state.logs,
            ],
          };
        }

        // Exactly 1 unlocked path: advance automatically
        const targetNode = unlockedCandidates[0];
        const stepResult = stepTraverse(graph, currentNodeId, targetNode.id, currentCash);

        // Pay elevator toll if applicable
        if (stepResult.tollPaid > 0) {
          const tollRes = executeLedgerTransaction(currentPlayers, {
            category: 'TAX_PAYMENT',
            from: activePlayer.id,
            to: 'BANK',
            amount: stepResult.tollPaid,
            roundNumber: state.roundNumber,
            memo: `Phí thang máy ($${stepResult.tollPaid})`,
          }, currentLedger);
          if (tollRes.success && tollRes.entry) {
            currentPlayers = tollRes.newPlayers;
            currentLedger = [...currentLedger, tollRes.entry];
          }
        }

        previousNodeId = currentNodeId;
        currentNodeId = targetNode.id;
        remainingSteps -= 1;

        // Check placed traps during movement traversal
        const trapCheck = triggerTrapAtNode(
          { ...state, players: currentPlayers, ledger: currentLedger },
          activePlayer.id,
          currentNodeId
        );
        if (trapCheck.trapTriggered) {
          currentPlayers = trapCheck.nextState.players;
          currentLedger = trapCheck.nextState.ledger || currentLedger;
          state = {
            ...state,
            placedTraps: trapCheck.nextState.placedTraps,
            logs: trapCheck.nextState.logs,
          };
          state = processGameEvent(state, {
            type: 'TRAP_TRIGGERED',
            playerId: activePlayer.id,
            nodeId: currentNodeId,
          });
          if (trapCheck.haltedMovement) {
            remainingSteps = 0;
            break;
          }
        }

        // Passing START node
        if (currentNodeId === graph.startNodeId) {
          const salary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
          const salRes = executeLedgerTransaction(currentPlayers, {
            category: 'SALARY_START',
            from: 'BANK',
            to: activePlayer.id,
            amount: salary,
            roundNumber: state.roundNumber,
            memo: `Lương Cổng Khởi Hành (GO)`,
          }, currentLedger);
          if (salRes.success && salRes.entry) {
            currentPlayers = salRes.newPlayers;
            currentLedger = [...currentLedger, salRes.entry];
          }
        }
      }

      // Stepping complete: land on currentNodeId
      const finalNode = graph.nodes[currentNodeId];
      const finalNumericId = finalNode?.numericId ?? activePlayer.position;
      const updatedPlayer: PlayerState = {
        ...(currentPlayers.find(p => p.id === activePlayer.id) || activePlayer),
        positionNodeId: currentNodeId,
        position: finalNumericId,
        consecutiveDoubles,
        stats: {
          ...activePlayer.stats,
          tilesTraveled: activePlayer.stats.tilesTraveled + sum,
        },
      };

      const updatedPlayers = currentPlayers.map(p => p.id === activePlayer.id ? updatedPlayer : p);
      const landingName = finalNode?.name || currentNodeId;

      let nextState: GameState = {
        ...state,
        players: updatedPlayers,
        dice,
        isDouble,
        turnPhase: 'ACTION_MENU',
        movementState: null,
        ledger: currentLedger,
        ledgerHistory: currentLedger,
        logs: [
          {
            id: `dice-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `${activePlayer.name} lắc được ${d1} + ${d2} = ${sum} điểm, di chuyển đến [${landingName}].`,
            type: 'DICE',
          },
          ...state.logs,
        ],
      };

      nextState = processGameEvent(nextState, { type: 'DICE_ROLLED', playerId: activePlayer.id });
      if (isDouble) {
        nextState = processGameEvent(nextState, { type: 'DICE_DOUBLES', playerId: activePlayer.id });
      }

      return resolveLandingTile(nextState, finalNumericId, sum);
    }

    case 'CHOOSE_BRANCH_PATH': {
      if (state.turnPhase !== 'BRANCH_DECISION' || !state.movementState) {
        return state;
      }

      const { targetNodeId } = action;
      const { remainingSteps, diceSum, currentNodeId, availableNextNodes } = state.movementState;

      // Validation: chosen node must be in available choices
      if (!availableNextNodes.includes(targetNodeId)) {
        return state;
      }

      const graph = state.spatialGraph;
      if (!graph) return state;

      const activePlayer = state.players[state.activePlayerIndex];
      let currentPlayers = state.players;
      let currentLedger = state.ledger || [];

      // Advance 1 step to chosen node
      const currentCashInitial = currentPlayers.find(p => p.id === activePlayer.id)?.cash ?? activePlayer.cash;
      const stepResult = stepTraverse(graph, currentNodeId, targetNodeId, currentCashInitial);
      if (stepResult.tollPaid > 0) {
        const tollRes = executeLedgerTransaction(currentPlayers, {
          category: 'TAX_PAYMENT',
          from: activePlayer.id,
          to: 'BANK',
          amount: stepResult.tollPaid,
          roundNumber: state.roundNumber,
          memo: `Phí thang máy ($${stepResult.tollPaid})`,
        }, currentLedger);
        if (tollRes.success && tollRes.entry) {
          currentPlayers = tollRes.newPlayers;
          currentLedger = [...currentLedger, tollRes.entry];
        }
      }

      let currNodeId = targetNodeId;
      let stepsLeft = remainingSteps - 1;
      let prevNodeId: string | undefined = currentNodeId;

      // Check trap on chosen branch step
      const branchTrapCheck = triggerTrapAtNode(
        { ...state, players: currentPlayers, ledger: currentLedger },
        activePlayer.id,
        currNodeId
      );
      if (branchTrapCheck.trapTriggered) {
        currentPlayers = branchTrapCheck.nextState.players;
        currentLedger = branchTrapCheck.nextState.ledger || currentLedger;
        state = {
          ...state,
          placedTraps: branchTrapCheck.nextState.placedTraps,
          logs: branchTrapCheck.nextState.logs,
        };
        state = processGameEvent(state, {
          type: 'TRAP_TRIGGERED',
          playerId: activePlayer.id,
          nodeId: currNodeId,
        });
        if (branchTrapCheck.haltedMovement) {
          stepsLeft = 0;
        }
      }

      // Passing START node
      if (currNodeId === graph.startNodeId) {
        const salary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
        const salRes = executeLedgerTransaction(currentPlayers, {
          category: 'SALARY_START',
          from: 'BANK',
          to: activePlayer.id,
          amount: salary,
          roundNumber: state.roundNumber,
          memo: `Lương Cổng Khởi Hành (GO)`,
        }, currentLedger);
        if (salRes.success && salRes.entry) {
          currentPlayers = salRes.newPlayers;
          currentLedger = [...currentLedger, salRes.entry];
        }
      }

      // Auto-advance if single path continues and stepsLeft > 0
      while (stepsLeft > 0) {
        const currentCash = currentPlayers.find(p => p.id === activePlayer.id)?.cash ?? activePlayer.cash;
        const validCandidates = getValidNextNodes(graph, currNodeId, currentCash, prevNodeId);
        const unlockedCandidates = validCandidates.filter(
          n => !n.isLocked && (!state.fogOfWarState || state.fogOfWarState.unlockedNodes[n.id] !== false)
        );

        if (unlockedCandidates.length === 0) {
          break;
        }

        if (unlockedCandidates.length > 1) {
          // Another intersection reached! Pause again
          const intermediatePlayer: PlayerState = {
            ...(currentPlayers.find(p => p.id === activePlayer.id) || activePlayer),
            positionNodeId: currNodeId,
            position: graph.nodes[currNodeId]?.numericId ?? activePlayer.position,
          };
          return {
            ...state,
            players: currentPlayers.map(p => p.id === activePlayer.id ? intermediatePlayer : p),
            turnPhase: 'BRANCH_DECISION',
            movementState: {
              remainingSteps: stepsLeft,
              diceSum,
              currentNodeId: currNodeId,
              availableNextNodes: unlockedCandidates.map(n => n.id),
            },
            ledger: currentLedger,
            ledgerHistory: currentLedger,
            logs: [
              {
                id: `branch-${Date.now()}`,
                timestamp: Date.now(),
                playerId: activePlayer.id,
                playerName: activePlayer.name,
                message: `${activePlayer.name} tiếp tục tới ngã rẽ [${graph.nodes[currNodeId]?.name || currNodeId}]. Còn ${stepsLeft} bước. Hãy chọn hướng!`,
                type: 'INFO',
              },
              ...state.logs,
            ],
          };
        }

        // Single path: step forward
        const nextNode = unlockedCandidates[0];
        const res = stepTraverse(graph, currNodeId, nextNode.id, currentCash);
        if (res.tollPaid > 0) {
          const tollRes = executeLedgerTransaction(currentPlayers, {
            category: 'TAX_PAYMENT',
            from: activePlayer.id,
            to: 'BANK',
            amount: res.tollPaid,
            roundNumber: state.roundNumber,
            memo: `Phí thang máy ($${res.tollPaid})`,
          }, currentLedger);
          if (tollRes.success && tollRes.entry) {
            currentPlayers = tollRes.newPlayers;
            currentLedger = [...currentLedger, tollRes.entry];
          }
        }

        prevNodeId = currNodeId;
        currNodeId = nextNode.id;
        stepsLeft -= 1;

        // Check placed traps during continuing branch traversal
        const loopTrapCheck = triggerTrapAtNode(
          { ...state, players: currentPlayers, ledger: currentLedger },
          activePlayer.id,
          currNodeId
        );
        if (loopTrapCheck.trapTriggered) {
          currentPlayers = loopTrapCheck.nextState.players;
          currentLedger = loopTrapCheck.nextState.ledger || currentLedger;
          state = {
            ...state,
            placedTraps: loopTrapCheck.nextState.placedTraps,
            logs: loopTrapCheck.nextState.logs,
          };
          state = processGameEvent(state, {
            type: 'TRAP_TRIGGERED',
            playerId: activePlayer.id,
            nodeId: currNodeId,
          });
          if (loopTrapCheck.haltedMovement) {
            stepsLeft = 0;
            break;
          }
        }

        if (currNodeId === graph.startNodeId) {
          const salary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers, state.roundNumber, state);
          const salRes = executeLedgerTransaction(currentPlayers, {
            category: 'SALARY_START',
            from: 'BANK',
            to: activePlayer.id,
            amount: salary,
            roundNumber: state.roundNumber,
            memo: `Lương Cổng Khởi Hành (GO)`,
          }, currentLedger);
          if (salRes.success && salRes.entry) {
            currentPlayers = salRes.newPlayers;
            currentLedger = [...currentLedger, salRes.entry];
          }
        }
      }

      // Movement finished!
      const finalNode = graph.nodes[currNodeId];
      const finalNumericId = finalNode?.numericId ?? activePlayer.position;
      const updatedPlayer: PlayerState = {
        ...(currentPlayers.find(p => p.id === activePlayer.id) || activePlayer),
        positionNodeId: currNodeId,
        position: finalNumericId,
        stats: {
          ...activePlayer.stats,
          tilesTraveled: activePlayer.stats.tilesTraveled + diceSum,
        },
      };

      const updatedPlayers = currentPlayers.map(p => p.id === activePlayer.id ? updatedPlayer : p);
      const landingName = finalNode?.name || currNodeId;

      const nextState: GameState = {
        ...state,
        players: updatedPlayers,
        turnPhase: 'ACTION_MENU',
        movementState: null,
        ledger: currentLedger,
        ledgerHistory: currentLedger,
        logs: [
          {
            id: `branch-land-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `${activePlayer.name} đã hoàn tất di chuyển và dừng lại tại [${landingName}].`,
            type: 'INFO',
          },
          ...state.logs,
        ],
      };

      return resolveLandingTile(nextState, finalNumericId, diceSum);
    }

    case 'UNLOCK_ZONE': {
      const { zoneId, reason } = action;
      if (!state.spatialGraph || !state.fogOfWarState) {
        return state;
      }

      const { updatedGraph, updatedFogState, unlockEvent } = unlockZone(
        state.spatialGraph,
        zoneId,
        state.fogOfWarState,
        state.roundNumber,
        reason
      );

      return {
        ...state,
        spatialGraph: updatedGraph,
        fogOfWarState: updatedFogState,
        logs: [
          {
            id: `unlock-${Date.now()}`,
            timestamp: Date.now(),
            playerId: state.players[state.activePlayerIndex]?.id || 'SYSTEM',
            playerName: state.players[state.activePlayerIndex]?.name || 'Hệ Thống',
            message: `[MỞ KHÓA KHU VỰC] ${unlockEvent.zoneName} đã được mở khóa! (${unlockEvent.triggeredBy})`,
            type: 'INFO',
          },
          ...state.logs,
        ],
      };
    }

    case 'BUY_PROPERTY': {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const validation = canBuyProperty(tileId, activePlayer.cash, state.properties, state.chaosModifiers, state.roundNumber, state);

      if (!validation.canBuy) {
        return state;
      }

      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;

      const price = getBuyPrice(tileId, state.roundNumber, state);
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: 'PROPERTY_PURCHASE',
        from: activePlayer.id,
        to: 'BANK',
        amount: price,
        roundNumber: state.roundNumber,
        tileId,
        memo: `Mua bất động sản [${tile.name}]`,
      }, state.ledger || []);

      if (!ledgerRes.success) return state;

      const updatedPlayers = ledgerRes.newPlayers.map(p =>
        p.id === activePlayer.id ? { ...p, stats: { ...p.stats, propertiesOwned: p.stats.propertiesOwned + 1 } } : p
      );
      const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);

      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ownerId: activePlayer.id,
          level: 0,
          isMortgaged: false,
        },
      };

      emitSound('buyProperty');

      let nextState: GameState = {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: 'buyProperty',
        logs: [
          {
            id: `buy-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[MUA ĐẤT] ${activePlayer.name} đã mua bất động sản [${tile.name}] với giá ${formatMoney(price)}.`,
            type: 'PURCHASE',
          },
          ...state.logs,
        ],
      };

      nextState = processGameEvent(nextState, {
        type: 'PROPERTY_PURCHASED',
        playerId: activePlayer.id,
        nodeId: `node-${tileId}`,
      });

      return nextState;
    }

    case 'UPGRADE_PROPERTY': {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const validation = canUpgradeProperty(tileId, activePlayer.id, activePlayer.cash, state.properties, state.chaosModifiers, state.roundNumber, state);

      if (!validation.canUpgrade) {
        return state;
      }

      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;

      const cost = getUpgradeCost(tileId, state.roundNumber, state);
      const currentLevel = state.properties[tileId]?.level || 0;
      const nextLevel = currentLevel + 1;

      const ledgerRes = executeLedgerTransaction(state.players, {
        category: 'PROPERTY_UPGRADE',
        from: activePlayer.id,
        to: 'BANK',
        amount: cost,
        roundNumber: state.roundNumber,
        tileId,
        memo: `Nâng cấp [${tile.name}] lên Cấp ${nextLevel}`,
      }, state.ledger || []);

      if (!ledgerRes.success) return state;
      const updatedPlayers = ledgerRes.newPlayers;
      const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);

      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ...state.properties[tileId],
          level: nextLevel,
          lastUpgradeRound: state.roundNumber,
        },
      };

      emitSound('upgradeProperty');

      const levelNames = ['Nhà Phố 1★', 'Biệt Thự 2★', 'TT Thương Mại 3★', 'Cao Ốc Phức Hợp 4★', 'Đại Công Trình Landmark 5★'];
      const levelTitle = levelNames[nextLevel - 1] || `Cấp ${nextLevel}★`;

      let nextState: GameState = {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: 'upgradeProperty',
        logs: [
          {
            id: `upgrade-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[XÂY DỰNG] ${activePlayer.name} nâng cấp [${tile.name}] lên ${levelTitle} (Cấp ${nextLevel}) chi phí ${formatMoney(cost)}!`,
            type: 'PURCHASE',
          },
          ...state.logs,
        ],
      };

      // Check Urban Fog of War unlock triggers
      if (nextState.spatialGraph && nextState.fogOfWarState) {
        const triggerRes = checkUnlockTriggers(nextState, nextState.spatialGraph, {
          triggerType: 'UPGRADE',
          upgradedTileId: tileId,
          newLevel: nextLevel,
        });
        if (triggerRes.shouldUnlock) {
          for (const zid of triggerRes.zoneIdsToUnlock) {
            const unlockRes = unlockZone(
              nextState.spatialGraph!,
              zid,
              nextState.fogOfWarState!,
              nextState.roundNumber,
              triggerRes.reasons[zid]
            );
            nextState = {
              ...nextState,
              spatialGraph: unlockRes.updatedGraph,
              fogOfWarState: unlockRes.updatedFogState,
              logs: [
                {
                  id: `unlock-${Date.now()}-${zid}`,
                  timestamp: Date.now(),
                  playerId: activePlayer.id,
                  playerName: activePlayer.name,
                  message: `[MỞ KHÓA KHU VỰC] ${unlockRes.unlockEvent.zoneName} đã được mở khóa! (${unlockRes.unlockEvent.triggeredBy})`,
                  type: 'INFO',
                },
                ...nextState.logs,
              ],
            };
          }
        }
      }

      nextState = processGameEvent(nextState, {
        type: 'PROPERTY_UPGRADED',
        playerId: activePlayer.id,
        nodeId: `node-${tileId}`,
      });

      return nextState;
    }

    case 'DOWNGRADE_PROPERTY': {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const actorId = action.senderPlayerId || activePlayer?.id;
      const actor = state.players.find(p => p.id === actorId);
      if (!actor || actor.isBankrupt) return state;
      if (!tradeAnytime(state) && activePlayer && actor.id !== activePlayer.id) {
        return state;
      }

      const validation = canDowngradeProperty(tileId, actor.id, state.properties, state.roundNumber, state);

      if (!validation.canDowngrade) {
        return state;
      }

      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;

      const refund = validation.refundAmount;
      const currentLevel = state.properties[tileId]?.level || 0;
      const nextLevel = currentLevel - 1;

      const ledgerRes = executeLedgerTransaction(state.players, {
        category: 'PROPERTY_DOWNGRADE',
        from: 'BANK',
        to: actor.id,
        amount: refund,
        roundNumber: state.roundNumber,
        tileId,
        memo: `Dỡ bỏ 1 cấp công trình tại [${tile.name}] nhận hoàn tiền ${Math.round(sellRate(state) * 100)}%`,
      }, state.ledger || []);

      if (!ledgerRes.success) return state;
      const updatedPlayers = ledgerRes.newPlayers;
      const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);

      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ...state.properties[tileId],
          level: nextLevel,
        },
      };

      emitSound('buyProperty');

      return {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: 'buyProperty',
        logs: [
          {
            id: `downgrade-${Date.now()}`,
            timestamp: Date.now(),
            playerId: actor.id,
            playerName: actor.name,
            message: `[DỠ BỎ] ${actor.name} bán bớt 1 cấp công trình tại [${tile.name}] nhận về ${formatMoney(refund)} (${Math.round(sellRate(state) * 100)}%).`,
            type: 'PURCHASE',
          },
          ...state.logs,
        ],
      };
    }

    case 'SELL_PROPERTY': {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const actorId = action.senderPlayerId || activePlayer?.id;
      const actor = state.players.find(p => p.id === actorId);
      if (!actor || actor.isBankrupt) return state;
      if (!tradeAnytime(state) && activePlayer && actor.id !== activePlayer.id) {
        return state;
      }

      const validation = canSellProperty(tileId, actor.id, state.properties, state.chaosModifiers, state.roundNumber, state);
      if (!validation.canSell) {
        return state;
      }

      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;

      const salePrice = validation.sellValue;
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: 'PROPERTY_SALE',
        from: 'BANK',
        to: actor.id,
        amount: salePrice,
        roundNumber: state.roundNumber,
        tileId,
        memo: `Bán lại ô đất [${tile.name}] cho Ngân hàng`,
      }, state.ledger || []);

      if (!ledgerRes.success) return state;
      const updatedPlayers = ledgerRes.newPlayers.map(p =>
        p.id === actor.id
          ? { ...p, stats: { ...p.stats, propertiesOwned: Math.max(0, p.stats.propertiesOwned - 1) } }
          : p
      );
      const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);

      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ownerId: null,
          level: 0,
          isMortgaged: false,
        },
      };

      emitSound('buyProperty');

      return {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: 'buyProperty',
        logs: [
          {
            id: `sell-${Date.now()}`,
            timestamp: Date.now(),
            playerId: actor.id,
            playerName: actor.name,
            message: `[BÁN ĐẤT] ${actor.name} bán lại [${tile.name}] cho Ngân hàng nhận ${formatMoney(salePrice)} (${Math.round(sellRate(state) * 100)}%).`,
            type: 'PURCHASE',
          },
          ...state.logs,
        ],
      };
    }

    case 'MORTGAGE_PROPERTY': {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const actorId = action.senderPlayerId || activePlayer?.id;
      const actor = state.players.find(p => p.id === actorId);
      if (!actor || actor.isBankrupt) return state;
      if (!tradeAnytime(state) && activePlayer && actor.id !== activePlayer.id) {
        return state;
      }

      const validation = canMortgageProperty(tileId, actor.id, state.properties, state.chaosModifiers, state, state.roundNumber);

      if (!validation.canMortgage) {
        return state;
      }

      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;

      const mortgageVal = validation.mortgageValue;
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: 'PROPERTY_MORTGAGE',
        from: 'BANK',
        to: actor.id,
        amount: mortgageVal,
        roundNumber: state.roundNumber,
        tileId,
        memo: `Thế chấp [${tile.name}] vay ngân hàng`,
      }, state.ledger || []);

      if (!ledgerRes.success) return state;
      const updatedPlayers = ledgerRes.newPlayers;
      const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);

      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ...state.properties[tileId],
          isMortgaged: true,
        },
      };

      emitSound('buyProperty');

      return {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: 'buyProperty',
        logs: [
          {
            id: `mortgage-${Date.now()}`,
            timestamp: Date.now(),
            playerId: actor.id,
            playerName: actor.name,
            message: `[CẦM CỐ] ${actor.name} thế chấp [${tile.name}] cho ngân hàng nhận ngay ${formatMoney(mortgageVal)}.`,
            type: 'PURCHASE',
          },
          ...state.logs,
        ],
      };
    }

    case 'UNMORTGAGE_PROPERTY': {
      const { tileId } = action;
      const activePlayer = state.players[state.activePlayerIndex];
      const validation = canUnmortgageProperty(tileId, activePlayer.id, activePlayer.cash, state.properties, state.chaosModifiers, state, state.roundNumber);

      if (!validation.canUnmortgage) {
        return state;
      }

      const tile = getTileById(tileId);
      if (!tile || !tile.property) return state;

      const cost = validation.unmortgageCost;
      const ledgerRes = executeLedgerTransaction(state.players, {
        category: 'PROPERTY_UNMORTGAGE',
        from: activePlayer.id,
        to: 'BANK',
        amount: cost,
        roundNumber: state.roundNumber,
        tileId,
        memo: `Giải chấp [${tile.name}]`,
      }, state.ledger || []);

      if (!ledgerRes.success) return state;
      const updatedPlayers = ledgerRes.newPlayers;
      const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);

      const updatedProperties = {
        ...state.properties,
        [tileId]: {
          ...state.properties[tileId],
          isMortgaged: false,
        },
      };

      emitSound('buyProperty');

      return {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: 'buyProperty',
        logs: [
          {
            id: `unmortgage-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[CHUỘC LẠI] ${activePlayer.name} giải chấp [${tile.name}] với chi phí ${formatMoney(cost)}.`,
            type: 'PURCHASE',
          },
          ...state.logs,
        ],
      };
    }

    case 'RESOLVE_DEBT':
    case 'SETTLE_PARTIAL_DEBT': {
      if ((state.turnPhase !== 'DEBT_LIQUIDATION' && state.turnPhase !== 'BANKRUPTCY_CHECK') || !state.pendingDebt) {
        return state;
      }

      const activePlayer = state.players[state.activePlayerIndex];
      const debt = state.pendingDebt;
      const requestedPayment = ('amount' in action && typeof action.amount === 'number' && action.amount > 0)
        ? Math.min(action.amount, debt.amount)
        : debt.amount;

      // In pure RESOLVE_DEBT without custom partial amount, reject if player cannot pay in full
      if (action.type === 'RESOLVE_DEBT' && !('amount' in action) && activePlayer.cash < debt.amount) {
        return state;
      }

      const ledgerRes = executeLedgerTransaction(state.players, {
        category: 'DEBT_SETTLEMENT',
        from: activePlayer.id,
        to: debt.creditorPlayerId || 'BANK',
        amount: requestedPayment,
        roundNumber: state.roundNumber,
        memo: `Thanh toán nợ: ${debt.reason}`,
        allowPartial: true,
        debtCategory: debt.category,
      }, state.ledger || []);

      if (!ledgerRes.success || ledgerRes.actualPaid <= 0) {
        return state;
      }

      const remainingDebt = debt.amount - ledgerRes.actualPaid;
      const isFullySettled = remainingDebt <= 0;
      const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);

      return {
        ...state,
        players: ledgerRes.newPlayers,
        turnPhase: isFullySettled ? 'ACTION_MENU' : state.turnPhase,
        pendingDebt: isFullySettled ? null : { ...debt, amount: remainingDebt },
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        logs: [
          {
            id: `debt-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: isFullySettled
              ? `[HOÀN TẤT TRẢ NỢ] ${activePlayer.name} đã thanh toán đủ khoản nợ ${formatMoney(debt.amount)} (${debt.reason}).`
              : `[TRẢ NỢ MỘT PHẦN] ${activePlayer.name} đã nộp ${formatMoney(ledgerRes.actualPaid)}, còn nợ lại ${formatMoney(remainingDebt)}.`,
            type: 'INFO',
          },
          ...state.logs,
        ],
      };
    }

    case 'PAY_DETENTION_BAIL': {
      const activePlayer = state.players[state.activePlayerIndex];
      const bailCost = state.config.detentionBailCost;
      if (!activePlayer.inDetention || activePlayer.cash < bailCost) {
        return state;
      }

      const ledgerRes = executeLedgerTransaction(state.players, {
        category: 'BAIL_PAYMENT',
        from: activePlayer.id,
        to: 'BANK',
        amount: bailCost,
        roundNumber: state.roundNumber,
        memo: `Nộp tiền bảo lãnh rời Khu Cách Ly`,
      }, state.ledger || []);

      if (!ledgerRes.success) return state;

      emitSound('buyProperty');
      const updatedPlayers = ledgerRes.newPlayers.map(p =>
        p.id === activePlayer.id ? { ...p, inDetention: false, detentionTurns: 0 } : p
      );
      const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);

      let nextState: GameState = {
        ...state,
        players: updatedPlayers,
        turnPhase: 'WAITING_FOR_ROLL',
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        lastSoundEffect: 'buyProperty',
        logs: [
          {
            id: `bail-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[BẢO LÃNH] ${activePlayer.name} nộp ${formatMoney(bailCost)} bảo lãnh để rời Khu Cách Ly lập tức.`,
            type: 'INFO',
          },
          ...state.logs,
        ],
      };

      nextState = processGameEvent(nextState, { type: 'PAY_DETENTION_BAIL', playerId: activePlayer.id });

      return nextState;
    }

    case 'USE_DETENTION_CARD': {
      const activePlayer = state.players[state.activePlayerIndex];
      if (!activePlayer.inDetention || (activePlayer.jailFreeCards || 0) <= 0) {
        return state;
      }

      emitSound('buyProperty');
      const updatedPlayer: PlayerState = {
        ...activePlayer,
        inDetention: false,
        detentionTurns: 0,
        jailFreeCards: (activePlayer.jailFreeCards || 0) - 1,
      };

      const updatedPlayers = state.players.map(p => p.id === activePlayer.id ? updatedPlayer : p);

      return {
        ...state,
        players: updatedPlayers,
        turnPhase: 'WAITING_FOR_ROLL',
        lastSoundEffect: 'buyProperty',
        logs: [
          {
            id: `jail-card-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[THẺ MIỄN GIAM] ${activePlayer.name} sử dụng Thẻ Miễn Giam để rời Khu Cách Ly (còn lại ${updatedPlayer.jailFreeCards} thẻ).`,
            type: 'INFO',
          },
          ...state.logs,
        ],
      };
    }

    case 'RESOLVE_CHAOS': {
      return {
        ...state,
        activeChaosCard: null,
      };
    }

    case 'APPLY_CHAOS_EFFECT': {
      return applyChaosCard(state, action.payload as any);
    }

    case 'START_AUCTION':
    case 'DECLINE_PROPERTY_PURCHASE': {
      return initiateAuction(state, action.tileId);
    }

    case 'PLACE_AUCTION_BID': {
      return placeAuctionBid(state, action.playerId, action.bidAmount);
    }

    case 'PASS_AUCTION_BID': {
      return passAuctionBid(state, action.playerId);
    }

    case 'PROPOSE_TRADE': {
      if (!tradeAnytime(state)) {
        const active = state.players[state.activePlayerIndex]?.id;
        if (active !== action.proposal.senderPlayerId) return state;
      }
      return proposeTrade(state, action.proposal);
    }

    case 'ACCEPT_TRADE': {
      // A pending offer must always be resolvable (bilateral answers, not a turn action).
      return acceptTrade(state, action.tradeId);
    }

    case 'REJECT_TRADE': {
      return rejectTrade(state, action.tradeId);
    }

    case 'CANCEL_TRADE': {
      return cancelTrade(state, action.tradeId);
    }

    case 'COUNTER_TRADE': {
      return counterTrade(state, action.proposal);
    }

    case 'RECORD_AI_DECISION': {
      return {
        ...state,
        lastAIDecision: action.decision,
      };
    }

    case 'LOAD_SAVED_MATCH': {
      if (!action.savedState || !Array.isArray(action.savedState.players) || action.savedState.players.length < 2) {
        return state;
      }
      return {
        ...INITIAL_GAME_STATE,
        ...action.savedState,
      };
    }

    case 'END_TURN': {
      if (
        state.turnPhase === 'BANKRUPTCY_CHECK' ||
        state.turnPhase === 'DEBT_LIQUIDATION' ||
        state.turnPhase === 'AUCTION' ||
        state.pendingDebt !== null ||
        state.activeAuction !== null
      ) {
        return state;
      }

      const activePlayer = state.players[state.activePlayerIndex];
      // If player rolled double and is not in detention and consecutiveDoubles < 3, grant extra turn!
      if (state.isDouble && !activePlayer.inDetention && activePlayer.consecutiveDoubles < 3) {
        return {
          ...state,
          turnPhase: 'WAITING_FOR_ROLL',
          activeChaosCard: null,
          rentModifier: 1,
          logs: [
            {
              id: `extra-turn-${Date.now()}`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `${activePlayer.name} được tung xúc xắc thêm một lượt vì đã lắc được Đôi!`,
              type: 'INFO',
            },
            ...state.logs,
          ],
        };
      }

      let nextState = advanceTurn(state);

      // Check Urban Fog of War unlock triggers on round or turn advance
      if (nextState.spatialGraph && nextState.fogOfWarState) {
        const triggerRes = checkUnlockTriggers(nextState, nextState.spatialGraph, {
          triggerType: 'ROUND_ADVANCE',
        });
        if (triggerRes.shouldUnlock) {
          for (const zid of triggerRes.zoneIdsToUnlock) {
            const unlockRes = unlockZone(
              nextState.spatialGraph!,
              zid,
              nextState.fogOfWarState!,
              nextState.roundNumber,
              triggerRes.reasons[zid]
            );
            nextState = {
              ...nextState,
              spatialGraph: unlockRes.updatedGraph,
              fogOfWarState: unlockRes.updatedFogState,
              logs: [
                {
                  id: `unlock-${Date.now()}-${zid}`,
                  timestamp: Date.now(),
                  playerId: 'SYSTEM',
                  playerName: 'Hệ Thống',
                  message: `[MỞ KHÓA KHU VỰC] ${unlockRes.unlockEvent.zoneName} đã được mở khóa! (${unlockRes.unlockEvent.triggeredBy})`,
                  type: 'INFO',
                },
                ...nextState.logs,
              ],
            };
          }
        }
      }

      return nextState;
    }

    case 'DECLARE_BANKRUPTCY': {
      const targetPlayer = state.players.find(p => p.id === action.playerId);
      if (!targetPlayer) return state;

      emitSound('payRent');
      const creditorId = state.pendingDebt?.creditorPlayerId || null;
      const updatedProperties = liquidateBankruptPlayer(action.playerId, state.properties, creditorId);
      const remainingCash = Math.max(0, targetPlayer.cash);

      let currentPlayers = state.players;
      let currentLedger = state.ledger || [];

      if (remainingCash > 0 && creditorId) {
        const ledgerRes = executeLedgerTransaction(currentPlayers, {
          category: 'DEBT_SETTLEMENT',
          from: targetPlayer.id,
          to: creditorId,
          amount: remainingCash,
          roundNumber: state.roundNumber,
          memo: `Chuyển toàn bộ tiền mặt còn lại cho chủ nợ khi phá sản`,
          debtCategory: state.pendingDebt?.category,
        }, currentLedger);

        if (ledgerRes.success && ledgerRes.entry) {
          currentPlayers = ledgerRes.newPlayers;
          currentLedger = [...currentLedger, ledgerRes.entry];
        }
      }

      const updatedPlayers = currentPlayers.map(p => {
        if (p.id === action.playerId) {
          return { ...p, isBankrupt: true, cash: 0 };
        }
        return p;
      });

      const logs = [
        {
          id: `bankrupt-${Date.now()}`,
          timestamp: Date.now(),
          playerId: targetPlayer.id,
          playerName: targetPlayer.name,
          message: `[PHÁ SẢN] ${targetPlayer.name} đã vỡ nợ và bị loại khỏi cuộc chơi! Toàn bộ bất động sản bị ngân hàng tịch thu.`,
          type: 'BANKRUPT' as const,
        },
        ...state.logs,
      ];

      // Check win condition immediately
      const winCheck = evaluateWinCondition(updatedPlayers, updatedProperties, state.roundNumber, state.config.maxRounds, state);
      if (winCheck.isGameOver) {
        emitSound('victory');
        return {
          ...state,
          status: 'ENDED',
          winner: winCheck.winner,
          turnPhase: 'GAME_OVER',
          players: updatedPlayers,
          properties: updatedProperties,
          pendingDebt: null,
          ledger: currentLedger,
          ledgerHistory: currentLedger,
          lastSoundEffect: 'victory',
          logs: [
            {
              id: `win-${Date.now()}`,
              timestamp: Date.now(),
              message: `🏆 CHIẾN THẮNG! ${winCheck.winner?.name} là người sống sót duy nhất và trở thành Tân Thị Trưởng Metropolis!`,
              type: 'VICTORY' as const,
            },
            ...logs,
          ],
        };
      }

      let newState: GameState = {
        ...state,
        players: updatedPlayers,
        properties: updatedProperties,
        pendingDebt: null,
        ledger: currentLedger,
        ledgerHistory: currentLedger,
        logs,
      };

      if (state.players[state.activePlayerIndex]?.id === action.playerId) {
        newState = advanceTurn(newState);
      }

      newState = processGameEvent(newState, { type: 'PLAYER_BANKRUPTCY', playerId: action.playerId });

      return newState;
    }

    case 'SELECT_TILE_DETAIL': {
      return {
        ...state,
        selectedTileForDetail: action.tileId,
      };
    }

    case 'RESTART_GAME': {
      return INITIAL_GAME_STATE;
    }

    case 'PLACE_TRAP': {
      const activePlayer = state.players[state.activePlayerIndex];
      if (!activePlayer || activePlayer.isBankrupt || state.status !== 'PLAYING') {
        return state;
      }
      const { nodeId, trapType } = action;

      if (!canPlaceTrap(state, activePlayer.id, nodeId)) {
        return state;
      }

      const newTrap: PlacedTrap = {
        id: `trap-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nodeId,
        ownerPlayerId: activePlayer.id,
        trapType,
        placedRound: state.roundNumber,
        revealed: false,
      };

      const nodeName = state.spatialGraph?.nodes[nodeId]?.name || nodeId;
      return {
        ...state,
        placedTraps: [...(state.placedTraps || []), newTrap],
        logs: [
          {
            id: `trap-place-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `🤫 [ĐẶT BẪY] ${activePlayer.name} đã bí mật cài đặt một bẫy ${trapType} tại [${nodeName}].`,
            type: 'CHAOS' as const,
          },
          ...state.logs,
        ],
      };
    }

    case 'TRIGGER_TRAP': {
      const { nodeId, victimPlayerId } = action;
      const triggerRes = triggerTrapAtNode(state, victimPlayerId, nodeId);
      return triggerRes.nextState;
    }

    case 'SELECT_BUSINESS_TYPE': {
      const activePlayer = state.players[state.activePlayerIndex];
      const actorId = action.playerId || activePlayer?.id;
      if (!actorId || state.status !== 'PLAYING') return state;

      const { businessId } = action;
      const businessDef = BUSINESS_CATALOG[businessId];
      if (!businessDef) return state;

      let targetTileId = action.tileId;
      let targetNodeId = action.nodeId;

      if (targetTileId === undefined && targetNodeId) {
        const num = parseInt(targetNodeId.replace(/^(node-|tile-)/, ''), 10);
        if (!isNaN(num)) targetTileId = num;
      } else if (targetTileId !== undefined && !targetNodeId) {
        targetNodeId = `node-${targetTileId}`;
      } else if (targetTileId === undefined && !targetNodeId && activePlayer) {
        targetTileId = activePlayer.position;
        targetNodeId = activePlayer.positionNodeId || `node-${activePlayer.position}`;
      }

      if (targetTileId === undefined) return state;

      const ownership = state.properties[targetTileId];
      if (!ownership || ownership.ownerId !== actorId || ownership.isMortgaged) {
        return state;
      }

      const updatedProperties = {
        ...state.properties,
        [targetTileId]: {
          ...ownership,
          businessTypeId: businessId,
        },
      };

      let updatedSpatialGraph = state.spatialGraph;
      if (updatedSpatialGraph && targetNodeId && updatedSpatialGraph.nodes[targetNodeId]) {
        const node = updatedSpatialGraph.nodes[targetNodeId];
        updatedSpatialGraph = {
          ...updatedSpatialGraph,
          nodes: {
            ...updatedSpatialGraph.nodes,
            [targetNodeId]: {
              ...node,
              currentBusiness: {
                id: `${businessId}-${targetNodeId}`,
                businessId,
                name: businessDef.name,
                category: businessDef.category,
                tier: Math.max(1, ownership.level || 1),
                baseRentMultiplier: 1.0,
                synergyTags: [...businessDef.synergyTags],
                ownerPlayerId: ownership.ownerId,
              },
            },
          },
        };
      }

      const tileName = getTileById(targetTileId)?.name || targetNodeId || `Ô ${targetTileId}`;
      const logEntry = {
        id: `biz-select-${Date.now()}`,
        timestamp: Date.now(),
        playerId: actorId,
        message: `🏢 [CHỌN MÔ HÌNH KINH DOANH] Đã chuyển đổi [${tileName}] sang mô hình ${businessDef.name}!`,
        type: 'PURCHASE' as const,
      };

      return {
        ...state,
        properties: updatedProperties,
        spatialGraph: updatedSpatialGraph,
        logs: [logEntry, ...state.logs],
      };
    }

    case 'APPLY_CHAOS_DELTA': {
      const delta = action.delta;
      const meter = state.chaosMeter || createInitialChaosMeter();
      const { nextMeter } = applyChaosDelta(meter, delta, state.roundNumber);
      return {
        ...state,
        chaosMeter: nextMeter,
      };
    }

    default:
      return state;
  }
}

/**
 * Resolves tile landing triggers (Rent, Tax, Go to Jail, Chaos, Chest, Chance)
 */
function resolveLandingTile(state: GameState, position: number, diceSum: number): GameState {
  const activePlayer = state.players[state.activePlayerIndex];
  const landingTile = getTileById(position);
  if (!landingTile) return state;

  const newLogs = [...state.logs];
  let updatedPlayers = [...state.players];
  let currentLedger = state.ledger || [];

  const landingNodeId = activePlayer.positionNodeId || (state.spatialGraph ? `node-${position}` : undefined);
  if (landingNodeId) {
    const trapCheck = triggerTrapAtNode(
      { ...state, players: updatedPlayers, ledger: currentLedger },
      activePlayer.id,
      landingNodeId
    );
    if (trapCheck.trapTriggered) {
      updatedPlayers = trapCheck.nextState.players;
      currentLedger = trapCheck.nextState.ledger || currentLedger;
      state = {
        ...state,
        placedTraps: trapCheck.nextState.placedTraps,
        logs: trapCheck.nextState.logs,
      };
      state = processGameEvent(state, {
        type: 'TRAP_TRIGGERED',
        playerId: activePlayer.id,
        nodeId: landingNodeId,
      });
      if (trapCheck.haltedMovement) {
        return {
          ...state,
          players: updatedPlayers,
          ledger: currentLedger,
          ledgerHistory: currentLedger,
          turnPhase: 'ACTION_MENU',
        };
      }
    }

    const patrolHit = checkPatrolInterception(activePlayer, state.chaosMeter?.patrolUnits || []);
    if (patrolHit) {
      const patrolRes = resolvePatrolPenalty(
        { ...state, players: updatedPlayers, ledger: currentLedger },
        activePlayer.id
      );
      updatedPlayers = patrolRes.nextState.players;
      currentLedger = patrolRes.nextState.ledger || currentLedger;
      state = {
        ...state,
        logs: patrolRes.nextState.logs,
        lastSoundEffect: patrolRes.nextState.lastSoundEffect,
      };
    }
  }

  switch (landingTile.type) {
    case 'GO_TO_JAIL': {
      // Tile 30: Go directly to Detention (Tile 10)
      emitSound('payRent');
      const updatedPlayer: PlayerState = {
        ...activePlayer,
        position: 10,
        inDetention: true,
        detentionTurns: 2,
        consecutiveDoubles: 0,
      };
      updatedPlayers = updatedPlayers.map(p => p.id === activePlayer.id ? updatedPlayer : p);

      newLogs.unshift({
        id: `jail-${Date.now()}`,
        timestamp: Date.now(),
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        message: `[LỆNH BẮT TẠM GIAM] ${activePlayer.name} dừng tại [${landingTile.name}] và bị áp giải ngay về Khu Cách Ly Tạm Giam!`,
        type: 'WARNING',
      });

      return {
        ...state,
        players: updatedPlayers,
        ledger: currentLedger,
        ledgerHistory: currentLedger,
        isDouble: false,
        turnPhase: 'ACTION_MENU',
        lastSoundEffect: 'payRent',
        logs: newLogs,
      };
    }

    case 'TAX': {
      const taxAmount = landingTile.taxAmount || (landingTile.id === 4 ? 200 : 100);
      emitSound('payRent');

      const ledgerRes = executeLedgerTransaction(updatedPlayers, {
        category: 'TAX_PAYMENT',
        from: activePlayer.id,
        to: 'BANK',
        amount: taxAmount,
        roundNumber: state.roundNumber,
        tileId: landingTile.id,
        memo: `Nộp thuế tại [${landingTile.name}]`,
        allowPartial: true,
      }, currentLedger);

      const updatedLedger = ledgerRes.entry ? [...currentLedger, ledgerRes.entry] : currentLedger;

      if (ledgerRes.shortfall > 0) {
        return {
          ...state,
          players: ledgerRes.newPlayers,
          ledger: updatedLedger,
          ledgerHistory: updatedLedger,
          turnPhase: 'BANKRUPTCY_CHECK',
          lastSoundEffect: 'payRent',
          pendingDebt: {
            creditorPlayerId: null,
            amount: ledgerRes.shortfall,
            reason: `Nộp thuế tại [${landingTile.name}]`,
            category: 'TAX_PAYMENT',
          },
          logs: [
            {
              id: `tax-warn-${Date.now()}`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `[CẢNH BÁO NỢ THUẾ] ${activePlayer.name} đối mặt khoản thuế ${formatMoney(taxAmount)}, thiếu ${formatMoney(ledgerRes.shortfall)}!`,
              type: 'WARNING',
            },
            ...newLogs,
          ],
        };
      }

      newLogs.unshift({
        id: `tax-${Date.now()}`,
        timestamp: Date.now(),
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        message: `${activePlayer.name} đóng ${formatMoney(taxAmount)} thuế tại [${landingTile.name}].`,
        type: 'WARNING',
      });

      return {
        ...state,
        players: ledgerRes.newPlayers,
        ledger: updatedLedger,
        ledgerHistory: updatedLedger,
        turnPhase: 'ACTION_MENU',
        lastSoundEffect: 'payRent',
        logs: newLogs,
      };
    }

    case 'CHAOS':
    case 'CHEST':
    case 'CHANCE': {
      if (state.config.gameMode === 'CLASSIC' && landingTile.type === 'CHAOS') {
        return {
          ...state,
          players: updatedPlayers,
          turnPhase: 'ACTION_MENU',
          logs: [
            ...newLogs,
            {
              id: `log-${Date.now()}-classic-chaos`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `${activePlayer.name} dừng chân tại ô Hỗn Loạn. Không có thiên tai trong chế độ Cổ Điển!`,
              type: 'INFO',
            },
          ],
        };
      }

      const tileSeed = state.config.seed
        ? state.config.seed + state.roundNumber * 997 + state.activePlayerIndex * 131 + landingTile.id * 17 + (state.chaosHistory?.length || 0) * 31
        : undefined;
      const tileRng = tileSeed !== undefined ? createPRNG(tileSeed) : undefined;
      // Phase 05: World map events ride on the canonical Chaos pipeline (CHAOS tiles only).
      const worldCard =
        landingTile.type === 'CHAOS' && state.config.gameMode !== 'CLASSIC'
          ? pickWorldEventCard({ ...state, players: updatedPlayers }, tileRng)
          : null;
      const card = worldCard ?? drawRandomChaosCard(landingTile.id, tileRng, state);
      let chaosState: GameState = {
        ...state,
        players: updatedPlayers,
        ledger: currentLedger,
        ledgerHistory: currentLedger,
        logs: newLogs,
      };
      chaosState = processGameEvent(chaosState, {
        type: 'CHAOS_CARD_DRAWN',
        playerId: activePlayer.id,
      });
      return applyChaosCard(chaosState, card, tileRng);
    }

    case 'PROPERTY':
    case 'TRANSPORT':
    case 'UTILITY': {
      const ownership = state.properties[landingTile.id];
      if (ownership && ownership.ownerId && ownership.ownerId !== activePlayer.id && !ownership.isMortgaged) {
        const blocked = isTileBlocked(state, landingTile.id);
        const targetNodeId = activePlayer.positionNodeId || `node-${landingTile.id}`;
        const hasBusiness = Boolean(
          ownership.businessTypeId || (state.spatialGraph?.nodes[targetNodeId]?.currentBusiness)
        );

        let rentAmount = 0;
        let isMonopoly = false;

        if (hasBusiness && state.spatialGraph) {
          rentAmount = calculateDynamicBusinessRent(state.spatialGraph, targetNodeId, state);
          if (blocked) rentAmount = 0;
        } else {
          const rentInfo = calculateRent(
            landingTile.id,
            state.properties,
            state.rentModifier *
              getRentEscalationMultiplier(state.roundNumber) *
              rentMultiplier(state, ownership.level, landingTile.type) *
              (blocked ? 0 : 1),
            diceSum,
            state.chaosModifiers
          );
          rentAmount = rentInfo.rentAmount;
          isMonopoly = rentInfo.isMonopoly;
        }
        const owner = updatedPlayers.find(p => p.id === ownership.ownerId);

        if (owner && !owner.isBankrupt && rentAmount > 0) {
          emitSound('payRent');

          const ledgerRes = executeLedgerTransaction(updatedPlayers, {
            category: 'RENT_PAYMENT',
            from: activePlayer.id,
            to: owner.id,
            amount: rentAmount,
            roundNumber: state.roundNumber,
            tileId: landingTile.id,
            memo: `Trả tiền thuê tại [${landingTile.name}] cho ${owner.name}`,
            allowPartial: true,
          }, currentLedger);

          const updatedLedger = ledgerRes.entry ? [...currentLedger, ledgerRes.entry] : currentLedger;

          let rentMsg = `${activePlayer.name} trả ${formatMoney(ledgerRes.actualPaid)} tiền thuê cho ${owner.name} tại [${landingTile.name}].`;
          if (isMonopoly) {
            rentMsg += ` (Nhân đôi do Độc quyền quận!)`;
          }

          newLogs.unshift({
            id: `rent-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: rentMsg,
            type: 'RENT',
          });

          state = processGameEvent(state, {
            type: 'RENT_PAID',
            amount: rentAmount,
            playerId: activePlayer.id,
          });

          if (ledgerRes.shortfall > 0) {
            return {
              ...state,
              players: ledgerRes.newPlayers,
              ledger: updatedLedger,
              ledgerHistory: updatedLedger,
              turnPhase: 'BANKRUPTCY_CHECK',
              lastSoundEffect: 'payRent',
              pendingDebt: {
                creditorPlayerId: owner.id,
                amount: ledgerRes.shortfall,
                reason: `Tiền thuê tại [${landingTile.name}] cho ${owner.name}`,
                category: 'RENT_PAYMENT',
              },
              logs: newLogs,
            };
          }

          return {
            ...state,
            players: ledgerRes.newPlayers,
            ledger: updatedLedger,
            ledgerHistory: updatedLedger,
            turnPhase: 'ACTION_MENU',
            lastSoundEffect: 'payRent',
            logs: newLogs,
          };
        }
      }
      break;
    }

    default:
      break;
  }

  return {
    ...state,
    players: updatedPlayers,
    ledger: currentLedger,
    ledgerHistory: currentLedger,
    turnPhase: 'ACTION_MENU',
    logs: newLogs,
  };
}
