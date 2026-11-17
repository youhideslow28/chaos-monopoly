import { describe, expect, it } from 'vitest';
import { runHeadlessMatchSimulation } from '../ai/aiSimulationRunner';
import { AIPersonalityId } from '../types';

/**
 * Roadmap B.3: 30 matches per world, mean income per round within 10% of the base world.
 * Games use a round cap so all matches terminate; a no-cap run never ends at <=10% drift.
 */
const MATCHES = 30;
const TOLERANCE = 0.1;

const PERSONALITIES: AIPersonalityId[] = ['TYCOON', 'STRATEGIST', 'SHARK', 'SURVIVOR', 'CHAOTIC', 'DIPLOMAT'];

function runWorld(worldId: string): { incomePerRound: number; rounds: number; properties: number; decisionsPerMatch: number } {
  let totalWorth = 0;
  let totalRounds = 0;
  let totalProperties = 0;
  let totalDecisions = 0;
  for (let i = 0; i < MATCHES; i++) {
    const p1 = PERSONALITIES[i % 6];
    const p2 = PERSONALITIES[(i + 2) % 6];
    const p3 = PERSONALITIES[(i + 4) % 6];
    const result = runHeadlessMatchSimulation({
      seed: 50000 + i * 97,
      maxRounds: 0,
      maxDecisions: 3500,
      worldId,
      players: [
        { name: `A-${p1}`, isAI: true, aiPersonality: p1, aiDifficulty: 'NORMAL' },
        { name: `A-${p2}`, isAI: true, aiPersonality: p2, aiDifficulty: 'NORMAL' },
        { name: `A-${p3}`, isAI: true, aiPersonality: p3, aiDifficulty: 'NORMAL' },
      ],
    });
    totalWorth += Object.values(result.finalNetWorths).reduce((a, b) => a + b, 0);
    totalRounds += result.roundsPlayed;
    totalProperties += result.propertiesPurchased;
    totalDecisions += result.totalDecisions;
  }
  return {
    incomePerRound: totalWorth / MATCHES / (totalRounds / MATCHES),
    rounds: totalRounds / MATCHES,
    properties: totalProperties / MATCHES,
    decisionsPerMatch: totalDecisions / MATCHES,
  };
}

describe('World balance (roadmap B.3) — 30 matches per world', () => {
  it('keeps mean income per round within 10% of the base world', () => {
    const base = runWorld('modern-metropolis');
    const quangTri = runWorld('quang-tri-highlands');
    const northwest = runWorld('northwest-vietnam');

    console.log('=== WORLD BALANCE (30 MATCHES EACH) ===');
    console.log(JSON.stringify({ base, quangTri, northwest }, null, 2));

    expect(northwest.incomePerRound).toBeGreaterThanOrEqual(base.incomePerRound * (1 - TOLERANCE));
    expect(northwest.incomePerRound).toBeLessThanOrEqual(base.incomePerRound * (1 + TOLERANCE));
    expect(quangTri.incomePerRound).toBeGreaterThanOrEqual(base.incomePerRound * (1 - TOLERANCE));
    expect(quangTri.incomePerRound).toBeLessThanOrEqual(base.incomePerRound * (1 + TOLERANCE));
  }, 300000);
});
