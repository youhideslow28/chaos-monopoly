import { useState, useCallback, useRef, useEffect } from 'react';
import { CameraState, getTile3DPosition } from '../board/spatialMath';

export type CameraPresetType = 'TOP_DOWN' | 'ISOMETRIC' | 'CINEMATIC' | 'TACTICAL' | 'STANDARD';

export const CAMERA_PRESETS: Record<
  CameraPresetType,
  { preset: CameraPresetType; pitch: number; yaw: number; zoom: number }
> = {
  TOP_DOWN: {
    preset: 'TOP_DOWN',
    pitch: 0,
    yaw: 0,
    zoom: 1.0,
  },
  ISOMETRIC: {
    preset: 'ISOMETRIC',
    pitch: 55,
    yaw: 45,
    zoom: 1.0,
  },
  CINEMATIC: {
    preset: 'CINEMATIC',
    pitch: 65,
    yaw: 20,
    zoom: 1.2,
  },
  TACTICAL: {
    preset: 'TACTICAL',
    pitch: 35,
    yaw: 45,
    zoom: 0.9,
  },
  // WebGL default: classic Monopoly orientation (GO bottom-right), gentle tilt, no rotation.
  STANDARD: {
    preset: 'STANDARD',
    pitch: 52,
    yaw: 0,
    zoom: 1.0,
  },
};

export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 1.6;
export const MIN_PAN = -250;
export const MAX_PAN = 250;

/**
 * Clamps a zoom level between [MIN_ZOOM, MAX_ZOOM].
 */
export function clampZoom(zoom: number): number {
  if (Number.isNaN(zoom)) return 1.0;
  return Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) * 100) / 100;
}

/**
 * Clamps a pan offset between [MIN_PAN, MAX_PAN].
 */
export function clampPan(val: number): number {
  if (Number.isNaN(val)) return 0;
  return Math.round(Math.max(MIN_PAN, Math.min(MAX_PAN, val)) * 10) / 10;
}

/**
 * Returns a full CameraState object initialized to a specific preset.
 */
export function getCameraPreset(preset: CameraPresetType): CameraState {
  const config = CAMERA_PRESETS[preset] || CAMERA_PRESETS.ISOMETRIC;
  return {
    preset: config.preset,
    pitch: config.pitch,
    yaw: config.yaw,
    zoom: config.zoom,
    panX: 0,
    panY: 0,
    isDragging: false,
    focusedTileId: null,
  };
}

/**
 * Calculates the exact pan offsets (panX, panY) needed to center a specific tile (0..39)
 * inside the camera viewport given current camera angles and zoom.
 */
export function calculateTileFocusPan(
  tileId: number,
  camera: CameraState,
  boardSizePx: number = 560
): { panX: number; panY: number } {
  const pos = getTile3DPosition(tileId, boardSizePx, 28);
  const radYaw = (camera.yaw * Math.PI) / 180;
  const radPitch = (camera.pitch * Math.PI) / 180;

  // Yaw rotation around board normal Z
  const rotX = pos.x * Math.cos(radYaw) - pos.y * Math.sin(radYaw);
  const rotY = pos.x * Math.sin(radYaw) + pos.y * Math.cos(radYaw);

  // Pitch tilt around stage X axis
  const zoom = camera.zoom || 1.0;
  const screenX = rotX * zoom;
  const screenY = (rotY * Math.cos(radPitch) - pos.z * Math.sin(radPitch)) * zoom;

  // Pan moves the stage in the opposite direction of the tile offset
  return {
    panX: clampPan(-screenX),
    panY: clampPan(-screenY),
  };
}

/**
 * Formats a CSS 3D transform string for the camera stage.
 */
export function getCameraTransformString(camera: CameraState): string {
  const zoom = camera.zoom || 1.0;
  return `translate3d(${camera.panX}px, ${camera.panY}px, 0) scale(${zoom}) rotateX(${camera.pitch}deg) rotateZ(${camera.yaw}deg)`;
}

export interface FocusTileOptions {
  boardSize?: number;
  smooth?: boolean;
}

export interface UseCameraStateOptions {
  initialPreset?: CameraPresetType;
  is3DView?: boolean;
}

export function useCameraState(options?: UseCameraStateOptions) {
  const initialPreset: CameraPresetType = options?.initialPreset ?? (options?.is3DView === false ? 'TOP_DOWN' : 'ISOMETRIC');
  
  const [camera, setCamera] = useState<CameraState>(() => getCameraPreset(initialPreset));
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Track media query changes for prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if ('addListener' in mediaQuery) {
      (mediaQuery as any).addListener(handler);
      return () => (mediaQuery as any).removeListener(handler);
    }
  }, []);

  // Synchronize when is3DView toggle prop changes from outside
  useEffect(() => {
    if (options?.is3DView !== undefined) {
      if (!options.is3DView && camera.preset !== 'TOP_DOWN') {
        setCamera((prev) => ({
          ...prev,
          ...CAMERA_PRESETS.TOP_DOWN,
          panX: 0,
          panY: 0,
          focusedTileId: null,
        }));
      } else if (options.is3DView && camera.preset === 'TOP_DOWN') {
        setCamera((prev) => ({
          ...prev,
          ...CAMERA_PRESETS.ISOMETRIC,
          panX: 0,
          panY: 0,
          focusedTileId: null,
        }));
      }
    }
  }, [options?.is3DView]);

  // Set Camera Preset
  const setPreset = useCallback((preset: CameraPresetType) => {
    const config = CAMERA_PRESETS[preset] || CAMERA_PRESETS.ISOMETRIC;
    setCamera((prev) => ({
      ...prev,
      preset: config.preset,
      pitch: config.pitch,
      yaw: config.yaw,
      zoom: config.zoom,
      panX: 0,
      panY: 0,
      focusedTileId: null,
      isDragging: false,
    }));
  }, []);

  // Zoom In
  const zoomIn = useCallback((step: number = 0.15) => {
    setCamera((prev) => ({
      ...prev,
      zoom: clampZoom(prev.zoom + step),
    }));
  }, []);

  // Zoom Out
  const zoomOut = useCallback((step: number = 0.15) => {
    setCamera((prev) => ({
      ...prev,
      zoom: clampZoom(prev.zoom - step),
    }));
  }, []);

  // Reset Camera View
  const resetCamera = useCallback(() => {
    setCamera((prev) => {
      const activePreset = (prev.preset as CameraPresetType) || 'ISOMETRIC';
      const config = CAMERA_PRESETS[activePreset] || CAMERA_PRESETS.ISOMETRIC;
      return {
        ...prev,
        pitch: config.pitch,
        yaw: config.yaw,
        zoom: config.zoom,
        panX: 0,
        panY: 0,
        isDragging: false,
        focusedTileId: null,
      };
    });
  }, []);

  // Focus Tile
  const focusTile = useCallback(
    (tileId: number, opt?: FocusTileOptions) => {
      const boardSize = opt?.boardSize ?? 560;
      setCamera((prev) => {
        const pan = calculateTileFocusPan(tileId, prev, boardSize);
        return {
          ...prev,
          panX: pan.panX,
          panY: pan.panY,
          focusedTileId: tileId,
        };
      });
    },
    []
  );

  // Pointer dragging refs
  const isPointerDownRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef<boolean>(false);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement> | PointerEvent) => {
    // Only drag with left mouse button (0) or touch/pen
    if ('button' in e && e.button !== 0) return;
    
    isPointerDownRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;

    setCamera((prev) => {
      panStartRef.current = { x: prev.panX, y: prev.panY };
      return prev;
    });

    if ('target' in e && e.target && 'setPointerCapture' in (e.target as any)) {
      try {
        (e.target as any).setPointerCapture((e as any).pointerId);
      } catch {
        // Safe ignore
      }
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement> | PointerEvent) => {
    if (!isPointerDownRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Movement threshold of 3px before initiating drag state
    if (!hasDraggedRef.current && Math.hypot(deltaX, deltaY) > 3) {
      hasDraggedRef.current = true;
    }

    if (hasDraggedRef.current) {
      const newPanX = clampPan(panStartRef.current.x + deltaX);
      const newPanY = clampPan(panStartRef.current.y + deltaY);

      setCamera((prev) => ({
        ...prev,
        panX: newPanX,
        panY: newPanY,
        isDragging: true,
      }));
    }
  }, []);

  const handlePointerUp = useCallback((e?: React.PointerEvent<HTMLElement> | PointerEvent) => {
    isPointerDownRef.current = false;
    hasDraggedRef.current = false;

    setCamera((prev) => {
      if (!prev.isDragging) return prev;
      return { ...prev, isDragging: false };
    });

    if (e && 'target' in e && e.target && 'releasePointerCapture' in (e.target as any)) {
      try {
        (e.target as any).releasePointerCapture((e as any).pointerId);
      } catch {
        // Safe ignore
      }
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLElement> | WheelEvent) => {
    // Zoom in on wheel up, zoom out on wheel down
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setCamera((prev) => ({
      ...prev,
      zoom: clampZoom(prev.zoom + delta),
    }));
  }, []);

  const cameraTransform = getCameraTransformString(camera);

  return {
    camera,
    setCamera,
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
  };
}
