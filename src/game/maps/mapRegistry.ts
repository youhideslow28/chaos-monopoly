/**
 * src/game/maps/mapRegistry.ts
 *
 * Map Schemas & Registry for Maps 1–5:
 * - Map 1: Hong Kong — Kowloon Walled City (`hong-kong-kowloon`)
 * - Map 2: New York — Wall Street & Subway (`new-york-wall-street`)
 * - Map 3: Paris — Riot Square (`paris-riot-square`)
 * - Map 4: Africa — Mining & Outpost (`africa-mining-outpost`)
 * - Map 5: Japan — Shinjuku Night Alleys (`japan-shinjuku-alleys`)
 */

import type { BoardNode, GraphEdge, SpatialBoardGraph } from '../graph/spatialGraphTypes';
import { LEGACY_RING_GRAPH } from '../graph/legacyRingAdapter';
import { createKowloonWalledCityGraph, KOWLOON_MAP_ID } from './kowloonWalledCity';
import { MapSchemaDefinition } from './mapTypes';

export const MAP_SCHEMAS: Record<string, MapSchemaDefinition> = {
  'new-york-wall-street': {
    mapId: 'new-york-wall-street',
    mapName: 'New York — Wall Street & Subway',
    nodeCount: 40,
    floorsCount: 2,
    uniqueMechanic: 'Stock Co-Ownership and $3 Subway Express Transit',
    disasterDefinition: {
      name: 'Black Monday Market Crash',
      triggerPhase: 'CHAOS',
      effectDescription: 'All rents halved for 2 rounds; subway power outage cuts express transit',
    },
    sampleNodes: [
      {
        id: 'NY_SURFACE_00',
        name: 'Wall Street NYSE',
        shortName: 'NYSE',
        type: 'PROPERTY',
        zoneId: 'ZONE_FINANCIAL',
        floor: 0,
        position3D: { x: 0, y: 0, z: 0 },
        connectedNodeIds: ['NY_SURFACE_01', 'NY_SUBWAY_00'],
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: 'NONE',
      },
      {
        id: 'NY_SUBWAY_00',
        name: 'Broad Street Subway Station',
        shortName: 'MTA-B',
        type: 'TRANSPORT',
        zoneId: 'ZONE_SUBWAY',
        floor: -1,
        position3D: { x: 0, y: -3.5, z: 0 },
        connectedNodeIds: ['NY_SURFACE_00'],
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: 'NONE',
      },
    ],
  },
  'paris-riot-square': {
    mapId: 'paris-riot-square',
    mapName: 'Paris — Riot Square',
    nodeCount: 44,
    floorsCount: 1,
    uniqueMechanic: 'Crisis Economics: Peaceful luxury boom vs Riot business surge',
    disasterDefinition: {
      name: 'General Strike Flaming Barricades',
      triggerPhase: 'CHAOS',
      effectDescription: '2 radial boulevards barricaded, forcing detours and burning vehicles',
    },
    sampleNodes: [
      {
        id: 'PARIS_CENTRAL_00',
        name: 'Place de la Bastille',
        shortName: 'Bastille',
        type: 'START',
        zoneId: 'ZONE_CENTRAL',
        floor: 0,
        position3D: { x: 0, y: 0, z: 0 },
        connectedNodeIds: ['PARIS_BLVD_A0', 'PARIS_BLVD_B0'],
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: 'NONE',
      },
    ],
  },
  'africa-mining-outpost': {
    mapId: 'africa-mining-outpost',
    mapName: 'Africa — Mining & Outpost',
    nodeCount: 40,
    floorsCount: 3,
    uniqueMechanic: 'Commodity tokens (Copper/Cobalt) and Haul Ramp Ascent Tolls',
    disasterDefinition: {
      name: 'Roaming Sandstorm',
      triggerPhase: 'INSTABILITY',
      effectDescription: '8-node moving dust storm halving movement dice rolls and blinding radar',
    },
    sampleNodes: [
      {
        id: 'AFRICA_RIM_00',
        name: 'Outpost Trading Post',
        shortName: 'Post',
        type: 'PROPERTY',
        zoneId: 'ZONE_RIM',
        floor: 0,
        position3D: { x: 0, y: 0, z: 0 },
        connectedNodeIds: ['AFRICA_PIT_00'],
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: 'NONE',
      },
    ],
  },
  'japan-shinjuku-alleys': {
    mapId: 'japan-shinjuku-alleys',
    mapName: 'Japan — Shinjuku Night Alleys',
    nodeCount: 44,
    floorsCount: 2,
    uniqueMechanic: '3-Business Synergy Triad (Izakaya + Karaoke + Capsule Hotel = 3.0x rent)',
    disasterDefinition: {
      name: '00:00 Last Train Curfew',
      triggerPhase: 'CHAOS',
      effectDescription: 'Elevated JR Line shuts down; stranded players in alleys detained by curfew police',
    },
    sampleNodes: [
      {
        id: 'SHINJUKU_ALLEY_00',
        name: 'Omoide Yokocho',
        shortName: 'Yokocho',
        type: 'PROPERTY',
        zoneId: 'ZONE_ALLEY',
        floor: 0,
        position3D: { x: 0, y: 0, z: 0 },
        connectedNodeIds: ['SHINJUKU_ALLEY_01', 'SHINJUKU_RAIL_00'],
        isIntersection: true,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: 'NONE',
      },
    ],
  },
};

export function validateMapSchema(schema: MapSchemaDefinition): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!schema.mapId || typeof schema.mapId !== 'string') errors.push('Missing mapId');
  if (!schema.mapName || typeof schema.mapName !== 'string') errors.push('Missing mapName');
  if (schema.nodeCount <= 0) errors.push('Invalid nodeCount');
  if (schema.floorsCount <= 0) errors.push('Invalid floorsCount');
  if (!schema.uniqueMechanic) errors.push('Missing uniqueMechanic');
  if (!schema.disasterDefinition?.name) errors.push('Missing disasterDefinition');
  if (!schema.sampleNodes || schema.sampleNodes.length === 0) errors.push('Missing sampleNodes');

  return { isValid: errors.length === 0, errors };
}

/**
 * Generates a full playable SpatialBoardGraph from a Map 2–5 schema definition.
 */
export function buildGraphFromSchema(schema: MapSchemaDefinition): SpatialBoardGraph {
  const nodes: Record<string, BoardNode> = {};
  const edges: Record<string, GraphEdge> = {};

  const nodesPerFloor = Math.ceil(schema.nodeCount / schema.floorsCount);
  const floorList: SpatialBoardGraph['floors'] = [];

  for (let f = 0; f < schema.floorsCount; f++) {
    const floorIndex = schema.mapId === 'new-york-wall-street' && f === 1 ? -1 : f;
    const elevationY = floorIndex * 3.5;
    const count = f === schema.floorsCount - 1 ? schema.nodeCount - f * nodesPerFloor : nodesPerFloor;
    const floorNodeIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const idx = f * nodesPerFloor + i;
      const id = `${schema.mapId.toUpperCase().replace(/-/g, '_')}_F${f}_${i < 10 ? `0${i}` : i}`;
      const nextI = (i + 1) % count;
      const nextId = `${schema.mapId.toUpperCase().replace(/-/g, '_')}_F${f}_${nextI < 10 ? `0${nextI}` : nextI}`;
      floorNodeIds.push(id);

      nodes[id] = {
        id,
        numericId: idx % 40,
        name: idx === 0 ? schema.sampleNodes[0]?.name || `${schema.mapName} Start` : `${schema.mapName} F${floorIndex}-${i}`,
        shortName: `M${f}-${i}`,
        type: idx === 0 ? 'START' : idx === 6 ? 'DETENTION' : i % 5 === 4 ? 'TRANSPORT' : 'PROPERTY',
        zoneId: `ZONE_F${f}`,
        floor: floorIndex,
        position3D: { x: (i % 4) * 3, y: elevationY, z: Math.floor(i / 4) * 3 },
        connectedNodeIds: [nextId],
        isIntersection: false,
        isSecretZone: false,
        isLocked: false,
        hazardStatus: 'NONE',
        property: {
          basePrice: 120 + f * 40,
          baseRent: 25 + f * 15,
          houseRent: [25, 60, 150, 380, 850],
          upgradeCost: 60,
          maxLevel: 5,
          district: `Floor ${floorIndex}`,
          districtColor: 'district-cyber',
        },
      };

      edges[`EDGE_${id}_${nextId}`] = {
        id: `EDGE_${id}_${nextId}`,
        fromNodeId: id,
        toNodeId: nextId,
        type: 'MAIN_LOOP',
        bidirectional: false,
      };
    }

    floorList.push({
      floorIndex,
      name: `Floor ${floorIndex}`,
      elevationY,
      nodeIds: floorNodeIds,
    });
  }

  // Link adjacent floors via vertical connectors at index 4
  if (floorList.length > 1) {
    for (let f = 0; f < floorList.length - 1; f++) {
      const fromId = floorList[f].nodeIds[Math.min(4, floorList[f].nodeIds.length - 1)];
      const toId = floorList[f + 1].nodeIds[Math.min(4, floorList[f + 1].nodeIds.length - 1)];
      if (fromId && toId) {
        nodes[fromId].connectedNodeIds.push(toId);
        nodes[fromId].isIntersection = true;
        nodes[toId].connectedNodeIds.push(fromId);
        nodes[toId].isIntersection = true;
        edges[`VERT_${fromId}_${toId}`] = {
          id: `VERT_${fromId}_${toId}`,
          fromNodeId: fromId,
          toNodeId: toId,
          type: 'VERTICAL_STAIRS',
          toll: { currency: 'CASH', amount: 0 },
          bidirectional: true,
        };
      }
    }
  }

  const allNodeIds = Object.keys(nodes);
  return {
    mapId: schema.mapId,
    mapName: schema.mapName,
    description: schema.uniqueMechanic,
    nodes,
    edges,
    startNodeId: allNodeIds[0],
    detentionNodeId: allNodeIds[Math.min(6, allNodeIds.length - 1)],
    floors: floorList,
  };
}

/**
 * Resolves a 3D SpatialBoardGraph by mapId or worldId.
 */
export function getSpatialGraphForMapId(mapOrWorldId?: string): SpatialBoardGraph {
  if (!mapOrWorldId) return LEGACY_RING_GRAPH;
  if (mapOrWorldId === KOWLOON_MAP_ID) {
    return createKowloonWalledCityGraph();
  }
  const schema = MAP_SCHEMAS[mapOrWorldId];
  if (schema) {
    return buildGraphFromSchema(schema);
  }
  return LEGACY_RING_GRAPH;
}
