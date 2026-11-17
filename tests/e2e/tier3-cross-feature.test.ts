/**
 * tests/e2e/tier3-cross-feature.test.ts
 *
 * Tier 3: Combinatorial & Cross-Feature Integration Suite
 * 5 multi-system combinatorial tests:
 * 1. Elevator toll + Robbery trap + Instability phase
 * 2. Business synergy + Upward fire disaster
 * 3. Fog of war unlock + Chaos phase transition
 * 4. AI pathfinding around choke-point traps & police
 * 5. Multiplayer state sync & trap masking
 */

import { describe, it, expect } from 'vitest';
import {
  createKowloonWalledCityGraph,
  getValidNextNodes,
  stepTraverse,
  createInitialChaosMeter,
  applyChaosDelta,
  ChaosEventBus,
  triggerTrapOnNode,
  PlacedTrap,
  calculateSynergyModifier,
  calculateBusinessRent,
  applyKowloonFireClearance,
  evaluateZoneUnlocks,
  evaluateAIBranchChoice,
  sanitizeStateForClient,
  verifyLedgerEquilibrium,
  executeDeterministicTransfer,
} from './helpers/e2eTestHarness';

describe('Tier 3: Combinatorial & Cross-Feature Interactions', () => {
  // ==========================================================================
  // COMBO 1: Elevator Toll + Robbery Trap + Instability Phase
  // ==========================================================================
  it('Combo 3.1: Elevator Toll + Robbery Trap + Instability Phase preserves ledger conservation', () => {
    const graph = createKowloonWalledCityGraph();
    let meter = createInitialChaosMeter();

    // Advance meter into Instability phase (35%)
    meter = applyChaosDelta(meter, 35.0).nextMeter;
    expect(meter.phase).toBe('INSTABILITY');

    // Setup players and bank
    const players = [
      { id: 'victim_p1', cash: 1000 },
      { id: 'trapper_p2', cash: 500 },
    ];
    let bankReserve = 100000;
    const initialSystemCash = 101500;

    // Trapper places Robbery trap on Floor 1 elevator exit
    const traps: PlacedTrap[] = [
      {
        id: 'TRAP_ELEV_F1',
        nodeId: 'KOW_F1_04',
        ownerPlayerId: 'trapper_p2',
        trapType: 'ROBBERY',
        placedRound: 4,
        revealed: false,
      },
    ];

    // Step 1: victim traverses elevator from F0 to F1, paying $50 toll to Bank
    const step = stepTraverse(graph, 'KOW_F0_04', 'KOW_F1_04', players[0].cash);
    expect(step.tollPaid).toBe(50);

    const tollTransfer = executeDeterministicTransfer(
      players[0],
      { id: 'BANK', cash: bankReserve },
      step.tollPaid
    );
    bankReserve = tollTransfer.targetAfter;
    expect(players[0].cash).toBe(950);
    expect(bankReserve).toBe(100050);

    // Verify ledger equilibrium after toll
    const ledgerAfterToll = verifyLedgerEquilibrium(players, bankReserve, initialSystemCash);
    expect(ledgerAfterToll.isBalanced).toBe(true);

    // Step 2: victim triggers robbery trap on landing at KOW_F1_04
    const trapResult = triggerTrapOnNode(
      traps,
      'victim_p1',
      'KOW_F1_04',
      players[0].cash,
      players[1].cash,
      graph.detentionNodeId
    );

    expect(trapResult.trapTriggered?.revealed).toBe(true);
    // 20% of 950 = 190
    expect(trapResult.cashDelta).toBe(190);
    players[0].cash = trapResult.victimCashAfter; // 950 - 190 = 760
    players[1].cash = trapResult.ownerCashAfter;  // 500 + 190 = 690
    expect(players[0].cash).toBe(760);
    expect(players[1].cash).toBe(690);

    // Step 3: Trap detonation bumps chaos meter by +2.5%
    meter = applyChaosDelta(meter, 2.5).nextMeter;
    expect(meter.value).toBe(37.5);
    expect(meter.phase).toBe('INSTABILITY');

    // Final ledger equilibrium audit: zero money created or lost!
    const finalEquilibrium = verifyLedgerEquilibrium(players, bankReserve, initialSystemCash);
    expect(finalEquilibrium.isBalanced).toBe(true);
    expect(finalEquilibrium.delta).toBe(0);
    expect(players[0].cash + players[1].cash + bankReserve).toBe(initialSystemCash);
  });

  // ==========================================================================
  // COMBO 2: Business Synergy + Upward Fire Disaster
  // ==========================================================================
  it('Combo 3.2: Business Synergy + Upward Fire Disaster clears lower businesses and inflates upper floor density rents', () => {
    const graph = createKowloonWalledCityGraph();

    // Assign Floor 0 businesses: Bar and Pawn Shop with +25% synergy
    graph.nodes['KOW_F0_02'].currentBusiness = {
      businessId: 'underground_bar',
      businessName: 'Underground Bar',
      category: 'NIGHTLIFE',
      level: 1,
      baseRent: 35,
      ownerPlayerId: 'p1',
    };
    graph.nodes['KOW_F0_03'].currentBusiness = {
      businessId: 'pawn_shop',
      businessName: 'Pawn Shop',
      category: 'FINANCE',
      level: 1,
      baseRent: 30,
      ownerPlayerId: 'p2',
    };

    // Assign Floor 1 property
    graph.nodes['KOW_F1_02'].currentBusiness = {
      businessId: 'coffin_home_units',
      businessName: 'Coffin Home Units',
      category: 'RESIDENTIAL',
      level: 1,
      baseRent: 45,
      ownerPlayerId: 'p1',
    };

    // Before disaster: Floor 0 bar enjoys synergy (35 * 1.25 = ~44)
    const initialBarRent = calculateBusinessRent(graph, 'KOW_F0_02', { floorPlayers: 1 });
    expect(initialBarRent).toBe(44);

    // Before disaster: Floor 1 coffin home rent with 1 player
    const initialF1Rent = calculateBusinessRent(graph, 'KOW_F1_02', { floorPlayers: 1 });
    expect(initialF1Rent).toBe(45);

    // Disaster strikes: Floor 0 burned and evacuated to Floor 1
    const { updatedGraph } = applyKowloonFireClearance(graph, 0);

    // Burned Floor 0 businesses produce $0 rent
    expect(updatedGraph.nodes['KOW_F0_02'].hazardStatus).toBe('FIRE');
    expect(calculateBusinessRent(updatedGraph, 'KOW_F0_02')).toBe(0);
    expect(calculateBusinessRent(updatedGraph, 'KOW_F0_03')).toBe(0);

    // Evacuated players arrive on Floor 1 (now 3 players on Floor 1)
    // Dynamic density multiplier: 1 + 0.5 * (3 - 1) = 2.0x
    const inflatedF1Rent = calculateBusinessRent(updatedGraph, 'KOW_F1_02', { floorPlayers: 3 });
    expect(inflatedF1Rent).toBe(45 * 2); // 90
    expect(inflatedF1Rent).toBeGreaterThan(initialF1Rent);
  });

  // ==========================================================================
  // COMBO 3: Fog of War Unlock + Chaos Phase Transition
  // ==========================================================================
  it('Combo 3.3: Fog of War Unlock coincides with Chaos Phase Transition to Instability', () => {
    const graph = createKowloonWalledCityGraph();
    const bus = new ChaosEventBus();
    let meter = createInitialChaosMeter();

    // Start near threshold at 29.5%
    meter = applyChaosDelta(meter, 29.5).nextMeter;
    expect(meter.phase).toBe('PEACEFUL');
    expect(graph.zones?.['ZONE_BLACK_MARKET'].isLocked).toBe(true);

    let phaseTransitionOccurred = false;
    bus.onDisaster('INSTABILITY', () => {
      phaseTransitionOccurred = true;
    });

    // Player upgrades coffin home: triggers +1.5% delta
    const dispatchResult = bus.dispatch({ type: 'PROPERTY_UPGRADED' }, meter);
    meter = dispatchResult.nextMeter;

    // Crosses 30.0% boundary: 29.5 + 1.5 = 31.0%
    expect(meter.value).toBe(31.0);
    expect(meter.phase).toBe('INSTABILITY');
    expect(meter.phaseFloor).toBe(30.0);
    expect(phaseTransitionOccurred).toBe(true);

    // Phase transition triggers Fog of War zone unlock
    const { unlockedZoneIds, updatedGraph } = evaluateZoneUnlocks(graph, {
      type: 'CHAOS_PHASE',
      value: meter.phase,
    });

    expect(unlockedZoneIds).toContain('ZONE_BLACK_MARKET');
    expect(updatedGraph.nodes['KOW_F0_11'].isLocked).toBe(false);

    // Black market is now fully traversable in path options
    const nextOptions = getValidNextNodes(updatedGraph, 'KOW_F0_10');
    expect(nextOptions.some(n => n.id === 'KOW_F0_11')).toBe(true);
  });

  // ==========================================================================
  // COMBO 4: AI Pathfinding around Choke-Point Traps & Police
  // ==========================================================================
  it('Combo 4: AI pathfinding chooses paid elevator detour to evade high-hazard trap choke-points', () => {
    const graph = createKowloonWalledCityGraph();

    // Intersection at KOW_F0_04 offers choice:
    // Route 1: KOW_F0_05 (Continues to Free Stairs KOW_F0_08, where an opponent trap & high rent await)
    // Route 2: KOW_F1_04 (Direct elevator vertical transit, $50 toll, clear path)
    const candidates = [graph.nodes['KOW_F0_05'], graph.nodes['KOW_F1_04']];

    // Scenario A: Risk-averse survivor bot with $500 cash
    const decisionA = evaluateAIBranchChoice({
      branches: candidates,
      playerCash: 500,
      opponentProperties: { KOW_F0_05: 600 }, // Dangerous opponent property
      trapsOnNodes: { KOW_F0_05: true },      // Suspected trap
      riskTolerance: 0.2,                     // Low tolerance -> high hazard penalty
    });

    // Chooses elevator KOW_F1_04 despite $50 toll because hazard penalty is avoided
    expect(decisionA.chosenNodeId).toBe('KOW_F1_04');
    expect(decisionA.utilities['KOW_F1_04']).toBeGreaterThan(decisionA.utilities['KOW_F0_05']);

    // Scenario B: Broke player ($20 cash) cannot afford $50 elevator toll
    const affordableNodes = getValidNextNodes(graph, 'KOW_F0_04', 20);
    expect(affordableNodes.some(n => n.id === 'KOW_F1_04')).toBe(false);
    expect(affordableNodes.some(n => n.id === 'KOW_F0_05')).toBe(true);
  });

  // ==========================================================================
  // COMBO 5: Multiplayer State Sync & Trap Masking
  // ==========================================================================
  it('Combo 3.5: Multiplayer State Sync masks unrevealed traps to clients and reveals on trigger', () => {
    // 3-Player match state
    const serverState = {
      config: { seed: 424242, worldId: 'hong-kong-kowloon' },
      players: [
        { id: 'p1_host', cash: 1500 },
        { id: 'p2_client', cash: 1500 },
        { id: 'p3_client', cash: 1500 },
      ],
      placedTraps: [
        {
          id: 'TRAP_P1',
          nodeId: 'KOW_F2_04',
          ownerPlayerId: 'p1_host',
          trapType: 'ROBBERY',
          placedRound: 3,
          revealed: false,
        },
      ],
    };

    // 1. Broadcast to opponent p2: trap must be masked as 'HIDDEN' and seed removed
    const clientStateP2 = sanitizeStateForClient(serverState, 'p2_client');
    expect(clientStateP2.config.seed).toBeUndefined();
    expect(clientStateP2.placedTraps?.[0].trapType).toBe('HIDDEN');
    expect(clientStateP2.placedTraps?.[0].ownerPlayerId).toBeUndefined();
    expect(clientStateP2.placedTraps?.[0].revealed).toBe(false);

    // 2. Broadcast to trap owner p1: unmasked
    const clientStateP1 = sanitizeStateForClient(serverState, 'p1_host');
    expect(clientStateP1.placedTraps?.[0].trapType).toBe('ROBBERY');
    expect(clientStateP1.placedTraps?.[0].ownerPlayerId).toBe('p1_host');

    // 3. Player 2 lands on KOW_F2_04: server executes trigger
    const triggerResult = triggerTrapOnNode(
      serverState.placedTraps as PlacedTrap[],
      'p2_client',
      'KOW_F2_04',
      serverState.players[1].cash,
      serverState.players[0].cash
    );

    serverState.placedTraps = triggerResult.nextTraps;
    serverState.players[1].cash = triggerResult.victimCashAfter;
    serverState.players[0].cash = triggerResult.ownerCashAfter;

    // 4. Broadcast updated state: trap is now revealed to all clients
    const syncStateP2After = sanitizeStateForClient(serverState, 'p2_client');
    expect(syncStateP2After.placedTraps?.[0].revealed).toBe(true);
    expect(syncStateP2After.placedTraps?.[0].trapType).toBe('ROBBERY');
    expect(syncStateP2After.placedTraps?.[0].ownerPlayerId).toBe('p1_host');

    // Double-entry ledger equilibrium holds across entire session
    const equilibrium = verifyLedgerEquilibrium(serverState.players, 100000, 104500);
    expect(equilibrium.isBalanced).toBe(true);
    expect(equilibrium.delta).toBe(0);
  });
});
