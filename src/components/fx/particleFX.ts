/**
 * CHAOS MONOPOLY — Action Particle Manager
 * Centralized, hardware-accelerated particle effects engine wrapping `canvas-confetti`.
 *
 * Performance Safeguards:
 * - Strictly respects `prefers-reduced-motion: reduce`.
 * - Internal throttle (min 350ms between bursts) to prevent visual spam & GPU overload.
 * - Zero DOM tree thrashing: renders directly to a recycled canvas overlay.
 */

import confetti from 'canvas-confetti';

export interface ScreenOrigin {
  x: number;
  y: number;
}

export class ActionParticleManager {
  private lastBurstTime = 0;
  private readonly minThrottleMs: number;

  constructor(minThrottleMs = 350) {
    this.minThrottleMs = minThrottleMs;
  }

  /**
   * Returns true if user has enabled reduced motion preferences.
   */
  public isReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  /**
   * Check if a burst is permitted according to reduced-motion and throttle limits.
   */
  private shouldThrottle(): boolean {
    if (this.isReducedMotion()) {
      return true;
    }
    const now = Date.now();
    if (now - this.lastBurstTime < this.minThrottleMs) {
      return true;
    }
    this.lastBurstTime = now;
    return false;
  }

  /**
   * Safely invoke canvas-confetti, catching any canvas errors or unsupported environments.
   */
  private fireConfetti(options: confetti.Options): void {
    if (typeof confetti !== 'function') return;
    try {
      confetti({
        disableForReducedMotion: true,
        zIndex: 60,
        ...options,
      });
    } catch {
      // Graceful fallback if canvas is unavailable
    }
  }

  /**
   * Dual synchronized bursts of amber/gold stars and circles on dice doubles.
   */
  public celebrateDiceDouble(screenOrigin?: ScreenOrigin): void {
    if (this.shouldThrottle()) return;

    const baseOrigin = screenOrigin ?? { x: 0.5, y: 0.58 };
    const amberPalette = ['#f59e0b', '#fbbf24', '#d97706', '#fef08a', '#ffffff'];

    // Left synchronized burst
    this.fireConfetti({
      particleCount: 30,
      angle: 65,
      spread: 60,
      startVelocity: 35,
      origin: {
        x: Math.max(0.1, baseOrigin.x - 0.08),
        y: baseOrigin.y,
      },
      colors: amberPalette,
      shapes: ['star', 'circle'],
      scalar: 1.1,
      ticks: 180,
    });

    // Right synchronized burst
    this.fireConfetti({
      particleCount: 30,
      angle: 115,
      spread: 60,
      startVelocity: 35,
      origin: {
        x: Math.min(0.9, baseOrigin.x + 0.08),
        y: baseOrigin.y,
      },
      colors: amberPalette,
      shapes: ['star', 'circle'],
      scalar: 1.1,
      ticks: 180,
    });
  }

  /**
   * Radial emerald and gold burst when purchasing property.
   */
  public celebratePropertyPurchase(colorHex?: string, screenOrigin?: ScreenOrigin): void {
    if (this.shouldThrottle()) return;

    const origin = screenOrigin ?? { x: 0.5, y: 0.65 };
    const propertyColors = [
      colorHex || '#10b981',
      '#10b981',
      '#059669',
      '#34d399',
      '#f59e0b',
      '#fbbf24',
    ];

    this.fireConfetti({
      particleCount: 45,
      spread: 85,
      startVelocity: 32,
      origin,
      colors: propertyColors,
      shapes: ['circle', 'square'],
      scalar: 1.05,
      ticks: 200,
      gravity: 0.9,
    });
  }

  /**
   * Ascending fountain of star particles scaling with upgrade level (Cottage -> Hotel).
   * Level 1 (Cottage): 25 particles
   * Level 5 (Hotel): 80 particles with golden/crimson luxury highlights
   */
  public celebrateBuildingUpgrade(level: number, screenOrigin?: ScreenOrigin): void {
    if (this.shouldThrottle()) return;

    const clampedLevel = Math.max(1, Math.min(5, Math.round(level)));
    const particleCount = 20 + clampedLevel * 12; // 32 to 80 particles
    const origin = screenOrigin ?? { x: 0.5, y: 0.7 };

    const isHotel = clampedLevel >= 5;
    const upgradeColors = isHotel
      ? ['#ef4444', '#f59e0b', '#fbbf24', '#fef08a', '#ffffff', '#e11d48']
      : ['#f59e0b', '#fbbf24', '#10b981', '#34d399', '#ffffff'];

    this.fireConfetti({
      particleCount,
      angle: 90,
      spread: 50 + clampedLevel * 4,
      startVelocity: 36 + clampedLevel * 3,
      origin,
      colors: upgradeColors,
      shapes: ['star', 'circle'],
      scalar: 1.0 + clampedLevel * 0.08,
      ticks: 220,
      gravity: 0.85,
    });
  }

  /**
   * Celebratory dollar-green & gold confetti cascade on passing GO / receiving salary.
   */
  public celebrateSalaryReward(isGoldenHour = false): void {
    if (this.shouldThrottle()) return;

    const salaryColors = isGoldenHour
      ? ['#fbbf24', '#f59e0b', '#fef08a', '#10b981', '#34d399', '#ffd700']
      : ['#10b981', '#059669', '#34d399', '#6ee7b7', '#f59e0b', '#fbbf24'];

    const count = isGoldenHour ? 70 : 45;

    // Dual cascade originating from top corners
    this.fireConfetti({
      particleCount: Math.round(count / 2),
      angle: 60,
      spread: 55,
      startVelocity: 28,
      origin: { x: 0.25, y: 0.15 },
      colors: salaryColors,
      shapes: ['circle', 'square'],
      ticks: 240,
      gravity: 0.75,
      drift: 0.2,
    });

    this.fireConfetti({
      particleCount: Math.round(count / 2),
      angle: 120,
      spread: 55,
      startVelocity: 28,
      origin: { x: 0.75, y: 0.15 },
      colors: salaryColors,
      shapes: ['circle', 'square'],
      ticks: 240,
      gravity: 0.75,
      drift: -0.2,
    });
  }

  /**
   * Calamity/Chaos event celebratory burst.
   */
  public celebrateChaosEvent(rarity = 'NORMAL'): void {
    if (this.shouldThrottle()) return;

    const isLegendary = rarity === 'LEGENDARY' || rarity === 'CALAMITY';
    const chaosColors = isLegendary
      ? ['#ef4444', '#f43f5e', '#8b5cf6', '#a855f7', '#fbbf24']
      : ['#06b6d4', '#3b82f6', '#10b981', '#fbbf24'];

    this.fireConfetti({
      particleCount: isLegendary ? 65 : 40,
      spread: 100,
      startVelocity: 38,
      origin: { x: 0.5, y: 0.5 },
      colors: chaosColors,
      shapes: ['star', 'circle'],
      ticks: 200,
    });
  }

  /**
   * Reset throttle timer (useful in unit testing).
   */
  public resetThrottle(): void {
    this.lastBurstTime = 0;
  }
}

// Export singleton instance as default & named
export const particleFX = new ActionParticleManager();
export default particleFX;
