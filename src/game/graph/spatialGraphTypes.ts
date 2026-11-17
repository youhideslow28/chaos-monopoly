/**
 * 3D Spatial Graph Types & Interfaces
 * Pure serializable graph architecture for CHAOS MONOPOLY board layouts.
 */

import { TileType, PropertyData } from '../types';

/**
 * 3D spatial coordinate in world units.
 * Adheres to Three.js world space:
 * - x: Horizontal axis (-10.0 to +10.0)
 * - y: Elevation / floor height (0.0 = Ground, 3.5 = Floor 1, 7.0 = Floor 2, 10.5 = Floor 3)
 * - z: Depth axis (-10.0 to +10.0)
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Edge classification governing transit behavior and movement costs.
 */
export type EdgeType =
  | 'MAIN_LOOP'          // Standard perimeter/arterial loop
  | 'BRANCH'             // Secondary branching pathways (alleys, markets)
  | 'VERTICAL_ELEVATOR'  // Paid fast vertical transit between floors ($50 toll)
  | 'VERTICAL_STAIRS'    // Free pedestrian stairwells between adjacent floors (1 step)
  | 'SKYWALK'            // Elevated pedestrian bridge between upper buildings
  | 'ONE_WAY';           // Strict unidirectional corridor (cannot be reversed)

/**
 * Directed connection between two board nodes.
 */
export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: EdgeType;
  toll?: {
    currency: 'CASH';
    amount: number;
  };
  bidirectional?: boolean;
  stepCost?: number; // Default 1
  label?: string;
}

/**
 * Architectural zoning categories for Urban Fog of War.
 */
export type ZoneType =
  | 'MAIN_DISTRICT'
  | 'MAIN_STREET'
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'INDUSTRIAL'
  | 'BASEMENT'
  | 'BLACK_MARKET'
  | 'ROOFTOP'
  | 'VIP_ROOFTOP'
  | 'SUBWAY'
  | 'SUBWAY_TRANSIT'
  | 'SECRET_ALLEY'
  | 'SPECIAL';

export type ZoneUnlockTriggerType =
  | 'BUILDING_UPGRADE'        // Target property reached upgrade threshold
  | 'BUILDING_UPGRADE_COUNT'  // Total upgrades across map reach threshold
  | 'LANDMARK_BUILT'          // Any property upgraded to level 5 (Landmark)
  | 'CHAOS_PHASE'             // Chaos meter reached Instability or Chaos
  | 'CHAOS_EVENT'             // Specific chaos card/event occurred
  | 'ROUND_NUMBER'            // Match reached round N
  | 'ROUND_THRESHOLD'         // Alias for ROUND_NUMBER
  | 'MANUAL';                 // Explicitly unlocked via UNLOCK_ZONE action

export interface ZoneUnlockRequirement {
  type: ZoneUnlockTriggerType;
  threshold?: number;
  targetDistrict?: string;
  targetPropertyId?: string;
  chaosPhase?: 'PEACEFUL' | 'INSTABILITY' | 'CHAOS';
  eventId?: string;
  descriptionVi?: string;
  descriptionEn?: string;
}

export interface ZoneDefinition {
  id: string;
  name: string;
  type?: ZoneType;
  zoneType?: ZoneType;
  floor?: number;
  isSecret?: boolean;
  isSecretZone?: boolean;
  isLocked?: boolean;
  initiallyLocked?: boolean;
  unlockRequirement?: ZoneUnlockRequirement;
  unlockTriggers?: ZoneUnlockRequirement[];
  nodeIds: string[];
  descriptionVi?: string;
  descriptionEn?: string;
}

export type HazardStatus = 'NONE' | 'FIRE' | 'POLICE_BARRICADE' | 'COLLAPSED';

export type BusinessCategory =
  | 'NIGHTLIFE'
  | 'COMMERCIAL'
  | 'CIVIC'
  | 'RESIDENTIAL'
  | 'FINANCE';

export interface CurrentBusiness {
  id: string;
  businessId: string;
  name: string;
  category: BusinessCategory;
  tier: number; // 1 to 5
  baseRentMultiplier?: number;
  synergyTags: string[];
  ownerPlayerId?: string;
}

/**
 * Fundamental board tile entity in the 3D Spatial Graph.
 */
export interface BoardNode {
  id: string;
  numericId?: number; // 0..39 alias for 100% backward compatibility
  name: string;
  shortName: string;
  type: TileType;
  zoneId: string;
  floor: number;
  position3D: Position3D;
  connectedNodeIds: string[];
  isIntersection: boolean;
  isSecretZone: boolean;
  isLocked: boolean;
  property?: PropertyData;
  currentBusiness?: CurrentBusiness;
  hazardStatus?: HazardStatus;
  description?: string;
  iconName?: string;
  taxAmount?: number;
  gridPosition?: { col: number; row: number };
}

export interface FloorDefinition {
  floorIndex: number;
  name: string;
  elevationY: number; // 0.0, 3.5, 7.0, 10.5
  nodeIds: string[];
  colorTheme?: string;
  isHazardAblaze?: boolean;
}

/**
 * Complete serializable level graph.
 */
export interface SpatialBoardGraph {
  mapId: string;
  mapName: string;
  description?: string;
  nodes: Record<string, BoardNode>;
  edges: Record<string, GraphEdge>;
  startNodeId: string;
  detentionNodeId: string;
  floors: FloorDefinition[];
  zones?: Record<string, ZoneDefinition>;
}

export interface BranchCandidate {
  targetNode: BoardNode;
  edge: GraphEdge;
  tollAmount: number;
  canAffordToll: boolean;
}

export interface TraversalStepResult {
  nextNodeId: string;
  tollPaid: number;
  edgeTraversed: GraphEdge;
  isBranchDecisionNeeded: boolean;
  candidateNodeIds: string[];
}

export interface PathFindingResult {
  path: string[];
  totalDistance: number;
  totalTolls: number;
  edges: GraphEdge[];
}
