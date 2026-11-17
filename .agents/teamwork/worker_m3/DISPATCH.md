## 2026-10-31T17:23:08Z
You are an authoritative Teamwork Worker implementing Milestone 3 of the CHAOS MONOPOLY 2.5D Visual Architecture Overhaul.

Working Directory: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\worker_m3
Original Request: Read c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Project Blueprint: Read c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\orchestrator\PROJECT.md.
Spatial UI & Camera Blueprint: Read c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\explorer_survey_spatial_ui\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- `src/components/camera/useCameraState.ts` (NEW)
- `src/components/camera/CameraControls.tsx` (NEW)
- `src/components/chaos/SpatialChaosVFX.tsx` (NEW)
- `src/components/worlds/WorldEnvironment.tsx` (UPDATE)
- `src/components/common/HeaderBar.tsx` (UPDATE)
- `src/components/board/BoardView.tsx` (UPDATE)
- `src/game/__tests__/camera_and_spatial_vfx.test.ts` (NEW unit test suite)

Detailed Milestone 3 Tasks:
1. Implement `src/components/camera/useCameraState.ts`:
   - Camera state: `{ preset, pitch, yaw, zoom, panX, panY, isDragging, focusedTileId }`.
   - Presets:
     - `TOP_DOWN`: pitch 0, yaw 0, zoom 1.0
     - `ISOMETRIC`: pitch 55, yaw 45, zoom 1.0
     - `CINEMATIC`: pitch 65, yaw 20, zoom 1.2
     - `TACTICAL`: pitch 35, yaw 45, zoom 0.9
   - Methods:
     - `setPreset(preset)`
     - `zoomIn()`, `zoomOut()`, `resetCamera()`
     - `focusTile(tileId, options)`: smoothly centers camera pan on tile coordinates with bounding limits ($\pm 250\text{px}$).
     - Pointer handlers: `handlePointerDown`, `handlePointerMove`, `handlePointerUp`, `handleWheel`.
   - Detect and respect `prefers-reduced-motion` (disables auto-focus lerps and transitions).
2. Implement `src/components/camera/CameraControls.tsx`:
   - Floating glassmorphic HUD bar docked to the board perimeter.
   - Buttons: `[2D]`, `[Iso]`, `[Cine]`, `[Tactical]`, `[+]`, `[-]`, `[🎯 Focus Player]`, `[↺ Reset]`.
   - Accessible ARIA labels and keyboard navigation.
3. Implement `src/components/chaos/SpatialChaosVFX.tsx`:
   - 3D Calamity VFX anchored at target tile 3D coordinates using `getTile3DPosition`:
     - Meteor Strike: Fiery projectile descending down Z-axis with expanding ground shockwave.
     - Market Crash: Red holographic grid descending on affected district with downward arrows.
     - Economic Boom: Gold particle fountain rising from the center plaza.
4. Update `src/components/worlds/WorldEnvironment.tsx`:
   - Add 3D horizon parallax skybox behind the tilted board that moves with camera yaw.
   - True 3D perspective precipitation (rain, snow, fireflies) falling onto board surface.
5. Update `src/components/common/HeaderBar.tsx`:
   - Connect camera presets and 2.5D view mode cleanly.
6. Update `src/components/board/BoardView.tsx`:
   - Connect `useCameraState` transforms and dock `CameraControls`.
7. Create `src/game/__tests__/camera_and_spatial_vfx.test.ts`:
   - Comprehensive unit tests verifying:
     - All 4 camera presets and pitch/yaw values.
     - Zoom bounds clamping $[0.6, 1.6]$ and pan bounds clamping $[ -250, 250]$.
     - `focusTile` coordinate resolution.
     - Reduced motion bypass.
     - SpatialChaosVFX tile positioning.
8. Run verification:
   - Execute `npm test` and ensure all 641+ tests pass with 0 failures.
   - Execute `npm run build` and ensure TypeScript and Vite build pass with 0 errors.

Record progress in `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\worker_m3\progress.md`.
Deliver handoff in `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\worker_m3\handoff.md`.
Send completion message to orchestrator when finished.
