/**
 * Screen shake (roadmap 8.2) — three fixed levels, a user toggle, and reduced-motion support.
 *
 * Design notes:
 * - Single owner of the shake clock: one rAF loop, subscribers get the current offset.
 * - Deterministic decay: amplitude fades linearly to zero over the level's duration.
 * - `prefers-reduced-motion: reduce` disables shake entirely, regardless of the toggle.
 */

export type ShakeLevel = 'LIGHT' | 'MEDIUM' | 'HEAVY';

export interface ShakeOffset {
  x: number;
  y: number;
}

export const SHAKE_AMPLITUDE: Record<ShakeLevel, number> = {
  LIGHT: 3,
  MEDIUM: 7,
  HEAVY: 14,
};

export const SHAKE_DURATION_MS: Record<ShakeLevel, number> = {
  LIGHT: 220,
  MEDIUM: 380,
  HEAVY: 620,
};

const STORAGE_KEY = 'chaos_screen_shake_v1';

type Listener = (offset: ShakeOffset) => void;
type Clock = { request: (cb: (t: number) => void) => number; cancel: (id: number) => void };

const defaultClock: Clock = {
  request: cb =>
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(cb)
      : (setTimeout(() => cb(Date.now()), 16) as unknown as number),
  cancel: id => {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
    else clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
  },
};

let enabled = loadEnabled();
const listeners = new Set<Listener>();
let clock: Clock = defaultClock;

let frameId: number | null = null;
let startedAt = -1;
let amplitude = 0;
let durationMs = 0;

function loadEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

export function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

export function isShakeEnabled(): boolean {
  return enabled;
}

export function setShakeEnabled(next: boolean): void {
  enabled = next;
  try {
    window.localStorage?.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    /* ignore quota/privacy errors */
  }
  if (!next) stop();
}

export function toggleShake(): boolean {
  setShakeEnabled(!enabled);
  return enabled;
}

export function subscribeShake(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(offset: ShakeOffset): void {
  listeners.forEach(l => l(offset));
}

function stop(): void {
  if (frameId !== null) {
    clock.cancel(frameId);
    frameId = null;
  }
  amplitude = 0;
  emit({ x: 0, y: 0 });
}

/** Triggers a shake. Returns true when a shake actually started. */
export function shake(level: ShakeLevel): boolean {
  if (!enabled || prefersReducedMotion()) return false;

  const nextAmplitude = SHAKE_AMPLITUDE[level];
  const nextDuration = SHAKE_DURATION_MS[level];
  if (nextAmplitude <= 0 || nextDuration <= 0) return false;

  // A stronger shake replaces a weaker one; a weaker one never shortens a stronger one.
  const alreadyRunning = frameId !== null;
  if (alreadyRunning && nextAmplitude < amplitude) return true;

  amplitude = nextAmplitude;
  durationMs = nextDuration;
  startedAt = -1;

  if (!alreadyRunning) {
    frameId = clock.request(tick);
  }
  return true;
}

function tick(timestamp: number): void {
  if (startedAt < 0) startedAt = timestamp;
  const elapsed = timestamp - startedAt;

  if (elapsed >= durationMs) {
    stop();
    return;
  }

  const decay = 1 - elapsed / durationMs;
  const current = amplitude * decay;
  emit({
    x: (Math.random() * 2 - 1) * current,
    y: (Math.random() * 2 - 1) * current,
  });
  frameId = clock.request(tick);
}

/** Test hook: replaces the animation clock so timings can be driven deterministically. */
export function __setShakeClock(next: Clock | null): void {
  stop();
  clock = next ?? defaultClock;
}

export function __resetShakeForTests(): void {
  stop();
  clock = defaultClock;
  enabled = true;
  listeners.clear();
}
