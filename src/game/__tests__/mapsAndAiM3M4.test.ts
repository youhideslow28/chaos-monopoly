import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';
import {
  KOWLOON_MAP_ID,
  COFFIN_HOME_UPGRADES,
  getKowloonFloorDensityMultiplier,
  calculateKowloonDensityRent,
  createKowloonWalledCityGraph,
  applyKowloonFireClearance,
  advanceKowloonDisasterIfNeeded,
  MAP_SCHEMAS,
  validateMapSchema,
  buildGraphFromSchema,
  getSpatialGraphForMapId,
} from '../maps';
import {
  computeNextAIDecision,
  evaluateAIBranchChoice,
  evaluateAIChokePointTrap,
  evaluateAIAdaptiveBusiness,
} from '../ai/aiDecisionEngine';
import { validateClientIntent, sanitizeStateForClient } from '../../server/roomManager';

describe('Milestone 3 & 4 Integration — Kowloon 3D Map, Maps 2-5 Schemas, AI & Multiplayer Parity', () => {
  it('initializes Kowloon Walled City 4-floor 44-node 3D graph via START_GAME reducer', () => {
    const state = gameReducer(INITIAL_GAME_STATE, {
      type: 'START_GAME',
      players: [
        { name: 'Human', token: DEFAULT_PLAYER_TOKENS[0], isAI: false },
        { name: 'Bot Shark', token: DEFAULT_PLAYER_TOKENS[1], isAI: true, aiPersonality: 'SHARK', aiDifficulty: 'HARD' },
      ],
      config: {
        mapId: KOWLOON_MAP_ID,
        startingCash: 1500,
      },
    });

    expect(state.status).toBe('PLAYING');
    expect(state.spatialGraph).toBeDefined();
    expect(state.spatialGraph?.mapId).toBe(KOWLOON_MAP_ID);
    expect(Object.keys(state.spatialGraph?.nodes || {}).length).toBe(44);
    expect(state.fogOfWarState?.unlockedZones['ZONE_BLACK_MARKET']).toBe(false);
    expect(state.chaosMeter?.value).toBe(0);
    expect(state.chaosMeter?.phase).toBe('PEACEFUL');
  });

  it('scales Kowloon Coffin Home rent by floor player density and handles upward fire clearance', () => {
    const graph = createKowloonWalledCityGraph();
    expect(COFFIN_HOME_UPGRADES).toHaveLength(5);
    expect(getKowloonFloorDensityMultiplier(1)).toBeCloseTo(1.0);
    expect(getKowloonFloorDensityMultiplier(3)).toBeCloseTo(2.0);
    expect(calculateKowloonDensityRent(100, 3)).toBe(200);

    let state = gameReducer(INITIAL_GAME_STATE, {
      type: 'START_GAME',
      players: [
        { name: 'P1', token: DEFAULT_PLAYER_TOKENS[0], isAI: false },
        { name: 'P2', token: DEFAULT_PLAYER_TOKENS[1], isAI: true },
      ],
      config: { mapId: KOWLOON_MAP_ID, startingCash: 1500 },
    });

    // Advance to round 18 and trigger upward fire clearance
    const afterFloor0 = advanceKowloonDisasterIfNeeded(state, 18);
    expect(afterFloor0.spatialGraph?.nodes['KOW_F0_00'].hazardStatus).toBe('FIRE');
    // Players on floor 0 evacuated to floor 1 (KOW_F1_00)
    expect(afterFloor0.players[0].positionNodeId).toBe('KOW_F1_00');

    const directFire = applyKowloonFireClearance(graph, 0);
    expect(directFire.evacuatedFloors).toContain(0);
    expect(directFire.affectedNodeIds.length).toBe(12);
  });

  it('loads and validates all 5 Map schemas (Kowloon + New York, Paris, Africa, Japan)', () => {
    for (const schema of Object.values(MAP_SCHEMAS)) {
      const validation = validateMapSchema(schema);
      expect(validation.isValid).toBe(true);
      const graph = buildGraphFromSchema(schema);
      expect(Object.keys(graph.nodes).length).toBe(schema.nodeCount);
    }

    expect(getSpatialGraphForMapId('new-york-wall-street')?.mapId).toBe('new-york-wall-street');
    expect(getSpatialGraphForMapId('paris-riot-square')?.mapId).toBe('paris-riot-square');
    expect(getSpatialGraphForMapId('africa-mining-outpost')?.mapId).toBe('africa-mining-outpost');
    expect(getSpatialGraphForMapId('japan-shinjuku-alleys')?.mapId).toBe('japan-shinjuku-alleys');
  });

  it('executes AI branch decision, adaptive business selection, and trap placement in reducer', () => {
    let state = gameReducer(INITIAL_GAME_STATE, {
      type: 'START_GAME',
      players: [
        { name: 'Bot Strategist', token: DEFAULT_PLAYER_TOKENS[0], isAI: true, aiPersonality: 'STRATEGIST', aiDifficulty: 'HARD' },
        { name: 'Human', token: DEFAULT_PLAYER_TOKENS[1], isAI: false },
      ],
      config: { mapId: KOWLOON_MAP_ID, startingCash: 1500 },
    });

    // Put AI into BRANCH_DECISION at KOW_F0_04 (South Elevator F0->F1 vs Main Loop KOW_F0_05)
    state = {
      ...state,
      turnPhase: 'BRANCH_DECISION',
      movementState: {
        currentNodeId: 'KOW_F0_04',
        remainingSteps: 2,
        diceSum: 4,
        availableNextNodes: ['KOW_F0_05', 'KOW_F1_04'],
      },
    };

    const branchDecision = computeNextAIDecision(state, 0);
    expect(branchDecision).not.toBeNull();
    expect(branchDecision?.action.type).toBe('CHOOSE_BRANCH_PATH');
    if (branchDecision?.action.type === 'CHOOSE_BRANCH_PATH') {
      expect(['KOW_F0_05', 'KOW_F1_04']).toContain(branchDecision.action.targetNodeId);
      const nextState = gameReducer(state, branchDecision.action);
      expect(nextState.turnPhase).toBe('ACTION_MENU');
    }

    // Verify AI adaptive business & trap evaluation helpers
    expect(evaluateAIAdaptiveBusiness('PEACEFUL', []).id).toBe('underground_casino');
    expect(evaluateAIAdaptiveBusiness('CHAOS', []).id).toBe('security_hq');
    expect(
      evaluateAIChokePointTrap(state.spatialGraph!, ['KOW_F0_01', 'KOW_F0_04'])
    ).toBe('KOW_F0_04');
    expect(
      evaluateAIBranchChoice({
        branches: [
          state.spatialGraph!.nodes['KOW_F0_05'],
          state.spatialGraph!.nodes['KOW_F1_04'],
        ],
        playerCash: 1200,
        opponentProperties: {},
        trapsOnNodes: {},
        riskTolerance: 0.7,
      }).chosenNodeId
    ).toBeTruthy();
  });

  it('validates multiplayer intents and sanitizes opponent hidden traps via roomManager helpers', () => {
    let state = gameReducer(INITIAL_GAME_STATE, {
      type: 'START_GAME',
      players: [
        { name: 'P1', token: DEFAULT_PLAYER_TOKENS[0], isAI: false },
        { name: 'P2', token: DEFAULT_PLAYER_TOKENS[1], isAI: false },
      ],
      config: { mapId: KOWLOON_MAP_ID, startingCash: 1500 },
    });

    state = {
      ...state,
      placedTraps: [
        {
          id: 'trap_p1',
          nodeId: 'KOW_F0_04',
          ownerPlayerId: 'player-0',
          trapType: 'ROBBERY',
          revealed: false,
          placedRound: 1,
        },
        {
          id: 'trap_p2',
          nodeId: 'KOW_F0_08',
          ownerPlayerId: 'player-1',
          trapType: 'LOCKDOWN',
          revealed: false,
          placedRound: 1,
        },
      ],
    };

    const sanitizedP1 = sanitizeStateForClient(state, 'player-0');
    const p1Traps = sanitizedP1?.placedTraps || [];
    expect(p1Traps.find((t) => t.id === 'trap_p1')?.trapType).toBe('ROBBERY');
    expect(p1Traps.find((t) => t.id === 'trap_p2')?.trapType).toBe('HIDDEN');

    expect(
      validateClientIntent({ type: 'CHOOSE_BRANCH_PATH', targetNodeId: '' }).isValid
    ).toBe(false);
    expect(
      validateClientIntent({ type: 'CHOOSE_BRANCH_PATH', targetNodeId: 'KOW_F1_04' }).isValid
    ).toBe(true);
  });
});
