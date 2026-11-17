import { describe, it, expect } from 'vitest';
import { runBatchSimulations, SimulatedPlayerConfig } from '../ai/aiSimulationRunner';
import { AIPersonalityId } from '../types';

describe('Phase 03 — Independent Adversarial Review & Multi-Seed Balance Benchmark', () => {
  it('runs a 24-match tournament across 2P, 3P, and 4P matches covering all 6 personalities and 3 difficulty levels', () => {
    const personalities: AIPersonalityId[] = [
      'TYCOON',
      'STRATEGIST',
      'SHARK',
      'SURVIVOR',
      'CHAOTIC',
      'DIPLOMAT',
    ];

    const configs: {
      players: SimulatedPlayerConfig[];
      seed: number;
      maxRounds: number;
    }[] = [];

    // 1. 12 Four-Player Mixed Personality & Difficulty Matches (Seeds 1001..1012)
    for (let i = 0; i < 12; i++) {
      const p1 = personalities[i % 6];
      const p2 = personalities[(i + 1) % 6];
      const p3 = personalities[(i + 2) % 6];
      const p4 = personalities[(i + 3) % 6];

      configs.push({
        seed: 1001 + i * 37,
        maxRounds: 40,
        players: [
          { name: `AI-${p1}`, isAI: true, aiPersonality: p1, aiDifficulty: 'HARD' },
          { name: `AI-${p2}`, isAI: true, aiPersonality: p2, aiDifficulty: 'NORMAL' },
          { name: `AI-${p3}`, isAI: true, aiPersonality: p3, aiDifficulty: 'EASY' },
          { name: `AI-${p4}`, isAI: true, aiPersonality: p4, aiDifficulty: 'HARD' },
        ],
      });
    }

    // 2. 6 Three-Player Matches (Seeds 2001..2006)
    for (let i = 0; i < 6; i++) {
      const p1 = personalities[i % 6];
      const p2 = personalities[(i + 2) % 6];
      const p3 = personalities[(i + 4) % 6];

      configs.push({
        seed: 2001 + i * 53,
        maxRounds: 35,
        players: [
          { name: `AI-${p1}`, isAI: true, aiPersonality: p1, aiDifficulty: 'HARD' },
          { name: `AI-${p2}`, isAI: true, aiPersonality: p2, aiDifficulty: 'NORMAL' },
          { name: `AI-${p3}`, isAI: true, aiPersonality: p3, aiDifficulty: 'EASY' },
        ],
      });
    }

    // 3. 6 Two-Player Head-to-Head Difficulty & Personality Duels (Seeds 3001..3006)
    for (let i = 0; i < 6; i++) {
      const p1 = personalities[i % 6];
      const p2 = personalities[(i + 3) % 6];

      configs.push({
        seed: 3001 + i * 71,
        maxRounds: 35,
        players: [
          { name: `AI-${p1}-HARD`, isAI: true, aiPersonality: p1, aiDifficulty: 'HARD' },
          { name: `AI-${p2}-EASY`, isAI: true, aiPersonality: p2, aiDifficulty: 'EASY' },
        ],
      });
    }

    const stats = runBatchSimulations(configs);

    // Log empirical telemetry for TEST_REPORT.md & PROJECT_STATUS.md
    console.log('=== PHASE 03 EMPIRICAL SIMULATION TELEMETRY (24 MATCHES) ===');
    console.log(JSON.stringify(stats, null, 2));

    expect(stats.totalMatches).toBe(24);
    expect(stats.allLedgersValid).toBe(true);

    // Verify HARD difficulty maintains strong competitive viability (>20% win rate and positive net worth)
    expect(stats.winRateByDifficulty.HARD.winRate).toBeGreaterThanOrEqual(20);
    expect(stats.winRateByDifficulty.HARD.avgNetWorth).toBeGreaterThan(1000);

    // Verify every personality participated in the tournament
    for (const p of personalities) {
      expect(stats.winRateByPersonality[p].appearances).toBeGreaterThanOrEqual(8);
    }

    // Verify meaningful economic activity (acquisitions, auctions, upgrades, Chaos)
    expect(stats.averagePropertiesAcquired).toBeGreaterThan(8);
    expect(stats.averageChaosEvents).toBeGreaterThan(2);
  }, 30000);

  it('Phase 04 Section 15 Follow-Up: runs a seat-balanced 72-match Latin-square tournament to eliminate seat-order bias', () => {
    const personalities: AIPersonalityId[] = [
      'TYCOON',
      'STRATEGIST',
      'SHARK',
      'SURVIVOR',
      'CHAOTIC',
      'DIPLOMAT',
    ];

    const balancedConfigs: {
      players: SimulatedPlayerConfig[];
      seed: number;
      maxRounds: number;
    }[] = [];

    // Part A: 36 3-Player Difficulty Rotation Matches (HARD, NORMAL, EASY rotated through Seat 1, Seat 2, Seat 3)
    const diffPermutations: Array<['HARD' | 'NORMAL' | 'EASY', 'HARD' | 'NORMAL' | 'EASY', 'HARD' | 'NORMAL' | 'EASY']> = [
      ['HARD', 'NORMAL', 'EASY'],
      ['NORMAL', 'EASY', 'HARD'],
      ['EASY', 'HARD', 'NORMAL'],
    ];

    for (let i = 0; i < 36; i++) {
      const perm = diffPermutations[i % 3];
      const p1 = personalities[i % 6];
      const p2 = personalities[(i + 2) % 6];
      const p3 = personalities[(i + 4) % 6];

      balancedConfigs.push({
        seed: 5000 + i * 41,
        maxRounds: 35,
        players: [
          { name: `Seat1-${perm[0]}`, isAI: true, aiPersonality: p1, aiDifficulty: perm[0] },
          { name: `Seat2-${perm[1]}`, isAI: true, aiPersonality: p2, aiDifficulty: perm[1] },
          { name: `Seat3-${perm[2]}`, isAI: true, aiPersonality: p3, aiDifficulty: perm[2] },
        ],
      });
    }

    // Part B: 36 4-Player Personality Rotation Matches (All at NORMAL difficulty, rotating personalities across seats 1..4)
    for (let i = 0; i < 36; i++) {
      const p1 = personalities[i % 6];
      const p2 = personalities[(i + 1) % 6];
      const p3 = personalities[(i + 2) % 6];
      const p4 = personalities[(i + 3) % 6];

      balancedConfigs.push({
        seed: 8000 + i * 59,
        maxRounds: 35,
        players: [
          { name: `P1-${p1}`, isAI: true, aiPersonality: p1, aiDifficulty: 'NORMAL' },
          { name: `P2-${p2}`, isAI: true, aiPersonality: p2, aiDifficulty: 'NORMAL' },
          { name: `P3-${p3}`, isAI: true, aiPersonality: p3, aiDifficulty: 'NORMAL' },
          { name: `P4-${p4}`, isAI: true, aiPersonality: p4, aiDifficulty: 'NORMAL' },
        ],
      });
    }

    const balancedStats = runBatchSimulations(balancedConfigs);

    console.log('=== PHASE 04 SEAT-BALANCED 72-MATCH TOURNAMENT TELEMETRY ===');
    console.log(JSON.stringify(balancedStats, null, 2));

    expect(balancedStats.totalMatches).toBe(72);
    expect(balancedStats.allLedgersValid).toBe(true);
    // Verify HARD difficulty achieves stable competitive presence (>15% win rate and positive average net worth)
    expect(balancedStats.winRateByDifficulty.HARD.winRate).toBeGreaterThanOrEqual(15);
    expect(balancedStats.winRateByDifficulty.HARD.avgNetWorth).toBeGreaterThan(1000);
  }, 30000);
});
