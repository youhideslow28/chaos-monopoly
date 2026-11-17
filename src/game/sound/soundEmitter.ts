/**
 * src/game/sound/soundEmitter.ts
 *
 * Decoupled procedural sound event emitter.
 * Allows gameReducer and game logic to stay completely pure and testable
 * in non-browser/headless Node environments without Web Audio errors.
 */

export type SoundEffectType =
  | 'buyProperty'
  | 'diceRoll'
  | 'payRent'
  | 'upgradeProperty'
  | 'victory'
  | 'chaosTrigger'
  | 'click'
  | 'tokenStep';

export type SoundEffectListener = (effect: SoundEffectType) => void;

let activeSoundListener: SoundEffectListener | null = null;

export function setSoundListener(listener: SoundEffectListener | null): void {
  activeSoundListener = listener;
}

export function emitSound(effect: SoundEffectType): void {
  if (activeSoundListener) {
    try {
      activeSoundListener(effect);
    } catch {
      // Audio playback errors must never fail state reduction
    }
  }
}
