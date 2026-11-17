import { describe, it, expect } from 'vitest';
import {
  SpatialBoardGraph,
  BoardNode,
} from '../spatialGraphTypes';
import {
  createInitialFogOfWarState,
  checkUnlockTriggers,
  unlockZone,
  isNodeTraversable,
  getFogShroudedZones,
} from '../urbanFogOfWarEngine';
import { GameState } from '../../types';

describe('Urban Fog of War Engine', () => {
  function createTestGraphWithZones(): SpatialBoardGraph {
    const nodes: Record<string, BoardNode> = {
      'node-1': {
        id: 'node-1',
        name: 'Main Street 1',
        shortName: 'MS1',
        type: 'PROPERTY',
        zoneId: 'zone-main',
        floor: 0,
        position3D: { x: 0, y: 0, z: 0 },
        connectedNodeIds: ['node-2'],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
      },
      'node-2': {
        id: 'node-2',
        name: 'Main Street 2',
        shortName: 'MS2',
        type: 'PROPERTY',
        zoneId: 'zone-main',
        floor: 0,
        position3D: { x: 2, y: 0, z: 0 },
        connectedNodeIds: ['node-secret-1'],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
      },
      'node-secret-1': {
        id: 'node-secret-1',
        name: 'Underground Casino',
        shortName: 'CASINO',
        type: 'CASINO',
        zoneId: 'zone-black-market',
        floor: -1,
        position3D: { x: 2, y: -3.5, z: 0 },
        connectedNodeIds: ['node-secret-2'],
        isIntersection: false,
        isSecretZone: true,
        isLocked: true,
      },
      'node-secret-2': {
        id: 'node-secret-2',
        name: 'Smuggler Den',
        shortName: 'DEN',
        type: 'PROPERTY',
        zoneId: 'zone-black-market',
        floor: -1,
        position3D: { x: 4, y: -3.5, z: 0 },
        connectedNodeIds: ['node-1'],
        isIntersection: false,
        isSecretZone: true,
        isLocked: true,
      },
      'node-vip-1': {
        id: 'node-vip-1',
        name: 'Penthouse Lounge',
        shortName: 'LOUNGE',
        type: 'PROPERTY',
        zoneId: 'zone-vip-rooftop',
        floor: 2,
        position3D: { x: 0, y: 7.0, z: 0 },
        connectedNodeIds: ['node-1'],
        isIntersection: false,
        isSecretZone: true,
        isLocked: true,
      },
    };

    return {
      mapId: 'test-fow-map',
      mapName: 'Test Fog of War Level',
      nodes,
      edges: {},
      startNodeId: 'node-1',
      detentionNodeId: 'node-2',
      floors: [
        { floorIndex: -1, name: 'Basement', elevationY: -3.5, nodeIds: ['node-secret-1', 'node-secret-2'] },
        { floorIndex: 0, name: 'Ground', elevationY: 0, nodeIds: ['node-1', 'node-2'] },
        { floorIndex: 2, name: 'Rooftop', elevationY: 7.0, nodeIds: ['node-vip-1'] },
      ],
      zones: {
        'zone-main': {
          id: 'zone-main',
          name: 'Main District',
          zoneType: 'MAIN_STREET',
          initiallyLocked: false,
          isSecretZone: false,
          nodeIds: ['node-1', 'node-2'],
        },
        'zone-black-market': {
          id: 'zone-black-market',
          name: 'Kowloon Black Market',
          zoneType: 'BLACK_MARKET',
          initiallyLocked: true,
          isSecretZone: true,
          nodeIds: ['node-secret-1', 'node-secret-2'],
          unlockTriggers: [
            {
              type: 'BUILDING_UPGRADE_COUNT',
              threshold: 5,
              descriptionVi: 'Tổng số cấp công trình toàn bản đồ đạt 5',
            },
          ],
        },
        'zone-vip-rooftop': {
          id: 'zone-vip-rooftop',
          name: 'VIP Rooftop Terrace',
          zoneType: 'VIP_ROOFTOP',
          initiallyLocked: true,
          isSecretZone: true,
          nodeIds: ['node-vip-1'],
          unlockTriggers: [
            {
              type: 'ROUND_NUMBER',
              threshold: 10,
              descriptionVi: 'Trận đấu tiến đến Vòng 10',
            },
          ],
        },
      },
    };
  }

  it('initializes fog of war state accurately from graph definitions', () => {
    const graph = createTestGraphWithZones();
    const fogState = createInitialFogOfWarState(graph);

    expect(fogState.unlockedZones['zone-main']).toBe(true);
    expect(fogState.unlockedZones['zone-black-market']).toBe(false);
    expect(fogState.unlockedZones['zone-vip-rooftop']).toBe(false);

    expect(fogState.unlockedNodes['node-1']).toBe(true);
    expect(fogState.unlockedNodes['node-2']).toBe(true);
    expect(fogState.unlockedNodes['node-secret-1']).toBe(false);
    expect(fogState.unlockedNodes['node-secret-2']).toBe(false);
    expect(fogState.unlockedNodes['node-vip-1']).toBe(false);
  });

  it('correctly queries shrouded zones and node traversability', () => {
    const graph = createTestGraphWithZones();
    const fogState = createInitialFogOfWarState(graph);

    expect(isNodeTraversable(graph, 'node-1', fogState)).toBe(true);
    expect(isNodeTraversable(graph, 'node-secret-1', fogState)).toBe(false);

    const shrouded = getFogShroudedZones(graph, fogState);
    expect(shrouded.map(z => z.id).sort()).toEqual(['zone-black-market', 'zone-vip-rooftop']);
  });

  it('evaluates BUILDING_UPGRADE_COUNT unlock trigger when threshold reached', () => {
    const graph = createTestGraphWithZones();
    const fogState = createInitialFogOfWarState(graph);

    // Mock game state with 4 upgrades (under threshold 5)
    const mockStateBelow = {
      roundNumber: 2,
      properties: {
        1: { ownerId: 'p1', level: 2 },
        2: { ownerId: 'p2', level: 2 },
      },
      fogOfWarState: fogState,
    } as unknown as GameState;

    const checkBelow = checkUnlockTriggers(mockStateBelow, graph, { triggerType: 'UPGRADE' });
    expect(checkBelow.shouldUnlock).toBe(false);

    // Mock game state with 5 upgrades (meets threshold 5)
    const mockStateMeets = {
      roundNumber: 2,
      properties: {
        1: { ownerId: 'p1', level: 3 },
        2: { ownerId: 'p2', level: 2 },
      },
      fogOfWarState: fogState,
    } as unknown as GameState;

    const checkMeets = checkUnlockTriggers(mockStateMeets, graph, { triggerType: 'UPGRADE' });
    expect(checkMeets.shouldUnlock).toBe(true);
    expect(checkMeets.zoneIdsToUnlock).toContain('zone-black-market');
  });

  it('evaluates ROUND_NUMBER threshold unlock trigger', () => {
    const graph = createTestGraphWithZones();
    const fogState = createInitialFogOfWarState(graph);

    const mockStateRound10 = {
      roundNumber: 10,
      properties: {},
      fogOfWarState: fogState,
    } as unknown as GameState;

    const checkRound = checkUnlockTriggers(mockStateRound10, graph, { triggerType: 'ROUND_ADVANCE' });
    expect(checkRound.shouldUnlock).toBe(true);
    expect(checkRound.zoneIdsToUnlock).toContain('zone-vip-rooftop');
  });

  it('immutably unlocks a zone and updates nodes, graph, and history', () => {
    const graph = createTestGraphWithZones();
    const fogState = createInitialFogOfWarState(graph);

    const { updatedGraph, updatedFogState, unlockEvent } = unlockZone(
      graph,
      'zone-black-market',
      fogState,
      3,
      'Tổng cấp công trình đạt 5'
    );

    // Check updated FogOfWarState
    expect(updatedFogState.unlockedZones['zone-black-market']).toBe(true);
    expect(updatedFogState.unlockedNodes['node-secret-1']).toBe(true);
    expect(updatedFogState.unlockedNodes['node-secret-2']).toBe(true);
    expect(updatedFogState.unlockHistory.length).toBe(1);
    expect(unlockEvent.zoneId).toBe('zone-black-market');

    // Check updated graph nodes are no longer locked
    expect(updatedGraph.nodes['node-secret-1'].isLocked).toBe(false);
    expect(updatedGraph.nodes['node-secret-2'].isLocked).toBe(false);
    expect(updatedGraph.zones?.['zone-black-market'].initiallyLocked).toBe(false);

    // Original graph and state remain unmodified (pure immutability)
    expect(graph.nodes['node-secret-1'].isLocked).toBe(true);
    expect(fogState.unlockedZones['zone-black-market']).toBe(false);

    // Node is now traversable
    expect(isNodeTraversable(updatedGraph, 'node-secret-1', updatedFogState)).toBe(true);
  });
});
