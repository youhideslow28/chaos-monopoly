/**
 * src/game/maps/kowloonWalledCity.ts
 *
 * Map 1 Reference Level: Hong Kong — Kowloon Walled City (Chung Cư Cửu Long)
 * - 4 vertically stacked floors (Y = 0.0, 3.5, 7.0, 10.5) with 44 nodes
 * - Paid South Elevator ($50 toll) vs. Free North Stairwell ($0 toll) + Skywalk bridge
 * - Secret Basement Black Market (Urban Fog of War zone)
 * - 5-tier Coffin Home upgrade tree
 * - Dynamic Floor Density Rent Scaling: Rent * (1 + 0.5 * (N_floor - 1))
 * - Upward Fire / Clearance Disaster (burns lower floors every 3 rounds in Chaos/late-game)
 */

import type { BoardNode, GraphEdge, SpatialBoardGraph, ZoneDefinition } from '../graph/spatialGraphTypes';
import type { GameState } from '../types';
import { executeLedgerTransaction } from '../economy/ledgerEngine';
import { CoffinUpgradeTier, KowloonFireClearanceResult } from './mapTypes';

export const KOWLOON_MAP_ID = 'hong-kong-kowloon' as const;

export const COFFIN_HOME_UPGRADES: CoffinUpgradeTier[] = [
  { level: 1, name: 'Wire Cage Bed', cost: 40, baseRent: 15 },
  { level: 2, name: 'Plywood Cubicle', cost: 40, baseRent: 45 },
  { level: 3, name: 'Subdivided Micro-Flat', cost: 50, baseRent: 135 },
  { level: 4, name: 'Double-Decker Mezzanine', cost: 60, baseRent: 350 },
  { level: 5, name: 'Slumlord Rooftop Stronghold (Landmark)', cost: 100, baseRent: 800 },
];

/**
 * Computes the dynamic floor density multiplier for Kowloon Walled City:
 * Multiplier = 1 + 0.5 * max(0, playersOnFloor - 1)
 */
export function getKowloonFloorDensityMultiplier(playersOnFloor: number): number {
  return 1.0 + 0.5 * Math.max(0, playersOnFloor - 1);
}

/**
 * Computes dynamic floor density rent for Kowloon Walled City:
 * Rent_total = round(BaseRent * (1 + 0.5 * (N_floor - 1)))
 */
export function calculateKowloonDensityRent(baseRent: number, playersOnFloor: number): number {
  if (baseRent <= 0) return 0;
  return Math.round(baseRent * getKowloonFloorDensityMultiplier(playersOnFloor));
}

/**
 * Builds the 4-floor, 44-node 3D Spatial Graph for Hong Kong — Kowloon Walled City.
 */
export function createKowloonWalledCityGraph(): SpatialBoardGraph {
  const nodes: Record<string, BoardNode> = {};
  const edges: Record<string, GraphEdge> = {};

  const floorElevations = [0.0, 3.5, 7.0, 10.5];
  const floorNodeCounts = [12, 12, 12, 8]; // Total 44 nodes
  const floorDistrictColors = [
    'district-brown',
    'district-orange',
    'district-red',
    'district-darkblue',
  ] as const;

  for (let f = 0; f < 4; f++) {
    const count = floorNodeCounts[f];
    const elevY = floorElevations[f];

    for (let i = 0; i < count; i++) {
      const idxStr = i < 10 ? `0${i}` : `${i}`;
      const id = `KOW_F${f}_${idxStr}`;
      const nextIdx = (i + 1) % count;
      const nextId = `KOW_F${f}_${nextIdx < 10 ? `0${nextIdx}` : `${nextIdx}`}`;
      const numericId = (f * 12 + i) % 40;

      nodes[id] = {
        id,
        numericId: f * 12 + i,
        name:
          f === 0 && i === 0
            ? 'Kai Tak Border Gate'
            : f === 0 && i === 6
              ? 'Kowloon Detention Cell'
              : f === 0 && i === 11
                ? 'Secret Basement Black Market'
                : i === 4
                  ? `South Freight Elevator F${f}`
                  : i === 8 || (f === 3 && i === 6)
                    ? `North Dark Stairwell F${f}`
                    : `Kowloon F${f} Node ${i}`,
        shortName: `K${f}-${i}`,
        type:
          f === 0 && i === 0
            ? 'START'
            : f === 0 && i === 6
              ? 'DETENTION'
              : i === 4
                ? 'TRANSPORT' // South Elevator
                : i === 8 || (f === 3 && i === 6)
                  ? 'TRANSPORT' // North Stairs
                  : 'PROPERTY',
        zoneId: f === 0 && i === 11 ? 'ZONE_BLACK_MARKET' : `ZONE_F${f}`,
        floor: f,
        position3D: { x: (i % 4) * 3, y: elevY, z: Math.floor(i / 4) * 3 },
        connectedNodeIds: [nextId],
        isIntersection: false,
        isSecretZone: f === 0 && i === 11, // Concealed basement black market node
        isLocked: f === 0 && i === 11,
        hazardStatus: 'NONE',
        property: {
          basePrice: 100 + f * 50,
          baseRent: COFFIN_HOME_UPGRADES[0].baseRent,
          houseRent: COFFIN_HOME_UPGRADES.map(u => u.baseRent),
          upgradeCost: 40 + f * 15,
          maxLevel: 5,
          district: `Floor ${f}`,
          districtColor: floorDistrictColors[f] || 'district-brown',
        },
        gridPosition: { col: numericId % 11, row: Math.floor(numericId / 11) },
      };

      edges[`EDGE_${id}_${nextId}`] = {
        id: `EDGE_${id}_${nextId}`,
        fromNodeId: id,
        toNodeId: nextId,
        type: 'MAIN_LOOP',
        bidirectional: false,
      };
    }
  }

  // Vertical transitions: Paid South Elevator Shaft between F0, F1, F2, F3 ($50 Toll)
  const elevNodes = ['KOW_F0_04', 'KOW_F1_04', 'KOW_F2_04', 'KOW_F3_04'];
  for (let f = 0; f < 3; f++) {
    const from = elevNodes[f];
    const to = elevNodes[f + 1];

    nodes[from].connectedNodeIds.push(to);
    nodes[from].isIntersection = true;
    nodes[to].connectedNodeIds.push(from);
    nodes[to].isIntersection = true;

    edges[`ELEV_${from}_${to}`] = {
      id: `ELEV_${from}_${to}`,
      fromNodeId: from,
      toNodeId: to,
      type: 'VERTICAL_ELEVATOR',
      toll: { currency: 'CASH', amount: 50 },
      bidirectional: true,
      label: 'Thang Máy Nam ($50)',
    };
  }

  // Vertical transitions: Free North Stairwell between F0, F1, F2, F3 ($0 Toll)
  const stairNodes = ['KOW_F0_08', 'KOW_F1_08', 'KOW_F2_08', 'KOW_F3_06'];
  for (let f = 0; f < 3; f++) {
    const from = stairNodes[f];
    const to = stairNodes[f + 1];

    nodes[from].connectedNodeIds.push(to);
    nodes[from].isIntersection = true;
    nodes[to].connectedNodeIds.push(from);
    nodes[to].isIntersection = true;

    edges[`STAIR_${from}_${to}`] = {
      id: `STAIR_${from}_${to}`,
      fromNodeId: from,
      toNodeId: to,
      type: 'VERTICAL_STAIRS',
      toll: { currency: 'CASH', amount: 0 },
      bidirectional: true,
      label: 'Cầu Thang Bộ Bắc (Miễn phí)',
    };
  }

  // Skywalk Bridge connecting Floor 2 to Floor 3
  nodes['KOW_F2_10'].connectedNodeIds.push('KOW_F3_02');
  nodes['KOW_F2_10'].isIntersection = true;
  nodes['KOW_F3_02'].connectedNodeIds.push('KOW_F2_10');
  nodes['KOW_F3_02'].isIntersection = true;
  edges['SKYWALK_F2_F3'] = {
    id: 'SKYWALK_F2_F3',
    fromNodeId: 'KOW_F2_10',
    toNodeId: 'KOW_F3_02',
    type: 'SKYWALK',
    bidirectional: true,
    label: 'Cầu Vượt Tầng Thượng',
  };

  const zones: Record<string, ZoneDefinition> = {
    ZONE_F0: {
      id: 'ZONE_F0',
      name: 'Ground Level Drainage & Alleys',
      isLocked: false,
      initiallyLocked: false,
      floor: 0,
      nodeIds: Object.keys(nodes).filter(k => k.startsWith('KOW_F0_') && k !== 'KOW_F0_11'),
    },
    ZONE_F1: {
      id: 'ZONE_F1',
      name: 'Second Floor Workshops & Dwellings',
      isLocked: false,
      initiallyLocked: false,
      floor: 1,
      nodeIds: Object.keys(nodes).filter(k => k.startsWith('KOW_F1_')),
    },
    ZONE_F2: {
      id: 'ZONE_F2',
      name: 'Third Floor Coffin Hive',
      isLocked: false,
      initiallyLocked: false,
      floor: 2,
      nodeIds: Object.keys(nodes).filter(k => k.startsWith('KOW_F2_')),
    },
    ZONE_F3: {
      id: 'ZONE_F3',
      name: 'Rooftop Shanties & Coops',
      isLocked: false,
      initiallyLocked: false,
      floor: 3,
      nodeIds: Object.keys(nodes).filter(k => k.startsWith('KOW_F3_')),
    },
    ZONE_BLACK_MARKET: {
      id: 'ZONE_BLACK_MARKET',
      name: 'Secret Basement Black Market',
      isLocked: true,
      initiallyLocked: true,
      isSecretZone: true,
      floor: 0,
      unlockRequirement: {
        type: 'BUILDING_UPGRADE_COUNT',
        threshold: 6,
        descriptionVi: 'Mở khóa khi tổng số lần nâng cấp công trình đạt 6 hoặc bước sang pha Bất Ổn.',
      },
      nodeIds: ['KOW_F0_11'],
    },
  };

  return {
    mapId: KOWLOON_MAP_ID,
    mapName: 'Hong Kong — Kowloon Walled City',
    description: 'Chung Cư Cửu Long 4 tầng chồng chất với thang máy thu phí, cầu thang tối tăm và Nhà Quan Tài.',
    nodes,
    edges,
    startNodeId: 'KOW_F0_00',
    detentionNodeId: 'KOW_F0_06',
    floors: [
      {
        floorIndex: 0,
        name: 'Ground Floor',
        elevationY: 0.0,
        nodeIds: Object.keys(nodes).filter(k => k.startsWith('KOW_F0_')),
      },
      {
        floorIndex: 1,
        name: 'Second Floor',
        elevationY: 3.5,
        nodeIds: Object.keys(nodes).filter(k => k.startsWith('KOW_F1_')),
      },
      {
        floorIndex: 2,
        name: 'Third Floor',
        elevationY: 7.0,
        nodeIds: Object.keys(nodes).filter(k => k.startsWith('KOW_F2_')),
      },
      {
        floorIndex: 3,
        name: 'Rooftop',
        elevationY: 10.5,
        nodeIds: Object.keys(nodes).filter(k => k.startsWith('KOW_F3_')),
      },
    ],
    zones,
  };
}

/**
 * Marks all nodes on `burnedFloor` with `hazardStatus = 'FIRE'`, disabling rent collection
 * and signaling upward evacuation to the next floor.
 */
export function applyKowloonFireClearance(
  graph: SpatialBoardGraph,
  burnedFloor: number
): KowloonFireClearanceResult {
  const updatedGraph: SpatialBoardGraph = JSON.parse(JSON.stringify(graph));
  const affectedNodeIds: string[] = [];

  for (const [nodeId, node] of Object.entries(updatedGraph.nodes)) {
    if (node.floor === burnedFloor) {
      node.hazardStatus = 'FIRE';
      affectedNodeIds.push(nodeId);
    }
  }

  if (updatedGraph.floors) {
    updatedGraph.floors = updatedGraph.floors.map(f =>
      f.floorIndex === burnedFloor ? { ...f, isHazardAblaze: true } : f
    );
  }

  return {
    updatedGraph,
    evacuatedFloors: [burnedFloor],
    affectedNodeIds,
  };
}

/**
 * Evaluates and applies the late-game Upward Fire / Clearance Disaster on Kowloon Walled City
 * when advancing rounds in the Chaos phase (or rounds 18, 21, 24).
 */
export function advanceKowloonDisasterIfNeeded(state: GameState, newRound: number): GameState {
  if (!state.spatialGraph || state.spatialGraph.mapId !== KOWLOON_MAP_ID) {
    return state;
  }

  const isChaosPhase = state.chaosMeter?.phase === 'CHAOS';
  let floorToBurn: number | null = null;

  if (newRound === 18 || (isChaosPhase && newRound % 3 === 0)) {
    // Find lowest unburned floor < 3
    for (let f = 0; f < 3; f++) {
      const floorNodes = Object.values(state.spatialGraph.nodes).filter(n => n.floor === f);
      const alreadyBurned = floorNodes.length > 0 && floorNodes.every(n => n.hazardStatus === 'FIRE');
      if (!alreadyBurned) {
        if (f === 0 && (newRound >= 18 || isChaosPhase)) {
          floorToBurn = 0;
          break;
        }
        if (f === 1 && (newRound >= 21 || isChaosPhase)) {
          floorToBurn = 1;
          break;
        }
        if (f === 2 && (newRound >= 24 || isChaosPhase)) {
          floorToBurn = 2;
          break;
        }
      }
    }
  }

  if (floorToBurn === null) {
    return state;
  }

  const { updatedGraph } = applyKowloonFireClearance(state.spatialGraph, floorToBurn);
  const nextFloor = Math.min(3, floorToBurn + 1);
  const evacNodeId = `KOW_F${nextFloor}_00`;
  const evacNumericId = updatedGraph.nodes[evacNodeId]?.numericId ?? 0;

  let currentPlayers = [...state.players];
  let currentLedger = state.ledger || [];
  const evacuatedNames: string[] = [];

  for (const player of currentPlayers) {
    if (player.isBankrupt) continue;
    const pNodeId = player.positionNodeId || `KOW_F0_00`;
    const pFloor = updatedGraph.nodes[pNodeId]?.floor ?? 0;

    if (pFloor <= floorToBurn) {
      evacuatedNames.push(player.name);
      // Apply $100 emergency evacuation penalty via ledger if player has cash
      const penalty = Math.min(player.cash, 100);
      if (penalty > 0) {
        const res = executeLedgerTransaction(
          currentPlayers,
          {
            category: 'CHAOS_EFFECT',
            from: player.id,
            to: 'BANK',
            amount: penalty,
            roundNumber: newRound,
            memo: `Phí sơ tán khẩn cấp đám cháy Tầng ${floorToBurn}`,
          },
          currentLedger
        );
        if (res.success) {
          currentPlayers = res.newPlayers;
          if (res.entry) currentLedger = [...currentLedger, res.entry];
        }
      }

      currentPlayers = currentPlayers.map(p =>
        p.id === player.id
          ? {
              ...p,
              positionNodeId: evacNodeId,
              position: evacNumericId,
            }
          : p
      );
    }
  }

  const fireLog = {
    id: `kowloon-fire-f${floorToBurn}-${Date.now()}`,
    timestamp: Date.now(),
    message: `🔥 [CHÁY LỚN / GIẢI TỎA CỬU LONG] Tầng ${floorToBurn} chìm trong biển lửa! Toàn bộ ô đất Tầng ${floorToBurn} bị vô hiệu hóa${
      evacuatedNames.length > 0 ? `, sơ tán khẩn cấp (${evacuatedNames.join(', ')}) lên Tầng ${nextFloor}!` : '!'
    }`,
    type: 'CHAOS' as const,
  };

  return {
    ...state,
    spatialGraph: updatedGraph,
    players: currentPlayers,
    ledger: currentLedger,
    ledgerHistory: currentLedger,
    logs: [fireLog, ...state.logs],
  };
}
