/**
 * tests/e2e/tier4-real-world-workload.test.ts
 *
 * Tier 4: Real-World Match Simulation Scenarios
 * 5 full-match simulation scenarios on Kowloon Walled City:
 * 1. 4-Player 40-Round Game (2 Human, 2 AI) to endgame
 * 2. Escalating Chaos Run to full Rooftop Evacuation
 * 3. Aggressive Business Warfare & Choke-Point Trap Sabotage
 * 4. Vertical Movement Stress Match & High-Density Bankruptcy
 * 5. Headless Multiplayer Room Lifecycle & Intent Synchronization
 */

import { describe, it, expect } from 'vitest';
import {
  createKowloonWalledCityGraph,
  runHeadlessE2EMatch,
  verifyLedgerEquilibrium,
  executeDeterministicTransfer,
  createInitialChaosMeter,
  applyChaosDelta,
  applyKowloonFireClearance,
  calculateBusinessRent,
  BUSINESS_CATALOG,
  calculateSynergyModifier,
  sanitizeStateForClient,
  validateClientIntent,
  Mulberry32,
  PlacedTrap,
  triggerTrapOnNode,
  getValidNextNodes,
  stepTraverse,
} from './helpers/e2eTestHarness';

describe('Tier 4: Real-World Match Simulation Workloads', () => {
  // ==========================================================================
  // SCENARIO 1: 4-Player 40-Round Match to Endgame
  // ==========================================================================
  it('Scenario 4.1: executes a complete 4-player 40-round match on Kowloon Walled City with ledger equilibrium', () => {
    const simulationResult = runHeadlessE2EMatch({
      seed: 20261115,
      maxRounds: 40,
      startingCash: 1500,
    });

    expect(simulationResult.roundsPlayed).toBe(40);
    expect(simulationResult.finalPlayers.length).toBe(4);
    expect(simulationResult.winner).toBeDefined();
    expect(simulationResult.winner.cash).toBeGreaterThan(0);
    expect(simulationResult.totalTransactions).toBeGreaterThan(20);

    // Double-entry financial ledger must remain perfectly balanced (delta === 0)
    expect(simulationResult.ledgerBalanced).toBe(true);
    expect(simulationResult.chaosHistory.length).toBeGreaterThan(40);
    // Chaos meter advanced significantly from initial 0%
    expect(simulationResult.chaosHistory[simulationResult.chaosHistory.length - 1]).toBeGreaterThan(30.0);
  });

  // ==========================================================================
  // SCENARIO 2: Escalating Chaos Run to Rooftop Evacuation
  // ==========================================================================
  it('Scenario 4.2: accelerates Chaos from Peaceful to full Fire Disaster clearance forcing rooftop endgame', () => {
    const graph = createKowloonWalledCityGraph();
    let meter = createInitialChaosMeter();
    const prng = new Mulberry32(777);

    let bankReserve = 100000;
    const players = [
      { id: 'p1', cash: 2000, floor: 0, currentNodeId: 'KOW_F0_02', isBankrupt: false },
      { id: 'p2', cash: 2000, floor: 0, currentNodeId: 'KOW_F0_03', isBankrupt: false },
      { id: 'p3', cash: 2000, floor: 0, currentNodeId: 'KOW_F0_05', isBankrupt: false },
      { id: 'p4', cash: 2000, floor: 0, currentNodeId: 'KOW_F0_07', isBankrupt: false },
    ];
    const initialSystemCash = 100000 + 8000;

    // Phase 1: Rapid escalation to Chaos (>70%)
    meter = applyChaosDelta(meter, 75.0).nextMeter;
    expect(meter.phase).toBe('CHAOS');
    expect(meter.phaseFloor).toBe(70.0);

    // Round 18: Floor 0 fire clears ground level, evacuates to Floor 1 with $100 fine
    let currentGraph = applyKowloonFireClearance(graph, 0).updatedGraph;
    for (const p of players) {
      if (p.floor === 0) {
        p.floor = 1;
        p.currentNodeId = 'KOW_F1_00';
        p.cash -= 100;
        bankReserve += 100;
      }
    }
    expect(currentGraph.nodes['KOW_F0_02'].hazardStatus).toBe('FIRE');
    expect(verifyLedgerEquilibrium(players, bankReserve, initialSystemCash).isBalanced).toBe(true);

    // Round 21: Floor 1 fire clears second floor, evacuates to Floor 2
    currentGraph = applyKowloonFireClearance(currentGraph, 1).updatedGraph;
    for (const p of players) {
      if (p.floor <= 1) {
        p.floor = 2;
        p.currentNodeId = 'KOW_F2_00';
      }
    }
    expect(currentGraph.nodes['KOW_F1_00'].hazardStatus).toBe('FIRE');

    // Round 24: Floor 2 fire clears third floor, forces all players to Rooftop (Floor 3)
    currentGraph = applyKowloonFireClearance(currentGraph, 2).updatedGraph;
    for (const p of players) {
      if (p.floor <= 2) {
        p.floor = 3;
        p.currentNodeId = 'KOW_F3_00';
      }
    }
    expect(currentGraph.nodes['KOW_F2_00'].hazardStatus).toBe('FIRE');

    // Assert all players are on Rooftop (Floor 3)
    for (const p of players) {
      expect(p.floor).toBe(3);
    }

    // On rooftop, 4 players confined triggers maximum density rent (2.5x)
    const rooftopNodeId = 'KOW_F3_02';
    const rooftopRent = calculateBusinessRent(currentGraph, rooftopNodeId, {
      floorPlayers: 4,
      upgradeTier: 4, // $350 base
      chaosPhase: 'CHAOS', // 1.25x
    });
    // 350 * 2.5 * 1.25 = ~1094
    expect(rooftopRent).toBeGreaterThan(1000);

    // Final ledger equilibrium check
    const equilibrium = verifyLedgerEquilibrium(players, bankReserve, initialSystemCash);
    expect(equilibrium.isBalanced).toBe(true);
    expect(equilibrium.delta).toBe(0);
  });

  // ==========================================================================
  // SCENARIO 3: Aggressive Business Warfare & Trap Sabotage
  // ==========================================================================
  it('Scenario 4.3: models competing business synergy warfare and choke-point trap detonations', () => {
    const graph = createKowloonWalledCityGraph();
    let bankReserve = 100000;
    const players = [
      { id: 'player_synergy', cash: 3000 },
      { id: 'player_police', cash: 3000 },
    ];
    const initialCash = 106000;

    // Player 1 opens Casino at KOW_F1_02
    graph.nodes['KOW_F1_02'].currentBusiness = {
      businessId: 'underground_casino',
      businessName: 'Underground Casino',
      category: 'NIGHTLIFE',
      level: 1,
      baseRent: 90,
      ownerPlayerId: 'player_synergy',
    };

    // Before counter: Casino rent is high (90M)
    const unsuppressedRent = calculateBusinessRent(graph, 'KOW_F1_02');
    expect(unsuppressedRent).toBe(90);

    // Player 2 counters by establishing Police Checkpoint at adjacent node KOW_F1_03
    graph.nodes['KOW_F1_03'].currentBusiness = {
      businessId: 'police_checkpoint',
      businessName: 'Police Checkpoint',
      category: 'CIVIC',
      level: 1,
      baseRent: 40,
      ownerPlayerId: 'player_police',
    };

    // Connect KOW_F1_02 to KOW_F1_03
    graph.nodes['KOW_F1_02'].connectedNodeIds.push('KOW_F1_03');

    // After counter: Police Checkpoint completely shuts down Casino ($0 rent)
    const suppressedRent = calculateBusinessRent(graph, 'KOW_F1_02');
    expect(suppressedRent).toBe(0);

    // In retaliation, Player 1 places a Robbery Trap at elevator choke-point KOW_F1_04
    const traps: PlacedTrap[] = [
      {
        id: 'SABOTAGE_TRAP_01',
        nodeId: 'KOW_F1_04',
        ownerPlayerId: 'player_synergy',
        trapType: 'ROBBERY',
        placedRound: 6,
        revealed: false,
      },
    ];

    // Player 2 walks into elevator choke-point
    const triggerResult = triggerTrapOnNode(
      traps,
      'player_police',
      'KOW_F1_04',
      players[1].cash,
      players[0].cash
    );

    players[1].cash = triggerResult.victimCashAfter;
    players[0].cash = triggerResult.ownerCashAfter;

    // Stolen cash (20% of 3000 capped at 250M) = 250M
    expect(triggerResult.cashDelta).toBe(250);
    expect(players[1].cash).toBe(2750);
    expect(players[0].cash).toBe(3250);

    // Complete financial audit passes
    expect(verifyLedgerEquilibrium(players, bankReserve, initialCash).isBalanced).toBe(true);
  });

  // ==========================================================================
  // SCENARIO 4: Vertical Movement Stress Match
  // ==========================================================================
  it('Scenario 4.4: stress-tests 100+ elevator/stair transitions verifying bank toll collection and solvency', () => {
    const graph = createKowloonWalledCityGraph();
    const prng = new Mulberry32(9999);

    let bankReserve = 100000;
    const players = [
      { id: 'commuter_1', cash: 5000, isBankrupt: false },
      { id: 'commuter_2', cash: 5000, isBankrupt: false },
    ];
    const initialSystemCash = 110000;

    let elevatorTransitCount = 0;
    let stairTransitCount = 0;

    const elevatorTransitions = [
      { from: 'KOW_F0_04', to: 'KOW_F1_04' },
      { from: 'KOW_F1_04', to: 'KOW_F2_04' },
      { from: 'KOW_F2_04', to: 'KOW_F3_04' },
      { from: 'KOW_F3_04', to: 'KOW_F2_04' },
    ];

    const stairTransitions = [
      { from: 'KOW_F0_08', to: 'KOW_F1_08' },
      { from: 'KOW_F1_08', to: 'KOW_F2_08' },
      { from: 'KOW_F2_08', to: 'KOW_F3_06' },
      { from: 'KOW_F3_06', to: 'KOW_F2_08' },
    ];

    // Simulate 100 rapid vertical transitions
    for (let i = 0; i < 100; i++) {
      const activePlayer = players[i % 2];
      if (activePlayer.isBankrupt) continue;

      const useElevator = prng.next() > 0.4;
      if (useElevator && activePlayer.cash >= 50) {
        const trans = prng.pickOne(elevatorTransitions);
        const step = stepTraverse(graph, trans.from, trans.to, activePlayer.cash);
        expect(step.tollPaid).toBe(50);

        activePlayer.cash -= step.tollPaid;
        bankReserve += step.tollPaid;
        elevatorTransitCount++;
      } else {
        const trans = prng.pickOne(stairTransitions);
        const step = stepTraverse(graph, trans.from, trans.to, activePlayer.cash);
        expect(step.tollPaid).toBe(0);
        stairTransitCount++;
      }
    }

    expect(elevatorTransitCount).toBeGreaterThan(30);
    expect(stairTransitCount).toBeGreaterThan(20);

    // Bank cash reserve must match exactly initial + (elevatorTransitCount * 50)
    expect(bankReserve).toBe(100000 + elevatorTransitCount * 50);

    // Double-entry ledger equilibrium holds 100%
    const audit = verifyLedgerEquilibrium(players, bankReserve, initialSystemCash);
    expect(audit.isBalanced).toBe(true);
    expect(audit.delta).toBe(0);
  });

  // ==========================================================================
  // SCENARIO 5: Multiplayer Room Lifecycle Simulation
  // ==========================================================================
  it('Scenario 4.5: simulates multiplayer authoritative room lifecycle with intent validation and client reconnect', () => {
    // 1. Authoritative Room State
    const roomState = {
      roomId: 'ROOM_KOWLOON_99',
      stateVersion: 1,
      config: { seed: 888123, worldId: 'hong-kong-kowloon' },
      players: [
        { id: 'p1_host', name: 'Alice', cash: 1500, isConnected: true },
        { id: 'p2_client', name: 'Bob', cash: 1500, isConnected: true },
        { id: 'p3_client', name: 'Charlie', cash: 1500, isConnected: true },
        { id: 'p4_client', name: 'Diana', cash: 1500, isConnected: true },
      ],
      placedTraps: [
        {
          id: 'TRAP_SERVER_01',
          nodeId: 'KOW_F1_04',
          ownerPlayerId: 'p1_host',
          trapType: 'ROBBERY',
          placedRound: 2,
          revealed: false,
        },
      ],
    };

    // 2. Validate client intents
    // Valid path selection
    const intent1 = { type: 'CHOOSE_PATH', targetNodeId: 'KOW_F1_04' };
    expect(validateClientIntent(intent1, roomState, 'p2_client').isValid).toBe(true);

    // Invalid path intent (missing target)
    const intentInvalid = { type: 'CHOOSE_PATH' };
    expect(validateClientIntent(intentInvalid, roomState, 'p2_client').isValid).toBe(false);

    // Valid business selection
    const intentBiz = { type: 'SELECT_BUSINESS_TYPE', businessId: 'underground_bar' };
    expect(validateClientIntent(intentBiz, roomState, 'p1_host').isValid).toBe(true);

    // Unknown business rejected
    const intentBadBiz = { type: 'SELECT_BUSINESS_TYPE', businessId: 'fake_biz' };
    expect(validateClientIntent(intentBadBiz, roomState, 'p1_host').isValid).toBe(false);

    // 3. State Sanitization for Bob (p2_client): secret seed and opponent trap type are masked
    const bobView = sanitizeStateForClient(roomState, 'p2_client');
    expect(bobView.config.seed).toBeUndefined();
    expect(bobView.placedTraps?.[0].trapType).toBe('HIDDEN');
    expect(bobView.placedTraps?.[0].ownerPlayerId).toBeUndefined();

    // 4. Simulate Client Disconnect & Reconnect
    // Bob disconnects
    roomState.players[1].isConnected = false;
    roomState.stateVersion++;

    // Bob reconnects and requests state sync
    roomState.players[1].isConnected = true;
    roomState.stateVersion++;
    const reconnectedBobView = sanitizeStateForClient(roomState, 'p2_client');
    expect(reconnectedBobView.players[1].isConnected).toBe(true);
    expect(reconnectedBobView.placedTraps?.[0].trapType).toBe('HIDDEN'); // Still sanitized

    // 5. Final ledger equilibrium
    const equilibrium = verifyLedgerEquilibrium(roomState.players, 100000, 106000);
    expect(equilibrium.isBalanced).toBe(true);
    expect(equilibrium.delta).toBe(0);
  });
});
