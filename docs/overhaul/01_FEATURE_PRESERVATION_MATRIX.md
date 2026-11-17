# CHAOS MONOPOLY — FEATURE PRESERVATION MATRIX

**Milestone:** 01 — System Preservation Guarantee  
**Target Release:** Realistic 3D Board Game & Family UX Overhaul  
**Mandate:** Zero removal, zero simplification of game rules, zero protocol breaks.

---

## 1. Core Systems Preservation Inventory

| Subsystem | Existing Implementation Files | Overhaul Presentation Impact | Underlying Engine Changes | Preservation Status |
|---|---|---|:---:|:---:|
| **Game State Machine (FSM)** | `src/game/gameReducer.ts`, `src/game/types/index.ts` | Turn phases (`ROLLING`, `BUY_DECISION`, `ACTION_MENU`, `AUCTION`, `DEBT_RESOLUTION`) presented with 1 dominant primary action button. | **NONE** — All action dispatches (`ROLL_DICE`, `BUY_PROPERTY`, `END_TURN`, etc.) preserved verbatim. | **100% PRESERVED** |
| **Board & Tile Rules** | `src/game/board/boardData.ts`, `src/game/gameReducer.ts` | 40 tiles rendered in genuine 3D WebGL tabletop with realistic materials. | **NONE** — Tile IDs 0–39, district groupings, prices, and rent formulas remain identical. | **100% PRESERVED** |
| **Economy & Rent Engine** | `src/game/economy/economicModifiers.ts`, `src/game/ledgerEngine.ts` | Rent collection and salary payouts display smooth floating notifications (+200k, -50k) with cheerful cash chimes. | **NONE** — Double rent on complete sets, house multipliers, and ledger integrity checks preserved. | **100% PRESERVED** |
| **Property Management** | `src/game/gameReducer.ts`, `PropertyDetailModal.tsx` | Building (Tiers 1–5), selling, mortgaging, and unmortgaging accessed via tactile Property Sheet. | **NONE** — All building limits, upgrade costs, and mortgage validation rules intact. | **100% PRESERVED** |
| **Property Trading** | `src/components/modals/TradeModal.tsx`, `src/game/gameReducer.ts` | Modern card-based trade negotiator with clean property chips and cash sliders. | **NONE** — Bilateral asset exchange, validation, and AI trade evaluations preserved. | **100% PRESERVED** |
| **Auctions** | `src/components/modals/AuctionModal.tsx`, `src/game/gameReducer.ts` | Clean visual bidding table with bid increments and countdown timer. | **NONE** — Multi-player turn bidding, timeout auto-pass, and final transfer preserved. | **100% PRESERVED** |
| **Chaos Cards & Events** | `src/game/chaos-engine/chaosCards.ts`, `src/game/chaos-engine/deterministicRng.ts` | Beautiful illustrated tarot-style event cards with warm physical paper texture. | **NONE** — All 36 Vietnamese event cards, deterministic Mulberry32 PRNG, and impacts preserved. | **100% PRESERVED** |
| **AI Personalities & Difficulty** | `src/game/ai/aiPersonalityProfiles.ts`, `src/game/ai/aiDecisionEngine.ts` | AI actions announced with friendly avatar speech bubble toasts. | **NONE** — All 6 personalities (`SHARK`, `TYCOON`, `DIPLOMAT`, `STRATEGIST`, `SURVIVOR`, `CHAOTIC`) and 3 difficulties intact. | **100% PRESERVED** |
| **Online Multiplayer Server** | `src/server/index.ts`, `src/server/roomManager.ts`, `src/server/security.ts` | Seamless room lobby, clean ready-check toggles, and status ribbons. | **NONE** — WebSocket wire protocol, intent validation, and room life cycles remain untouched. | **100% PRESERVED** |
| **Reconnection & Host Migration** | `src/multiplayer/ChaosMultiplayerClient.ts`, `src/game/storage/matchStorage.ts` | Automatic discreet reconnect banner with 1-click restore. | **NONE** — Session token caching, snapshot synchronization, and AI takeover timers preserved. | **100% PRESERVED** |
| **Multi-World Environments** | `src/worlds/packs/*.ts`, `src/components/worlds/WorldEnvironment.tsx` | 3D table environment, lighting, and tile textures reflect active world pack. | **NONE** — Metropolis, Cyberpunk, Mekong Delta, Space Colony configurations preserved. | **100% PRESERVED** |
| **Cosmetics & Progression** | `src/cosmetics/storage.ts`, `src/components/shop/ShopModal.tsx` | Clean light card gallery for dice skins, pet companions, and board textures. | **NONE** — Leveling curve, XP awards, coin balances, and equipped cosmetic IDs preserved. | **100% PRESERVED** |
| **Audio & SFX** | `src/game/sound/soundEngine.ts`, `src/components/common/HeaderBar.tsx` | Spatial audio chimes for dice roll, tile steps, cash transfers, and card draws. | **NONE** — Web Audio API synthesizer with volume sliders preserved. | **100% PRESERVED** |
| **Localization (VI / EN)** | `src/locales/i18n.ts`, `src/locales/translations.ts` | Complete bilingual support across all new light components and action labels. | **NONE** — Zero hardcoded untranslated strings; all labels localized. | **100% PRESERVED** |

---

## 2. Technical Boundary Guarantees

1. **No Gameplay Rewrite:** `src/game/gameReducer.ts` remains the single authoritative source of truth for local matches.
2. **No Protocol Modification:** `src/multiplayer/protocol.ts` message definitions (`CLIENT_INTENT`, `SERVER_STATE_SYNC`, `ROOM_UPDATE`, etc.) remain identical.
3. **No Schema Alteration:** `localStorage` schema `chaos_monopoly_saved_match_v2` and cosmetic storage format remain backwards compatible.
4. **Rendering Separation:** The 3D rendering canvas acts as a passive consumer of `GameState`, dispatching standard user intent actions back to the engine.
