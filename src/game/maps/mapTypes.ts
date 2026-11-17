/**
 * src/game/maps/mapTypes.ts
 *
 * Type definitions and data schema contracts for 3D Spatial Graph Maps
 * (Map 1: Hong Kong Kowloon Walled City + Maps 2-5 Schemas).
 */

import type { BoardNode, SpatialBoardGraph } from '../graph/spatialGraphTypes';
import type { ChaosPhase } from '../chaos-engine/chaosMeter';

export interface CoffinUpgradeTier {
  level: number;
  name: string;
  cost: number;
  baseRent: number;
}

export interface MapDisasterDefinition {
  name: string;
  triggerPhase: ChaosPhase;
  effectDescription: string;
  intervalRounds?: number;
}

export interface MapSchemaDefinition {
  mapId: string;
  mapName: string;
  nodeCount: number;
  floorsCount: number;
  uniqueMechanic: string;
  disasterDefinition: MapDisasterDefinition;
  sampleNodes: BoardNode[];
}

export interface KowloonFireClearanceResult {
  updatedGraph: SpatialBoardGraph;
  evacuatedFloors: number[];
  affectedNodeIds: string[];
}
