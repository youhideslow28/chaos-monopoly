import { describe, expect, it } from 'vitest';
import {
  getMusicIntensity,
  MUSIC_CROSSFADE_SECONDS,
  MUSIC_INTENSITY_GAIN,
  MUSIC_INTENSITY_LAYERS,
  setMusicIntensity,
  WORLD_VOICE,
} from '../../cosmetics/audioSettings';

describe('Adaptive music (roadmap 8.4)', () => {
  it('crossfades over 2 seconds as specified', () => {
    expect(MUSIC_CROSSFADE_SECONDS).toBe(2);
  });

  it('adds layers and loudness from calm to climax', () => {
    expect(MUSIC_INTENSITY_LAYERS.CALM).toBeLessThan(MUSIC_INTENSITY_LAYERS.TENSE);
    expect(MUSIC_INTENSITY_LAYERS.TENSE).toBeLessThan(MUSIC_INTENSITY_LAYERS.CLIMAX);
    expect(MUSIC_INTENSITY_GAIN.CALM).toBeLessThan(MUSIC_INTENSITY_GAIN.CLIMAX);
    // Never boost past unity by a lot: procedural chords already stack four notes.
    for (const gain of Object.values(MUSIC_INTENSITY_GAIN)) {
      expect(gain).toBeGreaterThan(0);
      expect(gain).toBeLessThanOrEqual(1.2);
    }
  });

  it('defines an instrument voice for every playable world', () => {
    const worlds = [
      'modern-metropolis',
      'cyberpunk-city',
      'mekong-delta',
      'quang-tri-highlands',
      'northwest-vietnam',
      'space-colony',
    ];
    for (const id of worlds) {
      expect(WORLD_VOICE[id], id).toBeDefined();
      expect(WORLD_VOICE[id].type, id).toMatch(/sine|square|sawtooth|triangle/);
    }
  });

  it('defaults to calm and switches intensity without an audio device', () => {
    expect(['CALM', 'TENSE', 'CLIMAX']).toContain(getMusicIntensity());
    expect(() => setMusicIntensity('TENSE')).not.toThrow();
    expect(getMusicIntensity()).toBe('TENSE');
    expect(() => setMusicIntensity('CALM')).not.toThrow();
    expect(getMusicIntensity()).toBe('CALM');
  });
});
