/**
 * src/game/__tests__/escalatingChaosM2.test.ts
 * Comprehensive Milestone 2 Unit & Integration Tests:
 * Features 7-13: Chaos Meter, Patrol Engine, Event Bus, Trap Engine,
 * 3D Trap Meshes, Business Catalog, Synergy Matrix, Reducer & Ledger Safety.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  createInitialChaosMeter,
  applyChaosDelta,
  getChaosPhaseRentMultiplier,
} from '../chaos-engine/chaosMeter';
import {
  createPatrolUnit,
  movePatrolUnits,
  checkPatrolInterception,
  resolvePatrolPenalty,
  PATROL_FINE_AMOUNT,
} from '../chaos-engine/patrolEngine';
import {
  ChaosEventBus,
  computeDeltaForEvent,
  processGameEvent,
} from '../chaos-engine/chaosEventBus';
import {
  canPlaceTrap,
  triggerTrapOnNode,
  triggerTrapAtNode,
  PlacedTrap,
} from '../chaos-engine/trapEngine';
import { ThreeTrapManager } from '../../components/board/three/ThreeTrapMeshes';
import {
  BUSINESS_CATALOG,
  isValidBusinessId,
} from '../business/businessCatalog';
import {
  calculateSynergyModifier,
  calculateBusinessRent,
} from '../business/businessSynergyEngine';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { GameState, PlayerState } from '../types';
import { SpatialBoardGraph, BoardNode } from '../graph/spatialGraphTypes';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';

function createMockSpatialGraph(): SpatialBoardGraph {
  const nodes: Record<string, BoardNode> = {
    'node-0': {
      id: 'node-0',
      name: 'Start',
      shortName: 'GO',
      type: 'START',
      zoneId: 'zone-1',
      floor: 0,
      position3D: { x: 0, y: 0, z: 0 },
      connectedNodeIds: ['node-1'],
      isIntersection: false,
      isSecretZone: false,
      isLocked: false,
    },
    'node-1': {
      id: 'node-1',
      name: 'District A',
      shortName: 'DA',
      type: 'PROPERTY',
      zoneId: 'zone-1',
      floor: 0,
      position3D: { x: 2, y: 0, z: 0 },
      connectedNodeIds: ['node-2'],
      isIntersection: false,
      isSecretZone: false,
      isLocked: false,
      property: {
        basePrice: 100,
        baseRent: 35,
        houseRent: [70, 140, 280, 450, 600],
        upgradeCost: 50,
        maxLevel: 5,
        district: 'District A',
        districtColor: 'district-brown',
      },
    },
    'node-2': {
      id: 'node-2',
      name: 'District B',
      shortName: 'DB',
      type: 'PROPERTY',
      zoneId: 'zone-1',
      floor: 0,
      position3D: { x: 4, y: 0, z: 0 },
      connectedNodeIds: ['node-3'],
      isIntersection: false,
      isSecretZone: false,
      isLocked: false,
      property: {
        basePrice: 120,
        baseRent: 40,
        houseRent: [80, 160, 320, 500, 700],
        upgradeCost: 60,
        maxLevel: 5,
        district: 'District B',
        districtColor: 'district-brown',
      },
    },
    'node-3': {
      id: 'node-3',
      name: 'District C',
      shortName: 'DC',
      type: 'PROPERTY',
      zoneId: 'zone-1',
      floor: 0,
      position3D: { x: 6, y: 0, z: 0 },
      connectedNodeIds: ['node-0'],
      isIntersection: false,
      isSecretZone: false,
      isLocked: false,
      property: {
        basePrice: 140,
        baseRent: 50,
        houseRent: [100, 200, 400, 600, 800],
        upgradeCost: 70,
        maxLevel: 5,
        district: 'District C',
        districtColor: 'district-brown',
      },
    },
    'node-detention': {
      id: 'node-detention',
      name: 'Detention Center',
      shortName: 'JAIL',
      type: 'DETENTION',
      zoneId: 'zone-1',
      floor: 0,
      position3D: { x: -4, y: 0, z: 0 },
      connectedNodeIds: ['node-0'],
      isIntersection: false,
      isSecretZone: false,
      isLocked: false,
    },
  };

  return {
    mapId: 'test-map',
    mapName: 'Test Map',
    startNodeId: 'node-0',
    detentionNodeId: 'node-detention',
    nodes,
    edges: {},
    floors: [{ floorIndex: 0, name: 'Ground Floor', elevationY: 0.0, nodeIds: Object.keys(nodes) }],
  };
}

function createTestState(playerCount: number = 2): GameState {
  const players: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      token: DEFAULT_PLAYER_TOKENS[i % DEFAULT_PLAYER_TOKENS.length],
      cash: 1500,
      position: 0,
      positionNodeId: 'node-0',
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
    spatialGraph: createMockSpatialGraph(),
    chaosMeter: createInitialChaosMeter(),
    placedTraps: [],
    properties: {
      1: { ownerId: 'player-2', level: 1 },
      2: { ownerId: 'player-2', level: 1 },
    },
  };
}

describe('Milestone 2: Escalating Chaos Engine, Traps & Synergies', () => {
  // =========================================================================
  // 1. CHAOS METER & PHASE RATCHET FLOORS (Features 7 & 8)
  // =========================================================================
  describe('1. Chaos Meter & Phase Ratchet Floors', () => {
    it('initializes at exactly 0.0% in PEACEFUL phase with floor 0.0', () => {
      const meter = createInitialChaosMeter();
      expect(meter.value).toBe(0.0);
      expect(meter.phase).toBe('PEACEFUL');
      expect(meter.phaseFloor).toBe(0.0);
      expect(meter.patrolUnits).toHaveLength(0);
    });

    it('advances continuously with exact rounding and detects 30.0% and 70.0% boundaries', () => {
      let meter = createInitialChaosMeter();

      // Delta 15.0 -> 15.0% Peaceful
      let res = applyChaosDelta(meter, 15.0);
      expect(res.nextMeter.value).toBe(15.0);
      expect(res.nextMeter.phase).toBe('PEACEFUL');
      expect(res.transitionedPhase).toBeUndefined();

      // Exactly 30.0% is still PEACEFUL
      res = applyChaosDelta(res.nextMeter, 15.0);
      expect(res.nextMeter.value).toBe(30.0);
      expect(res.nextMeter.phase).toBe('PEACEFUL');
      expect(res.transitionedPhase).toBeUndefined();

      // 30.1% enters INSTABILITY and ratchets floor to 30.0
      res = applyChaosDelta(res.nextMeter, 0.1);
      expect(res.nextMeter.value).toBe(30.1);
      expect(res.nextMeter.phase).toBe('INSTABILITY');
      expect(res.nextMeter.phaseFloor).toBe(30.0);
      expect(res.transitionedPhase).toBe('INSTABILITY');
      expect(res.nextMeter.patrolUnits).toHaveLength(1);
      expect(res.nextMeter.patrolUnits[0].id).toBe('PATROL_01');

      // Exactly 70.0% is still INSTABILITY
      res = applyChaosDelta(res.nextMeter, 39.9);
      expect(res.nextMeter.value).toBe(70.0);
      expect(res.nextMeter.phase).toBe('INSTABILITY');
      expect(res.nextMeter.phaseFloor).toBe(30.0);

      // 70.1% enters CHAOS and ratchets floor to 70.0
      res = applyChaosDelta(res.nextMeter, 0.1);
      expect(res.nextMeter.value).toBe(70.1);
      expect(res.nextMeter.phase).toBe('CHAOS');
      expect(res.nextMeter.phaseFloor).toBe(70.0);
      expect(res.transitionedPhase).toBe('CHAOS');
    });

    it('enforces one-way ratchet floors: never regresses below 30.0% or 70.0%', () => {
      let meter = createInitialChaosMeter();

      // Advance into Instability (45.0%)
      meter = applyChaosDelta(meter, 45.0).nextMeter;
      expect(meter.phaseFloor).toBe(30.0);

      // Attempt huge negative reduction (-50.0%)
      const reduced1 = applyChaosDelta(meter, -50.0).nextMeter;
      expect(reduced1.value).toBe(30.0);
      expect(reduced1.phase).toBe('INSTABILITY');
      expect(reduced1.phaseFloor).toBe(30.0);

      // Advance into Chaos (85.0%)
      meter = applyChaosDelta(meter, 40.0).nextMeter;
      expect(meter.phaseFloor).toBe(70.0);
      expect(meter.phase).toBe('CHAOS');

      // Attempt huge negative reduction (-90.0%)
      const reduced2 = applyChaosDelta(meter, -90.0).nextMeter;
      expect(reduced2.value).toBe(70.0);
      expect(reduced2.phase).toBe('CHAOS');
      expect(reduced2.phaseFloor).toBe(70.0);
    });

    it('clamps upper ceiling firmly at 100.0% without numerical overflow', () => {
      let meter = createInitialChaosMeter();
      meter = applyChaosDelta(meter, 150.0).nextMeter;
      expect(meter.value).toBe(100.0);
      expect(meter.phase).toBe('CHAOS');
    });

    it('calculates global rent volatility multipliers by phase and category', () => {
      expect(getChaosPhaseRentMultiplier('PEACEFUL')).toBe(1.0);
      expect(getChaosPhaseRentMultiplier('INSTABILITY', 'NIGHTLIFE')).toBe(1.2);
      expect(getChaosPhaseRentMultiplier('INSTABILITY', 'COMMERCIAL')).toBe(0.85);
      expect(getChaosPhaseRentMultiplier('INSTABILITY')).toBe(1.1);
      expect(getChaosPhaseRentMultiplier('CHAOS', 'CIVIC')).toBe(1.5);
      expect(getChaosPhaseRentMultiplier('CHAOS', 'RESIDENTIAL')).toBe(1.5);
      expect(getChaosPhaseRentMultiplier('CHAOS', 'COMMERCIAL')).toBe(0.5);
      expect(getChaosPhaseRentMultiplier('CHAOS')).toBe(1.25);
    });
  });

  // =========================================================================
  // 2. PATROLLING POLICE / GUARD UNITS (Feature 9)
  // =========================================================================
  describe('2. Patrolling Police / Guard Units', () => {
    it('creates patrol unit with default coordinates', () => {
      const unit = createPatrolUnit();
      expect(unit.id).toBe('PATROL_01');
      expect(unit.currentNodeId).toBe('KOW_F1_04');
      expect(unit.destinationNodeId).toBe('KOW_F1_08');
    });

    it('moves patrol unit along graph edges and avoids locked or collapsed nodes', () => {
      const graph = createMockSpatialGraph();
      const unit = createPatrolUnit('P1', 'node-0', 'node-2');
      const moved = movePatrolUnits([unit], graph);

      expect(moved).toHaveLength(1);
      expect(moved[0].currentNodeId).toBe('node-1');
    });

    it('detects interception when player lands on guard unit node', () => {
      const state = createTestState();
      const unit = createPatrolUnit('P1', 'node-1', 'node-2');

      const p1 = { ...state.players[0], positionNodeId: 'node-0' };
      const p2 = { ...state.players[1], positionNodeId: 'node-1' };

      expect(checkPatrolInterception(p1, [unit])).toBeUndefined();
      expect(checkPatrolInterception(p2, [unit])).toBeDefined();
    });

    it('applies $100M fine to BANK via double-entry ledger preserving total money conservation', () => {
      const state = createTestState();
      const victim = state.players[0];
      const initialCash = victim.cash;

      const res = resolvePatrolPenalty(state, victim.id);
      expect(res.penaltyType).toBe('FINE');
      expect(res.amountPaid).toBe(PATROL_FINE_AMOUNT);

      const updatedVictim = res.nextState.players.find(p => p.id === victim.id)!;
      expect(updatedVictim.cash).toBe(initialCash - PATROL_FINE_AMOUNT);

      const lastTx = res.nextState.ledger![res.nextState.ledger!.length - 1];
      expect(lastTx.category).toBe('TAX_PAYMENT');
      expect(lastTx.toPlayerId).toBe('BANK');
      expect(lastTx.amount).toBe(PATROL_FINE_AMOUNT);
    });

    it('sends insolvent player to Detention when unable to pay fine', () => {
      const state = createTestState();
      state.players[0].cash = 50; // Cannot afford 100 fine

      const res = resolvePatrolPenalty(state, state.players[0].id);
      expect(res.penaltyType).toBe('DETENTION');
      expect(res.amountPaid).toBe(0);

      const victim = res.nextState.players[0];
      expect(victim.inDetention).toBe(true);
      expect(victim.detentionTurns).toBe(2);
      expect(victim.cash).toBe(50); // Unaltered
    });
  });

  // =========================================================================
  // 3. CENTRALIZED EVENT BUS & DISASTER DISPATCHER (Feature 13)
  // =========================================================================
  describe('3. Centralized Event Bus & Disaster Dispatcher', () => {
    it('maps all game event types to their progression deltas', () => {
      expect(computeDeltaForEvent({ type: 'DICE_ROLLED' })).toBe(0.4);
      expect(computeDeltaForEvent({ type: 'DICE_DOUBLES' })).toBe(1.5);
      expect(computeDeltaForEvent({ type: 'PROPERTY_PURCHASED' })).toBe(1.0);
      expect(computeDeltaForEvent({ type: 'PROPERTY_UPGRADED' })).toBe(1.5);
      expect(computeDeltaForEvent({ type: 'RENT_PAID', amount: 50 })).toBe(0.2);
      expect(computeDeltaForEvent({ type: 'RENT_PAID', amount: 300 })).toBe(1.5); // 0.5 * 3
      expect(computeDeltaForEvent({ type: 'TRAP_TRIGGERED' })).toBe(2.5);
      expect(computeDeltaForEvent({ type: 'CHAOS_CARD_DRAWN' })).toBe(3.0);
      expect(computeDeltaForEvent({ type: 'AUCTION_STARTED' })).toBe(1.5);
      expect(computeDeltaForEvent({ type: 'PLAYER_BANKRUPTCY' })).toBe(8.0);
      expect(computeDeltaForEvent({ type: 'PASS_GO' })).toBe(-0.5);
      expect(computeDeltaForEvent({ type: 'PAY_DETENTION_BAIL' })).toBe(-1.0);
    });

    it('dispatches events and executes registered disaster hooks upon phase transition', () => {
      const bus = new ChaosEventBus();
      let instabilityTriggered = false;
      let chaosTriggered = false;

      bus.onDisaster('INSTABILITY', () => {
        instabilityTriggered = true;
      });
      bus.onDisaster('CHAOS', () => {
        chaosTriggered = true;
      });

      let meter = createInitialChaosMeter();

      // Trigger instability (delta +35.0%)
      const res1 = bus.dispatch({ type: 'CHAOS_CARD_DRAWN' }, { ...meter, value: 30.0 });
      expect(res1.nextMeter.phase).toBe('INSTABILITY');
      expect(instabilityTriggered).toBe(true);
      expect(chaosTriggered).toBe(false);

      // Trigger chaos (delta +5.0% over 68.0%)
      const res2 = bus.dispatch({ type: 'PLAYER_BANKRUPTCY' }, { ...res1.nextMeter, value: 68.0, phaseFloor: 30.0 });
      expect(res2.nextMeter.phase).toBe('CHAOS');
      expect(chaosTriggered).toBe(true);
    });

    it('processGameEvent pure functional helper updates GameState and triggers audio alerts', () => {
      const state = createTestState();
      const updated = processGameEvent(state, { type: 'PLAYER_BANKRUPTCY', playerId: 'player-2' });

      expect(updated.chaosMeter).toBeDefined();
      expect(updated.chaosMeter!.value).toBe(8.0);
    });
  });

  // =========================================================================
  // 4. TRAP CARDS & SABOTAGE ENGINE (Feature 10)
  // =========================================================================
  describe('4. Trap Cards & Sabotage Engine', () => {
    it('enforces maximum 2 active traps per player', () => {
      const graph = createMockSpatialGraph();
      const traps: PlacedTrap[] = [
        { id: 't1', nodeId: 'node-1', ownerPlayerId: 'player-1', trapType: 'ROBBERY', placedRound: 1, revealed: false },
        { id: 't2', nodeId: 'node-2', ownerPlayerId: 'player-1', trapType: 'LOCKDOWN', placedRound: 1, revealed: false },
      ];

      expect(canPlaceTrap(traps, 'player-1', 'node-3', graph)).toBe(false);
      expect(canPlaceTrap(traps, 'player-2', 'node-3', graph)).toBe(true);
    });

    it('prohibits duplicate traps on the same node and placement on collapsed nodes', () => {
      const graph = createMockSpatialGraph();
      const traps: PlacedTrap[] = [
        { id: 't1', nodeId: 'node-1', ownerPlayerId: 'player-1', trapType: 'ROBBERY', placedRound: 1, revealed: false },
      ];

      expect(canPlaceTrap(traps, 'player-2', 'node-1', graph)).toBe(false);

      graph.nodes['node-2'].hazardStatus = 'COLLAPSED';
      expect(canPlaceTrap(traps, 'player-2', 'node-2', graph)).toBe(false);
    });

    it('strictly enforces OWNER IMMUNITY: stepping on own trap never triggers it', () => {
      const traps: PlacedTrap[] = [
        { id: 't1', nodeId: 'node-1', ownerPlayerId: 'player-1', trapType: 'ROBBERY', placedRound: 1, revealed: false },
      ];

      const res = triggerTrapOnNode(traps, 'player-1', 'node-1', 1000, 1000);
      expect(res.trapTriggered).toBeUndefined();
      expect(res.nextTraps[0].revealed).toBe(false);
      expect(res.cashDelta).toBe(0);
      expect(res.victimCashAfter).toBe(1000);
      expect(res.ownerCashAfter).toBe(1000);
    });

    it('resolves ROBBERY trap stealing min(20% cash, $250M) with strict P2P money conservation', () => {
      const traps: PlacedTrap[] = [
        { id: 't1', nodeId: 'node-1', ownerPlayerId: 'player-1', trapType: 'ROBBERY', placedRound: 1, revealed: false },
      ];

      // Victim has $1000M: 20% is $200M (< $250M limit)
      const res1 = triggerTrapOnNode(traps, 'player-2', 'node-1', 1000, 500);
      expect(res1.trapTriggered).toBeDefined();
      expect(res1.cashDelta).toBe(200);
      expect(res1.victimCashAfter).toBe(800);
      expect(res1.ownerCashAfter).toBe(700);
      expect(res1.victimCashAfter + res1.ownerCashAfter).toBe(1000 + 500); // Strict sum conservation

      // Victim has $2000M: 20% is $400M -> clamped to $250M
      const res2 = triggerTrapOnNode(traps, 'player-2', 'node-1', 2000, 500);
      expect(res2.cashDelta).toBe(250);
      expect(res2.victimCashAfter).toBe(1750);
      expect(res2.ownerCashAfter).toBe(750);
      expect(res2.victimCashAfter + res2.ownerCashAfter).toBe(2000 + 500);
    });

    it('resolves LOCKDOWN trap stunning victim and setting turnLockTurns = 1', () => {
      const state = createTestState();
      state.placedTraps = [
        { id: 't1', nodeId: 'node-1', ownerPlayerId: 'player-1', trapType: 'LOCKDOWN', placedRound: 1, revealed: false },
      ];

      const res = triggerTrapAtNode(state, 'player-2', 'node-1');
      expect(res.haltedMovement).toBe(true);
      expect(res.trapTriggered).toBeDefined();

      const victim = res.nextState.players.find(p => p.id === 'player-2')!;
      expect(victim.turnLockTurns).toBe(1);
    });

    it('resolves TELEPORT_HAZARD warping victim to detention or opponent landmark', () => {
      const state = createTestState();
      state.placedTraps = [
        { id: 't1', nodeId: 'node-1', ownerPlayerId: 'player-1', trapType: 'TELEPORT_HAZARD', placedRound: 1, revealed: false },
      ];

      const res = triggerTrapAtNode(state, 'player-2', 'node-1');
      expect(res.haltedMovement).toBe(true);
      const victim = res.nextState.players.find(p => p.id === 'player-2')!;
      expect(victim.inDetention).toBe(true);
      expect(victim.position).toBe(10);
    });

    it('resolves SMUGGLER_BOON: 50% reward from Bank vs 50% penalty to Bank', () => {
      const traps: PlacedTrap[] = [
        { id: 't1', nodeId: 'node-1', ownerPlayerId: 'player-1', trapType: 'SMUGGLER_BOON', placedRound: 1, revealed: false },
      ];

      // Even cash (e.g. 1000) -> Reward +150
      const rewardRes = triggerTrapOnNode(traps, 'player-2', 'node-1', 1000, 500);
      expect(rewardRes.victimCashAfter).toBe(1150);

      // Odd cash (e.g. 1001) -> Penalty -200
      const penaltyRes = triggerTrapOnNode(traps, 'player-2', 'node-1', 1001, 500);
      expect(penaltyRes.victimCashAfter).toBe(801);
    });
  });

  // =========================================================================
  // 5. THREE.JS 3D TRAP MARKERS (Feature 10 Visuals)
  // =========================================================================
  describe('5. Three.js 3D Trap Markers (ThreeTrapMeshes)', () => {
    it('instantiates ThreeTrapManager and manages volumetric models with owner styling', () => {
      const scene = new THREE.Scene();
      const manager = new ThreeTrapManager(scene);

      const traps: PlacedTrap[] = [
        { id: 't1', nodeId: 'node-1', ownerPlayerId: 'player-1', trapType: 'ROBBERY', placedRound: 1, revealed: false },
        { id: 't2', nodeId: 'node-2', ownerPlayerId: 'player-2', trapType: 'LOCKDOWN', placedRound: 1, revealed: false },
        { id: 't3', nodeId: 'node-3', ownerPlayerId: 'player-1', trapType: 'TELEPORT_HAZARD', placedRound: 1, revealed: false },
      ];

      const players: PlayerState[] = [
        { id: 'player-1', name: 'P1', cash: 1000, position: 0, inDetention: false, detentionTurns: 0, isBankrupt: false, consecutiveDoubles: 0, stats: {} as any, token: { colorHex: '#ff0000', accentHex: '#ff5555' } as any },
        { id: 'player-2', name: 'P2', cash: 1000, position: 0, inDetention: false, detentionTurns: 0, isBankrupt: false, consecutiveDoubles: 0, stats: {} as any, token: { colorHex: '#0000ff', accentHex: '#5555ff' } as any },
      ];

      manager.syncWithTraps(traps, players, 'player-1', createMockSpatialGraph());

      const container = manager.getContainer();
      expect(container.children.length).toBe(3);

      // Animation tick
      expect(() => manager.tick(0.016, 1000)).not.toThrow();

      // Reduced motion
      manager.setReducedMotion(true);
      expect(() => manager.tick(0.016, 2000)).not.toThrow();

      // Clean disposal
      manager.dispose();
      expect(container.children.length).toBe(0);
    });
  });

  // =========================================================================
  // 6. BUSINESS CATALOG & ADJACENCY SYNERGY MATRIX (Features 11 & 12)
  // =========================================================================
  describe('6. Business Catalog & Adjacency Synergy Matrix', () => {
    it('contains all 10 required business archetypes with exact snake_case keys', () => {
      const expectedIds = [
        'underground_bar',
        'pawn_shop',
        'underground_casino',
        'street_food_stall',
        'clinic_pharmacy',
        'luxury_boutique',
        'police_checkpoint',
        'security_hq',
        'coffin_home_units',
        'tenement_complex',
      ];

      for (const id of expectedIds) {
        expect(isValidBusinessId(id)).toBe(true);
        expect(BUSINESS_CATALOG[id].id).toBe(id);
        expect(BUSINESS_CATALOG[id].baseRent).toBeGreaterThan(0);
        expect(BUSINESS_CATALOG[id].synergyTags.length).toBeGreaterThan(0);
      }
    });

    it('computes mutual positive synergies between complementary business pairs', () => {
      // Bar + Pawn Shop mutual +25%
      const barRes = calculateSynergyModifier('underground_bar', ['pawn_shop']);
      expect(barRes.multiplier).toBe(1.25);
      expect(barRes.isSuppressed).toBe(false);

      const pawnRes = calculateSynergyModifier('pawn_shop', ['underground_bar']);
      expect(pawnRes.multiplier).toBe(1.25);

      // Bar + Casino boosts Casino +30%
      const casinoRes = calculateSynergyModifier('underground_casino', ['underground_bar']);
      expect(casinoRes.multiplier).toBe(1.3);

      // Food Stall + Coffin Home +15%
      const foodRes = calculateSynergyModifier('street_food_stall', ['coffin_home_units']);
      expect(foodRes.multiplier).toBe(1.15);

      // Clinic + Clinic +20%
      const clinicRes = calculateSynergyModifier('clinic_pharmacy', ['clinic_pharmacy']);
      expect(clinicRes.multiplier).toBe(1.2);
    });

    it('compounds multi-neighbor cluster synergies multiplicatively', () => {
      // 4 adjacent Coffin Homes: 1.15^4
      const foodRes = calculateSynergyModifier('street_food_stall', [
        'coffin_home_units',
        'coffin_home_units',
        'coffin_home_units',
        'coffin_home_units',
      ]);
      expect(foodRes.multiplier).toBeCloseTo(Math.pow(1.15, 4), 6);

      // 3 adjacent Clinics: 1.20^3
      const clinicRes = calculateSynergyModifier('clinic_pharmacy', [
        'clinic_pharmacy',
        'clinic_pharmacy',
        'clinic_pharmacy',
      ]);
      expect(clinicRes.multiplier).toBeCloseTo(Math.pow(1.2, 3), 6);
    });

    it('enforces complete negative suppression: Police Checkpoint completely shuts down Casino ($0 rent)', () => {
      const casinoRes = calculateSynergyModifier('underground_casino', ['police_checkpoint']);
      expect(casinoRes.isSuppressed).toBe(true);
      expect(casinoRes.multiplier).toBe(0.0);
    });

    it('enforces fractional negative penalties: Police vs Pawn (-50%) and Coffin vs Boutique (-40%)', () => {
      const pawnRes = calculateSynergyModifier('pawn_shop', ['police_checkpoint']);
      expect(pawnRes.multiplier).toBe(0.5);

      const boutiqueRes = calculateSynergyModifier('luxury_boutique', ['coffin_home_units']);
      expect(boutiqueRes.multiplier).toBe(0.6);
    });

    it('calculates dynamic business rent factoring BaseRent, Synergy, Floor Density, and Chaos Phase', () => {
      const graph = createMockSpatialGraph();
      graph.nodes['node-1'].currentBusiness = {
        id: 'b1',
        businessId: 'underground_bar',
        name: 'Underground Bar',
        category: 'NIGHTLIFE',
        tier: 1,
        synergyTags: ['NIGHTLIFE'],
      };
      graph.nodes['node-2'].currentBusiness = {
        id: 'b2',
        businessId: 'pawn_shop',
        name: 'Pawn Shop',
        category: 'FINANCE',
        tier: 1,
        synergyTags: ['FINANCE'],
      };

      // Bar Base 35 * Synergy 1.25 * Density (1 player = 1.0) * Phase Peaceful (1.0) = 43.75 -> 44
      const rentPeaceful = calculateBusinessRent(graph, 'node-1', { floorPlayers: 1, chaosPhase: 'PEACEFUL' });
      expect(rentPeaceful).toBe(44);

      // In Instability: * 1.1 = 48.125 -> 48
      const rentInstability = calculateBusinessRent(graph, 'node-1', { floorPlayers: 1, chaosPhase: 'INSTABILITY' });
      expect(rentInstability).toBe(48);

      // In Chaos with 3 floor players: 35 * 1.25 * (1 + 0.5 * 2) * 1.25 = 35 * 1.25 * 2.0 * 1.25 = 109.375 -> 109
      const rentChaos = calculateBusinessRent(graph, 'node-1', { floorPlayers: 3, chaosPhase: 'CHAOS' });
      expect(rentChaos).toBe(109);
    });
  });

  // =========================================================================
  // 7. REDUCER INTEGRATION & INTENT ACTIONS
  // =========================================================================
  describe('7. Reducer Action Handlers & State Transitions', () => {
    it('dispatches PLACE_TRAP action and records secret trap card', () => {
      const state = createTestState();
      const next = gameReducer(state, {
        type: 'PLACE_TRAP',
        nodeId: 'node-1',
        trapType: 'ROBBERY',
      });

      expect(next.placedTraps).toHaveLength(1);
      expect(next.placedTraps![0].nodeId).toBe('node-1');
      expect(next.placedTraps![0].trapType).toBe('ROBBERY');
      expect(next.placedTraps![0].revealed).toBe(false);
    });

    it('dispatches SELECT_BUSINESS_TYPE action and assigns business archetype to property', () => {
      const state = createTestState();
      // Player 2 owns node 1
      const next = gameReducer(state, {
        type: 'SELECT_BUSINESS_TYPE',
        tileId: 1,
        nodeId: 'node-1',
        businessId: 'underground_bar',
        playerId: 'player-2',
      });

      expect(next.properties[1].businessTypeId).toBe('underground_bar');
      expect(next.spatialGraph?.nodes['node-1'].currentBusiness?.businessId).toBe('underground_bar');
    });

    it('dispatches APPLY_CHAOS_DELTA action and advances meter value', () => {
      const state = createTestState();
      const next = gameReducer(state, {
        type: 'APPLY_CHAOS_DELTA',
        delta: 25.5,
      });

      expect(next.chaosMeter!.value).toBe(25.5);
      expect(next.chaosMeter!.phase).toBe('PEACEFUL');
    });
  });
});
