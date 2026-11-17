import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionParticleManager } from '../particleFX';
import confetti from 'canvas-confetti';

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('ActionParticleManager (particleFX)', () => {
  let manager: ActionParticleManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ActionParticleManager(350);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers dual synchronized bursts on celebrateDiceDouble', () => {
    manager.celebrateDiceDouble({ x: 0.5, y: 0.6 });

    // Should call confetti twice (left and right synchronized burst)
    expect(confetti).toHaveBeenCalledTimes(2);

    const firstCall = vi.mocked(confetti).mock.calls[0][0];
    const secondCall = vi.mocked(confetti).mock.calls[1][0];

    expect(firstCall?.shapes).toEqual(['star', 'circle']);
    expect(secondCall?.shapes).toEqual(['star', 'circle']);
    expect(firstCall?.angle).toBe(65);
    expect(secondCall?.angle).toBe(115);
    expect(firstCall?.origin?.x).toBeLessThan(0.5);
    expect(secondCall?.origin?.x).toBeGreaterThan(0.5);
  });

  it('triggers radial emerald and gold burst on celebratePropertyPurchase', () => {
    manager.celebratePropertyPurchase('#3b82f6', { x: 0.5, y: 0.6 });

    expect(confetti).toHaveBeenCalledTimes(1);
    const call = vi.mocked(confetti).mock.calls[0][0];

    expect(call?.colors).toContain('#3b82f6');
    expect(call?.colors).toContain('#10b981');
    expect(call?.particleCount).toBeGreaterThanOrEqual(40);
    expect(call?.spread).toBe(85);
  });

  it('scales particle count and luxury colors with building upgrade level (Cottage -> Hotel)', () => {
    // Level 1: Cottage
    manager.celebrateBuildingUpgrade(1);
    expect(confetti).toHaveBeenCalledTimes(1);
    const level1Call = vi.mocked(confetti).mock.calls[0][0];
    expect(level1Call?.particleCount).toBe(32);
    expect(level1Call?.angle).toBe(90);

    // Reset throttle to test Level 5 Hotel
    manager.resetThrottle();
    vi.mocked(confetti).mockClear();

    manager.celebrateBuildingUpgrade(5);
    expect(confetti).toHaveBeenCalledTimes(1);
    const level5Call = vi.mocked(confetti).mock.calls[0][0];
    expect(level5Call?.particleCount).toBe(80);
    // Luxury hotel colors include crimson / gold
    expect(level5Call?.colors).toContain('#ef4444');
    expect(level5Call?.colors).toContain('#f59e0b');
  });

  it('triggers top-ribbon cascade on celebrateSalaryReward with golden hour enhancement', () => {
    manager.celebrateSalaryReward(false);
    expect(confetti).toHaveBeenCalledTimes(2); // Dual top corners cascade

    manager.resetThrottle();
    vi.mocked(confetti).mockClear();

    manager.celebrateSalaryReward(true);
    expect(confetti).toHaveBeenCalledTimes(2);
    const goldenCall = vi.mocked(confetti).mock.calls[0][0];
    expect(goldenCall?.colors).toContain('#ffd700');
    expect(goldenCall?.particleCount).toBeGreaterThan(30);
  });

  it('throttles rapid particle calls within minThrottleMs (350ms)', () => {
    manager.celebrateDiceDouble();
    expect(confetti).toHaveBeenCalledTimes(2);

    // Immediately trigger again without waiting
    manager.celebrateDiceDouble();
    // Should still be 2 because the second trigger was throttled
    expect(confetti).toHaveBeenCalledTimes(2);

    manager.celebratePropertyPurchase();
    expect(confetti).toHaveBeenCalledTimes(2);
  });

  it('respects prefers-reduced-motion media query by suppressing particles', () => {
    vi.spyOn(manager, 'isReducedMotion').mockReturnValue(true);

    manager.celebrateDiceDouble();
    manager.celebratePropertyPurchase();
    manager.celebrateBuildingUpgrade(5);
    manager.celebrateSalaryReward();

    expect(confetti).not.toHaveBeenCalled();
  });
});
