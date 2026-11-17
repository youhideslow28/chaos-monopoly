## 2026-10-31T16:33:29Z
You are an authoritative Teamwork Worker implementing Milestone 1 of the CHAOS MONOPOLY 2.5D Visual Architecture Overhaul.

Working Directory: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\worker_m1
Original Request: Read c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Project Blueprint: Read c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\orchestrator\PROJECT.md.
Explorer Blueprints:
- Read c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\explorer_survey_board\handoff.md (detailed blueprints for `BoardSlab.tsx`, `BoardView.tsx`, `TileComponent.tsx`, `index.css`, isometric math).
- Read c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\explorer_survey_spatial_ui\handoff.md (detailed blueprints for `spatialMath.ts`, `SpatialBillboard.tsx`, depth sorting, billboarding transforms).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- `src/components/board/spatialMath.ts` (NEW)
- `src/components/board/BoardSlab.tsx` (NEW)
- `src/components/board/SpatialBillboard.tsx` (NEW)
- `src/components/board/BoardView.tsx` (UPDATE)
- `src/components/board/TileComponent.tsx` (UPDATE)
- `src/index.css` (UPDATE)
- `src/game/__tests__/spatialMath.test.ts` (NEW unit test suite)

Detailed Milestone 1 Tasks:
1. Create `src/components/board/spatialMath.ts`:
   - Pure math module for 3D coordinates, screen projection, depth sorting (`depth = (r + c) * 100 + layerOffset`), container-fit board sizing (`calculateFitBoardSize`), and camera-facing billboarding transforms (`getBillboardTransform`).
2. Create `src/components/board/BoardSlab.tsx`:
   - True 6-faced volumetric 3D cuboid slab with 28px extruded South-West and South-East sidewalls, ambient occlusion shading, beveled LED accent rim, and ground contact shadow.
3. Create `src/components/board/SpatialBillboard.tsx`:
   - Camera-facing 3D container applying inverse camera rotation so typography and price tags stay crisp and unwarped.
4. Refactor `src/components/board/BoardView.tsx`:
   - Wrap board in 2.5D isometric stage (`perspective: 3200px`, `rotateX(55deg) rotateZ(45deg)`).
   - Use proportional corner scaling: `gridTemplateColumns: '1.35fr repeat(9, 1fr) 1.35fr'`.
   - Embed `BoardSlab` with responsive fit sizing so diamond vertices never clip on desktop or mobile.
   - Preserve 2D view toggle fallback cleanly.
5. Enhance `src/components/board/TileComponent.tsx`:
   - Add tactile 3D plate depth (`translateZ(4px)`).
   - Hover lift state (`translateZ(12px)`) with drop shadow.
   - Mortgaged sunken state (`translateZ(-4px)`).
   - Use `SpatialBillboard` for price tag / rent callout text.
6. Update `src/index.css`:
   - Calibrated 2.5D isometric viewport, 3D vertical token hopping (`tokenHop3D` along $+Z$ axis), `preserve-3d`, `backface-visibility: hidden`.
7. Create `src/game/__tests__/spatialMath.test.ts`:
   - Comprehensive unit tests verifying `getTile3DPosition`, `calculateFitBoardSize`, `calculateDepthIndex`, and `getBillboardTransform`.
8. Verification:
   - Run `npm test` and ensure all 26+ test suites pass with 0 failures.
   - Run `npm run build` and ensure TypeScript compilation and Vite build pass with 0 errors.
