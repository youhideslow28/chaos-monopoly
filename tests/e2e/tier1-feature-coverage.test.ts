/**
 * tests/e2e/tier1-feature-coverage.test.ts
 *
 * Tier 1: Comprehensive Feature Coverage Suite
 * Validates all 29 features from PROJECT.md § Feature Inventory (Features 1–29)
 * across Parts A, B, C, and D, with >= 5 targeted assertions per feature group.
 */

import { describe, it, expect } from 'vitest';
import {
  Mulberry32,
  verifyLedgerEquilibrium,
  executeDeterministicTransfer,
  createLegacyRingGraph,
  createKowloonWalledCityGraph,
  getValidNextNodes,
  stepTraverse,
  evaluateZoneUnlocks,
  applyChaosDelta,
  createInitialChaosMeter,
  ChaosEventBus,
  canPlaceTrap,
  triggerTrapOnNode,
  BUSINESS_CATALOG,
  calculateSynergyModifier,
  calculateBusinessRent,
  COFFIN_HOME_UPGRADES,
  applyKowloonFireClearance,
  MAP_SCHEMAS,
  validateMapSchema,
  evaluateAIBranchChoice,
  evaluateAIChokePointTrap,
  evaluateAIAdaptiveBusiness,
  sanitizeStateForClient,
  validateClientIntent,
  PlacedTrap,
} from './helpers/e2eTestHarness';

describe('Tier 1: Feature Coverage (Features 1–29)', () => {
  // ==========================================================================
  // PART A: 3D Spatial Graph & Traversal (Features 1–6)
  // ==========================================================================
  describe('Part A: 3D Spatial Graph & Urban Fog of War (Features 1–6)', () => {
    // Feature 1: 3D Spatial Graph Topology
    it('Feature 1: 3D Spatial Graph Topology provides nodes, coordinates, and multi-floor representation', () => {
      const graph = createKowloonWalledCityGraph();

      expect(graph.mapId).toBe('hong-kong-kowloon');
      expect(Object.keys(graph.nodes).length).toBe(44);
      expect(graph.floors.length).toBe(4);

      // Verify node 3D coordinates
      const startNode = graph.nodes[graph.startNodeId];
      expect(startNode).toBeDefined();
      expect(startNode.position3D).toEqual({ x: 0, y: 0.0, z: 0 });
      expect(startNode.floor).toBe(0);

      // Check elevation on each floor
      const f1Node = graph.nodes['KOW_F1_00'];
      const f2Node = graph.nodes['KOW_F2_00'];
      const f3Node = graph.nodes['KOW_F3_00'];
      expect(f1Node.position3D.y).toBe(3.5);
      expect(f2Node.position3D.y).toBe(7.0);
      expect(f3Node.position3D.y).toBe(10.5);
    });

    // Feature 2: Branching Movement at Intersections
    it('Feature 2: Branching Movement at Intersections identifies branch choices and steps', () => {
      const graph = createKowloonWalledCityGraph();
      // Elevator junction has multiple connected nodes (main loop + vertical transition)
      const elevatorNode = graph.nodes['KOW_F0_04'];
      expect(elevatorNode.isIntersection).toBe(true);
      expect(elevatorNode.connectedNodeIds.length).toBeGreaterThan(1);

      const nextNodes = getValidNextNodes(graph, 'KOW_F0_04', 1000);
      expect(nextNodes.length).toBeGreaterThanOrEqual(2);

      // Verify step traversal across branch
      const chosenTarget = nextNodes[0].id;
      const stepResult = stepTraverse(graph, 'KOW_F0_04', chosenTarget, 1000);
      expect(stepResult.nextNodeId).toBe(chosenTarget);
      expect(typeof stepResult.tollPaid).toBe('number');
    });

    // Feature 3: Vertical Transitions (Elevators & Stairs)
    it('Feature 3: Vertical Transitions enforce paid elevators ($50) vs free stairs ($0)', () => {
      const graph = createKowloonWalledCityGraph();

      // South Elevator from F0 to F1 charges $50
      const elevatorStep = stepTraverse(graph, 'KOW_F0_04', 'KOW_F1_04', 100);
      expect(elevatorStep.nextNodeId).toBe('KOW_F1_04');
      expect(elevatorStep.tollPaid).toBe(50);

      // North Stairs from F0 to F1 charges $0
      const stairStep = stepTraverse(graph, 'KOW_F0_08', 'KOW_F1_08', 0);
      expect(stairStep.nextNodeId).toBe('KOW_F1_08');
      expect(stairStep.tollPaid).toBe(0);

      // Insufficient cash prevents choosing elevator
      const affordableOptions = getValidNextNodes(graph, 'KOW_F0_04', 20);
      const includesElevator = affordableOptions.some(n => n.id === 'KOW_F1_04');
      expect(includesElevator).toBe(false);

      // Sufficient cash allows choosing elevator
      const richOptions = getValidNextNodes(graph, 'KOW_F0_04', 100);
      expect(richOptions.some(n => n.id === 'KOW_F1_04')).toBe(true);
    });

    // Feature 4: Urban Fog of War
    it('Feature 4: Urban Fog of War conceals secret zones and unlocks upon upgrade threshold', () => {
      const graph = createKowloonWalledCityGraph();

      // Secret basement black market initially locked
      const blackMarketNode = graph.nodes['KOW_F0_11'];
      expect(blackMarketNode.isSecretZone).toBe(true);
      expect(blackMarketNode.isLocked).toBe(true);
      expect(graph.zones?.['ZONE_BLACK_MARKET'].isLocked).toBe(true);

      // Locked nodes are excluded from traversal
      const initialNext = getValidNextNodes(graph, 'KOW_F0_10');
      expect(initialNext.some(n => n.id === 'KOW_F0_11')).toBe(false);

      // Unlock trigger fires when upgrades reach 6
      const { unlockedZoneIds, updatedGraph } = evaluateZoneUnlocks(graph, {
        type: 'UPGRADE',
        value: 6,
      });

      expect(unlockedZoneIds).toContain('ZONE_BLACK_MARKET');
      expect(updatedGraph.nodes['KOW_F0_11'].isLocked).toBe(false);
      expect(updatedGraph.nodes['KOW_F0_11'].isSecretZone).toBe(false);

      // Now traversable
      const afterUnlockNext = getValidNextNodes(updatedGraph, 'KOW_F0_10');
      expect(afterUnlockNext.some(n => n.id === 'KOW_F0_11')).toBe(true);
    });

    // Feature 5: Serializable Graph Schema
    it('Feature 5: Serializable Graph Schema validates full JSON round-trip serialization', () => {
      const graph = createKowloonWalledCityGraph();
      const serialized = JSON.stringify(graph);
      expect(typeof serialized).toBe('string');

      const parsed = JSON.parse(serialized);
      expect(parsed.mapId).toBe(graph.mapId);
      expect(Object.keys(parsed.nodes).length).toBe(Object.keys(graph.nodes).length);
      expect(parsed.floors.length).toBe(graph.floors.length);
      expect(parsed.nodes['KOW_F0_00'].position3D).toEqual(graph.nodes['KOW_F0_00'].position3D);
      expect(parsed.startNodeId).toBe(graph.startNodeId);
    });

    // Feature 6: Legacy Ring Graph Adapter
    it('Feature 6: Legacy Ring Graph Adapter wraps 40-tile perimeter with 100% backward compatibility', () => {
      const legacyGraph = createLegacyRingGraph(40);

      expect(legacyGraph.mapId).toBe('classic-ring-40');
      expect(Object.keys(legacyGraph.nodes).length).toBe(40);
      expect(legacyGraph.startNodeId).toBe('NODE_0');
      expect(legacyGraph.detentionNodeId).toBe('NODE_10');

      // 1-cycle topology: NODE_i connects to NODE_(i+1)%40
      for (let i = 0; i < 40; i++) {
        const node = legacyGraph.nodes[`NODE_${i}`];
        expect(node.numericId).toBe(i);
        expect(node.connectedNodeIds).toEqual([`NODE_${(i + 1) % 40}`]);
      }

      // Step traverse around loop
      const step = stepTraverse(legacyGraph, 'NODE_39', 'NODE_0', 500);
      expect(step.nextNodeId).toBe('NODE_0');
      expect(step.tollPaid).toBe(0);
    });
  });

  // ==========================================================================
  // PART B: Chaos Engine, Traps & Synergies (Features 7–13)
  // ==========================================================================
  describe('Part B: Chaos Engine, Traps & Synergies (Features 7–13)', () => {
    // Feature 7: Tension / Chaos Meter
    it('Feature 7: Tension / Chaos Meter tracks quantitative continuous 0-100% progression', () => {
      let meter = createInitialChaosMeter();
      expect(meter.value).toBe(0.0);
      expect(meter.phase).toBe('PEACEFUL');

      // Small delta from dice roll
      const r1 = applyChaosDelta(meter, 0.4);
      meter = r1.nextMeter;
      expect(meter.value).toBe(0.4);

      // Delta from property upgrade
      const r2 = applyChaosDelta(meter, 1.5);
      meter = r2.nextMeter;
      expect(meter.value).toBe(1.9);

      // Delta from trap trigger
      const r3 = applyChaosDelta(meter, 2.5);
      meter = r3.nextMeter;
      expect(meter.value).toBe(4.4);

      // Max value clamp at 100.0
      const r4 = applyChaosDelta(meter, 150.0);
      expect(r4.nextMeter.value).toBe(100.0);
    });

    // Feature 8: 3 Distinct Chaos Phases & Ratchet
    it('Feature 8: 3 Distinct Chaos Phases transition with one-way ratchet locks', () => {
      let meter = createInitialChaosMeter();

      // Phase 1: 0 - 30% (Peaceful)
      const p1 = applyChaosDelta(meter, 25.0);
      meter = p1.nextMeter;
      expect(meter.phase).toBe('PEACEFUL');
      expect(meter.phaseFloor).toBe(0.0);

      // Phase 2: 31 - 70% (Instability)
      const p2 = applyChaosDelta(meter, 10.0);
      meter = p2.nextMeter;
      expect(meter.phase).toBe('INSTABILITY');
      expect(meter.phaseFloor).toBe(30.0);
      expect(p2.transitionedPhase).toBe('INSTABILITY');

      // Negative delta cannot breach ratchet floor (30.0)
      const p2Drop = applyChaosDelta(meter, -20.0);
      expect(p2Drop.nextMeter.value).toBe(30.0);
      expect(p2Drop.nextMeter.phase).toBe('INSTABILITY');

      // Phase 3: 71 - 100% (Chaos / Endgame)
      const p3 = applyChaosDelta(meter, 45.0);
      meter = p3.nextMeter;
      expect(meter.phase).toBe('CHAOS');
      expect(meter.phaseFloor).toBe(70.0);
      expect(p3.transitionedPhase).toBe('CHAOS');

      // Negative delta cannot breach second ratchet floor (70.0)
      const p3Drop = applyChaosDelta(meter, -50.0);
      expect(p3Drop.nextMeter.value).toBe(70.0);
      expect(p3Drop.nextMeter.phase).toBe('CHAOS');
    });

    // Feature 9: Patrolling Police / Guard Units
    it('Feature 9: Patrolling Police / Guard Units spawn upon Instability phase transition', () => {
      const meter = createInitialChaosMeter();
      expect(meter.patrolUnits.length).toBe(0);

      // Transition to Instability
      const result = applyChaosDelta(meter, 35.0);
      expect(result.transitionedPhase).toBe('INSTABILITY');
      expect(result.nextMeter.patrolUnits.length).toBeGreaterThan(0);

      const patrol = result.nextMeter.patrolUnits[0];
      expect(patrol.id).toBe('PATROL_01');
      expect(patrol.currentNodeId).toBeDefined();
      expect(patrol.destinationNodeId).toBeDefined();
    });

    // Feature 10: Trap Cards & Sabotage Engine
    it('Feature 10: Trap Cards support face-down placement, limit enforcement, and triggers', () => {
      const graph = createKowloonWalledCityGraph();
      let traps: PlacedTrap[] = [];

      // Valid placement
      expect(canPlaceTrap(traps, 'p1', 'KOW_F1_02', graph)).toBe(true);
      traps.push({
        id: 'T1',
        nodeId: 'KOW_F1_02',
        ownerPlayerId: 'p1',
        trapType: 'ROBBERY',
        placedRound: 1,
        revealed: false,
      });

      // No duplicate on same node
      expect(canPlaceTrap(traps, 'p2', 'KOW_F1_02', graph)).toBe(false);

      // Second trap for p1 is allowed
      expect(canPlaceTrap(traps, 'p1', 'KOW_F1_05', graph)).toBe(true);
      traps.push({
        id: 'T2',
        nodeId: 'KOW_F1_05',
        ownerPlayerId: 'p1',
        trapType: 'LOCKDOWN',
        placedRound: 1,
        revealed: false,
      });

      // Third trap for p1 is rejected (max 2 active traps per player)
      expect(canPlaceTrap(traps, 'p1', 'KOW_F1_07', graph)).toBe(false);

      // Owner immunity check
      const ownerPass = triggerTrapOnNode(traps, 'p1', 'KOW_F1_02', 1000, 500);
      expect(ownerPass.trapTriggered).toBeUndefined();
      expect(ownerPass.victimCashAfter).toBe(1000);

      // Opponent trigger: Robbery steals cash and maintains ledger conservation
      const opponentTrigger = triggerTrapOnNode(traps, 'p2', 'KOW_F1_02', 1000, 500);
      expect(opponentTrigger.trapTriggered?.revealed).toBe(true);
      expect(opponentTrigger.victimCashAfter).toBe(800); // 1000 - 200 (20%)
      expect(opponentTrigger.ownerCashAfter).toBe(700);  // 500 + 200
      expect(opponentTrigger.cashDelta).toBe(200);
      // Double-entry check
      expect(opponentTrigger.victimCashAfter + opponentTrigger.ownerCashAfter).toBe(1000 + 500);
    });

    // Feature 11: Multi-tier Business Archetypes
    it('Feature 11: Multi-tier Business Archetypes catalog provides 10 distinct business models', () => {
      const keys = Object.keys(BUSINESS_CATALOG);
      expect(keys.length).toBe(10);

      expect(BUSINESS_CATALOG['underground_bar'].category).toBe('NIGHTLIFE');
      expect(BUSINESS_CATALOG['pawn_shop'].category).toBe('FINANCE');
      expect(BUSINESS_CATALOG['underground_casino'].category).toBe('NIGHTLIFE');
      expect(BUSINESS_CATALOG['street_food_stall'].category).toBe('COMMERCIAL');
      expect(BUSINESS_CATALOG['clinic_pharmacy'].category).toBe('CIVIC');
      expect(BUSINESS_CATALOG['luxury_boutique'].category).toBe('COMMERCIAL');
      expect(BUSINESS_CATALOG['police_checkpoint'].category).toBe('CIVIC');
      expect(BUSINESS_CATALOG['security_hq'].category).toBe('CIVIC');
      expect(BUSINESS_CATALOG['coffin_home_units'].category).toBe('RESIDENTIAL');
      expect(BUSINESS_CATALOG['tenement_complex'].category).toBe('RESIDENTIAL');

      // Verify all base rents are positive numbers
      for (const b of Object.values(BUSINESS_CATALOG)) {
        expect(b.baseRent).toBeGreaterThan(0);
        expect(b.synergyTags.length).toBeGreaterThan(0);
      }
    });

    // Feature 12: Adjacency Synergy Graph
    it('Feature 12: Adjacency Synergy Graph computes positive synergies and negative counters', () => {
      // Positive: Bar + Pawn Shop (+25%)
      const barPawn = calculateSynergyModifier('underground_bar', ['pawn_shop']);
      expect(barPawn.multiplier).toBe(1.25);
      expect(barPawn.isSuppressed).toBe(false);

      // Positive: Bar + Casino (+30% to Casino)
      const barCasino = calculateSynergyModifier('underground_casino', ['underground_bar']);
      expect(barCasino.multiplier).toBe(1.3);

      // Negative Counter: Police Checkpoint shuts down Casino completely ($0 rent)
      const policeCasino = calculateSynergyModifier('underground_casino', ['police_checkpoint']);
      expect(policeCasino.isSuppressed).toBe(true);
      expect(policeCasino.multiplier).toBe(0.0);

      // Negative Penalty: Police Checkpoint reduces Pawn Shop by 50%
      const policePawn = calculateSynergyModifier('pawn_shop', ['police_checkpoint']);
      expect(policePawn.multiplier).toBe(0.5);

      // Negative Penalty: Coffin Home reduces Luxury Boutique by 40%
      const coffinBoutique = calculateSynergyModifier('luxury_boutique', ['coffin_home_units']);
      expect(coffinBoutique.multiplier).toBe(0.6);
    });

    // Feature 13: Centralized Event Bus & Disaster Hooks
    it('Feature 13: Centralized Event Bus dispatches events and invokes phase disaster hooks', () => {
      const bus = new ChaosEventBus();
      let disasterFired = false;
      let hookTriggeredPhase = '';

      bus.onDisaster('INSTABILITY', () => {
        disasterFired = true;
        hookTriggeredPhase = 'INSTABILITY';
      });

      let meter = createInitialChaosMeter();

      // Normal event progression
      const d1 = bus.dispatch({ type: 'DICE_ROLLED' }, meter);
      meter = d1.nextMeter;
      expect(meter.value).toBe(0.4);
      expect(disasterFired).toBe(false);

      // Event crossing threshold into Instability
      meter.value = 29.8;
      const d2 = bus.dispatch({ type: 'PLAYER_BANKRUPTCY' }, meter);
      expect(d2.nextMeter.phase).toBe('INSTABILITY');
      expect(disasterFired).toBe(true);
      expect(hookTriggeredPhase).toBe('INSTABILITY');
      expect(d2.triggeredDisasters).toContain('INSTABILITY');
    });
  });

  // ==========================================================================
  // PART C: Kowloon Walled City & Map Schemas (Features 14–23)
  // ==========================================================================
  describe('Part C: Kowloon Walled City & Map Schemas (Features 14–23)', () => {
    // Feature 14: Map 1 Kowloon Reference Level
    it('Feature 14: Map 1 Kowloon Walled City contains 4 vertically stacked floors with 44 nodes', () => {
      const graph = createKowloonWalledCityGraph();
      expect(graph.floors.length).toBe(4);
      expect(graph.floors[0].elevationY).toBe(0.0);
      expect(graph.floors[1].elevationY).toBe(3.5);
      expect(graph.floors[2].elevationY).toBe(7.0);
      expect(graph.floors[3].elevationY).toBe(10.5);

      const totalNodes = Object.keys(graph.nodes).length;
      expect(totalNodes).toBe(44);

      expect(graph.floors[0].nodeIds.length).toBe(12);
      expect(graph.floors[1].nodeIds.length).toBe(12);
      expect(graph.floors[2].nodeIds.length).toBe(12);
      expect(graph.floors[3].nodeIds.length).toBe(8);
    });

    // Feature 15: Map 1 Vertical Movement & Tolls
    it('Feature 15: Map 1 Vertical Movement routes through elevator shafts and stairwells', () => {
      const graph = createKowloonWalledCityGraph();

      // South Elevator traverses floors with toll
      const f0Elev = graph.nodes['KOW_F0_04'];
      expect(f0Elev.connectedNodeIds).toContain('KOW_F1_04');
      const elevToll = stepTraverse(graph, 'KOW_F0_04', 'KOW_F1_04', 100);
      expect(elevToll.tollPaid).toBe(50);

      // Free North Stairwell
      const f0Stair = graph.nodes['KOW_F0_08'];
      expect(f0Stair.connectedNodeIds).toContain('KOW_F1_08');
      const stairToll = stepTraverse(graph, 'KOW_F0_08', 'KOW_F1_08', 0);
      expect(stairToll.tollPaid).toBe(0);

      // Skywalk connects Floor 2 to Floor 3
      const skywalk = stepTraverse(graph, 'KOW_F2_10', 'KOW_F3_02', 0);
      expect(skywalk.tollPaid).toBe(0);
      expect(skywalk.nextNodeId).toBe('KOW_F3_02');
    });

    // Feature 16: Coffin Home Upgrade Tree
    it('Feature 16: Coffin Home Upgrade Tree features 5 tiers of escalating rents', () => {
      expect(COFFIN_HOME_UPGRADES.length).toBe(5);

      const [t1, t2, t3, t4, t5] = COFFIN_HOME_UPGRADES;
      expect(t1.name).toBe('Wire Cage Bed');
      expect(t1.baseRent).toBe(15);

      expect(t2.name).toBe('Plywood Cubicle');
      expect(t2.baseRent).toBe(45);

      expect(t3.name).toBe('Subdivided Micro-Flat');
      expect(t3.baseRent).toBe(135);

      expect(t4.name).toBe('Double-Decker Mezzanine');
      expect(t4.baseRent).toBe(350);

      expect(t5.name).toBe('Slumlord Rooftop Stronghold (Landmark)');
      expect(t5.baseRent).toBe(800);
    });

    // Feature 17: Dynamic Floor Density Rent
    it('Feature 17: Dynamic Floor Density Rent scales as Rent * (1 + 0.5 * (N_floor - 1))', () => {
      const graph = createKowloonWalledCityGraph();

      // 1 player on floor: 1.0x
      const rent1 = calculateBusinessRent(graph, 'KOW_F2_02', { floorPlayers: 1, upgradeTier: 1 });
      expect(rent1).toBe(15);

      // 2 players on floor: 1.5x (15 * 1.5 = 22.5 -> 23 or 22)
      const rent2 = calculateBusinessRent(graph, 'KOW_F2_02', { floorPlayers: 2, upgradeTier: 1 });
      expect(rent2).toBe(23);

      // 3 players on floor: 2.0x (15 * 2.0 = 30)
      const rent3 = calculateBusinessRent(graph, 'KOW_F2_02', { floorPlayers: 3, upgradeTier: 1 });
      expect(rent3).toBe(30);

      // 4 players on floor: 2.5x (15 * 2.5 = 37.5 -> 38)
      const rent4 = calculateBusinessRent(graph, 'KOW_F2_02', { floorPlayers: 4, upgradeTier: 1 });
      expect(rent4).toBe(38);

      // Landmark level 5 with 4 players: 800 * 2.5 = 2000
      const landmarkRent = calculateBusinessRent(graph, 'KOW_F2_02', { floorPlayers: 4, upgradeTier: 5 });
      expect(landmarkRent).toBe(2000);
    });

    // Feature 18: Upward Fire Clearance Disaster
    it('Feature 18: Upward Fire Clearance Disaster disables burned floors and zeroes rent', () => {
      const graph = createKowloonWalledCityGraph();

      // Clear floor 0
      const { updatedGraph, affectedNodeIds } = applyKowloonFireClearance(graph, 0);
      expect(affectedNodeIds.length).toBe(12);

      for (const id of affectedNodeIds) {
        expect(updatedGraph.nodes[id].hazardStatus).toBe('FIRE');
        const rent = calculateBusinessRent(updatedGraph, id);
        expect(rent).toBe(0); // Burned property yields $0 rent
      }

      // Upper floor remains undamaged
      expect(updatedGraph.nodes['KOW_F1_00'].hazardStatus).toBe('NONE');
      expect(calculateBusinessRent(updatedGraph, 'KOW_F1_00')).toBeGreaterThan(0);
    });

    // Features 19–22: Maps 2-5 Data Schemas
    it('Features 19–22: Maps 2-5 Data Schemas validate schemas and unique disaster hooks', () => {
      // Map 2: New York
      const ny = MAP_SCHEMAS['new-york-wall-street'];
      expect(ny.nodeCount).toBe(40);
      expect(ny.floorsCount).toBe(2);
      expect(ny.disasterDefinition.name).toBe('Black Monday Market Crash');
      expect(validateMapSchema(ny).isValid).toBe(true);

      // Map 3: Paris
      const paris = MAP_SCHEMAS['paris-riot-square'];
      expect(paris.nodeCount).toBe(44);
      expect(paris.disasterDefinition.name).toBe('General Strike Flaming Barricades');
      expect(validateMapSchema(paris).isValid).toBe(true);

      // Map 4: Africa
      const africa = MAP_SCHEMAS['africa-mining-outpost'];
      expect(africa.nodeCount).toBe(40);
      expect(africa.floorsCount).toBe(3);
      expect(africa.disasterDefinition.name).toBe('Roaming Sandstorm');
      expect(validateMapSchema(africa).isValid).toBe(true);

      // Map 5: Japan
      const japan = MAP_SCHEMAS['japan-shinjuku-alleys'];
      expect(japan.nodeCount).toBe(44);
      expect(japan.disasterDefinition.name).toBe('00:00 Last Train Curfew');
      expect(validateMapSchema(japan).isValid).toBe(true);
    });

    // Feature 23: Map Registry & Selection System
    it('Feature 23: Map Registry loader returns registered schemas with zero defects', () => {
      const registeredMapIds = Object.keys(MAP_SCHEMAS);
      expect(registeredMapIds.length).toBe(4);
      expect(registeredMapIds).toContain('new-york-wall-street');
      expect(registeredMapIds).toContain('paris-riot-square');
      expect(registeredMapIds).toContain('africa-mining-outpost');
      expect(registeredMapIds).toContain('japan-shinjuku-alleys');

      for (const mapId of registeredMapIds) {
        const schema = MAP_SCHEMAS[mapId];
        const validation = validateMapSchema(schema);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toEqual([]);
      }
    });
  });

  // ==========================================================================
  // PART D: AI Decision Making & Multiplayer Parity (Features 24–29)
  // ==========================================================================
  describe('Part D: AI Decision Making & Multiplayer Parity (Features 24–29)', () => {
    // Feature 24: AI Branching Path Heuristic
    it('Feature 24: AI Branching Path Heuristic evaluates expected utility U = V_reward - alpha_risk * H_hazard - C_toll', () => {
      const graph = createKowloonWalledCityGraph();
      const nodeA = graph.nodes['KOW_F0_05']; // Safe low-rent property
      const nodeB = graph.nodes['KOW_F1_04']; // Elevator with high hazard

      const result = evaluateAIBranchChoice({
        branches: [nodeA, nodeB],
        playerCash: 500,
        opponentProperties: { [nodeB.id]: 800 }, // High opponent hazard on B
        trapsOnNodes: { [nodeB.id]: true },
        riskTolerance: 0.2, // Risk averse survivor
      });

      expect(result.chosenNodeId).toBe(nodeA.id);
      expect(result.utilities[nodeA.id]).toBeGreaterThan(result.utilities[nodeB.id]);
      expect(result.utilities[nodeB.id]).toBeLessThan(0);
    });

    // Feature 25: AI Choke-Point Trap Deployment
    it('Feature 25: AI Choke-Point Trap Deployment prioritizes elevators and stairwells', () => {
      const graph = createKowloonWalledCityGraph();
      const candidateNodes = ['KOW_F0_02', 'KOW_F0_04', 'KOW_F0_09']; // KOW_F0_04 is elevator shaft

      const chosenTrapNode = evaluateAIChokePointTrap(graph, candidateNodes);
      expect(chosenTrapNode).toBe('KOW_F0_04'); // Chosen because elevator has highest choke-point score
    });

    // Feature 26: AI Adaptive Business Selection
    it('Feature 26: AI Adaptive Business Selection pivots archetypes across Chaos phases', () => {
      // Peaceful: chooses lucrative Nightlife / Casino
      const peaceChoice = evaluateAIAdaptiveBusiness('PEACEFUL', []);
      expect(peaceChoice.id).toBe('underground_casino');

      // Instability: counters opponent Casino with Police Checkpoint
      const instabChoice = evaluateAIAdaptiveBusiness('INSTABILITY', [BUSINESS_CATALOG['underground_casino']]);
      expect(instabChoice.id).toBe('police_checkpoint');

      // Chaos: selects defensive Security HQ
      const chaosChoice = evaluateAIAdaptiveBusiness('CHAOS', []);
      expect(chaosChoice.id).toBe('security_hq');
    });

    // Feature 27: Multiplayer Protocol Schema Extensions
    it('Feature 27: Multiplayer Protocol Schema Extensions validate CHOOSE_PATH, PLACE_TRAP, and SELECT_BUSINESS_TYPE', () => {
      expect(validateClientIntent({ type: 'CHOOSE_PATH', targetNodeId: 'KOW_F1_04' }, {}, 'p1').isValid).toBe(true);
      expect(validateClientIntent({ type: 'CHOOSE_PATH' }, {}, 'p1').isValid).toBe(false);

      expect(validateClientIntent({ type: 'PLACE_TRAP', nodeId: 'KOW_F1_04', trapType: 'ROBBERY' }, {}, 'p1').isValid).toBe(true);
      expect(validateClientIntent({ type: 'PLACE_TRAP', nodeId: 'KOW_F1_04' }, {}, 'p1').isValid).toBe(false);

      expect(validateClientIntent({ type: 'SELECT_BUSINESS_TYPE', businessId: 'underground_bar' }, {}, 'p1').isValid).toBe(true);
      expect(validateClientIntent({ type: 'SELECT_BUSINESS_TYPE', businessId: 'invalid_biz' }, {}, 'p1').isValid).toBe(false);
    });

    // Feature 28: Multiplayer Authoritative Handling
    it('Feature 28: Multiplayer Authoritative Handling sanitizes hidden traps and secret seeds', () => {
      const rawState = {
        config: { seed: 99999, worldId: 'hong-kong-kowloon' },
        placedTraps: [
          { id: 'T1', nodeId: 'KOW_F1_04', ownerPlayerId: 'p1', trapType: 'ROBBERY', revealed: false },
          { id: 'T2', nodeId: 'KOW_F1_08', ownerPlayerId: 'p2', trapType: 'LOCKDOWN', revealed: true },
        ],
        players: [{ id: 'p1' }, { id: 'p2' }],
      };

      // Sanitize for opponent p2: p1's unrevealed trap must be masked as 'HIDDEN' and owner hidden
      const sanitizedForP2 = sanitizeStateForClient(rawState, 'p2');
      expect(sanitizedForP2.config.seed).toBeUndefined(); // Seed stripped
      expect(sanitizedForP2.placedTraps?.[0].trapType).toBe('HIDDEN');
      expect(sanitizedForP2.placedTraps?.[0].ownerPlayerId).toBeUndefined();
      // Revealed trap is unchanged
      expect(sanitizedForP2.placedTraps?.[1].trapType).toBe('LOCKDOWN');

      // Sanitize for owner p1: p1 can see their own trap
      const sanitizedForP1 = sanitizeStateForClient(rawState, 'p1');
      expect(sanitizedForP1.placedTraps?.[0].trapType).toBe('ROBBERY');
      expect(sanitizedForP1.placedTraps?.[0].ownerPlayerId).toBe('p1');
    });

    // Feature 29: Single-Player & Multiplayer Parity
    it('Feature 29: Single-Player & Multiplayer Parity preserves cash conservation across actions', () => {
      const players = [
        { id: 'p1', cash: 1500 },
        { id: 'p2', cash: 1500 },
      ];
      let bankReserve = 100000;
      const initialTotal = 103000;

      // Transfer 1: p1 pays elevator toll ($50) to Bank
      const t1 = executeDeterministicTransfer(players[0], { id: 'BANK', cash: bankReserve }, 50);
      bankReserve = t1.targetAfter;
      expect(t1.ledgerBalanced).toBe(true);
      expect(verifyLedgerEquilibrium(players, bankReserve, initialTotal).isBalanced).toBe(true);

      // Transfer 2: p2 pays rent ($200) to p1
      const t2 = executeDeterministicTransfer(players[1], players[0], 200);
      expect(t2.ledgerBalanced).toBe(true);
      expect(verifyLedgerEquilibrium(players, bankReserve, initialTotal).isBalanced).toBe(true);

      // Verify final cash balance
      expect(players[0].cash).toBe(1500 - 50 + 200);
      expect(players[1].cash).toBe(1500 - 200);
      expect(bankReserve).toBe(100050);
    });
  });
});
