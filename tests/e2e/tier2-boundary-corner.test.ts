/**
 * tests/e2e/tier2-boundary-corner.test.ts
 *
 * Tier 2: Boundary, Limit & Corner Cases Suite
 * Covers 8 critical boundary groups:
 * 1. Zero Cash Elevator Toll
 * 2. Exact Phase Thresholds (30%, 70%, 100%)
 * 3. Negative Ratchet Floor Locks
 * 4. $0 Cash Robbery Trap
 * 5. Maximum Cluster Synergy
 * 6. Double Negative Police Suppression
 * 7. Top Floor Fire Crowding & Density
 * 8. Dead-End & Collapsed Navigation
 */

import { describe, it, expect } from 'vitest';
import {
  createKowloonWalledCityGraph,
  getValidNextNodes,
  stepTraverse,
  createInitialChaosMeter,
  applyChaosDelta,
  triggerTrapOnNode,
  PlacedTrap,
  calculateSynergyModifier,
  calculateBusinessRent,
  applyKowloonFireClearance,
  verifyLedgerEquilibrium,
  SpatialBoardGraph,
  BoardNode,
} from './helpers/e2eTestHarness';

describe('Tier 2: Boundary & Corner Cases (8 Boundary Groups)', () => {
  // ==========================================================================
  // GROUP 1: Zero Cash Elevator Toll
  // ==========================================================================
  describe('Boundary Group 1: Zero Cash & Fractional Toll Boundaries', () => {
    it('rejects elevator traversal when player has $0 cash', () => {
      const graph = createKowloonWalledCityGraph();

      // At $0 cash, South Elevator (toll $50) must not appear in valid next nodes
      const validNodesZeroCash = getValidNextNodes(graph, 'KOW_F0_04', 0);
      expect(validNodesZeroCash.some(n => n.id === 'KOW_F1_04')).toBe(false);

      // Attempting stepTraverse directly throws error
      expect(() => stepTraverse(graph, 'KOW_F0_04', 'KOW_F1_04', 0)).toThrow(
        /Insufficient cash for toll/i
      );
    });

    it('rejects elevator traversal at boundary cash $49 and permits at exact $50', () => {
      const graph = createKowloonWalledCityGraph();

      // $49 is below $50 toll
      const validNodes49 = getValidNextNodes(graph, 'KOW_F0_04', 49);
      expect(validNodes49.some(n => n.id === 'KOW_F1_04')).toBe(false);
      expect(() => stepTraverse(graph, 'KOW_F0_04', 'KOW_F1_04', 49)).toThrow();

      // Exact $50 is permitted
      const validNodes50 = getValidNextNodes(graph, 'KOW_F0_04', 50);
      expect(validNodes50.some(n => n.id === 'KOW_F1_04')).toBe(true);

      const step = stepTraverse(graph, 'KOW_F0_04', 'KOW_F1_04', 50);
      expect(step.nextNodeId).toBe('KOW_F1_04');
      expect(step.tollPaid).toBe(50);
    });

    it('allows free stair traversal ($0 toll) regardless of player cash', () => {
      const graph = createKowloonWalledCityGraph();

      // Stairs at $0 cash are accessible
      const stairNodesZero = getValidNextNodes(graph, 'KOW_F0_08', 0);
      expect(stairNodesZero.some(n => n.id === 'KOW_F1_08')).toBe(true);

      const stairStep = stepTraverse(graph, 'KOW_F0_08', 'KOW_F1_08', 0);
      expect(stairStep.nextNodeId).toBe('KOW_F1_08');
      expect(stairStep.tollPaid).toBe(0);
    });
  });

  // ==========================================================================
  // GROUP 2: Exact Phase Thresholds (30%, 70%, 100%)
  // ==========================================================================
  describe('Boundary Group 2: Exact Phase Thresholds (0%, 30%, 70%, 100%)', () => {
    it('remains in PEACEFUL at exact boundary 30.0% and transitions at 30.1%', () => {
      let meter = createInitialChaosMeter();

      // Exact 30.0% is Peaceful
      const at30 = applyChaosDelta(meter, 30.0);
      expect(at30.nextMeter.value).toBe(30.0);
      expect(at30.nextMeter.phase).toBe('PEACEFUL');
      expect(at30.transitionedPhase).toBeUndefined();

      // 30.1% enters Instability
      const at30Point1 = applyChaosDelta(meter, 30.1);
      expect(at30Point1.nextMeter.value).toBe(30.1);
      expect(at30Point1.nextMeter.phase).toBe('INSTABILITY');
      expect(at30Point1.transitionedPhase).toBe('INSTABILITY');
    });

    it('remains in INSTABILITY at exact boundary 70.0% and transitions at 70.1%', () => {
      let meter = createInitialChaosMeter();
      meter = applyChaosDelta(meter, 40.0).nextMeter; // In Instability

      // Exact 70.0% is still Instability
      meter.value = 65.0;
      const at70 = applyChaosDelta(meter, 5.0);
      expect(at70.nextMeter.value).toBe(70.0);
      expect(at70.nextMeter.phase).toBe('INSTABILITY');
      expect(at70.transitionedPhase).toBeUndefined();

      // 70.1% enters Chaos
      const at70Point1 = applyChaosDelta(meter, 5.1);
      expect(at70Point1.nextMeter.value).toBe(70.1);
      expect(at70Point1.nextMeter.phase).toBe('CHAOS');
      expect(at70Point1.transitionedPhase).toBe('CHAOS');
    });

    it('clamps firmly at 100.0% ceiling without numerical overflow', () => {
      let meter = createInitialChaosMeter();
      meter.value = 99.5;
      meter.phase = 'CHAOS';
      meter.phaseFloor = 70.0;

      const overLimit = applyChaosDelta(meter, 25.0);
      expect(overLimit.nextMeter.value).toBe(100.0);
      expect(overLimit.nextMeter.phase).toBe('CHAOS');
    });
  });

  // ==========================================================================
  // GROUP 3: Negative Ratchet Floor Locks
  // ==========================================================================
  describe('Boundary Group 3: Negative Ratchet Floor Locks', () => {
    it('enforces 30.0% ratchet floor lock against large negative deltas in Instability', () => {
      let meter = createInitialChaosMeter();
      meter = applyChaosDelta(meter, 45.0).nextMeter;
      expect(meter.phase).toBe('INSTABILITY');
      expect(meter.phaseFloor).toBe(30.0);

      // Attempt delta of -30.0%
      const dropped = applyChaosDelta(meter, -30.0);
      expect(dropped.nextMeter.value).toBe(30.0);
      expect(dropped.nextMeter.phase).toBe('INSTABILITY');
      expect(dropped.nextMeter.phaseFloor).toBe(30.0);

      // Further negative delta still clamped at 30.0%
      const droppedAgain = applyChaosDelta(dropped.nextMeter, -50.0);
      expect(droppedAgain.nextMeter.value).toBe(30.0);
      expect(droppedAgain.nextMeter.phase).toBe('INSTABILITY');
    });

    it('enforces 70.0% ratchet floor lock against extreme negative deltas in Chaos', () => {
      let meter = createInitialChaosMeter();
      meter = applyChaosDelta(meter, 85.0).nextMeter;
      expect(meter.phase).toBe('CHAOS');
      expect(meter.phaseFloor).toBe(70.0);

      // Extreme negative delta -90.0%
      const dropped = applyChaosDelta(meter, -90.0);
      expect(dropped.nextMeter.value).toBe(70.0);
      expect(dropped.nextMeter.phase).toBe('CHAOS');
      expect(dropped.nextMeter.phaseFloor).toBe(70.0);
    });
  });

  // ==========================================================================
  // GROUP 4: $0 Cash Robbery Trap
  // ==========================================================================
  describe('Boundary Group 4: $0 Cash Robbery Trap', () => {
    it('executes robbery trap safely on victim with $0 without creating negative cash', () => {
      const traps: PlacedTrap[] = [
        {
          id: 'TRAP_ROB',
          nodeId: 'KOW_F1_03',
          ownerPlayerId: 'player_rich',
          trapType: 'ROBBERY',
          placedRound: 2,
          revealed: false,
        },
      ];

      // Victim has exactly $0
      const result = triggerTrapOnNode(traps, 'player_broke', 'KOW_F1_03', 0, 1000);

      expect(result.trapTriggered?.revealed).toBe(true);
      expect(result.cashDelta).toBe(0);
      expect(result.victimCashAfter).toBe(0); // Never negative
      expect(result.ownerCashAfter).toBe(1000); // Unchanged

      // Double-entry ledger balance check
      const equilibrium = verifyLedgerEquilibrium(
        [
          { id: 'player_broke', cash: result.victimCashAfter },
          { id: 'player_rich', cash: result.ownerCashAfter },
        ],
        100000,
        101000
      );
      expect(equilibrium.isBalanced).toBe(true);
    });

    it('caps robbery steal amount at maximum $250M limit even for billionaire victims', () => {
      const traps: PlacedTrap[] = [
        {
          id: 'TRAP_ROB_2',
          nodeId: 'KOW_F2_05',
          ownerPlayerId: 'player_owner',
          trapType: 'ROBBERY',
          placedRound: 5,
          revealed: false,
        },
      ];

      // Victim with $50,000M: 20% would be $10,000M, but capped at $250M
      const result = triggerTrapOnNode(traps, 'player_billionaire', 'KOW_F2_05', 50000, 500);

      expect(result.cashDelta).toBe(250);
      expect(result.victimCashAfter).toBe(49750);
      expect(result.ownerCashAfter).toBe(750);
    });
  });

  // ==========================================================================
  // GROUP 5: Maximum Cluster Synergy
  // ==========================================================================
  describe('Boundary Group 5: Maximum Cluster Synergy', () => {
    it('compounds multi-neighbor synergies cleanly without numeric instability', () => {
      // Food stall surrounded by 4 coffin home units
      const clusterModifier = calculateSynergyModifier('street_food_stall', [
        'coffin_home_units',
        'coffin_home_units',
        'coffin_home_units',
        'coffin_home_units',
      ]);

      // 1.15 ^ 4 = ~1.749
      expect(clusterModifier.multiplier).toBeGreaterThan(1.7);
      expect(clusterModifier.multiplier).toBeLessThan(1.8);
      expect(clusterModifier.isSuppressed).toBe(false);
      expect(Number.isFinite(clusterModifier.multiplier)).toBe(true);

      // Healthcare cluster (4 clinics/pharmacies)
      const healthCluster = calculateSynergyModifier('clinic_pharmacy', [
        'clinic_pharmacy',
        'clinic_pharmacy',
        'clinic_pharmacy',
      ]);
      // 1.2 ^ 3 = 1.728
      expect(healthCluster.multiplier).toBeCloseTo(1.728, 2);
    });

    it('computes isolated property with 0 neighbors at exactly 1.0x baseline', () => {
      const isolated = calculateSynergyModifier('underground_bar', []);
      expect(isolated.multiplier).toBe(1.0);
      expect(isolated.isSuppressed).toBe(false);
      expect(isolated.modifierSummary.length).toBe(0);
    });
  });

  // ==========================================================================
  // GROUP 6: Double Negative Police Suppression
  // ==========================================================================
  describe('Boundary Group 6: Double Negative Police Suppression', () => {
    it('clamps Casino rent strictly at $0 under multiple adjacent Police Checkpoints', () => {
      const doublePolice = calculateSynergyModifier('underground_casino', [
        'police_checkpoint',
        'police_checkpoint',
      ]);

      expect(doublePolice.isSuppressed).toBe(true);
      expect(doublePolice.multiplier).toBe(0.0);
    });

    it('compounds multiple police penalties on Pawn Shop without dropping below $0', () => {
      // Pawn Shop penalized by 2 police checkpoints: 0.5 * 0.5 = 0.25
      const doublePenalty = calculateSynergyModifier('pawn_shop', [
        'police_checkpoint',
        'police_checkpoint',
      ]);

      expect(doublePenalty.multiplier).toBe(0.25);
      expect(doublePenalty.isSuppressed).toBe(false);
      expect(doublePenalty.multiplier).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // GROUP 7: Top Floor Fire Crowding
  // ==========================================================================
  describe('Boundary Group 7: Top Floor Fire Crowding', () => {
    it('applies maximum 4-player density rent (2.5x) when all players are forced to Floor 3', () => {
      const graph = createKowloonWalledCityGraph();

      // Progressive clearance: Floor 0, 1, 2 burned
      let currentGraph = graph;
      currentGraph = applyKowloonFireClearance(currentGraph, 0).updatedGraph;
      currentGraph = applyKowloonFireClearance(currentGraph, 1).updatedGraph;
      currentGraph = applyKowloonFireClearance(currentGraph, 2).updatedGraph;
      const updatedGraph = currentGraph;

      // Verify Floors 0, 1, 2 are hazardStatus FIRE
      expect(updatedGraph.nodes['KOW_F0_02'].hazardStatus).toBe('FIRE');
      expect(updatedGraph.nodes['KOW_F1_02'].hazardStatus).toBe('FIRE');
      expect(updatedGraph.nodes['KOW_F2_02'].hazardStatus).toBe('FIRE');

      // Burned floors yield 0 rent
      expect(calculateBusinessRent(updatedGraph, 'KOW_F0_02')).toBe(0);
      expect(calculateBusinessRent(updatedGraph, 'KOW_F1_02')).toBe(0);
      expect(calculateBusinessRent(updatedGraph, 'KOW_F2_02')).toBe(0);

      // Rooftop (Floor 3) survives and all 4 players crowded there: 2.5x density multiplier
      const rooftopRent = calculateBusinessRent(updatedGraph, 'KOW_F3_01', {
        floorPlayers: 4,
        upgradeTier: 5, // Landmark $800M
        chaosPhase: 'CHAOS', // 1.25x chaos multiplier
      });

      // 800 * 2.5 * 1.25 = 2500
      expect(rooftopRent).toBe(2500);
    });
  });

  // ==========================================================================
  // GROUP 8: Dead-End & Collapsed Navigation
  // ==========================================================================
  describe('Boundary Group 8: Dead-End & Collapsed Navigation', () => {
    it('returns empty valid next nodes when all outgoing connections are collapsed', () => {
      const graph: SpatialBoardGraph = {
        mapId: 'test-collapsed-map',
        mapName: 'Test Collapsed Map',
        startNodeId: 'N1',
        detentionNodeId: 'N1',
        floors: [{ floorIndex: 0, name: 'Ground', elevationY: 0, nodeIds: ['N1', 'N2'] }],
        nodes: {
          N1: {
            id: 'N1',
            name: 'Start',
            shortName: 'N1',
            type: 'START',
            zoneId: 'Z1',
            floor: 0,
            position3D: { x: 0, y: 0, z: 0 },
            connectedNodeIds: ['N2'],
            isIntersection: false,
            isSecretZone: false,
            isLocked: false,
            hazardStatus: 'NONE',
          },
          N2: {
            id: 'N2',
            name: 'Collapsed Bridge',
            shortName: 'N2',
            type: 'PROPERTY',
            zoneId: 'Z1',
            floor: 0,
            position3D: { x: 1, y: 0, z: 0 },
            connectedNodeIds: [],
            isIntersection: false,
            isSecretZone: false,
            isLocked: false,
            hazardStatus: 'COLLAPSED', // Collapsed!
          },
        },
      };

      const validNodes = getValidNextNodes(graph, 'N1', 1000);
      expect(validNodes.length).toBe(0); // Excluded collapsed node

      // Direct traversal attempt fails cleanly
      expect(() => stepTraverse(graph, 'N1', 'N2', 1000)).toThrow(/locked or collapsed/i);
    });

    it('handles dead-end node with zero outgoing edges without throwing', () => {
      const deadEndNode: BoardNode = {
        id: 'DEAD_END',
        name: 'Cul-de-sac',
        shortName: 'END',
        type: 'PROPERTY',
        zoneId: 'Z1',
        floor: 0,
        position3D: { x: 5, y: 0, z: 5 },
        connectedNodeIds: [], // Dead end
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: 'NONE',
      };

      const graph: SpatialBoardGraph = {
        mapId: 'test-dead-end',
        mapName: 'Dead End Test',
        startNodeId: 'DEAD_END',
        detentionNodeId: 'DEAD_END',
        floors: [{ floorIndex: 0, name: 'Ground', elevationY: 0, nodeIds: ['DEAD_END'] }],
        nodes: { DEAD_END: deadEndNode },
      };

      const validNodes = getValidNextNodes(graph, 'DEAD_END', 500);
      expect(validNodes).toEqual([]);
    });
  });
});
