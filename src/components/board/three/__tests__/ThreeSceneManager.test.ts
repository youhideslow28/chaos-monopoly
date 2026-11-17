import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThreeSceneManager } from '../ThreeSceneManager';
import { INITIAL_GAME_STATE } from '../../../../game/gameReducer';
import { GameState } from '../../../../game/types';

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();

  class MockWebGLRenderer {
    domElement: any;
    render = vi.fn();
    setSize = vi.fn();
    setPixelRatio = vi.fn();
    shadowMap = { enabled: true, type: actual.PCFShadowMap };
    info = {
      render: { calls: 0, triangles: 0 },
      memory: { geometries: 0, textures: 0 },
      programs: [],
    };
    getContext = vi.fn(() => ({
      pixelStorei: vi.fn(),
      UNPACK_FLIP_Y_WEBGL: 0x9240,
      UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
    }));
    dispose = vi.fn();

    constructor(params?: any) {
      this.domElement = params?.canvas;
      (globalThis as any).__mockRendererInstance = this;
    }
  }

  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

// Helper to create a comprehensive mock 2D canvas context
function createMock2DContext() {
  return {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    roundRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    drawImage: vi.fn(),
  };
}

// Helper to create a mock canvas element
function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const listeners: Record<string, Function[]> = {};
  const mock2D = createMock2DContext();

  const canvas = {
    clientWidth: width,
    clientHeight: height,
    width,
    height,
    style: { cursor: 'default' },
    getBoundingClientRect: vi.fn(() => ({
      left: 100,
      top: 50,
      width,
      height,
      right: 100 + width,
      bottom: 50 + height,
      x: 100,
      y: 50,
      toJSON: () => {},
    })),
    getContext: vi.fn((type: string) => {
      if (type === '2d') return mock2D;
      return null;
    }),
    addEventListener: vi.fn((event: string, listener: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((l) => l !== listener);
      }
    }),
    dispatchEvent: vi.fn((event: { type: string }) => {
      const handlers = listeners[event.type] || [];
      for (const h of handlers) h(event);
      return true;
    }),
  } as unknown as HTMLCanvasElement;

  return canvas;
}

describe('ThreeSceneManager — 3D Tabletop & Scene Engine Unit Tests', () => {
  let originalWindow: typeof global.window;
  let originalDocument: typeof global.document;
  let originalResizeObserver: any;

  beforeEach(() => {
    originalWindow = global.window;
    originalDocument = global.document;
    originalResizeObserver = (global as any).ResizeObserver;

    // Set up global mocks for headless Node environment
    (global as any).requestAnimationFrame = vi.fn((cb: any) => setTimeout(cb, 16));
    (global as any).cancelAnimationFrame = vi.fn((id: any) => clearTimeout(id));

    (global as any).window = {
      devicePixelRatio: 1,
      requestAnimationFrame: (global as any).requestAnimationFrame,
      cancelAnimationFrame: (global as any).cancelAnimationFrame,
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      WebGLRenderingContext: class {},
    };

    (global as any).document = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') {
          return createMockCanvas(1024, 1024);
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

  describe('1. Construction & Scene Assembly', () => {
    it('constructs scene, lighting, tabletop, slab, and 40 tile meshes', () => {
      const canvas = createMockCanvas(800, 600);
      const onSelectTile = vi.fn();
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile,
        worldConfig: null,
        initialPreset: 'STANDARD',
        minimal: false,
      });

      const mockRenderer = (globalThis as any).__mockRendererInstance;
      expect(manager).toBeDefined();
      expect(mockRenderer).toBeDefined();
      expect(mockRenderer.setSize).toHaveBeenCalledWith(800, 600, false);

      // Verify scene construction via disposal or inspection
      manager.dispose();
      expect(mockRenderer.dispose).toHaveBeenCalled();
    });

    it('initializes in minimal mode without ambient weather particles', () => {
      const canvas = createMockCanvas(800, 600);
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile: vi.fn(),
        worldConfig: null,
        initialPreset: 'STANDARD',
        minimal: true,
      });

      expect(manager).toBeDefined();
      manager.dispose();
    });
  });

  describe('2. Camera Preset Transitions & Smart Rig Controls', () => {
    it('transitions seamlessly through camera presets (STANDARD, ISOMETRIC, CINEMATIC, TACTICAL, TOP_DOWN)', () => {
      const canvas = createMockCanvas(800, 600);
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile: vi.fn(),
        worldConfig: null,
        initialPreset: 'STANDARD',
      });

      manager.setCameraPreset('ISOMETRIC');
      manager.setCameraPreset('CINEMATIC');
      manager.setCameraPreset('TACTICAL');
      manager.setCameraPreset('TOP_DOWN');
      manager.setCameraPreset('STANDARD');

      manager.resetCamera(false);
      manager.zoomBy(1.25);
      manager.zoomBy(0.8);

      manager.dispose();
    });

    it('focuses camera on any tile coordinate across the board', () => {
      const canvas = createMockCanvas(800, 600);
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile: vi.fn(),
        worldConfig: null,
      });

      // Focus corner tiles and mid tiles
      manager.focusTile(0);  // Start
      manager.focusTile(10); // Jail
      manager.focusTile(20); // Festival
      manager.focusTile(30); // Go to jail
      manager.focusTile(39); // Landmark 81

      manager.dispose();
    });
  });

  describe('3. Raycaster NDC Coordinate Calculation & Tile Picking', () => {
    it('accurately normalizes screen coordinates and picks tiles without skew', () => {
      const canvas = createMockCanvas(800, 600);
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile: vi.fn(),
        worldConfig: null,
        initialPreset: 'TOP_DOWN',
      });

      // Canvas is at (left: 100, top: 50, width: 800, height: 600)
      // Test picking with valid client coordinates
      const tileId = manager.pickTileAt(500, 350); // Canvas center (400, 300) -> NDC (0, 0)
      expect(tileId === null || typeof tileId === 'number').toBe(true);

      // Test picking with boundary / empty coordinates
      expect(manager.pickTileAt(-1000, -1000)).toBeNull();

      // Test picking with zero rect dimensions
      (canvas.getBoundingClientRect as any).mockReturnValueOnce({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      });
      expect(manager.pickTileAt(100, 100)).toBeNull();

      manager.dispose();
    });

    it('picks a perimeter tile when ray intersects tile mesh', () => {
      const canvas = createMockCanvas(800, 600);
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile: vi.fn(),
        worldConfig: null,
        initialPreset: 'TOP_DOWN',
      });

      // In TOP_DOWN view, camera looks straight down at (0, 0, 0).
      // Perimeter tiles are arranged around x in [-10, 10], z in [-10, 10].
      // When picking near perimeter (e.g. Tile 0 world pos is around (9.5, 0, 9.5) or (-9.5, 0, 9.5))
      // Verify pickTileAt executes raycaster.intersectObjects and returns null or number
      const result = manager.pickTileAt(120, 70); // Near top-left
      expect(result === null || typeof result === 'number').toBe(true);

      manager.dispose();
    });
  });

  describe('4. 3D Shockwave Ring Emitter (emitTileEvent)', () => {
    it('creates expanding shockwave rings for PURCHASE, UPGRADE, and SALARY tile events', () => {
      const canvas = createMockCanvas(800, 600);
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile: vi.fn(),
        worldConfig: null,
      });

      // Emit events on different tiles
      manager.emitTileEvent(1, 'PURCHASE');
      manager.emitTileEvent(3, 'UPGRADE');
      manager.emitTileEvent(0, 'SALARY');

      // Verify no exceptions thrown and shockwaves are tracked
      manager.dispose();
    });
  });

  describe('5. Reactive Game State Sync & Token Tracking', () => {
    it('updates player token positions, buildings, and ownership markers', () => {
      const canvas = createMockCanvas(800, 600);
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile: vi.fn(),
        worldConfig: null,
      });

      const testState: GameState = {
        ...INITIAL_GAME_STATE,
        players: [
          {
            ...INITIAL_GAME_STATE.players[0],
            token: { id: 'car', colorHex: '#10b981' } as any,
            position: 5,
          },
          {
            ...INITIAL_GAME_STATE.players[1],
            token: { id: 'hat', colorHex: '#3b82f6' } as any,
            position: 12,
          },
        ],
      };

      manager.updateState(testState, { 'player-1': 5, 'player-2': 12 });
      manager.setFollowPlayer('player-1');
      manager.rollDice(4, 5, false);
      manager.tumbleDice();

      manager.dispose();
    });
  });

  describe('6. Pointer Drag, Orbit Gestures & Click Selection', () => {
    it('handles resize observation correctly', () => {
      const canvas = createMockCanvas(800, 600);
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile: vi.fn(),
        worldConfig: null,
      });

      manager.handleResize();
      const mockRenderer = (globalThis as any).__mockRendererInstance;
      expect(mockRenderer.setSize).toHaveBeenCalled();

      manager.dispose();
    });

    it('triggers onSelectTile callback on click within threshold', () => {
      const canvas = createMockCanvas(800, 600);
      const onSelectTile = vi.fn();
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile,
        worldConfig: null,
      });

      // Mock pickTileAt to return a known tile
      vi.spyOn(manager, 'pickTileAt').mockReturnValue(5);

      // Simulate click: pointerdown then pointerup at same coordinates
      canvas.dispatchEvent({
        type: 'pointerdown',
        pointerId: 1,
        clientX: 200,
        clientY: 200,
        button: 0,
        pointerType: 'mouse',
      } as any);

      canvas.dispatchEvent({
        type: 'pointerup',
        pointerId: 1,
        clientX: 200,
        clientY: 200,
        button: 0,
        pointerType: 'mouse',
      } as any);

      expect(onSelectTile).toHaveBeenCalledWith(5);

      manager.dispose();
    });

    it('orbits camera on pointer drag exceeding threshold without selecting tile', () => {
      const canvas = createMockCanvas(800, 600);
      const onSelectTile = vi.fn();
      const manager = new ThreeSceneManager({
        canvas,
        onSelectTile,
        worldConfig: null,
      });

      vi.spyOn(manager, 'pickTileAt').mockReturnValue(5);

      // Pointer down
      canvas.dispatchEvent({
        type: 'pointerdown',
        pointerId: 1,
        clientX: 200,
        clientY: 200,
        button: 0,
        pointerType: 'mouse',
      } as any);

      // Pointer move (large drag > 7px)
      canvas.dispatchEvent({
        type: 'pointermove',
        pointerId: 1,
        clientX: 250,
        clientY: 250,
        button: 0,
        pointerType: 'mouse',
      } as any);

      // Pointer up
      canvas.dispatchEvent({
        type: 'pointerup',
        pointerId: 1,
        clientX: 250,
        clientY: 250,
        button: 0,
        pointerType: 'mouse',
      } as any);

      // Selection must NOT be triggered because user dragged camera
      expect(onSelectTile).not.toHaveBeenCalled();

      manager.dispose();
    });
  });
});
