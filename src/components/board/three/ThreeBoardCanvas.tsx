/**
 * CHAOS MONOPOLY — 3D Board Canvas (React Component)
 * Embeds the Three.js WebGL scene into the React layout, connecting reactive
 * game state with the physical 3D tabletop diorama.
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { GameState } from '../../../game/types';
import { WorldConfig } from '../../../worlds/types';
import { ThreeSceneManager, ThreeCameraPreset } from './ThreeSceneManager';

export interface ThreeBoardCanvasProps {
  state: GameState;
  worldConfig: WorldConfig | null;
  visualPositions: Record<string, number>;
  onSelectTile: (tileId: number) => void;
  cameraPreset?: ThreeCameraPreset;
  className?: string;
  /** Classic board-game look; applied when the scene is created. */
  minimal?: boolean;
  /** The player whose token the camera follows (null = none). */
  followPlayerId?: string | null;
}

export interface ThreeBoardCanvasHandle {
  rollDice: (d1: number, d2: number, animate?: boolean) => void;
  tumbleDice: () => void;
  setCameraPreset: (preset: ThreeCameraPreset) => void;
  resetCamera: () => void;
  focusTile: (tileId: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  emitTileEvent: (tileId: number, type: 'PURCHASE' | 'UPGRADE' | 'SALARY') => void;
}

const ZOOM_STEP = 1.25;

export const ThreeBoardCanvas = forwardRef<ThreeBoardCanvasHandle, ThreeBoardCanvasProps>(
  ({ state, worldConfig, visualPositions, onSelectTile, cameraPreset = 'STANDARD', className = '', minimal = false, followPlayerId = null }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sceneManagerRef = useRef<ThreeSceneManager | null>(null);

    // Always call the latest handler without rebuilding the WebGL scene
    const onSelectTileRef = useRef(onSelectTile);
    onSelectTileRef.current = onSelectTile;

    // Latest values for first sync right after the scene is created
    const latestRef = useRef({ state, visualPositions, worldConfig, cameraPreset, minimal });
    latestRef.current = { state, visualPositions, worldConfig, cameraPreset, minimal };

    useImperativeHandle(ref, () => ({
      rollDice: (d1: number, d2: number, animate: boolean = true) =>
        sceneManagerRef.current?.rollDice(d1, d2, animate),
      tumbleDice: () => sceneManagerRef.current?.tumbleDice(),
      setCameraPreset: (preset: ThreeCameraPreset) => sceneManagerRef.current?.setCameraPreset(preset),
      resetCamera: () => sceneManagerRef.current?.resetCamera(true),
      focusTile: (tileId: number) => sceneManagerRef.current?.focusTile(tileId),
      zoomIn: () => sceneManagerRef.current?.zoomBy(ZOOM_STEP),
      zoomOut: () => sceneManagerRef.current?.zoomBy(1 / ZOOM_STEP),
      emitTileEvent: (tileId: number, type: 'PURCHASE' | 'UPGRADE' | 'SALARY') =>
        sceneManagerRef.current?.emitTileEvent(tileId, type),
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Gracefully check WebGL availability (guards against headless environments)
      const isWebGLAvailable = (() => {
        try {
          const testCanvas = document.createElement('canvas');
          return !!(
            window.WebGLRenderingContext &&
            (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
          );
        } catch {
          return false;
        }
      })();
      if (!isWebGLAvailable) return;

      const latest = latestRef.current;
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile: (tileId) => onSelectTileRef.current(tileId),
        worldConfig: latest.worldConfig,
        initialPreset: latest.cameraPreset,
        minimal: latest.minimal,
      });
      sceneManagerRef.current = manager;
      manager.updateState(latest.state, latest.visualPositions);

      const resizeObserver = new ResizeObserver(() => manager.handleResize());
      resizeObserver.observe(canvas);
      manager.handleResize();

      return () => {
        resizeObserver.disconnect();
        manager.dispose();
        sceneManagerRef.current = null;
      };
    }, []);

    // Sync reactive state changes to 3D scene
    useEffect(() => {
      sceneManagerRef.current?.updateState(state, visualPositions);
    }, [state, visualPositions]);

    // Sync world config & environment changes
    useEffect(() => {
      sceneManagerRef.current?.setWorldConfig(worldConfig);
    }, [worldConfig]);

    // Sync camera preset changes
    useEffect(() => {
      sceneManagerRef.current?.setCameraPreset(cameraPreset);
    }, [cameraPreset]);

    // Sync which player the camera follows
    useEffect(() => {
      sceneManagerRef.current?.setFollowPlayer(followPlayerId);
    }, [followPlayerId]);

    return (
      <div className={`relative w-full flex items-center justify-center overflow-hidden ${className}`}>
        <canvas
          ref={canvasRef}
          data-testid="three-board-canvas"
          className="w-full h-full block touch-none outline-none select-none"
        />
      </div>
    );
  }
);

ThreeBoardCanvas.displayName = 'ThreeBoardCanvas';
