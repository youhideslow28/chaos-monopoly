import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetShakeForTests,
  __setShakeClock,
  isShakeEnabled,
  setShakeEnabled,
  shake,
  SHAKE_AMPLITUDE,
  SHAKE_DURATION_MS,
  ShakeOffset,
  subscribeShake,
} from '../fx/screenShake';

/**
 * The project's test environment is `node`, so a minimal `window` is installed here
 * instead of pulling in a DOM implementation.
 */
function installFakeWindow(matchesReduceMotion: boolean): () => void {
  const holder = globalThis as unknown as { window?: unknown };
  const original = holder.window;
  holder.window = {
    matchMedia: (query: string) => ({ matches: matchesReduceMotion && query.includes('reduce') }),
    localStorage: undefined,
  };
  return () => {
    holder.window = original;
  };
}

/** Deterministic animation clock: frames run only when the test pumps them. */
function makeClock() {
  let pending: ((t: number) => void) | null = null;
  return {
    clock: {
      request: (cb: (t: number) => void) => {
        pending = cb;
        return 1;
      },
      cancel: () => {
        pending = null;
      },
    },
    pump: (timestamp: number) => {
      const cb = pending;
      pending = null;
      cb?.(timestamp);
    },
    isPending: () => pending !== null,
  };
}

describe('Screen shake (roadmap 8.2)', () => {
  let harness: ReturnType<typeof makeClock>;
  let offsets: ShakeOffset[];
  let restoreWindow: () => void;

  beforeEach(() => {
    restoreWindow = installFakeWindow(false);
    __resetShakeForTests();
    harness = makeClock();
    __setShakeClock(harness.clock);
    offsets = [];
    subscribeShake(o => offsets.push(o));
  });

  afterEach(() => {
    __resetShakeForTests();
    restoreWindow();
  });

  it('runs a light shake with the configured amplitude and decays to zero', () => {
    expect(shake('LIGHT')).toBe(true);
    harness.pump(100);
    harness.pump(101);
    const first = offsets.at(-1)!;
    expect(Math.abs(first.x)).toBeLessThanOrEqual(SHAKE_AMPLITUDE.LIGHT);
    expect(Math.abs(first.y)).toBeLessThanOrEqual(SHAKE_AMPLITUDE.LIGHT);
    expect(Math.abs(first.x) + Math.abs(first.y)).toBeGreaterThan(0);

    harness.pump(100 + SHAKE_DURATION_MS.LIGHT);
    expect(offsets.at(-1)).toEqual({ x: 0, y: 0 });
    expect(harness.isPending()).toBe(false);
  });

  it('uses increasing amplitudes across the three levels', () => {
    expect(SHAKE_AMPLITUDE.LIGHT).toBeLessThan(SHAKE_AMPLITUDE.MEDIUM);
    expect(SHAKE_AMPLITUDE.MEDIUM).toBeLessThan(SHAKE_AMPLITUDE.HEAVY);
    expect(SHAKE_DURATION_MS.LIGHT).toBeLessThan(SHAKE_DURATION_MS.HEAVY);
  });

  it('does nothing while the toggle is off, and works again when re-enabled', () => {
    setShakeEnabled(false);
    expect(isShakeEnabled()).toBe(false);
    expect(shake('HEAVY')).toBe(false);
    expect(harness.isPending()).toBe(false);

    setShakeEnabled(true);
    expect(shake('HEAVY')).toBe(true);
    expect(harness.isPending()).toBe(true);
  });

  it('respects prefers-reduced-motion', () => {
    restoreWindow();
    restoreWindow = installFakeWindow(true);
    __resetShakeForTests();
    __setShakeClock(harness.clock);

    expect(shake('HEAVY')).toBe(false);
    expect(harness.isPending()).toBe(false);
  });

  it('lets a stronger shake take over but never lets a weaker one shorten it', () => {
    shake('LIGHT');
    harness.pump(100);
    harness.pump(110);

    // A heavy shake replaces the running light one.
    shake('HEAVY');
    harness.pump(120);
    harness.pump(121);
    let peak = 0;
    offsets.forEach(o => {
      peak = Math.max(peak, Math.abs(o.x), Math.abs(o.y));
    });
    expect(peak).toBeGreaterThan(SHAKE_AMPLITUDE.LIGHT);

    // A new light shake must not cut the heavy one short.
    shake('LIGHT');
    harness.pump(122);
    expect(harness.isPending()).toBe(true);
  });
});
