# Explorer 2 Dispatch: Volumetric Objects & 3D Geometry Survey
Objective: Investigate 3D volumetric token representation, volumetric buildings (houses, hotels, landmarks), volumetric dice, world-specific themes (`src/worlds/`), cosmetics (`src/cosmetics/`), and geometric depth implementation.
## 2026-10-31T16:24:51Z
You are an authoritative Volumetric Objects & 3D Geometry Explorer.
Your mission is to survey CHAOS MONOPOLY's game entities and produce a definitive technical plan for implementing volumetric 3D objects, dynamic token stacking, realistic buildings/landmarks, and animated 3D dice.

Working Directory: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\explorer_survey_volumetric
Original Request: Read c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.

Investigate:
1. Current game object rendering:
   - Tokens: `src/components/board/PlayerToken.tsx` and cosmetics token styles in `src/cosmetics/types.ts` & `catalog.ts`.
   - Buildings/Upgrades: Current upgrade indicators on tiles (tier 1..5 upgrades, houses/hotels/skyscrapers in `BoardTile.tsx`).
   - Dice: `src/components/dice/DiceRollModal.tsx`, `DiceControls.tsx`, `DiceFace.tsx`.
   - World themes & props: `src/worlds/packs/` and world visual tokens.
2. Genuine volumetric 3D requirements:
   - Volumetric player tokens: 3D prismatic shapes (cylinder/token pedestal/voxel meeples) with top, sides, drop shadows, and elevation off the board surface.
   - Dynamic token stacking: When 2, 3, or 4 players occupy the exact same tile (e.g. Start, Jail, popular properties), dynamic offset/stacking algorithm to ensure all tokens are clearly visible and do not clip or obscure each other.
   - Volumetric buildings & landmarks: 3D miniature buildings (Houses, Multi-story Apartments, Modern Skyscrapers, World Landmarks) with roof geometry, side facades, windows, and level-specific heights (Tier 1..5).
   - Volumetric 3D dice: True 3D cube geometry with 6 textured faces, rolling animations, physical bounce, and clean settlement.
3. Compatibility with cosmetics and themes: How skins, trails, and custom tokens map onto the volumetric system without breaking existing definitions.
4. Provide precise file-by-file recommendations and architectural blueprints.

Record your progress in `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\explorer_survey_volumetric\progress.md` with timestamps.
Produce your final report in `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\explorer_survey_volumetric\handoff.md`.
Send a completion message back to orchestrator when finished.
