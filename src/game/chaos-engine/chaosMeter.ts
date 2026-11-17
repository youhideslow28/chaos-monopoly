/**
 * src/game/chaos-engine/chaosMeter.ts
 * Continuous 0.0 to 100.0 Tension / Chaos Meter with Ratcheted Phase Floors.
 */

export type ChaosPhase = 'PEACEFUL' | 'INSTABILITY' | 'CHAOS';

export interface PatrolUnit {
  id: string;
  currentNodeId: string;
  destinationNodeId?: string;
  targetNodeId?: string;
  direction?: 'FORWARD' | 'REVERSE';
}

export interface ChaosMeterState {
  value: number; // 0.0 to 100.0
  phase: ChaosPhase;
  phaseFloor: number; // Ratchet floor: 0.0, 30.0, or 70.0
  patrolUnits: PatrolUnit[];
}

export const CHAOS_DELTAS = {
  DICE_ROLLED: 0.4,
  DICE_DOUBLES: 1.5,
  PROPERTY_PURCHASED: 1.0,
  PROPERTY_UPGRADED: 1.5,
  RENT_PAID_BASE: 0.2,
  RENT_PAID_HIGH_RATE: 0.5, // per $100M if >= $200M
  TRAP_TRIGGERED: 2.5,
  CHAOS_CARD_DRAWN: 3.0,
  AUCTION_STARTED: 1.5,
  PLAYER_BANKRUPTCY: 8.0,
  PASS_GO: -0.5,
  PAY_DETENTION_BAIL: -1.0,
} as const;

export function createInitialChaosMeter(): ChaosMeterState {
  return {
    value: 0.0,
    phase: 'PEACEFUL',
    phaseFloor: 0.0,
    patrolUnits: [],
  };
}

/**
 * Applies a positive or negative delta to the Chaos Meter.
 * Ratchets phase floors:
 * - 0.0% to 30.0%: PEACEFUL, floor 0.0
 * - 30.1% to 70.0%: INSTABILITY, floor ratchets to at least 30.0
 * - 70.1% to 100.0%: CHAOS, floor ratchets to at least 70.0
 * Once entered, the meter can never regress below its ratcheted floor.
 */
export function applyChaosDelta(
  meter: ChaosMeterState,
  delta: number,
  _roundNumber?: number
): { nextMeter: ChaosMeterState; transitionedPhase?: ChaosPhase } {
  const candidate = Math.round((meter.value + delta) * 100) / 100;
  const clampedValue = Math.min(100.0, Math.max(meter.phaseFloor, candidate));

  let nextPhase: ChaosPhase = meter.phase;
  let nextFloor = meter.phaseFloor;
  let transitionedPhase: ChaosPhase | undefined;

  if (nextFloor >= 70.0 || clampedValue > 70.0) {
    nextPhase = 'CHAOS';
    nextFloor = Math.max(nextFloor, 70.0);
    if (meter.phase !== 'CHAOS') {
      transitionedPhase = 'CHAOS';
    }
  } else if (nextFloor >= 30.0 || clampedValue > 30.0) {
    nextPhase = 'INSTABILITY';
    nextFloor = Math.max(nextFloor, 30.0);
    if (meter.phase === 'PEACEFUL') {
      transitionedPhase = 'INSTABILITY';
    }
  } else {
    nextPhase = 'PEACEFUL';
    nextFloor = 0.0;
  }

  const patrolUnits = [...(meter.patrolUnits || [])];
  if (transitionedPhase === 'INSTABILITY' && patrolUnits.length === 0) {
    patrolUnits.push({
      id: 'PATROL_01',
      currentNodeId: 'KOW_F1_04',
      destinationNodeId: 'KOW_F1_08',
      direction: 'FORWARD',
    });
  }

  const nextMeter: ChaosMeterState = {
    value: clampedValue,
    phase: nextPhase,
    phaseFloor: nextFloor,
    patrolUnits,
  };

  return { nextMeter, transitionedPhase };
}

/**
 * Rent volatility multipliers by Chaos phase and business category:
 * - PEACEFUL: 1.0
 * - INSTABILITY: Nightlife 1.2, Commercial 0.85, baseline 1.1
 * - CHAOS: Civic/Residential 1.5, Commercial 0.5, baseline 1.25
 */
export function getChaosPhaseRentMultiplier(phase: ChaosPhase, category?: string): number {
  switch (phase) {
    case 'PEACEFUL':
      return 1.0;
    case 'INSTABILITY':
      if (category === 'NIGHTLIFE') return 1.2;
      if (category === 'COMMERCIAL') return 0.85;
      return 1.1;
    case 'CHAOS':
      if (category === 'CIVIC' || category === 'RESIDENTIAL') return 1.5;
      if (category === 'COMMERCIAL') return 0.5;
      return 1.25;
    default:
      return 1.0;
  }
}
