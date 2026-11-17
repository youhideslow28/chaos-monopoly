import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../../gameReducer';
import { GameState, PlayerState } from '../../types';
import { SpatialBoardGraph, BoardNode, GraphEdge } from '../spatialGraphTypes';
import { createInitialFogOfWarState } from '../urbanFogOfWarEngine';

describe('Branch Decision & Reducer Integration', () => {
  // Construct a branching graph with:
  // Node 0 -> Node 1 (Intersection with 2 choices: Node 2A and Node 2B)
  // Node 2A -> Node 3
  // Node 2B -> Node 3 (Vertical Elevator, $50 toll)
  // Node 3 -> Node 0
  function createBranchingTestGraph(): SpatialBoardGraph {
    const nodes: Record<string, BoardNode> = {
      'node-0': {
        id: 'node-0',
        numericId: 0,
        name: 'Start Plaza',
        shortName: 'START',
        type: 'START',
        zoneId: 'zone-main',
        floor: 0,
        position3D: { x: 0, y: 0, z: 0 },
        connectedNodeIds: ['node-1'],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
      },
      'node-1': {
        id: 'node-1',
        numericId: 1,
        name: 'Fork Junction',
        shortName: 'FORK',
        type: 'PROPERTY',
        zoneId: 'zone-main',
        floor: 0,
        position3D: { x: 2, y: 0, z: 0 },
        connectedNodeIds: ['node-2a', 'node-2b'], // 2 Choices!
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
      },
      'node-2a': {
        id: 'node-2a',
        numericId: 2,
        name: 'Street Avenue',
        shortName: 'STREET',
        type: 'PROPERTY',
        zoneId: 'zone-main',
        floor: 0,
        position3D: { x: 4, y: 0, z: 0 },
        connectedNodeIds: ['node-3'],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
      },
      'node-2b': {
        id: 'node-2b',
        numericId: 3,
        name: 'Sky Lift Tower',
        shortName: 'LIFT',
        type: 'TRANSPORT',
        zoneId: 'zone-rooftop',
        floor: 1,
        position3D: { x: 2, y: 3.5, z: 2 },
        connectedNodeIds: ['node-3'],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
      },
      'node-3': {
        id: 'node-3',
        numericId: 20, // Tile 20: Free Parking (no tax)
        name: 'Grand Station',
        shortName: 'STATION',
        type: 'REST_ZONE',
        zoneId: 'zone-main',
        floor: 0,
        position3D: { x: 4, y: 0, z: 2 },
        connectedNodeIds: ['node-0'],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
      },
    };

    const edges: Record<string, GraphEdge> = {
      'node-0->node-1': {
        id: 'node-0->node-1',
        fromNodeId: 'node-0',
        toNodeId: 'node-1',
        type: 'MAIN_LOOP',
        stepCost: 1,
      },
      'node-1->node-2a': {
        id: 'node-1->node-2a',
        fromNodeId: 'node-1',
        toNodeId: 'node-2a',
        type: 'BRANCH',
        stepCost: 1,
      },
      'node-1->node-2b': {
        id: 'node-1->node-2b',
        fromNodeId: 'node-1',
        toNodeId: 'node-2b',
        type: 'VERTICAL_ELEVATOR',
        stepCost: 1,
        toll: { currency: 'CASH', amount: 50 },
      },
      'node-2a->node-3': {
        id: 'node-2a->node-3',
        fromNodeId: 'node-2a',
        toNodeId: 'node-3',
        type: 'MAIN_LOOP',
        stepCost: 1,
      },
      'node-2b->node-3': {
        id: 'node-2b->node-3',
        fromNodeId: 'node-2b',
        toNodeId: 'node-3',
        type: 'VERTICAL_STAIRS',
        stepCost: 1,
      },
      'node-3->node-0': {
        id: 'node-3->node-0',
        fromNodeId: 'node-3',
        toNodeId: 'node-0',
        type: 'MAIN_LOOP',
        stepCost: 1,
      },
    };

    return {
      mapId: 'branching-test-map',
      mapName: 'Branching Test Map',
      nodes,
      edges,
      startNodeId: 'node-0',
      detentionNodeId: 'node-1',
      floors: [
        { floorIndex: 0, name: 'Ground', elevationY: 0, nodeIds: ['node-0', 'node-1', 'node-2a', 'node-3'] },
        { floorIndex: 1, name: 'Sky', elevationY: 3.5, nodeIds: ['node-2b'] },
      ],
      zones: {
        'zone-secret': {
          id: 'zone-secret',
          name: 'Hidden Vault',
          zoneType: 'BASEMENT',
          initiallyLocked: true,
          nodeIds: [],
          unlockTriggers: [
            {
              type: 'BUILDING_UPGRADE_COUNT',
              threshold: 2,
            },
          ],
        },
      },
    };
  }

  function setupMatchState(graph?: SpatialBoardGraph): GameState {
    const p1: PlayerState = {
      id: 'p1',
      name: 'Player 1',
      token: { id: 'car', name: 'Car' },
      cash: 1000,
      position: 0,
      positionNodeId: 'node-0',
      inDetention: false,
      detentionTurns: 0,
      consecutiveDoubles: 0,
      isBankrupt: false,
      stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
    };

    const p2: PlayerState = {
      id: 'p2',
      name: 'Player 2',
      token: { id: 'hat', name: 'Hat' },
      cash: 1000,
      position: 0,
      positionNodeId: 'node-0',
      inDetention: false,
      detentionTurns: 0,
      consecutiveDoubles: 0,
      isBankrupt: false,
      stats: { rentPaid: 0, rentCollected: 0, chaosTriggered: 0, tilesTraveled: 0, propertiesOwned: 0 },
    };

    const baseGraph = graph || INITIAL_GAME_STATE.spatialGraph;

    return {
      ...INITIAL_GAME_STATE,
      status: 'PLAYING',
      players: [p1, p2],
      activePlayerIndex: 0,
      turnPhase: 'WAITING_FOR_ROLL',
      spatialGraph: baseGraph,
      fogOfWarState: baseGraph ? createInitialFogOfWarState(baseGraph) : undefined,
    };
  }

  it('preserves 100% legacy behavior: roll advances instantly to ACTION_MENU with no branch pauses', () => {
    const state = setupMatchState(); // Uses default LEGACY_RING_GRAPH
    const nextState = gameReducer(state, {
      type: 'ROLL_DICE_RESULT',
      dice: [2, 3], // 5 steps
    });

    expect(nextState.turnPhase).toBe('ACTION_MENU');
    expect(nextState.players[0].position).toBe(5);
    expect(nextState.movementState).toBeFalsy();
  });

  it('pauses at branch intersection with BRANCH_DECISION when multiple paths exist', () => {
    const graph = createBranchingTestGraph();
    const state = setupMatchState(graph);

    // Roll 3: Player at node-0 needs 3 steps.
    // Step 1: node-0 -> node-1 (Fork Junction, 2 outgoing branches: node-2a and node-2b)
    // Needs 2 more steps -> must pause for decision!
    const branchState = gameReducer(state, {
      type: 'ROLL_DICE_RESULT',
      dice: [1, 2], // sum = 3
    });

    expect(branchState.turnPhase).toBe('BRANCH_DECISION');
    expect(branchState.movementState).toBeDefined();
    expect(branchState.movementState?.currentNodeId).toBe('node-1');
    expect(branchState.movementState?.remainingSteps).toBe(2);
    expect(branchState.movementState?.availableNextNodes.sort()).toEqual(['node-2a', 'node-2b']);
  });

  it('CHOOSE_BRANCH_PATH advances movement, deducts elevator toll and lands on final node', () => {
    const graph = createBranchingTestGraph();
    const state = setupMatchState(graph);

    // Roll 3 and pause at node-1
    const branchState = gameReducer(state, {
      type: 'ROLL_DICE_RESULT',
      dice: [1, 2],
    });

    // Player chooses paid elevator path: node-2b ($50 toll)
    const initialCash = branchState.players[0].cash;
    const finalState = gameReducer(branchState, {
      type: 'CHOOSE_BRANCH_PATH',
      targetNodeId: 'node-2b',
    });

    // 1 step into node-2b, 1 remaining step auto-advances to node-3
    expect(finalState.turnPhase).toBe('ACTION_MENU');
    expect(finalState.players[0].positionNodeId).toBe('node-3');
    expect(finalState.movementState).toBeNull();

    // Check elevator toll ($50) deducted
    expect(finalState.players[0].cash).toBe(initialCash - 50);
  });

  it('CHOOSE_BRANCH_PATH takes free street path with zero toll', () => {
    const graph = createBranchingTestGraph();
    const state = setupMatchState(graph);

    const branchState = gameReducer(state, {
      type: 'ROLL_DICE_RESULT',
      dice: [1, 2],
    });

    const initialCash = branchState.players[0].cash;
    const finalState = gameReducer(branchState, {
      type: 'CHOOSE_BRANCH_PATH',
      targetNodeId: 'node-2a', // Free street path
    });

    expect(finalState.turnPhase).toBe('ACTION_MENU');
    expect(finalState.players[0].positionNodeId).toBe('node-3');
    expect(finalState.players[0].cash).toBe(initialCash); // Zero toll
  });

  it('handles UNLOCK_ZONE action explicitly', () => {
    const graph = createBranchingTestGraph();
    const state = setupMatchState(graph);

    expect(state.fogOfWarState?.unlockedZones['zone-secret']).toBe(false);

    const unlockedState = gameReducer(state, {
      type: 'UNLOCK_ZONE',
      zoneId: 'zone-secret',
      reason: 'Lệnh mở khóa khẩn cấp',
    });

    expect(unlockedState.fogOfWarState?.unlockedZones['zone-secret']).toBe(true);
    expect(unlockedState.logs[0].message).toContain('[MỞ KHÓA KHU VỰC]');
  });

  describe('Financial Invariants & Dynamic Liquid Cash Regression Suite', () => {
    function createMultiIntersectionGraph(): SpatialBoardGraph {
      const nodes: Record<string, BoardNode> = {
        'node-start': {
          id: 'node-start',
          numericId: 0,
          name: 'Start Gate',
          shortName: 'START',
          type: 'START',
          zoneId: 'zone-main',
          floor: 0,
          position3D: { x: 0, y: 0, z: 0 },
          connectedNodeIds: ['node-elev-fork'],
          isIntersection: false,
          isSecretZone: false,
          isLocked: false,
        },
        'node-elev-fork': {
          id: 'node-elev-fork',
          numericId: 1,
          name: 'Elevator Fork Junction',
          shortName: 'ELEV_FORK',
          type: 'PROPERTY',
          zoneId: 'zone-main',
          floor: 1,
          position3D: { x: 0, y: 3.5, z: 0 },
          connectedNodeIds: ['node-path-a', 'node-second-elev-fork'],
          isIntersection: true,
          isSecretZone: false,
          isLocked: false,
        },
        'node-path-a': {
          id: 'node-path-a',
          numericId: 2,
          name: 'Path A',
          shortName: 'PATH_A',
          type: 'PROPERTY',
          zoneId: 'zone-main',
          floor: 1,
          position3D: { x: 2, y: 3.5, z: 0 },
          connectedNodeIds: ['node-dest-a'],
          isIntersection: false,
          isSecretZone: false,
          isLocked: false,
        },
        'node-second-elev-fork': {
          id: 'node-second-elev-fork',
          numericId: 3,
          name: 'Second Elevator Fork',
          shortName: 'FORK_2',
          type: 'PROPERTY',
          zoneId: 'zone-main',
          floor: 2,
          position3D: { x: 0, y: 7.0, z: 0 },
          connectedNodeIds: ['node-sub-a', 'node-sub-b'],
          isIntersection: true,
          isSecretZone: false,
          isLocked: false,
        },
        'node-sub-a': {
          id: 'node-sub-a',
          numericId: 4,
          name: 'Sub A',
          shortName: 'SUB_A',
          type: 'PROPERTY',
          zoneId: 'zone-main',
          floor: 2,
          position3D: { x: 2, y: 7.0, z: 0 },
          connectedNodeIds: [],
          isIntersection: false,
          isSecretZone: false,
          isLocked: false,
        },
        'node-sub-b': {
          id: 'node-sub-b',
          numericId: 5,
          name: 'Sub B',
          shortName: 'SUB_B',
          type: 'PROPERTY',
          zoneId: 'zone-main',
          floor: 2,
          position3D: { x: -2, y: 7.0, z: 0 },
          connectedNodeIds: [],
          isIntersection: false,
          isSecretZone: false,
          isLocked: false,
        },
        'node-dest-a': {
          id: 'node-dest-a',
          numericId: 6,
          name: 'Dest A',
          shortName: 'DEST_A',
          type: 'PROPERTY',
          zoneId: 'zone-main',
          floor: 1,
          position3D: { x: 4, y: 3.5, z: 0 },
          connectedNodeIds: [],
          isIntersection: false,
          isSecretZone: false,
          isLocked: false,
        },
      };

      const edges: Record<string, GraphEdge> = {
        'node-start->node-elev-fork': {
          id: 'node-start->node-elev-fork',
          fromNodeId: 'node-start',
          toNodeId: 'node-elev-fork',
          type: 'VERTICAL_ELEVATOR',
          toll: { currency: 'CASH', amount: 50 },
        },
        'node-elev-fork->node-path-a': {
          id: 'node-elev-fork->node-path-a',
          fromNodeId: 'node-elev-fork',
          toNodeId: 'node-path-a',
          type: 'MAIN_LOOP',
        },
        'node-elev-fork->node-second-elev-fork': {
          id: 'node-elev-fork->node-second-elev-fork',
          fromNodeId: 'node-elev-fork',
          toNodeId: 'node-second-elev-fork',
          type: 'VERTICAL_ELEVATOR',
          toll: { currency: 'CASH', amount: 50 },
        },
        'node-second-elev-fork->node-sub-a': {
          id: 'node-second-elev-fork->node-sub-a',
          fromNodeId: 'node-second-elev-fork',
          toNodeId: 'node-sub-a',
          type: 'BRANCH',
        },
        'node-second-elev-fork->node-sub-b': {
          id: 'node-second-elev-fork->node-sub-b',
          fromNodeId: 'node-second-elev-fork',
          toNodeId: 'node-sub-b',
          type: 'BRANCH',
        },
        'node-path-a->node-dest-a': {
          id: 'node-path-a->node-dest-a',
          fromNodeId: 'node-path-a',
          toNodeId: 'node-dest-a',
          type: 'MAIN_LOOP',
        },
      };

      return {
        mapId: 'multi-intersection-test-map',
        mapName: 'Multi Intersection Test Map',
        nodes,
        edges,
        startNodeId: 'node-start',
        detentionNodeId: 'node-start',
        floors: [
          { floorIndex: 0, name: 'F0', elevationY: 0, nodeIds: ['node-start'] },
          { floorIndex: 1, name: 'F1', elevationY: 3.5, nodeIds: ['node-elev-fork', 'node-path-a', 'node-dest-a'] },
          { floorIndex: 2, name: 'F2', elevationY: 7.0, nodeIds: ['node-second-elev-fork', 'node-sub-a', 'node-sub-b'] },
        ],
      };
    }

    it('preserves salary in player cash when passing START immediately before an intersection pause', () => {
      const graph = createBranchingTestGraph();
      // Position player at node-3 (the node leading to node-0 START)
      const baseState = setupMatchState(graph);
      const state: GameState = {
        ...baseState,
        players: [
          {
            ...baseState.players[0],
            positionNodeId: 'node-3',
            position: 20,
            cash: 1000,
          },
          baseState.players[1],
        ],
      };

      // Roll 3:
      // Step 1: node-3 -> node-0 (START): awards $200 salary
      // Step 2: node-0 -> node-1 (Fork Junction with 2 branches: node-2a and node-2b)
      // Pauses in BRANCH_DECISION with 1 step remaining
      const branchState = gameReducer(state, {
        type: 'ROLL_DICE_RESULT',
        dice: [1, 2], // sum = 3
      });

      expect(branchState.turnPhase).toBe('BRANCH_DECISION');
      expect(branchState.movementState?.currentNodeId).toBe('node-1');
      expect(branchState.movementState?.remainingSteps).toBe(1);

      // CRITICAL CHECK: Player cash MUST be 1000 + 200 = 1200, NOT reverted to 1000
      expect(branchState.players[0].cash).toBe(1200);

      // Ledger must contain SALARY_START of 200
      const salaryEntry = (branchState.ledger || []).find(e => e.category === 'SALARY_START');
      expect(salaryEntry).toBeDefined();
      expect(salaryEntry?.amount).toBe(200);
      expect(salaryEntry?.toPlayerId).toBe(state.players[0].id);
    });

    it('preserves elevator toll deduction in player cash when paid immediately before an intersection pause', () => {
      const graph = createMultiIntersectionGraph();
      const state = setupMatchState(graph);

      // Player at node-start with $1000 cash rolls 2:
      // Step 1: node-start -> node-elev-fork (via VERTICAL_ELEVATOR, $50 toll). Toll paid: $50.
      // At node-elev-fork, remainingSteps = 1 > 0 and 2 branches exist.
      // Pauses in BRANCH_DECISION.
      const branchState = gameReducer(state, {
        type: 'ROLL_DICE_RESULT',
        dice: [1, 1], // sum = 2
      });

      expect(branchState.turnPhase).toBe('BRANCH_DECISION');
      expect(branchState.movementState?.currentNodeId).toBe('node-elev-fork');
      expect(branchState.movementState?.remainingSteps).toBe(1);

      // CRITICAL CHECK: Player cash MUST be 1000 - 50 = 950, NOT reverted to 1000
      expect(branchState.players[0].cash).toBe(950);

      // Ledger must contain TAX_PAYMENT of 50
      const tollEntry = (branchState.ledger || []).find(e => e.category === 'TAX_PAYMENT');
      expect(tollEntry).toBeDefined();
      expect(tollEntry?.amount).toBe(50);
      expect(tollEntry?.fromPlayerId).toBe(state.players[0].id);
    });

    it('preserves branch elevator toll deduction when taking branch leading to a secondary intersection', () => {
      const graph = createMultiIntersectionGraph();
      const state = setupMatchState(graph);

      // Roll 3 from node-start:
      // Step 1: node-start -> node-elev-fork (Elevator 1, $50 toll). Cash = 950.
      // Pauses at node-elev-fork with 2 steps remaining.
      const firstBranchState = gameReducer(state, {
        type: 'ROLL_DICE_RESULT',
        dice: [1, 2], // sum = 3
      });

      expect(firstBranchState.turnPhase).toBe('BRANCH_DECISION');
      expect(firstBranchState.movementState?.remainingSteps).toBe(2);
      expect(firstBranchState.players[0].cash).toBe(950);

      // Choose branch path: node-second-elev-fork (Elevator 2, $50 toll)
      // Step 2: advances to node-second-elev-fork. Toll paid: $50. Cash = 900.
      // At node-second-elev-fork, stepsLeft = 1 > 0 and 2 branches exist (node-sub-a, node-sub-b).
      // Pauses AGAIN in BRANCH_DECISION.
      const secondBranchState = gameReducer(firstBranchState, {
        type: 'CHOOSE_BRANCH_PATH',
        targetNodeId: 'node-second-elev-fork',
      });

      expect(secondBranchState.turnPhase).toBe('BRANCH_DECISION');
      expect(secondBranchState.movementState?.currentNodeId).toBe('node-second-elev-fork');
      expect(secondBranchState.movementState?.remainingSteps).toBe(1);

      // CRITICAL CHECK: Cash MUST be 900 (1000 - 50 - 50), NOT reverted to 1000 or 950
      expect(secondBranchState.players[0].cash).toBe(900);

      const tollEntries = (secondBranchState.ledger || []).filter(e => e.category === 'TAX_PAYMENT');
      expect(tollEntries).toHaveLength(2);
      expect(tollEntries[0].amount).toBe(50);
      expect(tollEntries[1].amount).toBe(50);
    });

    it('prevents chained elevator overdraft during multi-step auto-traversal when liquid cash is exhausted', () => {
      // Linear chain: node-0 -> (Elevator 1, $50 toll) -> node-1 -> (Elevator 2, $50 toll) -> node-2
      const chainGraph: SpatialBoardGraph = {
        mapId: 'chained-elevator-map',
        mapName: 'Chained Elevator Test',
        nodes: {
          'chain-0': {
            id: 'chain-0',
            numericId: 0,
            name: 'Base Floor',
            shortName: 'BASE',
            type: 'START',
            zoneId: 'zone-main',
            floor: 0,
            position3D: { x: 0, y: 0, z: 0 },
            connectedNodeIds: ['chain-1'],
            isIntersection: false,
            isSecretZone: false,
            isLocked: false,
          },
          'chain-1': {
            id: 'chain-1',
            numericId: 1,
            name: 'Mid Level',
            shortName: 'MID',
            type: 'PROPERTY',
            zoneId: 'zone-main',
            floor: 1,
            position3D: { x: 0, y: 3.5, z: 0 },
            connectedNodeIds: ['chain-2'],
            isIntersection: false,
            isSecretZone: false,
            isLocked: false,
          },
          'chain-2': {
            id: 'chain-2',
            numericId: 2,
            name: 'Top Level Fork',
            shortName: 'TOP',
            type: 'PROPERTY',
            zoneId: 'zone-main',
            floor: 2,
            position3D: { x: 0, y: 7.0, z: 0 },
            connectedNodeIds: ['chain-3a', 'chain-3b'],
            isIntersection: true,
            isSecretZone: false,
            isLocked: false,
          },
          'chain-3a': {
            id: 'chain-3a',
            numericId: 3,
            name: 'Roof Deck A',
            shortName: 'ROOF_A',
            type: 'PROPERTY',
            zoneId: 'zone-main',
            floor: 2,
            position3D: { x: 2, y: 7.0, z: 0 },
            connectedNodeIds: [],
            isIntersection: false,
            isSecretZone: false,
            isLocked: false,
          },
          'chain-3b': {
            id: 'chain-3b',
            numericId: 4,
            name: 'Roof Deck B',
            shortName: 'ROOF_B',
            type: 'PROPERTY',
            zoneId: 'zone-main',
            floor: 2,
            position3D: { x: -2, y: 7.0, z: 0 },
            connectedNodeIds: [],
            isIntersection: false,
            isSecretZone: false,
            isLocked: false,
          },
        },
        edges: {
          'chain-0->chain-1': {
            id: 'chain-0->chain-1',
            fromNodeId: 'chain-0',
            toNodeId: 'chain-1',
            type: 'VERTICAL_ELEVATOR',
            toll: { currency: 'CASH', amount: 50 },
          },
          'chain-1->chain-2': {
            id: 'chain-1->chain-2',
            fromNodeId: 'chain-1',
            toNodeId: 'chain-2',
            type: 'VERTICAL_ELEVATOR',
            toll: { currency: 'CASH', amount: 50 },
          },
          'chain-2->chain-3a': {
            id: 'chain-2->chain-3a',
            fromNodeId: 'chain-2',
            toNodeId: 'chain-3a',
            type: 'BRANCH',
          },
          'chain-2->chain-3b': {
            id: 'chain-2->chain-3b',
            fromNodeId: 'chain-2',
            toNodeId: 'chain-3b',
            type: 'BRANCH',
          },
        },
        startNodeId: 'chain-0',
        detentionNodeId: 'chain-0',
        floors: [
          { floorIndex: 0, name: 'F0', elevationY: 0, nodeIds: ['chain-0'] },
          { floorIndex: 1, name: 'F1', elevationY: 3.5, nodeIds: ['chain-1'] },
          { floorIndex: 2, name: 'F2', elevationY: 7.0, nodeIds: ['chain-2', 'chain-3a', 'chain-3b'] },
        ],
      };

      const baseState = setupMatchState(chainGraph);
      // Give player only $60 cash (enough for 1 elevator, not 2)
      const state: GameState = {
        ...baseState,
        players: [
          {
            ...baseState.players[0],
            positionNodeId: 'chain-0',
            position: 0,
            cash: 60,
          },
          baseState.players[1],
        ],
      };

      // Roll 2:
      // Step 1: takes elevator 1 to chain-1. Toll paid: $50. Cash becomes $10.
      // Step 2: at chain-1, evaluating edge to chain-2 checks dynamic liquid cash ($10).
      // Since $10 < $50, the candidate is rejected (no valid candidates).
      // Traversal halts at chain-1. Player does NOT overdraft and does NOT ride elevator 2 for free!
      const endState = gameReducer(state, {
        type: 'ROLL_DICE_RESULT',
        dice: [1, 1], // sum = 2
      });

      expect(endState.players[0].positionNodeId).toBe('chain-1');
      expect(endState.players[0].cash).toBe(10);

      const tolls = (endState.ledger || []).filter(e => e.category === 'TAX_PAYMENT');
      expect(tolls).toHaveLength(1);
      expect(tolls[0].amount).toBe(50);
    });
  });
});
