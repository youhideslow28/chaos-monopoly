/**
 * Urban Fog of War Engine
 * Dynamic zone locking, trigger evaluation, and revelation system.
 */

import { GameState } from '../types';
import {
  SpatialBoardGraph,
  ZoneDefinition,
  ZoneUnlockRequirement,
} from './spatialGraphTypes';

export interface ZoneUnlockEvent {
  zoneId: string;
  zoneName: string;
  triggeredBy: string;      // Human-readable trigger explanation
  roundNumber: number;
  timestamp: number;
  unlockedNodeIds: string[];
}

export interface FogOfWarState {
  unlockedZones: Record<string, boolean>; // zoneId -> isUnlocked
  unlockedNodes: Record<string, boolean>; // nodeId -> isUnlocked
  unlockHistory: ZoneUnlockEvent[];
}

export interface TriggerContext {
  triggerType: 'UPGRADE' | 'ROUND_ADVANCE' | 'CHAOS_CHANGE' | 'EVENT' | 'MANUAL';
  chaosMeterValue?: number;
  chaosPhase?: 'PEACEFUL' | 'INSTABILITY' | 'CHAOS';
  eventId?: string;
  upgradedTileId?: number | string;
  newLevel?: number;
}

/**
 * Initializes Fog of War state from the spatial board graph.
 * If the graph has no defined zones (e.g., legacy ring graph),
 * all nodes and zones default to unlocked.
 */
export function createInitialFogOfWarState(graph: SpatialBoardGraph): FogOfWarState {
  const unlockedZones: Record<string, boolean> = {};
  const unlockedNodes: Record<string, boolean> = {};

  // 1. Process defined zones if any
  if (graph.zones) {
    for (const [zoneId, zone] of Object.entries(graph.zones)) {
      const isLocked = Boolean(zone.initiallyLocked ?? zone.isLocked ?? zone.isSecretZone ?? zone.isSecret);
      unlockedZones[zoneId] = !isLocked;

      for (const nodeId of zone.nodeIds) {
        unlockedNodes[nodeId] = !isLocked;
      }
    }
  }

  // 2. Process all nodes in graph
  for (const [nodeId, node] of Object.entries(graph.nodes)) {
    if (unlockedNodes[nodeId] === undefined) {
      unlockedNodes[nodeId] = !node.isSecretZone && !node.isLocked;
    }
  }

  return {
    unlockedZones,
    unlockedNodes,
    unlockHistory: [],
  };
}

/**
 * Evaluates all locked zones against current game state and trigger conditions.
 * Supports building upgrade thresholds, chaos phases, round milestones, and landmarks.
 */
export function checkUnlockTriggers(
  state: GameState,
  graph: SpatialBoardGraph,
  triggerContext?: TriggerContext
): { shouldUnlock: boolean; zoneIdsToUnlock: string[]; reasons: Record<string, string> } {
  if (!graph.zones) {
    return { shouldUnlock: false, zoneIdsToUnlock: [], reasons: {} };
  }

  const fogState = state.fogOfWarState;
  const zoneIdsToUnlock: string[] = [];
  const reasons: Record<string, string> = {};

  // Calculate current building upgrade metrics
  const totalUpgrades = Object.values(state.properties || {}).reduce(
    (sum, p) => sum + (p.level || 0),
    0
  );
  const hasLandmark = Object.values(state.properties || {}).some(
    p => (p.level || 0) >= 5
  );

  for (const [zoneId, zone] of Object.entries(graph.zones)) {
    // Skip if already unlocked in Fog of War state
    if (fogState && fogState.unlockedZones[zoneId]) {
      continue;
    }

    // Combine unlockRequirement and unlockTriggers array
    const triggers: ZoneUnlockRequirement[] = [];
    if (zone.unlockRequirement) {
      triggers.push(zone.unlockRequirement);
    }
    if (zone.unlockTriggers && Array.isArray(zone.unlockTriggers)) {
      triggers.push(...zone.unlockTriggers);
    }

    for (const trigger of triggers) {
      let matched = false;
      let reasonText = '';

      switch (trigger.type) {
        case 'BUILDING_UPGRADE_COUNT': {
          const threshold = trigger.threshold ?? 5;
          if (totalUpgrades >= threshold) {
            matched = true;
            reasonText = `Tổng cấp công trình toàn bàn cờ đạt ${totalUpgrades}/${threshold}`;
          }
          break;
        }

        case 'BUILDING_UPGRADE': {
          if (trigger.targetPropertyId) {
            // Check specific property upgrade level
            const prop = Object.entries(state.properties || {}).find(
              ([id]) => id === trigger.targetPropertyId || `tile-${id}` === trigger.targetPropertyId
            );
            const level = prop ? prop[1].level : 0;
            const threshold = trigger.threshold ?? 3;
            if (level >= threshold) {
              matched = true;
              reasonText = `Bất động sản [${trigger.targetPropertyId}] đã nâng cấp lên cấp ${level}`;
            }
          } else {
            const threshold = trigger.threshold ?? 5;
            if (totalUpgrades >= threshold) {
              matched = true;
              reasonText = `Tổng nâng cấp công trình đạt ${totalUpgrades}`;
            }
          }
          break;
        }

        case 'LANDMARK_BUILT': {
          if (hasLandmark) {
            matched = true;
            reasonText = `Đại Công Trình Landmark 5★ đầu tiên đã được hoàn thành`;
          }
          break;
        }

        case 'ROUND_NUMBER':
        case 'ROUND_THRESHOLD': {
          const targetRound = trigger.threshold ?? 5;
          if (state.roundNumber >= targetRound) {
            matched = true;
            reasonText = `Vòng đấu đã tiến tới Vòng ${state.roundNumber}`;
          }
          break;
        }

        case 'CHAOS_PHASE': {
          const currentPhase = triggerContext?.chaosPhase;
          if (currentPhase && trigger.chaosPhase && currentPhase === trigger.chaosPhase) {
            matched = true;
            reasonText = `Chỉ số Hỗn Loạn chuyển sang giai đoạn [${trigger.chaosPhase}]`;
          }
          break;
        }

        case 'CHAOS_EVENT': {
          const activeEventId = triggerContext?.eventId || state.activeChaosCard?.id;
          if (activeEventId && trigger.eventId && activeEventId === trigger.eventId) {
            matched = true;
            reasonText = `Sự kiện Hỗn Loạn kích hoạt: [${trigger.eventId}]`;
          }
          break;
        }

        case 'MANUAL': {
          if (triggerContext?.triggerType === 'MANUAL') {
            matched = true;
            reasonText = trigger.descriptionVi || 'Mở khóa đặc biệt theo lệnh điều khiển';
          }
          break;
        }
      }

      if (matched) {
        zoneIdsToUnlock.push(zoneId);
        reasons[zoneId] = reasonText;
        break; // Evaluated this zone successfully
      }
    }
  }

  return {
    shouldUnlock: zoneIdsToUnlock.length > 0,
    zoneIdsToUnlock,
    reasons,
  };
}

/**
 * Immutably unlocks a zone by updating isLocked: false on all its nodes
 * and generating an unlock notification event.
 */
export function unlockZone(
  graph: SpatialBoardGraph,
  zoneId: string,
  fogState: FogOfWarState,
  roundNumber: number = 1,
  reason?: string
): { updatedGraph: SpatialBoardGraph; updatedFogState: FogOfWarState; unlockEvent: ZoneUnlockEvent } {
  const zone = graph.zones?.[zoneId];
  const affectedNodeIds = zone?.nodeIds || [];

  // 1. Immutable clone of graph nodes
  const updatedNodes = { ...graph.nodes };
  for (const nodeId of affectedNodeIds) {
    if (updatedNodes[nodeId]) {
      updatedNodes[nodeId] = {
        ...updatedNodes[nodeId],
        isLocked: false,
        isSecretZone: false,
      };
    }
  }

  // 2. Immutable clone of graph zones
  const updatedZones = graph.zones ? { ...graph.zones } : {};
  if (updatedZones[zoneId]) {
    updatedZones[zoneId] = {
      ...updatedZones[zoneId],
      isLocked: false,
      initiallyLocked: false,
      isSecret: false,
      isSecretZone: false,
    };
  }

  const updatedGraph: SpatialBoardGraph = {
    ...graph,
    nodes: updatedNodes,
    zones: updatedZones,
  };

  // 3. Immutable clone of FogOfWarState
  const updatedUnlockedZones = {
    ...fogState.unlockedZones,
    [zoneId]: true,
  };

  const updatedUnlockedNodes = {
    ...fogState.unlockedNodes,
  };
  for (const nodeId of affectedNodeIds) {
    updatedUnlockedNodes[nodeId] = true;
  }

  const unlockEvent: ZoneUnlockEvent = {
    zoneId,
    zoneName: zone?.name || zoneId,
    triggeredBy: reason || 'Khu vực bí mật đã được vén màn sương mù!',
    roundNumber,
    timestamp: Date.now(),
    unlockedNodeIds: affectedNodeIds,
  };

  const updatedFogState: FogOfWarState = {
    unlockedZones: updatedUnlockedZones,
    unlockedNodes: updatedUnlockedNodes,
    unlockHistory: [...fogState.unlockHistory, unlockEvent],
  };

  return { updatedGraph, updatedFogState, unlockEvent };
}

/**
 * Returns true if the node is unlocked and traversable.
 */
export function isNodeTraversable(
  graph: SpatialBoardGraph,
  nodeId: string,
  fogState?: FogOfWarState
): boolean {
  const node = graph.nodes[nodeId];
  if (!node) return false;
  if (node.isLocked) return false;
  if (node.hazardStatus === 'COLLAPSED') return false;
  if (fogState && fogState.unlockedNodes[nodeId] === false) return false;
  return true;
}

/**
 * Returns all currently locked/shrouded zones for Three.js volumetric fog rendering.
 */
export function getFogShroudedZones(
  graph: SpatialBoardGraph,
  fogState: FogOfWarState
): ZoneDefinition[] {
  if (!graph.zones) return [];
  return Object.values(graph.zones).filter(z => !fogState.unlockedZones[z.id]);
}

/**
 * Pure graph-level zone unlock evaluator for standalone E2E & unit tests.
 */
export function evaluateZoneUnlocks(
  graph: SpatialBoardGraph,
  trigger: {
    type: 'UPGRADE' | 'CHAOS_PHASE' | 'ROUND_COUNT' | 'EVENT';
    value: number | string;
  }
): { unlockedZoneIds: string[]; updatedGraph: SpatialBoardGraph } {
  const updatedGraph: SpatialBoardGraph = JSON.parse(JSON.stringify(graph));
  const unlockedZoneIds: string[] = [];

  if (updatedGraph.zones) {
    for (const [zoneId, zone] of Object.entries(updatedGraph.zones)) {
      if (!zone.isLocked) continue;

      let shouldUnlock = false;
      if (trigger.type === 'UPGRADE' && typeof trigger.value === 'number' && trigger.value >= 6) {
        shouldUnlock = true;
      } else if (
        trigger.type === 'CHAOS_PHASE' &&
        (trigger.value === 'INSTABILITY' || trigger.value === 'CHAOS')
      ) {
        shouldUnlock = true;
      } else if (trigger.type === 'ROUND_COUNT' && typeof trigger.value === 'number' && trigger.value >= 15) {
        shouldUnlock = true;
      } else if (trigger.type === 'EVENT' && trigger.value === 'BLACK_MARKET_OPEN') {
        shouldUnlock = true;
      }

      if (shouldUnlock) {
        zone.isLocked = false;
        unlockedZoneIds.push(zoneId);
        for (const nodeId of zone.nodeIds) {
          if (updatedGraph.nodes[nodeId]) {
            updatedGraph.nodes[nodeId].isLocked = false;
            updatedGraph.nodes[nodeId].isSecretZone = false;
          }
        }
      }
    }
  }

  return { unlockedZoneIds, updatedGraph };
}
