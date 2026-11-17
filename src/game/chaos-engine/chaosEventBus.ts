/**
 * src/game/chaos-engine/chaosEventBus.ts
 * Centralized Event Bus & Disaster Dispatcher for CHAOS MONOPOLY.
 */

import { GameState } from '../types';
import { ChaosMeterState, ChaosPhase, createInitialChaosMeter, applyChaosDelta, CHAOS_DELTAS } from './chaosMeter';
import { checkUnlockTriggers, unlockZone } from '../graph/urbanFogOfWarEngine';

export type GameEventType =
  | 'DICE_ROLLED'
  | 'DICE_DOUBLES'
  | 'PROPERTY_PURCHASED'
  | 'PROPERTY_UPGRADED'
  | 'RENT_PAID'
  | 'TRAP_TRIGGERED'
  | 'CHAOS_CARD_DRAWN'
  | 'AUCTION_STARTED'
  | 'PLAYER_BANKRUPTCY'
  | 'PASS_GO'
  | 'PAY_DETENTION_BAIL'
  | 'DISASTER_CLEARANCE';

export interface GameEvent {
  type: GameEventType;
  amount?: number;
  playerId?: string;
  nodeId?: string;
  payload?: any;
  timestamp?: number;
  roundNumber?: number;
}

export function computeDeltaForEvent(event: GameEvent): number {
  switch (event.type) {
    case 'DICE_ROLLED':
      return CHAOS_DELTAS.DICE_ROLLED; // +0.4%
    case 'DICE_DOUBLES':
      return CHAOS_DELTAS.DICE_DOUBLES; // +1.5%
    case 'PROPERTY_PURCHASED':
      return CHAOS_DELTAS.PROPERTY_PURCHASED; // +1.0%
    case 'PROPERTY_UPGRADED':
      return CHAOS_DELTAS.PROPERTY_UPGRADED; // +1.5%
    case 'RENT_PAID':
      if (event.amount !== undefined && event.amount >= 200) {
        return CHAOS_DELTAS.RENT_PAID_HIGH_RATE * Math.floor(event.amount / 100);
      }
      return CHAOS_DELTAS.RENT_PAID_BASE; // +0.2%
    case 'TRAP_TRIGGERED':
      return CHAOS_DELTAS.TRAP_TRIGGERED; // +2.5%
    case 'CHAOS_CARD_DRAWN':
      return CHAOS_DELTAS.CHAOS_CARD_DRAWN; // +3.0%
    case 'AUCTION_STARTED':
      return CHAOS_DELTAS.AUCTION_STARTED; // +1.5%
    case 'PLAYER_BANKRUPTCY':
      return CHAOS_DELTAS.PLAYER_BANKRUPTCY; // +8.0%
    case 'PASS_GO':
      return CHAOS_DELTAS.PASS_GO; // -0.5%
    case 'PAY_DETENTION_BAIL':
      return CHAOS_DELTAS.PAY_DETENTION_BAIL; // -1.0%
    default:
      return 0.0;
  }
}

/**
 * Decoupled Chaos Event Bus instance with disaster hook subscriptions.
 */
export class ChaosEventBus {
  private listeners: ((event: GameEvent, nextMeter: ChaosMeterState) => void)[] = [];
  private disasterHooks: Record<ChaosPhase, (() => void)[]> = {
    PEACEFUL: [],
    INSTABILITY: [],
    CHAOS: [],
  };

  public subscribe(listener: (event: GameEvent, nextMeter: ChaosMeterState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public onDisaster(phase: ChaosPhase, callback: () => void): () => void {
    this.disasterHooks[phase].push(callback);
    return () => {
      this.disasterHooks[phase] = this.disasterHooks[phase].filter(cb => cb !== callback);
    };
  }

  public dispatch(
    event: GameEvent,
    meter: ChaosMeterState
  ): { nextMeter: ChaosMeterState; triggeredDisasters: string[] } {
    const delta = computeDeltaForEvent(event);
    const { nextMeter, transitionedPhase } = applyChaosDelta(meter, delta);
    const triggeredDisasters: string[] = [];

    if (transitionedPhase && this.disasterHooks[transitionedPhase]) {
      for (const hook of this.disasterHooks[transitionedPhase]) {
        hook();
        triggeredDisasters.push(transitionedPhase);
      }
    }

    for (const listener of this.listeners) {
      listener(event, nextMeter);
    }

    return { nextMeter, triggeredDisasters };
  }
}

/**
 * Pure functional helper to update GameState with chaos meter progression
 * and handle phase transition disaster side-effects (Fog of War unlocks, logs, audio cues).
 */
export function processGameEvent(state: GameState, event: GameEvent): GameState {
  const currentMeter = state.chaosMeter || createInitialChaosMeter();
  const delta = computeDeltaForEvent(event);
  const { nextMeter, transitionedPhase } = applyChaosDelta(currentMeter, delta, state.roundNumber);

  let nextState: GameState = {
    ...state,
    chaosMeter: nextMeter,
  };

  if (transitionedPhase) {
    const phaseName =
      transitionedPhase === 'INSTABILITY' ? 'BẤT ỔN (INSTABILITY)' : 'HỖN LOẠN TỘT ĐỘ (CHAOS)';
    const logEntry = {
      id: `disaster-phase-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      message: `🚨 [BÁO ĐỘNG HỖN LOẠN] Chỉ số Hỗn Loạn đạt ${nextMeter.value}%! Trò chơi bước vào giai đoạn ${phaseName}!`,
      type: 'WARNING' as const,
    };
    nextState.logs = [logEntry, ...nextState.logs];
    nextState.lastSoundEffect = 'chaosWarning';

    // Check Urban Fog of War unlocks on phase transition
    if (nextState.spatialGraph && nextState.fogOfWarState) {
      const unlockRes = checkUnlockTriggers(nextState, nextState.spatialGraph, {
        triggerType: 'CHAOS_CHANGE',
        chaosPhase: transitionedPhase,
        chaosMeterValue: nextMeter.value,
      });

      if (unlockRes.shouldUnlock) {
        let currentGraph = nextState.spatialGraph;
        let currentFog = nextState.fogOfWarState;
        const newLogs = [...nextState.logs];

        for (const zoneId of unlockRes.zoneIdsToUnlock) {
          const reason = unlockRes.reasons[zoneId] || `Khai mở do Hỗn Loạn bước vào ${transitionedPhase}`;
          const res = unlockZone(currentGraph, zoneId, currentFog, nextState.roundNumber, reason);
          currentGraph = res.updatedGraph;
          currentFog = res.updatedFogState;

          newLogs.unshift({
            id: `unlock-${zoneId}-${Date.now()}`,
            timestamp: Date.now(),
            message: `🔓 [KHAI MỞ KHU VỰC] Khu vực bí mật [${res.unlockEvent.zoneName}] đã được khai mở! (${reason})`,
            type: 'CHAOS',
          });
        }

        nextState = {
          ...nextState,
          spatialGraph: currentGraph,
          fogOfWarState: currentFog,
          logs: newLogs,
        };
      }
    }
  }

  return nextState;
}
