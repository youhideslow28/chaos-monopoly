# CHAOS MONOPOLY — COSMETICS, PLAYER IDENTITY & UI/UX ARCHITECTURE
## Phase 06 Specification & Technical Documentation

---

## 1. Executive Summary

Phase 06 delivers a **complete, high-polish visual upgrade, player personalization engine, guest identity progression system, and strictly non-pay-to-win cosmetic economy** for CHAOS MONOPOLY.

Key architectural pillars implemented:
- **Cinematic Main Menu (`MainMenu.tsx`)**: Replaces the raw modal setup as the primary entry point, showcasing the active world, quick-launch game modes (Quick Play, Play vs AI, Local Pass & Play, Online Create/Join), player identity chip, and wardrobe/shop shortcuts.
- **Guest Player Identity & Progression Engine (`src/cosmetics/storage.ts`)**: Generates persistent guest profiles with editable nicknames, Level 1..50 progression, real-match XP and Chaos Coin reward formulas, career statistics, and 9+ career achievements.
- **Cosmetic Collection & Wardrobe (`src/cosmetics/catalog.ts`, `CollectionModal.tsx`)**: 35+ catalog items spanning 7 distinct categories (Characters, Outfits, Pets, Dice Skins, Tokens, Board Effects, Emotes) across 5 rarity tiers with in-game 3D rendering.
- **Strictly Non-Pay-To-Win Monetization (`src/cosmetics/shop.ts`, `ShopModal.tsx`)**: In-game earnable Chaos Coins (🪙) only. Zero real-money gateways, zero gameplay advantages, transparent pricing, and owned-item protection.
- **Procedural Audio Synthesis & Settings (`src/cosmetics/audioSettings.ts`, `SettingsModal.tsx`)**: Independent master/music/sfx volume controls, mute toggle, LocalStorage persistence, and Web Audio API procedural ambient background chords tailored per world.
- **Multiplayer Synchronization & Emote Reactions (`src/multiplayer/protocol.ts`, `src/server/roomManager.ts`, `EmoteBar.tsx`)**: Server-authoritative cosmetic validation and real-time floating emote bubbles.
- **Full VI/EN Bilingual Support (`src/worlds/i18n.ts`)**: Complete localization across all menus, modals, tooltips, and catalogs.

---

## 2. Visual Design System & Aesthetics

### 2.1 Aesthetic Archetype
**Premium Minimalism meets Playful Cyber-Tactile 2.5D**:
- **Backgrounds**: Deep space obsidian `#080c14` with procedural radial atmospheric glows.
- **Accents**: Neon Cyan (`#06b6d4`), Cyber Fuchsia (`#d946ef`), Radiant Amber (`#f59e0b`), Matrix Emerald (`#10b981`).
- **Surfaces**: Frosted glassmorphism (`backdrop-blur-xl`, `bg-[#0f172a]/95`, `border-slate-800/80`).
- **Tactile Feedback**: Subtle button shrink effects (`active:scale-95`), soft neon drop shadows (`shadow-neon-cyan`), and smooth transitions.

### 2.2 Navigation Architecture
```
                         ┌────────────────────────────────┐
                         │   Main Menu (MainMenu.tsx)     │
                         └────────────────┬───────────────┘
                                          │
       ┌──────────────┬───────────────────┼───────────────────┬──────────────┐
       │              │                   │                   │              │
┌──────▼─────┐ ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐ ┌─────▼──────┐
│ Quick Play │ │ Play vs AI  │     │ Online Room │     │  Wardrobe   │ │ Shop (🪙)  │
│ (Instant)  │ │ (SetupModal)│     │(Create/Join)│     │(Collection) │ │(ShopModal) │
└──────┬─────┘ └──────┬──────┘     └──────┬──────┘     └─────────────┘ └────────────┘
       │              │                   │
       └──────────────┼───────────────────┘
                      │
           ┌──────────▼──────────┐
           │ Active Board Match  │◄────── In-game Header Home Button
           │ (BoardView/Actions) │
           └──────────┬──────────┘
                      │
       ┌──────────────┴──────────────┐
       ▼                             ▼
┌──────────────┐              ┌──────────────┐
│   EmoteBar   │              │ EmoteOverlay │
│(Quick Popover│              │(Floating FX) │
└──────────────┘              └──────────────┘
```

---

## 3. Player Identity & Progression Architecture

### 3.1 Guest Profile Schema (`src/cosmetics/storage.ts`)
```typescript
export interface PlayerProfile {
  id: string;                      // Persistent guest session, e.g. "guest-a8f3b2"
  displayName: string;             // Editable player nickname
  level: number;                   // 1 .. 50
  xp: number;                      // Current XP progress in current level
  chaosCoins: number;              // In-game earnable cosmetic currency (🪙)
  cosmetics: PlayerCosmetics;      // Currently equipped items across 6 slots
  inventory: string[];             // Unlocked cosmetic IDs
  stats: PlayerStats;              // Real career metrics
  unlockedAchievements: string[];  // Unlocked achievement IDs
}
```

### 3.2 Progression Formulas
- **XP Threshold**: `getXpRequiredForLevel(level) = Math.max(100, level * 250)`
  - Level 1: 250 XP
  - Level 2: 500 XP
  - Level 10: 2,500 XP
- **Match Rewards (`recordMatchResult`)**:
  - Base Match XP: 100 XP
  - Win Bonus XP: 200 XP
  - Action XP: `(propertiesBought * 10) + (upgrades * 20) + (auctionsWon * 15) + (trades * 15) + (chaosSurvived * 10)`
  - Chaos Coins: `50 base + (150 if win) + floor(actionXp / 5)`

---

## 4. Cosmetic Catalog & Wardrobe (`src/cosmetics/catalog.ts`)

### 4.1 Cosmetic Categories
| Category | Slot | Description | Visual Implementation |
|---|---|---|---|
| `CHARACTER` | Avatar | Player persona & archetype | Displayed in Profile, Lobby, Leaderboard |
| `OUTFIT` | Skin | Outfit thematic variant | Visual badge & card accent |
| `PET` | Companion | Cute animated sidekick | Rendered alongside token on `TileComponent` |
| `DICE` | Dice Skin | Custom textured dice set | Custom gradient & glowing pips on `AnimatedDice` |
| `TOKEN` | Vehicle | Board pawn replacement | Pawn color, symbol, and 3D hopping style |
| `EFFECT` | Board Aura | Ambient tile/path particles | Tile highlight and active turn halo |
| `EMOTE` | Reaction | Quick chat reaction emote | Floating reaction bubble over board view |

### 4.2 Rarity Tiers
- **COMMON** (Default / Free)
- **UNCOMMON** (300 🪙)
- **RARE** (600 🪙)
- **EPIC** (1,200 🪙)
- **LEGENDARY** (2,500 🪙)

---

## 5. Non-Pay-To-Win Monetization Policy

1. **Zero Real-Money Purchases**:
   - There are no credit card inputs, mock payment gateways, or pay-walled content.
   - All items are strictly purchased with in-game Chaos Coins (🪙).
2. **Zero Gameplay Advantage**:
   - Cosmetics alter ONLY visual graphics, audio effects, animations, and emotes.
   - Rent calculations, dice probability, property pricing, and AI decisions remain 100% deterministic and unaffected by equipped cosmetics.
3. **Earn Through Play**:
   - Players earn coins by completing matches, winning rounds, trading, participating in auctions, and surviving chaos disasters.

---

## 6. Procedural Audio Synthesizer & Settings

### 6.1 Audio Architecture (`src/cosmetics/audioSettings.ts`)
- **Sound Effects (SFX)**: Web Audio API synthesis via `soundEngine.ts`.
- **World Ambient Music**: Procedural chord progression synthesis tailored to each active world:
  - *Metropolis 2077*: Cyberpunk Minor Chords (A2, C3, E3, G3).
  - *Mekong Delta*: Pentatonic Folk Harmonies (C3, D3, E3, G3, A3).
  - *Ha Long Bay*: Ethereal Floating Ambient (D3, F#3, A3, C#4).
  - *Sapa Highlands*: Mystical Highland Drone (E2, B2, E3, G#3).
- **Controls**: Master Volume (0..1), Music Volume (0..1), SFX Volume (0..1), Mute Toggle. All persistent in `chaos_audio_settings_v1`.

---

## 7. Multiplayer Synchronization & Anti-Cheat Security

1. **Protocol Integration (`src/multiplayer/protocol.ts`)**:
   - `RoomSeatMember` includes `cosmetics?: PlayerCosmetics`.
   - `CREATE_ROOM`, `JOIN_ROOM`, and `SELECT_TOKEN` accept `cosmetics?: PlayerCosmetics`.
   - New message types: `SEND_EMOTE` (client) and `EMOTE_BROADCAST` (server).
2. **Server-Side Sanitization (`src/server/security.ts`)**:
   - Unknown or malicious cosmetic IDs are automatically rejected or replaced with safe defaults via `sanitizePlayerCosmetics`.
   - Emote IDs must match registered catalog emotes; arbitrary strings are rejected.
3. **Room Broadcasting (`src/server/roomManager.ts`)**:
   - When a player emits an emote or updates cosmetics, the authoritative server broadcasts `EMOTE_BROADCAST` and `ROOM_UPDATED` to all connected clients.
