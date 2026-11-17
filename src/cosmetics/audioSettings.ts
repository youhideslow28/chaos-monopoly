import { useSyncExternalStore } from 'react';
import { getAudioContext, setSoundEnabled } from '../game/sound/soundEngine';

export interface AudioSettings {
  masterVolume: number; // 0.0 .. 1.0
  musicVolume: number; // 0.0 .. 1.0
  sfxVolume: number; // 0.0 .. 1.0
  ambienceVolume: number; // 0.0 .. 1.0
  isMuted: boolean;
}

const STORAGE_KEY = 'chaos_audio_settings_v1';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  musicVolume: 0.5,
  sfxVolume: 0.85,
  ambienceVolume: 0.6,
  isMuted: false,
};

let cachedSettings: AudioSettings = loadAudioSettingsFromStorage();
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach(l => l());
}

export function loadAudioSettingsFromStorage(): AudioSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const parsed = JSON.parse(raw);
    const settings: AudioSettings = {
      masterVolume: Math.max(0, Math.min(1, Number(parsed.masterVolume) ?? 0.8)),
      musicVolume: Math.max(0, Math.min(1, Number(parsed.musicVolume) ?? 0.5)),
      sfxVolume: Math.max(0, Math.min(1, Number(parsed.sfxVolume) ?? 0.85)),
      ambienceVolume: Math.max(0, Math.min(1, Number(parsed.ambienceVolume) ?? 0.6)),
      isMuted: Boolean(parsed.isMuted),
    };
    cachedSettings = settings;
    return settings;
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  const clamped: AudioSettings = {
    masterVolume: Math.max(0, Math.min(1, Number(settings.masterVolume) || 0)),
    musicVolume: Math.max(0, Math.min(1, Number(settings.musicVolume) || 0)),
    sfxVolume: Math.max(0, Math.min(1, Number(settings.sfxVolume) || 0)),
    ambienceVolume: Math.max(0, Math.min(1, Number(settings.ambienceVolume ?? 0.6))),
    isMuted: Boolean(settings.isMuted),
  };
  cachedSettings = clamped;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
    } catch {
      /* ignore */
    }
  }
  setSoundEnabled(!clamped.isMuted && clamped.masterVolume > 0 && clamped.sfxVolume > 0);
  notify();
}

export function getAudioSettings(): AudioSettings {
  return cachedSettings;
}

export function updateAudioSettings(partial: Partial<AudioSettings>): void {
  saveAudioSettings({
    ...cachedSettings,
    ...partial,
  });
}

export function toggleMuteAudio(): boolean {
  const next = !cachedSettings.isMuted;
  updateAudioSettings({ isMuted: next });
  return next;
}

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => cachedSettings,
    () => DEFAULT_AUDIO_SETTINGS
  );
}

// Procedural Ambient Music Synthesizer (Zero copyrighted assets, pure Web Audio mathematical chords)
let ambientTimer: ReturnType<typeof setInterval> | null = null;
let ambientDroneTimer: ReturnType<typeof setInterval> | null = null;
let isAmbientPlaying = false;

/** Three situational layers (roadmap 8.4): calm → tense → climax, crossfaded over 2 s. */
export type MusicIntensity = 'CALM' | 'TENSE' | 'CLIMAX';

export const MUSIC_INTENSITY_GAIN: Record<MusicIntensity, number> = {
  CALM: 0.9,
  TENSE: 1.0,
  CLIMAX: 1.12,
};

export const MUSIC_INTENSITY_LAYERS: Record<MusicIntensity, number> = {
  CALM: 2,
  TENSE: 3,
  CLIMAX: 4,
};

export const MUSIC_CROSSFADE_SECONDS = 2;

let musicIntensity: MusicIntensity = 'CALM';
let musicBus: GainNode | null = null;

export function getMusicIntensity(): MusicIntensity {
  return musicIntensity;
}

/** Ramps the shared music bus over 2 seconds; the new layer count applies from the next chord. */
export function setMusicIntensity(level: MusicIntensity): void {
  if (level === musicIntensity) return;
  musicIntensity = level;
  if (!musicBus) return;
  try {
    const ctx = musicBus.context;
    const target = MUSIC_INTENSITY_GAIN[level];
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(target, ctx.currentTime + MUSIC_CROSSFADE_SECONDS);
  } catch {
    /* safe audio fallback */
  }
}

/** World-specific instrument colour: oscillator shape plus a plucked (zither) or reedy envelope. */
export const WORLD_VOICE: Record<string, { type: OscillatorType; pluck: boolean; detune: number }> = {
  'modern-metropolis': { type: 'sine', pluck: false, detune: 0 },
  'cyberpunk-city': { type: 'sawtooth', pluck: false, detune: -6 },
  'mekong-delta': { type: 'triangle', pluck: true, detune: 0 },
  // Đàn tranh feel: short plucked attack, bright triangle.
  'quang-tri-highlands': { type: 'triangle', pluck: true, detune: 4 },
  // Khèn feel: reedy square, slight detune.
  'northwest-vietnam': { type: 'square', pluck: false, detune: 7 },
  'space-colony': { type: 'sine', pluck: false, detune: 12 },
};

const WORLD_CHORDS: Record<string, number[][]> = {
  'modern-metropolis': [
    [261.63, 329.63, 392.0, 523.25], // Cmaj7
    [220.0, 261.63, 329.63, 440.0], // Am7
    [174.61, 220.0, 261.63, 349.23], // Fmaj7
    [196.0, 246.94, 293.66, 392.0], // G7
  ],
  'cyberpunk-city': [
    [220.0, 277.18, 329.63, 440.0], // A minor dark
    [164.81, 207.65, 246.94, 329.63], // E minor
    [174.61, 220.0, 261.63, 349.23], // F synth
    [146.83, 185.0, 220.0, 293.66], // D minor
  ],
  'mekong-delta': [
    [261.63, 293.66, 329.63, 392.0], // Pentatonic acoustic flow
    [196.0, 220.0, 261.63, 329.63],
    [220.0, 261.63, 293.66, 392.0],
  ],
  'space-colony': [
    [196.0, 293.66, 392.0, 587.33], // Cosmic 5th resonance
    [164.81, 246.94, 329.63, 493.88],
    [220.0, 329.63, 440.0, 659.25],
  ],
  // Núi rừng miền Trung: modal, hơi trầm, thiên về quãng 5.
  'quang-tri-highlands': [
    [196.0, 220.0, 293.66, 392.0],
    [174.61, 220.0, 261.63, 349.23],
    [146.83, 196.0, 246.94, 293.66],
  ],
  // Phiên chợ vùng cao: ngũ cung, sáng và nhanh hơn.
  'northwest-vietnam': [
    [261.63, 293.66, 329.63, 392.0],
    [349.23, 392.0, 440.0, 523.25],
    [196.0, 261.63, 293.66, 392.0],
  ],
};

let chordStep = 0;
let currentPlayingWorldId: string | null = null;

export function startAmbientMusic(worldId: string = 'modern-metropolis'): void {
  if (isAmbientPlaying && currentPlayingWorldId === worldId) return;
  if (isAmbientPlaying && currentPlayingWorldId !== worldId) {
    stopAmbientMusic();
  }
  const ctx = getAudioContext();
  if (!ctx) return;

  isAmbientPlaying = true;
  currentPlayingWorldId = worldId;
  chordStep = 0;
  const chords = WORLD_CHORDS[worldId] || WORLD_CHORDS['modern-metropolis'];

  const playChord = () => {
    if (!isAmbientPlaying || cachedSettings.isMuted || cachedSettings.musicVolume <= 0) return;
    const currentChord = chords[chordStep % chords.length];
    chordStep++;

    const now = ctx.currentTime;
    const duration = 4.5;
    const effectiveVol = cachedSettings.masterVolume * cachedSettings.musicVolume * 0.08;
    const voice = WORLD_VOICE[worldId] || WORLD_VOICE['modern-metropolis'];
    const layerCount = MUSIC_INTENSITY_LAYERS[musicIntensity];

    // Shared bus so intensity changes can crossfade instead of jump-cutting.
    if (!musicBus) {
      musicBus = ctx.createGain();
      musicBus.gain.value = MUSIC_INTENSITY_GAIN[musicIntensity];
      musicBus.connect(ctx.destination);
    }
    const bus = musicBus;

    // Layers: 1 pad (root+5th), 2 add the third, 3 add the octave, 4 add a low bass pulse.
    const layerNotes: number[][] = [
      [currentChord[0], currentChord[2]],
      [currentChord[1]],
      [currentChord[0] * 2],
      [currentChord[0] / 2],
    ];

    layerNotes.slice(0, Math.max(1, Math.min(layerCount, layerNotes.length))).forEach((notes, layerIdx) => {
      notes.forEach((freq, noteIdx) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = voice.type;
          osc.frequency.setValueAtTime(freq, now);
          if (voice.detune !== 0) osc.detune.setValueAtTime(voice.detune, now);

          const layerVol = effectiveVol * (layerIdx === 0 ? 1 : layerIdx === 3 ? 0.5 : 0.6);
          const attack = voice.pluck ? 0.06 : 1.2;
          gain.gain.setValueAtTime(0.001, now + noteIdx * 0.02);
          gain.gain.linearRampToValueAtTime(layerVol, now + noteIdx * 0.02 + attack);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

          osc.connect(gain);
          gain.connect(bus);
          osc.start(now + noteIdx * 0.02);
          osc.stop(now + duration + 0.1);
        } catch {
          /* safe audio fallback */
        }
      });
    });
  };

  const playAmbienceLayer = () => {
    if (!isAmbientPlaying || cachedSettings.isMuted || (cachedSettings.ambienceVolume ?? 0.6) <= 0) return;
    const now = ctx.currentTime;
    const effectiveAmbienceVol = cachedSettings.masterVolume * (cachedSettings.ambienceVolume ?? 0.6) * 0.045;

    try {
      if (worldId === 'cyberpunk-city') {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, now);
        filter.frequency.linearRampToValueAtTime(300, now + 2.5);
        filter.frequency.linearRampToValueAtTime(140, now + 5.5);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(effectiveAmbienceVol * 0.6, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 5.6);
      } else if (worldId === 'mekong-delta') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 1.4);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(effectiveAmbienceVol * 0.5, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.5);
      } else if (worldId === 'space-colony') {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(220, now);
        filter.Q.setValueAtTime(2.5, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(effectiveAmbienceVol * 0.5, now + 1.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.2);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 5.3);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(effectiveAmbienceVol * 0.35, now + 1.0);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 3.9);
      }
    } catch {
      /* safe audio fallback */
    }
  };

  playChord();
  ambientTimer = setInterval(playChord, 4600);

  playAmbienceLayer();
  ambientDroneTimer = setInterval(playAmbienceLayer, 5800);
}

export function stopAmbientMusic(): void {
  isAmbientPlaying = false;
  currentPlayingWorldId = null;
  if (ambientTimer) {
    clearInterval(ambientTimer);
    ambientTimer = null;
  }
  if (ambientDroneTimer) {
    clearInterval(ambientDroneTimer);
    ambientDroneTimer = null;
  }
  if (musicBus) {
    try {
      musicBus.disconnect();
    } catch {
      /* already disconnected */
    }
    musicBus = null;
  }
}
