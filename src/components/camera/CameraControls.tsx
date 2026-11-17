import React from 'react';
import { CameraState } from '../board/spatialMath';
import { CameraPresetType } from './useCameraState';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Crosshair } from 'lucide-react';
import { soundEffects } from '../../game/sound/soundEngine';
import { GAME_UI, useLocale } from '../../worlds/i18n';

export interface CameraControlsProps {
  camera: CameraState;
  onSetPreset: (preset: CameraPresetType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFocusActivePlayer?: () => void;
  activePlayerTileId?: number;
  className?: string;
  /** `minimal`: only a 2D/3D switch and zoom buttons. */
  variant?: 'full' | 'minimal';
}

/** The 3D viewing angles the "rotate view" button cycles through, in order. */
const VIEW_CYCLE: Array<{ id: CameraPresetType }> = [
  { id: 'STANDARD' },
  { id: 'ISOMETRIC' },
  { id: 'CINEMATIC' },
  { id: 'TACTICAL' },
];

export const CameraControls: React.FC<CameraControlsProps> = ({
  camera,
  onSetPreset,
  onZoomIn,
  onZoomOut,
  onReset,
  onFocusActivePlayer,
  className = '',
  variant = 'full',
}) => {
  const [locale] = useLocale();
  const t = (key: keyof typeof GAME_UI) => GAME_UI[key][locale];
  const currentPreset = camera.preset || 'ISOMETRIC';
  const isTopDown = currentPreset === 'TOP_DOWN';
  const viewLabel = (id: CameraPresetType): string =>
    id === 'STANDARD'
      ? t('viewStandard')
      : id === 'ISOMETRIC'
      ? t('viewIso')
      : id === 'CINEMATIC'
      ? t('viewCine')
      : id === 'TACTICAL'
      ? t('viewHigh')
      : t('viewStandard');
  const cycleIndex = VIEW_CYCLE.findIndex((v) => v.id === currentPreset);
  const nextView = VIEW_CYCLE[(cycleIndex + 1 + VIEW_CYCLE.length) % VIEW_CYCLE.length];
  const currentView = VIEW_CYCLE[cycleIndex] ?? VIEW_CYCLE[0];

  if (variant === 'minimal') {
    const options: Array<{ id: CameraPresetType; label: string; aria: string }> = [
      { id: 'TOP_DOWN', label: '2D', aria: t('camera2dTopAria') },
      { id: 'STANDARD', label: '3D', aria: t('camera3dAria') },
    ];
    const iconBtn =
      'w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-emerald-500';
    return (
      <div
        role="toolbar"
        aria-label={t('cameraViews')}
        data-testid="camera-controls-hud"
        className={`select-none flex items-center gap-1 p-1 rounded-xl bg-white/95 border border-[#e5e0d3] shadow-sm ${className}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          {options.map((o) => {
            const active = currentPreset === o.id;
            return (
              <button
                key={o.id}
                type="button"
                data-testid={`camera-preset-${o.id.toLowerCase()}`}
                aria-label={o.aria}
                aria-pressed={active}
                onClick={(e) => {
                  e.stopPropagation();
                  soundEffects.click();
                  onSetPreset(o.id);
                }}
                className={`px-3 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          data-testid="camera-zoom-in"
          aria-label={t('zoomIn')}
          onClick={(e) => {
            e.stopPropagation();
            soundEffects.click();
            onZoomIn();
          }}
          className={iconBtn}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="camera-zoom-out"
          aria-label={t('zoomOut')}
          onClick={(e) => {
            e.stopPropagation();
            soundEffects.click();
            onZoomOut();
          }}
          className={iconBtn}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="camera-reset"
          aria-label={t('resetView')}
          onClick={(e) => {
            e.stopPropagation();
            soundEffects.click();
            onReset();
          }}
          className={iconBtn}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const iconBtn =
    'w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100 active:scale-95 transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500';

  return (
    <div
      role="toolbar"
      aria-label={t('cameraControls')}
      data-testid="camera-controls-hud"
      className={`select-none flex items-center gap-1 p-1 rounded-xl bg-white/95 border border-slate-200 shadow-sm z-30 ${className}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* 2D / 3D switch */}
      <button
        type="button"
        data-testid="camera-view-toggle"
        aria-label={isTopDown ? t('to3d') : t('to2d')}
        aria-pressed={isTopDown}
        title={isTopDown ? t('to3d') : t('to2d')}
        onClick={(e) => {
          e.stopPropagation();
          soundEffects.click();
          onSetPreset(isTopDown ? 'STANDARD' : 'TOP_DOWN');
        }}
        className="px-3 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-xs font-black bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        {isTopDown ? '3D' : '2D'}
      </button>

      {/* Rotate view: cycles through the 3D angles (hidden in 2D) */}
      {!isTopDown && (
        <button
          type="button"
          data-testid="camera-view-cycle"
          aria-label={`${t('rotateView')} (${viewLabel(currentView.id)})`}
          title={`${t('rotateView')} → ${viewLabel(nextView.id)}`}
          onClick={(e) => {
            e.stopPropagation();
            soundEffects.click();
            onSetPreset(nextView.id);
          }}
          className="px-3 h-11 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-1 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <RotateCw className="w-3.5 h-3.5 text-emerald-700" />
          <span className="hidden sm:inline">{viewLabel(currentView.id)}</span>
        </button>
      )}

      <div className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true" />

      {/* Zoom */}
      <button
        type="button"
        data-testid="camera-zoom-in"
        aria-label={t('zoomIn')}
        title={t('zoomIn')}
        onClick={(e) => {
          e.stopPropagation();
          soundEffects.click();
          onZoomIn();
        }}
        className={iconBtn}
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        type="button"
        data-testid="camera-zoom-out"
        aria-label={t('zoomOut')}
        title={t('zoomOut')}
        onClick={(e) => {
          e.stopPropagation();
          soundEffects.click();
          onZoomOut();
        }}
        className={iconBtn}
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      {/* Focus active player */}
      {onFocusActivePlayer && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true" />
          <button
            type="button"
            data-testid="camera-focus-player"
            aria-label={t('focusPlayer')}
            title={t('focusPlayer')}
            onClick={(e) => {
              e.stopPropagation();
              soundEffects.click();
              onFocusActivePlayer();
            }}
            className="px-3 h-11 min-h-[44px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 active:scale-95 transition-all focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">
              {t('focusActive')}
            </span>
          </button>
        </>
      )}

      {/* Reset */}
      <button
        type="button"
        data-testid="camera-reset"
        aria-label={t('resetView')}
        title={t('resetView')}
        onClick={(e) => {
          e.stopPropagation();
          soundEffects.click();
          onReset();
        }}
        className={iconBtn}
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
};
