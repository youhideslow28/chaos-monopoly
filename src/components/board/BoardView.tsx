import React, { useEffect, useRef, useState } from 'react';
import { GameState, PlayerState } from '../../game/types';
import { WorldConfig } from '../../worlds/types';
import { BOARD_TILES, TILE_GRID_POSITIONS_40 } from '../../game/board/boardData';
import { TileComponent } from './TileComponent';
import { CenterCityView } from './CenterCityView';
import { BoardSlab } from './BoardSlab';
import {
  calculateFitBoardSize,
  calculateDepthIndex,
  CameraState,
  TOP_DOWN_CAMERA,
} from './spatialMath';
import { soundEffects } from '../../game/sound/soundEngine';
import { useCameraState, CameraPresetType } from '../camera/useCameraState';
import { CameraControls } from '../camera/CameraControls';
import { SpatialChaosVFX } from '../chaos/SpatialChaosVFX';
import { ThreeBoardCanvas, ThreeBoardCanvasHandle } from './three/ThreeBoardCanvas';
import { ThreeCameraPreset } from './three/ThreeSceneManager';

export interface BoardViewProps {
  state: GameState;
  worldConfig?: WorldConfig | null;
  is3DView: boolean;
  diceSkinId?: string;
  equippedPetId?: string | null;
  onRollDice: () => void;
  onEndTurn: () => void;
  onSelectTile: (tileId: number) => void;
  cameraPreset?: CameraPresetType;
  onCameraChange?: (camera: CameraState) => void;
  /** Classic board-game look: simple 2D/3D toggle, neutral 3D scene. */
  minimal?: boolean;
  /** The player whose token the camera follows (the viewer's own token). */
  followPlayerId?: string | null;
  /** Fill the parent's height instead of using the viewport-based default size. */
  fill?: boolean;
}

const BoardViewInner: React.FC<BoardViewProps> = ({
  state,
  worldConfig,
  is3DView,
  diceSkinId,
  equippedPetId,
  onRollDice,
  onEndTurn,
  onSelectTile,
  cameraPreset,
  onCameraChange,
  minimal = false,
  fill = false,
  followPlayerId = null,
}) => {
  const activePlayer = state.players[state.activePlayerIndex];
  const followPlayer = followPlayerId
    ? state.players.find(p => p.id === followPlayerId) ?? null
    : activePlayer ?? null;
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize interactive camera state
  const {
    camera,
    setPreset,
    zoomIn,
    zoomOut,
    resetCamera,
    focusTile,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    isReducedMotion,
    cameraTransform,
  } = useCameraState({
    is3DView,
    initialPreset: cameraPreset ?? (is3DView ? 'ISOMETRIC' : 'TOP_DOWN'),
  });

  // Notify parent of camera changes if listener provided
  useEffect(() => {
    onCameraChange?.(camera);
  }, [camera, onCameraChange]);

  // Responsive fit board size (calculated at base zoom 1.0 to allow GPU hardware scaling)
  const [boardSize, setBoardSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const w = Math.min(window.innerWidth * 0.9, 860);
      const h = Math.min(window.innerHeight * 0.8, 800);
      return calculateFitBoardSize(w, h, is3DView ? { ...camera, zoom: 1.0 } : TOP_DOWN_CAMERA);
    }
    return 560;
  });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = rect.width > 0 ? rect.width : (typeof window !== 'undefined' ? window.innerWidth * 0.9 : 860);
        const h = rect.height > 100 ? rect.height : (typeof window !== 'undefined' ? window.innerHeight * 0.8 : 700);
        const newSize = calculateFitBoardSize(
          w,
          h,
          is3DView ? { ...camera, zoom: 1.0 } : TOP_DOWN_CAMERA
        );
        setBoardSize(newSize);
      }
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, [is3DView, camera.pitch, camera.yaw]);

  // Visual animated positions for players (for sequential hopping effect)
  const [visualPositions, setVisualPositions] = useState<Record<string, number>>({});
  const prevPositionsRef = useRef<Record<string, number>>({});
  const hopIntervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const threeCanvasRef = useRef<ThreeBoardCanvasHandle | null>(null);
  const [webGLAvailable] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      const c = document.createElement('canvas');
      return Boolean(
        window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl'))
      );
    } catch {
      return false;
    }
  });

  // Sync 3D dice: tumble while ROLLING, then settle on the authoritative result.
  const wasRollingRef = useRef(false);
  const settledDiceRef = useRef<string | null>(null);
  const latestRollId = state.logs.find((l) => l.type === 'DICE')?.id ?? null;
  useEffect(() => {
    const handle = threeCanvasRef.current;
    if (!handle) return;
    const [d1, d2] = state.dice;

    if (state.turnPhase === 'ROLLING') {
      wasRollingRef.current = true;
      handle.tumbleDice();
      return;
    }

    // A roll is identified by its (unique) log entry, so two identical rolls in a row still count
    // as two rolls. Plain value comparison would skip the animation the second time.
    const key = `${latestRollId ?? 'none'}:${d1}-${d2}`;
    if (wasRollingRef.current) {
      wasRollingRef.current = false;
      settledDiceRef.current = key;
      handle.rollDice(d1, d2, true);
    } else if (settledDiceRef.current !== key) {
      // First observation (mount / resumed game / world switch): show the faces without animation.
      // Later changes without a local ROLLING phase are server-authoritative online rolls
      // (START + RESULT arrive in one sync), so they still get the roll animation.
      const animate = settledDiceRef.current !== null && state.status === 'PLAYING';
      settledDiceRef.current = key;
      handle.rollDice(d1, d2, animate);
    }
  }, [state.turnPhase, state.dice, latestRollId, state.status, webGLAvailable, is3DView]);

  const validThreePreset: ThreeCameraPreset =
    camera.preset === 'TOP_DOWN' ||
    camera.preset === 'CINEMATIC' ||
    camera.preset === 'TACTICAL' ||
    camera.preset === 'STANDARD'
      ? camera.preset
      : 'ISOMETRIC';

  // In WebGL mode the default view is the classic "STANDARD" Monopoly orientation,
  // until the player explicitly picks another preset. (The CSS fallback keeps ISOMETRIC.)
  const [autoStandard, setAutoStandard] = useState<boolean>(true);
  useEffect(() => {
    if (!is3DView) setAutoStandard(true);
  }, [is3DView]);
  useEffect(() => {
    if (webGLAvailable && is3DView && autoStandard && !cameraPreset && camera.preset === 'ISOMETRIC') {
      setPreset('STANDARD');
    }
  }, [webGLAvailable, is3DView, autoStandard, cameraPreset, camera.preset, setPreset]);

  // Initialize and synchronize player positions with hopping animation & safe cleanup
  useEffect(() => {
    const isReduced =
      isReducedMotion ||
      (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    state.players.forEach((p) => {
      const prev = prevPositionsRef.current[p.id];

      // Initial mount or first observation
      if (prev === undefined) {
        prevPositionsRef.current[p.id] = p.position;
        setVisualPositions((curr) => ({ ...curr, [p.id]: p.position }));
        return;
      }

      // If position changed, animate sequential hopping
      if (prev !== p.position) {
        if (hopIntervalsRef.current[p.id]) {
          clearInterval(hopIntervalsRef.current[p.id]);
          delete hopIntervalsRef.current[p.id];
        }

        const target = p.position;
        const start = prev;

        const forwardDistance = (target - start + 40) % 40;

        if (!isReduced && forwardDistance > 0 && forwardDistance <= 12) {
          let currentStep = start;

          const hopInterval = setInterval(() => {
            currentStep = (currentStep + 1) % 40;
            setVisualPositions((curr) => ({ ...curr, [p.id]: currentStep }));
            soundEffects.tokenStep();

            if (currentStep === target) {
              clearInterval(hopInterval);
              delete hopIntervalsRef.current[p.id];
              prevPositionsRef.current[p.id] = target;
            }
          }, 110);
          hopIntervalsRef.current[p.id] = hopInterval;
        } else {
          prevPositionsRef.current[p.id] = target;
          setVisualPositions((curr) => ({ ...curr, [p.id]: target }));
        }
      }
    });

    return () => {
      Object.values(hopIntervalsRef.current).forEach((interval) => clearInterval(interval));
      hopIntervalsRef.current = {};
    };
  }, [state.players, isReducedMotion]);

  return (
    <div
      ref={containerRef}
      data-testid="board-view-container"
      className={`relative w-full flex items-center justify-center overflow-visible select-none ${
        fill ? 'h-full min-h-[220px] p-0' : 'p-1 sm:p-3'
      } ${webGLAvailable && is3DView ? '' : 'perspective-board'}`}
      onPointerDown={webGLAvailable && is3DView ? undefined : handlePointerDown}
      onPointerMove={webGLAvailable && is3DView ? undefined : handlePointerMove}
      onPointerUp={webGLAvailable && is3DView ? undefined : handlePointerUp}
      onPointerCancel={webGLAvailable && is3DView ? undefined : handlePointerUp}
      onWheel={webGLAvailable && is3DView ? undefined : handleWheel}
      style={{
        touchAction: webGLAvailable && is3DView ? 'auto' : 'none',
        transform: webGLAvailable && is3DView ? 'none' : undefined,
        transformStyle: webGLAvailable && is3DView ? 'flat' : undefined,
      }}
    >
      {/* 3D WebGL Canvas or 2D/2.5D Fallback Stage */}
      {webGLAvailable && is3DView ? (
        <div
          data-testid="board-camera-stage"
          className={`w-full flex items-center justify-center ${fill ? 'h-full min-h-[220px]' : ''}`}
          style={{ transform: 'none', transformStyle: 'flat' }}
          data-world-id={worldConfig?.id || state.config.worldId || 'modern-metropolis'}
        >
          <ThreeBoardCanvas
            ref={threeCanvasRef}
            state={state}
            worldConfig={worldConfig ?? null}
            visualPositions={visualPositions}
            onSelectTile={onSelectTile}
            cameraPreset={validThreePreset}
            minimal={minimal}
            followPlayerId={followPlayerId}
            className={
              fill
                ? 'w-full h-full min-h-[220px] rounded-2xl overflow-hidden border border-[#e5e0d3] bg-[#f5ede0]'
                : 'w-full max-w-[1400px] h-[calc(100vh-340px)] min-h-[400px] max-h-[900px] rounded-3xl shadow-2xl overflow-hidden border border-[#e8e2d5] bg-[#faf8f5]'
            }
          />
        </div>
      ) : (
        <div
          data-testid="board-camera-stage"
          className={`transition-transform ${
            camera.isDragging || isReducedMotion ? 'duration-0' : 'duration-500 ease-out'
          } ${is3DView ? 'isometric-view' : 'flat-view'}`}
          style={{
            transform: is3DView
              ? cameraTransform
              : `translate3d(${camera.panX}px, ${camera.panY}px, 0) scale(${camera.zoom}) rotateX(0deg) rotateZ(0deg)`,
            transformStyle: is3DView ? 'preserve-3d' : 'flat',
          }}
          data-world-id={worldConfig?.id || state.config.worldId || 'modern-metropolis'}
        >
          <BoardSlab
            boardSize={boardSize}
            slabThickness={28}
            worldConfig={worldConfig}
            is3DView={is3DView}
          >
            {/* Spatial Calamity VFX Anchored in 3D Coordinates */}
            {state.activeChaosCard && (
              <SpatialChaosVFX
                card={state.activeChaosCard}
                boardSize={boardSize}
                slabHeight={28}
                camera={is3DView ? camera : TOP_DOWN_CAMERA}
              />
            )}

            <div
              className="w-full h-full grid gap-0.5 sm:gap-1"
              style={{
                // Proportional corner scaling (Monopoly standard: corners 1.35x width of regular tiles)
                gridTemplateColumns: 'minmax(0, 1.35fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.35fr)',
                gridTemplateRows: 'minmax(0, 1.35fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.35fr)',
                transformStyle: is3DView ? 'preserve-3d' : 'flat',
              }}
            >
              {/* Render all 40 perimeter tiles */}
              {BOARD_TILES.map((tile) => {
                const gridPos = TILE_GRID_POSITIONS_40[tile.id];
                if (!gridPos) return null;

                const ownership = state.properties[tile.id];
                const ownerPlayer = ownership?.ownerId
                  ? state.players.find((p) => p.id === ownership.ownerId)
                  : undefined;

                // Compute which players are visually occupying this tile right now
                const playersHere: PlayerState[] = state.players.filter((p) => {
                  if (p.isBankrupt) return false;
                  const visualPos = visualPositions[p.id] ?? p.position;
                  return visualPos === tile.id;
                });

                const isHighlighted =
                  activePlayer &&
                  (visualPositions[activePlayer.id] ?? activePlayer.position) === tile.id;

                // Deterministic depth sorting for 2.5D isometric view
                const depthIndex = is3DView
                  ? calculateDepthIndex(gridPos.col, gridPos.row, 10)
                  : undefined;

                return (
                  <div
                    key={tile.id}
                    style={{
                      gridColumnStart: gridPos.col,
                      gridColumnEnd: gridPos.col + 1,
                      gridRowStart: gridPos.row,
                      gridRowEnd: gridPos.row + 1,
                      zIndex: depthIndex,
                      transformStyle: is3DView ? 'preserve-3d' : 'flat',
                    }}
                    className="w-full h-full flex"
                  >
                    <TileComponent
                      tile={tile}
                      ownership={ownership}
                      ownerPlayer={ownerPlayer}
                      playersHere={playersHere}
                      activePlayerId={activePlayer?.id}
                      isHighlighted={isHighlighted}
                      equippedPetId={equippedPetId}
                      bandColor={
                        tile.property
                          ? worldConfig?.pack.tileVisuals.districtColors[tile.property.districtColor]
                          : undefined
                      }
                      onSelect={onSelectTile}
                      is3DView={is3DView}
                      camera={is3DView ? camera : TOP_DOWN_CAMERA}
                      worldId={worldConfig?.id || state.config.worldId || 'modern-metropolis'}
                    />
                  </div>
                );
              })}

              {/* Center 9x9 Metropolis Plaza */}
              <div
                style={{
                  gridColumnStart: 2,
                  gridColumnEnd: 11,
                  gridRowStart: 2,
                  gridRowEnd: 11,
                  zIndex: is3DView ? calculateDepthIndex(6, 6, 0) : undefined,
                  transformStyle: is3DView ? 'preserve-3d' : 'flat',
                }}
                className="w-full h-full p-1"
              >
                <CenterCityView
                  state={state}
                  worldConfig={worldConfig}
                  diceSkinId={diceSkinId}
                  onRollDice={onRollDice}
                  onEndTurn={onEndTurn}
                />
              </div>
            </div>
          </BoardSlab>
        </div>
      )}

      {/* Docked Floating Camera Controls HUD */}
      <div
        className={`absolute z-40 pointer-events-auto ${
          webGLAvailable && is3DView
            ? 'bottom-2 left-2 sm:bottom-3 sm:left-3'
            : 'bottom-2 right-2 sm:bottom-4 sm:right-4'
        }`}
        style={{ zIndex: 50 }}
      >
        <CameraControls
          camera={camera}
          onSetPreset={(preset) => {
            setAutoStandard(false);
            setPreset(preset);
            threeCanvasRef.current?.setCameraPreset(preset as ThreeCameraPreset);
          }}
          onZoomIn={() => {
            zoomIn();
            threeCanvasRef.current?.zoomIn();
          }}
          onZoomOut={() => {
            zoomOut();
            threeCanvasRef.current?.zoomOut();
          }}
          onReset={() => {
            resetCamera();
            threeCanvasRef.current?.resetCamera();
          }}
          onFocusActivePlayer={() => {
            if (followPlayer) {
              const followPos = visualPositions[followPlayer.id] ?? followPlayer.position;
              focusTile(followPos, { boardSize });
              threeCanvasRef.current?.focusTile(followPos);
            }
          }}
          activePlayerTileId={followPlayer?.position}
        />
      </div>
    </div>
  );
};

export const BoardView = React.memo(BoardViewInner);
