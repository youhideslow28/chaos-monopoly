import React, { useEffect, useState } from 'react';
import { WorldConfig } from '../../worlds/types';
import { WORLD_UI, useLocale } from '../../worlds/i18n';
import { CameraState, DEFAULT_CAMERA } from '../board/spatialMath';

export interface WorldEnvironmentProps {
  config: WorldConfig | null;
  camera?: CameraState;
}

/**
 * 3D Horizon Parallax Skybox & Perspective Ambient Precipitation for CHAOS MONOPOLY.
 * Dynamically shifts horizon backdrop in response to camera yaw/pitch,
 * and renders true 3D perspective precipitation falling onto the board surface.
 */
export const WorldEnvironment: React.FC<WorldEnvironmentProps> = ({
  config,
  camera = DEFAULT_CAMERA,
}) => {
  if (!config) return null;
  const { kind, intensity } = config.pack.environment;
  const o = Math.min(1, Math.max(0, intensity));

  const yaw = camera.yaw ?? 45;
  const pitch = camera.pitch ?? 55;

  // Horizon Parallax offset based on camera yaw and pitch
  const parallaxX = -((yaw - 45) * 1.8);
  const parallaxY = (pitch - 55) * 0.7;

  // World-themed horizon silhouette styling
  const worldId = config.id || 'modern-metropolis';

  return (
    <div
      className="world-env pointer-events-none fixed inset-0 z-0 overflow-hidden w-full max-w-full"
      aria-hidden="true"
      data-testid="world-environment"
      data-kind={kind}
    >
      {/* 1. 3D Horizon Parallax Skybox (Rotates/translates with camera yaw) */}
      <div
        data-testid="world-horizon-skybox"
        className="absolute inset-x-0 top-0 h-[65vh] w-full max-w-full pointer-events-none transition-transform duration-300 ease-out flex flex-col justify-end opacity-40 select-none overflow-hidden"
        style={{
          transform: `translate3d(${parallaxX}px, ${parallaxY}px, 0)`,
        }}
      >
        {/* Skybox Silhouette Backdrop based on active world */}
        {worldId === 'modern-metropolis' && (
          <div className="w-full flex items-end justify-around px-8 opacity-60">
            {[45, 75, 110, 60, 95, 130, 80, 50, 115, 70, 90].map((h, i) => (
              <div
                key={i}
                className="w-12 sm:w-16 rounded-t-sm bg-gradient-to-t from-slate-900 to-slate-800/60 border-t border-x border-cyan-500/20 relative"
                style={{ height: `${h}px` }}
              >
                {/* Spire Beacon */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-3 bg-cyan-400/80 rounded-full animate-ping"
                  style={{ animationDuration: `${2 + (i % 3)}s` }}
                />
              </div>
            ))}
          </div>
        )}

        {worldId === 'cyberpunk-city' && (
          <div className="w-full flex items-end justify-around px-6 opacity-50">
            {[80, 120, 60, 140, 90, 160, 70, 130, 85, 110].map((h, i) => (
              <div
                key={i}
                className="w-14 sm:w-20 rounded-t-sm bg-gradient-to-t from-[#0d0718] to-[#1c0f32] border-t-2 border-fuchsia-500/40 relative shadow-[0_0_20px_rgba(217,70,239,0.2)]"
                style={{ height: `${h}px` }}
              >
                <div
                  className="absolute top-4 left-2 right-2 h-1 bg-cyan-400/60 rounded shadow-[0_0_8px_#06b6d4]"
                />
              </div>
            ))}
          </div>
        )}

        {worldId === 'mekong-delta' && (
          <div className="w-full flex items-end justify-around opacity-45">
            {[50, 90, 40, 80, 60, 100, 45, 85].map((h, i) => (
              <div
                key={i}
                className="w-24 sm:w-36 rounded-t-full bg-gradient-to-t from-[#08150f] to-[#112d1e] border-t border-emerald-500/20"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        )}

        {worldId === 'space-colony' && (
          <div className="w-full flex items-center justify-center opacity-55 relative pb-8">
            {/* Distant Saturnian Celestial Ring */}
            <div
              className="w-96 h-28 rounded-[100%] border-t-4 border-indigo-400/30 border-b-2 border-cyan-400/20 shadow-[0_0_50px_rgba(99,102,241,0.25)]"
              style={{ transform: 'rotate(-15deg)' }}
            />
          </div>
        )}
      </div>

      {/* 2. True 3D Perspective Weather Particles */}
      {kind !== 'none' && intensity > 0 && (
        <div
          data-testid="world-perspective-weather"
          className="absolute inset-0 pointer-events-none overflow-hidden max-w-full"
          style={{
            perspective: '1200px',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Rain streaks angled in 3D perspective to align with board tilt */}
          {kind === 'rain' && (
            <div
              className="world-env-rain absolute inset-0 w-full h-full overflow-hidden"
              style={{
                opacity: 0.38 * o,
                transform: `rotateX(${Math.max(15, pitch * 0.4)}deg) rotateZ(${(yaw - 45) * 0.25}deg)`,
              }}
            />
          )}

          {/* Twinkling parallax stars */}
          {kind === 'stars' && (
            <div
              className="world-env-stars absolute inset-0"
              style={{
                opacity: 0.85 * o,
                transform: `translate3d(${parallaxX * 0.3}px, ${parallaxY * 0.3}px, 0)`,
              }}
            />
          )}

          {/* Volumetric fireflies drifting in 3D perspective space */}
          {kind === 'fireflies' &&
            Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="world-env-firefly absolute rounded-full"
                style={{
                  left: `${8 + i * 11}%`,
                  top: `${20 + ((i * 37) % 60)}%`,
                  width: 4,
                  height: 4,
                  background: config.palette.accent2,
                  opacity: 0.65 * o,
                  transform: `translateZ(${((i * 43) % 80) - 20}px)`,
                  animationDelay: `${i * 0.9}s`,
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
};

/** Short cinematic title card shown once when a match enters a world. Skippable. */
export const WorldIntroOverlay: React.FC<{
  config: WorldConfig | null;
  onDone: () => void;
}> = ({ config, onDone }) => {
  const [locale] = useLocale();
  const [leaving, setLeaving] = useState(false);
  const ms = config?.pack.animations.introMs ?? 0;

  useEffect(() => {
    if (!config || ms <= 0) {
      onDone();
      return;
    }
    const t1 = setTimeout(() => setLeaving(true), ms);
    const t2 = setTimeout(onDone, ms + 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [config, ms, onDone]);

  if (!config || ms <= 0) return null;
  return (
    <div
      onClick={onDone}
      role="presentation"
      data-testid="world-intro"
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-end pb-8 [@media(min-height:520px)]:justify-center [@media(min-height:520px)]:pb-0 text-center px-4 transition-opacity duration-300 select-none ${
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: config.pack.background.gradient,
        backgroundColor: (config.palette as any).background || config.palette.bg || '#080c14',
        color: config.palette.text,
        fontFamily: config.pack.typography.display,
      }}
    >
      <div className="max-w-md w-full mx-auto px-4 py-3 sm:py-5 flex flex-col items-center justify-center rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl [@media(max-height:480px)]:py-2.5">
        <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] opacity-75 mb-1 sm:mb-2">
          CHAOS MONOPOLY
        </div>
        <h1
          className="text-2xl min-[400px]:text-3xl [@media(min-height:520px)]:sm:text-5xl font-black tracking-tight leading-tight"
          style={{ color: config.palette.accent }}
        >
          {config.name[locale]}
        </h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base opacity-85 leading-snug max-w-sm">
          {config.tagline[locale]}
        </p>
        <p className="mt-2.5 sm:mt-4 text-[10px] sm:text-xs opacity-60 font-medium">
          {WORLD_UI.skipIntro[locale]}
        </p>
      </div>
    </div>
  );
};
