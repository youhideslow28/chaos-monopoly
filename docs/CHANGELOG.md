# CHANGELOG — CHAOS MONOPOLY

## [Phase 07] — 2026-10-31: Production Readiness, Security Audit & Deployment Preparation

### Added
- **Systematic Security Hardening & Automated Audit Suite (`src/game/__tests__/phase07_security_audit.test.ts`)**:
  - Implemented WebSocket Origin verification (`isOriginAllowed`) with configurable `ALLOWED_ORIGINS` whitelist.
  - Implemented Sliding Window Rate Limiting (35 requests/5s) with automated memory-leak-free pruning.
  - Hardened server-authoritative anti-cheat: rejected 9 forbidden client actions (`ROLL_DICE_RESULT`, `SET_CASH`, `SET_POSITION`, etc.), forbidden payload key filtering, and boundary validation [0..39].
  - Implemented XSS and HTML injection text sanitization (`sanitizeDisplayText`).
  - Added constant-time SHA-256 secret token hash comparison (`verifySecretTokenHash`) preventing timing attacks.
  - LocalStorage guest profile tampering prevention clamping level (1..50), coins (0..1M), and XP (0..500k).
- **SQLite WAL Integrity, Backup & Disaster Recovery (`src/game/__tests__/phase07_database_recovery.test.ts`, `src/server/roomRepository.ts`)**:
  - Added `checkIntegrity()` running `PRAGMA integrity_check` directly connected to `/api/health` and `/api/ready` endpoints.
  - Added `walCheckpoint('PASSIVE' | 'FULL' | 'TRUNCATE')` for non-blocking WAL log flushing.
  - Implemented atomic `backup(targetPath)` utilizing SQLite `VACUUM INTO` for point-in-time consistent backups.
  - Transactional rollback guarantees on failure via `BEGIN IMMEDIATE TRANSACTION`.
  - Fault tolerance: `loadAllActiveRooms` gracefully ignores corrupted records without crashing.
- **Frontend Performance & Bundle Optimization (`vite.config.ts`, `src/App.tsx`, `ErrorBoundary.tsx`)**:
  - Configured Rollup manual chunk splitting (`vendor-react`, `vendor-icons`, `vendor-misc`).
  - Lazy-loaded 13 modals and 4 world theme packs via `React.lazy()` and `Suspense`.
  - Dramatically cut main application bundle from **592.59 kB down to 257.90 kB** (-56.5% reduction).
  - Eliminated Vite bundle size warning (> 500 kB) completely.
  - Added cyberpunk/neon styled `ErrorBoundary` component safeguarding the root app from runtime crashes.
- **Multiplayer Reliability & Concurrency Load Suite (`src/game/__tests__/phase07_multiplayer_reliability.test.ts`)**:
  - Simulated 12 concurrent rooms with mixed human and AI players (2P, 3P, 4P).
  - Verified action idempotency: duplicate `actionId` submissions rejected with `DUPLICATE_ACTION`.
  - Verified socket drop and seamless reconnect with valid token.
  - Simulated full server shutdown and restart, recovering active rooms and stateVersions from SQLite.
- **Deployment Artifacts**:
  - Created multi-stage `Dockerfile` (Node 22-alpine, non-root user `node`, healthcheck probe).
  - Created `.dockerignore` for minimal build context.
  - Created production `nginx.conf` with reverse proxy for static files, caching, Gzip, and WSS WebSocket upgrades.
  - Updated `.env.example` with comprehensive production configurations.
- **Operations & Production Documentation**:
  - `docs/PRODUCTION_READINESS.md`: Readiness scorecard, bundle benchmarks, and Staging Ready sign-off.
  - `docs/SECURITY_AUDIT.md`: Complete OWASP Top 10 web & API audit, threat model, and test verification.
  - `docs/DEPLOYMENT.md`: Step-by-step guides for Docker, Nginx, Render, Railway, and SSL Certbot.
  - `docs/OPERATIONS_RUNBOOK.md`: SRE runbook, telemetry, automated backup cron, disaster recovery, incident playbooks.
  - `docs/RELEASE_CHECKLIST.md`: Release v1.0.0 Go/No-Go decision checklist.

---

## [Phase 06] — 2026-10-31: UI/UX, Cosmetics, Player Identity & Monetization

### Added
- **Cinematic Main Menu Entrypoint (`src/components/menu/MainMenu.tsx`)**:
  - Replaced the direct setup screen as the primary game portal.
  - Active world showcase banner, Quick Play instant launcher (1-click match start), game mode selector (Play vs AI, Local Pass & Play, Create/Join Online Room), and quick shortcuts to Wardrobe, Shop, Profile, and Settings.
  - Responsive layout, active ongoing game return button, and header language switcher.
- **Guest Player Identity & Progression System (`src/cosmetics/storage.ts`, `ProfileModal.tsx`)**:
  - Persistent guest session in LocalStorage (`chaos_player_profile_v1`) with randomized ID and editable nickname.
  - Level progression (Level 1..50) with formula `getXpRequiredForLevel(level) = Math.max(100, level * 250)`.
  - Realistic match completion rewards (`recordMatchResult`) computing XP and Chaos Coins based on match outcomes (wins, properties purchased, net worth, survival).
  - Career statistics tracking: matches played, won, win streaks, cash earned, auctions won, trades made.
  - 9+ career achievements with cosmetic rewards and instant unlock banners.
- **Cosmetic Collection & Equipment System (`src/cosmetics/catalog.ts`, `CollectionModal.tsx`)**:
  - 35+ items across 7 categories: `CHARACTER`, `OUTFIT`, `PET`, `DICE`, `TOKEN`, `EFFECT`, `EMOTE`.
  - 5 distinct rarity tiers: `COMMON`, `UNCOMMON`, `RARE`, `EPIC`, `LEGENDARY`.
  - Real-time in-game rendering: custom textured dice on `AnimatedDice.tsx`, pets alongside player tokens on `TileComponent.tsx`, character badges in lobbies and profiles.
  - Strict fallback guards (`sanitizePlayerCosmetics`) ensuring corrupted IDs revert safely to defaults.
- **Strictly Non-Pay-To-Win Cosmetic Shop (`src/cosmetics/shop.ts`, `ShopModal.tsx`)**:
  - Powered exclusively by earnable Chaos Coins (🪙).
  - Guaranteed 100% aesthetic: zero gameplay impact, zero pay-to-win mechanics, zero real-money gateways.
  - Duplicate purchase protection and balance validation.
- **Procedural Ambient Music & Audio Settings (`src/cosmetics/audioSettings.ts`, `SettingsModal.tsx`)**:
  - Master, music, and sfx volume controls with mute toggle and LocalStorage persistence (`chaos_audio_settings_v1`).
  - Web Audio API procedural ambient chord progressions tailored per active world.
- **Multiplayer Emote Reactions & Cosmetic Synchronization**:
  - Updated WebSocket protocol (`protocol.ts`), security validation (`security.ts`), and server room management (`roomManager.ts`) to validate and synchronize player cosmetics.
  - In-game quick emote reaction picker (`EmoteBar.tsx`) and animated floating overlay (`EmoteOverlay`).
- **Comprehensive Automated Test Suite (`src/game/__tests__/phase06_cosmetics_ui.test.ts`)**:
  - 17 test cases covering catalog validity, guest profile lifecycle, equipment rules, progression math, shop transactions, audio settings, localization, and multiplayer synchronization.

---

## [Phase 05] — 2026-10-31: Worlds, Maps & Content Expansion

### Added
- **Data-Driven World Engine (`src/worlds/`)**:
  - `src/worlds/types.ts` & `src/worlds/catalog.ts`: Defined the 8-world catalog (`modern-metropolis`, `cyberpunk-city`, `mekong-delta`, `quang-tri-highlands`, `northwest-vietnam`, `fantasy-kingdom`, `tropical-island`, `space-colony`) with explicit `availability` (`AVAILABLE` vs `COMING_SOON`) and `completeness` (`FULL` vs `CONFIG_ONLY`).
  - `src/worlds/packs/`: Created lazy-loaded world packs (`modern-metropolis.ts`, `cyberpunk-city.ts`, `mekong-delta.ts`, `space-colony.ts`) mapping all 28 ownable tiles in both Vietnamese (`vi`) and English (`en`), custom district color hexes, board/sky gradients, and ambient environment configs (`none`, `rain`, `fireflies`, `stars`).
  - `src/worlds/worldEvents.ts`: Added 13 bounded, seat-fair world map events across the 4 playable worlds and integrated `pickWorldEventCard` into `gameReducer.ts` on `CHAOS` tile landings.
  - `src/worlds/validate.ts` & `src/worlds/registry.ts`: Added strict schema/bound validators (`EVENT_BOUNDS`), per-world dynamic `import()` caching, and automatic `FALLBACK_PACK` recovery on chunk load failure.
  - `src/worlds/i18n.ts` & `src/worlds/runtime.ts`: Added runtime VI/EN language switching (`useLocale`) and active world tile name resolution (`displayTileName`).
- **World Selection & In-Game Presentation UI (`src/components/worlds/`)**:
  - `WorldSelectionModal.tsx`, `WorldPicker.tsx`, and `WorldEnvironment.tsx` integrated into `GameSetupModal.tsx`, `OnlineLobbyModal.tsx`, `BoardView.tsx`, `CenterCityView.tsx`, `TileComponent.tsx`, `PropertyDetailModal.tsx`, `ActionPanel.tsx`, `ChaosModal.tsx`, and `App.tsx`.
- **Multiplayer Server World Validation & Synchronization**:
  - Updated `src/server/roomManager.ts`, `src/server/security.ts`, and `src/multiplayer/protocol.ts` (`INVALID_WORLD`) so the authoritative server validates selectable worlds on room creation and configuration, synchronizes `worldId` to all room members, and persists `worldId` across reconnects and SQLite server restarts.
- **Phase 05 Automated Verification Suite**:
  - Added `src/game/__tests__/phase05_worlds.test.ts` (20 comprehensive tests covering catalog guards, schema validation, 28-tile VI/EN mapping, world events, ledger conservation, AI simulations across all 4 worlds, WebSocket multiplayer world sync/reconnect/restart, and asset failure fallback).

---

## [Phase 04] — 2026-10-31: Online Multiplayer & Social Platform
- Implemented authoritative Node.js + WebSocket multiplayer server (`src/server/`), SQLite WAL persistence (`roomRepository.ts`), security & anti-cheat (`security.ts`), online lobby UI (`OnlineLobbyModal.tsx`), and 72-match Latin-square seat-balanced AI benchmark.

---

## [Phase 03] — 2026-10-31: AI Players & Chaos Intelligence
- Implemented 6 AI personalities (`TYCOON`, `STRATEGIST`, `SHARK`, `SURVIVOR`, `CHAOTIC`, `DIPLOMAT`), 3 difficulty levels (`EASY`, `NORMAL`, `HARD`), multi-actor AI decision engine (`src/game/ai/`), Chaos context-weighted card selection and chaining (`src/game/chaos-engine/chaosEngine.ts`), and headless simulation runner.

---

## [Phase 02] — 2026-10-31: Complete Game Systems
- Implemented Double-Entry Economy Ledger (`ledgerEngine.ts`), Public Property Auctions (`auctionEngine.ts`), Bilateral Player Trading (`tradeEngine.ts`), Emergency Debt Liquidation (`DebtSettlementModal.tsx`), and LocalStorage match persistence (`matchStorage.ts`).
