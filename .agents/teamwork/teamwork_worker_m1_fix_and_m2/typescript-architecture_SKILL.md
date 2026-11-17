---
name: typescript-architecture
description: >-
  Type-safe enterprise and game engine architecture in TypeScript. Covers immutable domain modeling,
  finite state machines (FSM), strict algebraic data types, validated action dispatchers, and modular separation.
risk: none
source: community
date_added: "2026-03-01"
---

# TypeScript Architecture for Complex Web Apps & Games

## 1. Architectural Boundaries
Keep game rules and simulation 100% decoupled from the UI framework (React/Vue/DOM):
```
src/
├── game/
│   ├── types/           # Immutable domain types & branded types
│   ├── core/            # Pure game loop & deterministic state transitions
│   ├── economy/         # Money, transactions, property valuations
│   ├── board/           # Tile definitions, board layout, topology
│   ├── chaos/           # Chaos card definitions & event resolution
│   └── engine.ts        # Pure reducer / state machine: (State, Action) => State
├── components/          # Presentation layer (dumb or connected)
├── hooks/ / store/      # UI adapter layer connecting engine to React
└── audio/               # Audio synthesizers & sound effect triggers
```

## 2. Branded Types & Strict Enums
Avoid primitive obsession. Prevent mixing up player IDs, tile IDs, and monetary values:
```typescript
export type PlayerId = string & { readonly __brand: unique symbol };
export type TileId = string & { readonly __brand: unique symbol };
export type Money = number & { readonly __brand: unique symbol };

export const asMoney = (val: number): Money => Math.max(0, Math.floor(val)) as Money;
```

## 3. Action-Driven Reducer Pattern
All state mutations must occur via explicit, validated actions:
```typescript
export type GameAction =
  | { type: 'ROLL_DICE' }
  | { type: 'MOVE_TOKEN'; steps: number }
  | { type: 'BUY_PROPERTY'; tileId: TileId }
  | { type: 'UPGRADE_PROPERTY'; tileId: TileId }
  | { type: 'TRIGGER_CHAOS'; cardId: string }
  | { type: 'END_TURN' };

export interface ActionValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateAction(state: GameState, action: GameAction): ActionValidationResult;
export function gameReducer(state: GameState, action: GameAction): GameState;
```
