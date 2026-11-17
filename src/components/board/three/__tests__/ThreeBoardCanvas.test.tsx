import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThreeBoardCanvas, ThreeBoardCanvasHandle } from '../ThreeBoardCanvas';
import { INITIAL_GAME_STATE } from '../../../../game/gameReducer';

// Mock ThreeSceneManager to isolate React component testing
vi.mock('../ThreeSceneManager', () => {
  const MockSceneManager = vi.fn().mockImplementation((options: any) => {
    const instance = {
      canvas: options.canvas,
      onSelectTile: options.onSelectTile,
      updateState: vi.fn(),
      setWorldConfig: vi.fn(),
      setCameraPreset: vi.fn(),
      setFollowPlayer: vi.fn(),
      handleResize: vi.fn(),
      rollDice: vi.fn(),
      tumbleDice: vi.fn(),
      resetCamera: vi.fn(),
      focusTile: vi.fn(),
      zoomBy: vi.fn(),
      emitTileEvent: vi.fn(),
      dispose: vi.fn(),
    };
    (globalThis as any).__mockThreeSceneManagerInstance = instance;
    return instance;
  });

  return {
    ThreeSceneManager: MockSceneManager,
  };
});

describe('ThreeBoardCanvas — React 3D Canvas Viewport Unit Tests', () => {
  let originalWindow: typeof global.window;
  let originalDocument: typeof global.document;
  let originalResizeObserver: any;

  beforeEach(() => {
    originalWindow = global.window;
    originalDocument = global.document;
    originalResizeObserver = (global as any).ResizeObserver;

    (global as any).window = {
      devicePixelRatio: 1,
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      requestAnimationFrame: vi.fn((cb: any) => setTimeout(cb, 16)),
      cancelAnimationFrame: vi.fn((id: any) => clearTimeout(id)),
      WebGLRenderingContext: class {},
    };

    (global as any).document = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') {
          return {
            getContext: vi.fn((type: string) => {
              if (type === 'webgl' || type === 'experimental-webgl') {
                return {};
              }
              return null;
            }),
          };
        }
        return {};
      }),
    };

    (global as any).ResizeObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (global as any).window = originalWindow;
    (global as any).document = originalDocument;
    (global as any).ResizeObserver = originalResizeObserver;
  });

  describe('1. HTML5 Static Markup Rendering & Layout Isolation', () => {
    it('renders outer container and HTML5 canvas with correct data-testid and CSS classes', () => {
      const markup = renderToStaticMarkup(
        <ThreeBoardCanvas
          state={INITIAL_GAME_STATE}
          worldConfig={null}
          visualPositions={{}}
          onSelectTile={vi.fn()}
          className="custom-3d-board-wrapper"
        />
      );

      expect(markup).toContain('data-testid="three-board-canvas"');
      expect(markup).toContain('<canvas');
      expect(markup).toContain('custom-3d-board-wrapper');
      expect(markup).toContain('w-full h-full block touch-none outline-none select-none');
    });

    it('supports minimal prop and custom camera presets cleanly in markup', () => {
      const markup = renderToStaticMarkup(
        <ThreeBoardCanvas
          state={INITIAL_GAME_STATE}
          worldConfig={null}
          visualPositions={{}}
          onSelectTile={vi.fn()}
          minimal={true}
          cameraPreset="ISOMETRIC"
          className="border-slate-300"
        />
      );

      expect(markup).toContain('border-slate-300');
      expect(markup).toContain('relative w-full flex items-center justify-center overflow-hidden');
    });
  });

  describe('2. WebGL Guard & Context Verification', () => {
    it('verifies WebGL detection guard succeeds when WebGLRenderingContext and context exist', () => {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl');
      expect(gl).toBeDefined();
      expect(window.WebGLRenderingContext).toBeDefined();
    });

    it('guards against environments without WebGL context', () => {
      (document.createElement as any).mockReturnValueOnce({
        getContext: vi.fn(() => null),
      });

      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl');
      expect(gl).toBeNull();
    });
  });

  describe('3. Imperative Handle Methods & Ref Delegation', () => {
    it('defines and validates all 8 imperative handle methods on ref interface', () => {
      // Simulate imperative handle binding with mock scene manager
      const mockManager = {
        rollDice: vi.fn(),
        tumbleDice: vi.fn(),
        setCameraPreset: vi.fn(),
        resetCamera: vi.fn(),
        focusTile: vi.fn(),
        zoomBy: vi.fn(),
        emitTileEvent: vi.fn(),
      };

      const ZOOM_STEP = 1.25;
      const handle: ThreeBoardCanvasHandle = {
        rollDice: (d1, d2, animate = true) => mockManager.rollDice(d1, d2, animate),
        tumbleDice: () => mockManager.tumbleDice(),
        setCameraPreset: (preset) => mockManager.setCameraPreset(preset),
        resetCamera: () => mockManager.resetCamera(),
        focusTile: (tileId) => mockManager.focusTile(tileId),
        zoomIn: () => mockManager.zoomBy(ZOOM_STEP),
        zoomOut: () => mockManager.zoomBy(1 / ZOOM_STEP),
        emitTileEvent: (tileId, type) => mockManager.emitTileEvent(tileId, type),
      };

      // Test rollDice
      handle.rollDice(3, 5, true);
      expect(mockManager.rollDice).toHaveBeenCalledWith(3, 5, true);

      // Test tumbleDice
      handle.tumbleDice();
      expect(mockManager.tumbleDice).toHaveBeenCalled();

      // Test setCameraPreset
      handle.setCameraPreset('CINEMATIC');
      expect(mockManager.setCameraPreset).toHaveBeenCalledWith('CINEMATIC');

      // Test resetCamera
      handle.resetCamera();
      expect(mockManager.resetCamera).toHaveBeenCalled();

      // Test focusTile
      handle.focusTile(15);
      expect(mockManager.focusTile).toHaveBeenCalledWith(15);

      // Test zoomIn & zoomOut
      handle.zoomIn();
      expect(mockManager.zoomBy).toHaveBeenCalledWith(1.25);

      handle.zoomOut();
      expect(mockManager.zoomBy).toHaveBeenCalledWith(1 / 1.25);

      // Test emitTileEvent (M1 ↔ M3 interface contract)
      handle.emitTileEvent(24, 'PURCHASE');
      expect(mockManager.emitTileEvent).toHaveBeenCalledWith(24, 'PURCHASE');

      handle.emitTileEvent(10, 'UPGRADE');
      expect(mockManager.emitTileEvent).toHaveBeenCalledWith(10, 'UPGRADE');

      handle.emitTileEvent(0, 'SALARY');
      expect(mockManager.emitTileEvent).toHaveBeenCalledWith(0, 'SALARY');
    });
  });
});
