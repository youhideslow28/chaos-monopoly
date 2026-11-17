# Handoff Report — Task M1-3: Core Rules, Movement, Detention & FSM Guards

**Author**: Explorer M1-3 (`teamwork_explorer_m1_3`)  
**Mission**: Comprehensive Strategy, Architecture Specification, Code Diffs, and Unit Tests for Milestone 1 (Task M1-3)  
**Target Recipient**: Lead Orchestrator (`dfdc5340-0019-4b2e-8180-5f5d8ae40b15`) & Worker M1 (`teamwork_worker_m1`)  
**Date**: 2026-10-31  

---

## Executive Summary

This report establishes the complete implementation blueprint for **Milestone 1 (Task M1-3)** of CHAOS MONOPOLY Phase 02:
1. **Jail & Detention Overhaul**: Eliminating the double-decrement defect, setting maximum detention duration to exactly 3 turns, adding `jailFreeCards` to `PlayerState`, wiring the `USE_DETENTION_CARD` action and `chaosEngine.ts` card grants, ensuring doubles escape moves the player by the rolled dice sum, and enforcing mandatory bail on the 3rd failed roll.
2. **Start Tile Rewards (Passing vs Landing)**: Awarding $200k VND ($400k during `goldenHourTurns > 0`) for passing START, and awarding a dedicated $400k VND bonus ($800k during `goldenHourTurns > 0`) for landing directly on START (Tile 0).
3. **Turn Authorization & FSM Guards**: Adding `actionId?: string` and `senderPlayerId?: string` to action envelopes, enforcing strict active-player authorization while rejecting bankrupt actors, implementing a 50-element FIFO ring buffer (`processedActionIds`) for action idempotency, and completely decoupling procedural sound effects from `gameReducer.ts` into a pure event emitter/subscriber pattern.

---

## 1. Observation

### 1.1 Jail & Detention Subsystem Defects

#### A. The Double-Decrement Bug & Shortened Jail Sentence
- **`src/game/gameReducer.ts` Lines 201–207 & Lines 776–782**:
  When a player speeds (3 consecutive doubles) or lands on Tile 30 (`GO_TO_JAIL`), their state is initialized to `detentionTurns: 2`:
  ```typescript
  // gameReducer.ts line 205 & line 780
  inDetention: true,
  detentionTurns: 2, // BUG: Only sets 2 turns instead of 3
  consecutiveDoubles: 0,
  ```
- **`src/game/turn-manager/turnManager.ts` Lines 70–84**:
  When advancing the turn to the jailed player, `turnManager.ts` decrements `detentionTurns` immediately before the player has had a chance to roll:
  ```typescript
  // turnManager.ts lines 70-84
  if (updatedPlayer.inDetention) {
    if (updatedPlayer.detentionTurns > 1) {
      updatedPlayer = {
        ...updatedPlayer,
        detentionTurns: updatedPlayer.detentionTurns - 1, // Decrement 1
      };
    } else {
      updatedPlayer = {
        ...updatedPlayer,
        inDetention: false,
        detentionTurns: 0,
      };
    }
  }
  ```
- **`src/game/gameReducer.ts` Lines 167–175**:
  During their turn in `ROLL_DICE_RESULT`, if the player rolls non-doubles, `gameReducer.ts` decrements `detentionTurns` a SECOND time:
  ```typescript
  // gameReducer.ts line 168
  const remainingTurns = Math.max(0, activePlayer.detentionTurns - 1); // Decrement 2
  const updatedPlayer: PlayerState = {
    ...activePlayer,
    detentionTurns: remainingTurns,
  };
  ```
- **Impact**: Because `detentionTurns` is decremented upon entering their turn AND upon rolling non-doubles, a sentence of 2 turns is reduced to 0 turns in a single round. The player only gets 1 attempt to roll doubles before being automatically released.

#### B. Doubles Escape Does Not Move the Player
- **`src/game/gameReducer.ts` Lines 137–165**:
  When a detained player rolls doubles (`isDouble === true`), the reducer sets `inDetention: false` and `detentionTurns: 0`, but resets `turnPhase` to `'WAITING_FOR_ROLL'` at position 10:
  ```typescript
  // gameReducer.ts lines 148-154
  return {
    ...state,
    players: updatedPlayers,
    dice,
    isDouble: false, // Don't grant extra turn on jail-escape double
    turnPhase: 'WAITING_FOR_ROLL',
    // ...
  };
  ```
- **Impact**: The player remains stuck at Tile 10 and is forced to wait for another roll rather than moving by the sum of the dice that granted their escape. In official Monopoly rules, rolling doubles frees the prisoner and immediately advances their token by the rolled sum without granting an extra turn.

#### C. Missing Mandatory Bail on 3rd Failed Turn
- **`src/game/gameReducer.ts` Lines 167–195**:
  If a player fails their 3rd doubles roll (`detentionTurns === 1`), the reducer simply sets `detentionTurns: 0` and sets `turnPhase: 'ACTION_MENU'`. It does not deduct bail ($50k) and does not move the player by the rolled sum.

#### D. Missing Detention Card Inventory & Unwired Action
- **`src/game/types/index.ts` Lines 74–92**:
  `PlayerState` has no field `jailFreeCards: number`.
- **`src/game/chaos-engine/chaosEngine.ts` Lines 499–503**:
  Drawing `DETENTION_RELEASE` or `DETENTION_IMMUNITY` cards only logs a message:
  ```typescript
  case 'DETENTION_IMMUNITY':
  case 'DETENTION_RELEASE': {
    logMsg += ` -> Nhận 1 Thẻ Miễn Trừ Giam Giữ đặc quyền!`;
    break;
  }
  ```
  No state mutation occurs; the card is lost immediately.
- **`src/game/types/index.ts` Lines 247–266**:
  `GameAction` lacks `{ type: 'USE_DETENTION_CARD' }`.

---

### 1.2 Start Tile Rewards (Passing vs Landing)

- **`src/game/gameReducer.ts` Lines 231–237**:
  ```typescript
  const { newPosition, passedStart } = calculateNewPosition(activePlayer.position, sum, BOARD_SIZE);
  let earnedSalary = 0;
  if (passedStart) {
    earnedSalary = state.config.salaryOnStart; // default 200
  }
  ```
- **`src/game/gameReducer.ts` Lines 764–944 (`resolveLandingTile`)**:
  No `case 'START':` exists in `resolveLandingTile`.
- **`src/game/chaos-engine/chaosEngine.ts` Lines 592–596**:
  ```typescript
  case 'GOLDEN_HOUR': {
    updatedModifiers.goldenHourTurns = durationInTurns || 1;
    logMsg += ` -> Giờ vàng đô thị! Lương Cổng Khởi Hành tăng gấp đôi ($400M) trong 1 vòng!`;
    break;
  }
  ```
- **Impact**:
  1. Passing START gives $200k VND. Landing directly on START (`newPosition === 0`) gives the exact same $200k VND (no landing bonus).
  2. `chaosModifiers.goldenHourTurns` is completely ignored in `gameReducer.ts`, so the advertised 2x multiplier ($400k pass / $800k land) is never awarded.

---

### 1.3 Turn Authorization & FSM Guards

#### A. Missing Envelope & Authorization Checks
- **`src/game/types/index.ts` Lines 247–266**:
  `GameAction` does not define `senderPlayerId?: string` or `actionId?: string`.
- **`src/game/gameReducer.ts` Lines 58–63**:
  Guard only checks `state.status === 'ENDED' || state.turnPhase === 'GAME_OVER'`. There is zero validation that the action dispatcher matches `state.players[state.activePlayerIndex].id`, nor that the dispatcher is not bankrupt.

#### B. Missing Action Idempotency Ring Buffer
- **`src/game/types/index.ts` Lines 228–245**:
  `GameState` does not have `processedActionIds: string[]`.
- **Impact**: Rapid button clicks, key-repeat on Spacebar, or network retries can duplicate critical financial transactions (e.g., double property purchase or double bail deduction).

#### C. Procedural Audio Side-Effects in Pure Reducer
- **`src/game/gameReducer.ts`**:
  Direct invocations of `soundEffects.*()` appear at lines 17, 96, 119, 200, 318, 370, 425, 475, 525, 606, 680, 709, 775, 805, 883.
- **Impact**: Violates pure reducer principles, causes Web Audio warnings in Node.js test runs, and makes action replays non-deterministic.

---

## 2. Logic Chain

1. **Jail Sentence Normalization**:
   - In standard rules, detention lasts up to 3 turns.
   - When a player is jailed, `detentionTurns` must be initialized to `3`.
   - The turn countdown represents the number of *escape attempts remaining*. It must be decremented *only when the player makes an unsuccessful escape attempt* (rolls non-doubles in `gameReducer.ts`).
   - Removing the automatic decrement from `advanceTurn` in `turnManager.ts` eliminates the double-decrement bug.
2. **Escape Movement & Mandatory Bail**:
   - If doubles are rolled on turns 1, 2, or 3: the prisoner is freed immediately (`inDetention = false, detentionTurns = 0`), moves forward by `sum = d1 + d2`, resolves the landing tile, and enters `ACTION_MENU` (or `BANKRUPTCY_CHECK`). `isDouble` is set to `false` because the roll was consumed to escape.
   - If non-doubles are rolled on turns 1 or 2 (`detentionTurns > 1`): `detentionTurns` decrements by 1 (`3 -> 2`, `2 -> 1`), and the player remains in detention (`turnPhase = 'ACTION_MENU'`).
   - If non-doubles are rolled on turn 3 (`detentionTurns === 1`): This is the final attempt. Mandatory bail ($50k) is deducted. If solvent, the player is freed and moves forward by `sum = d1 + d2`, resolving the landing tile. If insolvent, cash is set to 0 and the player enters `BANKRUPTCY_CHECK` with `pendingDebt`.
3. **Detention Card Flow**:
   - Adding `jailFreeCards: number` (default 0) to `PlayerState` allows players to collect cards from Chaos cards (`DETENTION_RELEASE`, `DETENTION_IMMUNITY`).
   - Dispatching `{ type: 'USE_DETENTION_CARD' }` validates `activePlayer.inDetention && activePlayer.jailFreeCards > 0`, decrements `jailFreeCards`, clears detention, and sets `turnPhase: 'WAITING_FOR_ROLL'`.
4. **Start Tile Arithmetic**:
   - Check `const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;` with `multiplier = isGoldenHour ? 2 : 1;`.
   - When `newPosition === 0`: Player landed directly on START. Award `$400k * multiplier` ($400k or $800k).
   - When `passedStart && newPosition !== 0`: Player passed START. Award `$200k * multiplier` ($200k or $400k).
5. **Turn Authorization & Idempotency**:
   - Defining `BaseActionEnvelope` with `actionId?: string; senderPlayerId?: string; timestamp?: number;`.
   - At reducer entry:
     - If `action.actionId` is present in `state.processedActionIds`, return `state` untouched.
     - If `action.senderPlayerId` is bankrupt, reject the action.
     - If `action.senderPlayerId` does not match `activePlayer.id` (and action is not a global action like `START_GAME`, `RESTART_GAME`, or `SELECT_TILE_DETAIL`), reject the action.
   - On successful state transition, push `action.actionId` into `processedActionIds`, retaining at most the last 50 IDs.
6. **Sound Decoupling**:
   - Replace direct imports of `soundEffects` with a pluggable listener `SoundEffectListener`.
   - In Node.js / unit tests, the listener defaults to `null` (zero audio side effects).
   - In browser runtime (`App.tsx`), `setSoundListener` hooks directly into `soundEffects`.

---

## 3. Caveats & Invariant Safeguards

1. **Test Compatibility on Doubles Escape**:
   - In Phase 01, two tests (`tier3_combinations.test.ts:75` and `tier5_adversarial_hardening.test.ts:492`) tested an incomplete stub where doubles escape left the player at Tile 10 with `turnPhase: 'WAITING_FOR_ROLL'`.
   - With the correct spec ("when escaping via doubles, move player by rolled dice sum"), escaping with `[5, 5]` moves the player to Tile 20 (`10 + 10 = 20`) and transitions to `ACTION_MENU`.
   - *Recommendation*: The Worker implementing this change must update lines 74–75 of `tier3_combinations.test.ts` and lines 491–492 of `tier5_adversarial_hardening.test.ts` to assert `position === 20` and `turnPhase === 'ACTION_MENU'`.
2. **Auction and Trading Exemption in Milestone 2**:
   - In Milestone 2, non-active players will submit bids in auctions (`PLACE_BID`, `PASS_BID`) and respond to trade proposals (`ACCEPT_TRADE`, `REJECT_TRADE`).
   - The authorization guard must explicitly whitelist auction and trade action types so non-active players are not rejected during those phases.
3. **Mandatory Bail Insolvency**:
   - If a player with less than $50k cash fails their 3rd roll, deducting $50k directly would breach the non-negative cash invariant.
   - The implementation must transfer available cash, set cash to 0, and create a `pendingDebt` record targeting `creditorPlayerId: null` (Bank debt), transitioning to `turnPhase: 'BANKRUPTCY_CHECK'`.

---

## 4. Conclusion & Concrete Implementation Strategy

### 4.1 Type Definitions (`src/game/types/index.ts`)

```typescript
// 1. Extend PlayerState
export interface PlayerState {
  id: PlayerId;
  name: string;
  token: PlayerToken;
  cash: number;
  position: TileId;
  inDetention: boolean;
  detentionTurns: number;
  jailFreeCards: number; // NEW: Inventory of Get Out of Detention cards (default 0)
  isBankrupt: boolean;
  isAI?: boolean;
  consecutiveDoubles: number;
  stats: {
    rentPaid: number;
    rentCollected: number;
    chaosTriggered: number;
    tilesTraveled: number;
    propertiesOwned: number;
  };
}

// 2. Extend GameState
export interface GameState {
  config: GameConfig;
  status: 'SETUP' | 'PLAYING' | 'ENDED';
  players: PlayerState[];
  activePlayerIndex: number;
  turnPhase: TurnPhase;
  roundNumber: number;
  dice: [number, number];
  isDouble: boolean;
  properties: Record<TileId, PropertyOwnership>;
  activeChaosCard: ChaosCard | null;
  pendingDebt?: PendingDebt | null;
  logs: GameLogEntry[];
  winner: PlayerState | null;
  selectedTileForDetail: TileId | null;
  rentModifier: number;
  chaosModifiers?: ChaosModifiers;
  processedActionIds?: string[]; // NEW: Ring buffer of last 50 processed action IDs
  lastSoundEffect?: SoundEffectType | null; // NEW: Decoupled sound event emitter
}

// 3. Action Envelope & Union
export interface BaseActionEnvelope {
  actionId?: string;
  senderPlayerId?: string;
  timestamp?: number;
}

export type GameActionPayload =
  | { type: 'START_GAME'; players: { name: string; token?: PlayerToken; isAI?: boolean }[]; config?: Partial<GameConfig> }
  | { type: 'ROLL_DICE_START' }
  | { type: 'ROLL_DICE_RESULT'; dice: [number, number] }
  | { type: 'STEP_MOVE_COMPLETE' }
  | { type: 'BUY_PROPERTY'; tileId: TileId }
  | { type: 'UPGRADE_PROPERTY'; tileId: TileId }
  | { type: 'DOWNGRADE_PROPERTY'; tileId: TileId }
  | { type: 'MORTGAGE_PROPERTY'; tileId: TileId }
  | { type: 'UNMORTGAGE_PROPERTY'; tileId: TileId }
  | { type: 'PAY_RENT'; tileId: TileId }
  | { type: 'PAY_DETENTION_BAIL' }
  | { type: 'USE_DETENTION_CARD' } // NEW: Action to consume 1 card and exit detention
  | { type: 'RESOLVE_CHAOS' }
  | { type: 'APPLY_CHAOS_EFFECT'; payload: ChaosEventPayload | ChaosCard }
  | { type: 'RESOLVE_DEBT' }
  | { type: 'END_TURN' }
  | { type: 'DECLARE_BANKRUPTCY'; playerId: PlayerId }
  | { type: 'SELECT_TILE_DETAIL'; tileId: TileId | null }
  | { type: 'RESTART_GAME' };

export type GameAction = GameActionPayload & BaseActionEnvelope;
```

---

### 4.2 Sound Decoupling Engine (`src/game/sound/soundEmitter.ts` or inside `gameReducer.ts`)

```typescript
export type SoundEffectType =
  | 'buyProperty'
  | 'diceRoll'
  | 'payRent'
  | 'upgradeProperty'
  | 'victory'
  | 'chaosTrigger'
  | 'click'
  | 'tokenStep';

export type SoundEffectListener = (effect: SoundEffectType) => void;

let activeSoundListener: SoundEffectListener | null = null;

export function setSoundListener(listener: SoundEffectListener | null): void {
  activeSoundListener = listener;
}

export function emitSound(effect: SoundEffectType): void {
  if (activeSoundListener) {
    try {
      activeSoundListener(effect);
    } catch {
      // Audio execution failure must never corrupt state reduction
    }
  }
}
```

---

### 4.3 Reducer Implementation Changes (`src/game/gameReducer.ts`)

#### A. Initial State & FSM Guards
```typescript
export const INITIAL_GAME_STATE: GameState = {
  // ... existing fields ...
  processedActionIds: [],
  lastSoundEffect: null,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  // 1. Terminal State Guard
  if ((state.status === 'ENDED' || state.turnPhase === 'GAME_OVER') && action.type !== 'RESTART_GAME') {
    return state;
  }

  // 2. Action Idempotency Guard (Ring Buffer max 50)
  if (action.actionId && state.processedActionIds && state.processedActionIds.includes(action.actionId)) {
    console.warn(`[IDEMPOTENCY] Dropping duplicate actionId: ${action.actionId}`);
    return state;
  }

  // 3. Sender Authorization Guard
  if (action.senderPlayerId) {
    const sender = state.players.find(p => p.id === action.senderPlayerId);
    if (sender && sender.isBankrupt) {
      console.warn(`[AUTHORIZATION] Bankrupt player ${action.senderPlayerId} rejected from action ${action.type}`);
      return state;
    }

    const activePlayer = state.players[state.activePlayerIndex];
    const isGlobalAction =
      action.type === 'START_GAME' ||
      action.type === 'RESTART_GAME' ||
      action.type === 'SELECT_TILE_DETAIL' ||
      action.type === 'RESOLVE_CHAOS';

    if (!isGlobalAction && activePlayer && action.senderPlayerId !== activePlayer.id) {
      console.warn(`[AUTHORIZATION] Non-active player ${action.senderPlayerId} rejected from action ${action.type}`);
      return state;
    }
  }

  // Execute action reduction...
  const nextState = reduceAction(state, action);

  // Maintain 50-item idempotency ring buffer
  if (action.actionId && nextState !== state) {
    const existingIds = state.processedActionIds || [];
    nextState.processedActionIds = [...existingIds.slice(-49), action.actionId];
  }

  return nextState;
}
```

#### B. Detention Handling in `ROLL_DICE_RESULT`
```typescript
case 'ROLL_DICE_RESULT': {
  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer || activePlayer.isBankrupt) return state;

  const dice = action.dice || rollTwoDice().dice;
  const [d1, d2] = dice;
  const sum = d1 + d2;
  const isDouble = d1 === d2;

  // Case 1: Player is currently in Detention
  if (activePlayer.inDetention) {
    if (isDouble) {
      // Free on doubles: move by sum, no extra roll
      emitSound('diceRoll');
      const { newPosition, passedStart } = calculateNewPosition(activePlayer.position, sum, BOARD_SIZE);
      const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
      const salaryMultiplier = isGoldenHour ? 2 : 1;

      let earnedSalary = 0;
      let salaryLog = '';
      if (newPosition === 0) {
        earnedSalary = (state.config.salaryOnStart * 2) * salaryMultiplier;
        salaryLog = ` và đáp trúng Cổng Khởi Hành nhận thưởng $${earnedSalary}M${isGoldenHour ? ' (x2 Giờ Vàng)!' : '!'}`;
      } else if (passedStart) {
        earnedSalary = state.config.salaryOnStart * salaryMultiplier;
        salaryLog = ` và nhận $${earnedSalary}M trợ cấp Cổng Khởi Hành${isGoldenHour ? ' (x2 Giờ Vàng)!' : '!'}`;
      }

      const updatedPlayer: PlayerState = {
        ...activePlayer,
        position: newPosition,
        cash: activePlayer.cash + earnedSalary,
        inDetention: false,
        detentionTurns: 0,
        consecutiveDoubles: 0,
        stats: {
          ...activePlayer.stats,
          tilesTraveled: activePlayer.stats.tilesTraveled + sum,
        },
      };

      const updatedPlayers = [...state.players];
      updatedPlayers[state.activePlayerIndex] = updatedPlayer;

      const landingTile = getTileById(newPosition);
      const escapeLog: GameLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        message: `[THOÁT GIAM] ${activePlayer.name} lắc được đôi ${d1}-${d2}! Tự do và tiến ${sum} ô đến [${landingTile?.name || newPosition}]${salaryLog}.`,
        type: 'INFO',
      };

      const stateAfterEscape: GameState = {
        ...state,
        players: updatedPlayers,
        dice,
        isDouble: false, // Invariant: Escaping via doubles does NOT grant an extra roll
        turnPhase: 'ACTION_MENU',
        logs: [escapeLog, ...state.logs],
      };

      return resolveLandingTile(stateAfterEscape, newPosition, sum);
    } else {
      // Non-doubles while detained
      if (activePlayer.detentionTurns > 1) {
        // Turns 1 or 2: Remain detained, decrement counter
        const remainingTurns = activePlayer.detentionTurns - 1;
        const updatedPlayer: PlayerState = {
          ...activePlayer,
          detentionTurns: remainingTurns,
        };
        const updatedPlayers = [...state.players];
        updatedPlayers[state.activePlayerIndex] = updatedPlayer;

        return {
          ...state,
          players: updatedPlayers,
          dice,
          isDouble: false,
          turnPhase: 'ACTION_MENU',
          logs: [
            {
              id: `log-${Date.now()}`,
              timestamp: Date.now(),
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              message: `${activePlayer.name} lắc được ${d1}-${d2} (không phải đôi), tiếp tục ở lại Khu Cách Ly (còn ${remainingTurns} lượt).`,
              type: 'INFO',
            },
            ...state.logs,
          ],
        };
      } else {
        // Turn 3: Final attempt failed -> MANDATORY BAIL
        const bailCost = state.config.detentionBailCost;
        if (activePlayer.cash >= bailCost) {
          emitSound('buyProperty');
          const { newPosition, passedStart } = calculateNewPosition(activePlayer.position, sum, BOARD_SIZE);
          const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
          const salaryMultiplier = isGoldenHour ? 2 : 1;

          let earnedSalary = 0;
          if (newPosition === 0) {
            earnedSalary = (state.config.salaryOnStart * 2) * salaryMultiplier;
          } else if (passedStart) {
            earnedSalary = state.config.salaryOnStart * salaryMultiplier;
          }

          const updatedPlayer: PlayerState = {
            ...activePlayer,
            position: newPosition,
            cash: activePlayer.cash - bailCost + earnedSalary,
            inDetention: false,
            detentionTurns: 0,
            consecutiveDoubles: 0,
            stats: {
              ...activePlayer.stats,
              tilesTraveled: activePlayer.stats.tilesTraveled + sum,
            },
          };

          const updatedPlayers = [...state.players];
          updatedPlayers[state.activePlayerIndex] = updatedPlayer;

          const landingTile = getTileById(newPosition);
          const forcedBailLog: GameLogEntry = {
            id: `log-forced-bail-${Date.now()}`,
            timestamp: Date.now(),
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            message: `[BẢO LÃNH BẮT BUỘC] Hết 3 lượt tạm giam. ${activePlayer.name} nộp $${bailCost}M bảo lãnh và di chuyển ${sum} ô đến [${landingTile?.name || newPosition}].`,
            type: 'WARNING',
          };

          const stateAfterForcedBail: GameState = {
            ...state,
            players: updatedPlayers,
            dice,
            isDouble: false,
            turnPhase: 'ACTION_MENU',
            logs: [forcedBailLog, ...state.logs],
          };

          return resolveLandingTile(stateAfterForcedBail, newPosition, sum);
        } else {
          // Cannot afford mandatory bail -> Debt Liquidation
          const availableCash = activePlayer.cash;
          const remainingDebt = bailCost - availableCash;
          const updatedPlayer: PlayerState = {
            ...activePlayer,
            cash: 0,
            detentionTurns: 0,
          };
          const updatedPlayers = [...state.players];
          updatedPlayers[state.activePlayerIndex] = updatedPlayer;

          return {
            ...state,
            players: updatedPlayers,
            dice,
            isDouble: false,
            turnPhase: 'BANKRUPTCY_CHECK',
            pendingDebt: {
              creditorPlayerId: null,
              amount: remainingDebt,
              reason: `Bảo lãnh bắt buộc rời Khu Cách Ly ($${bailCost}M)`,
            },
            logs: [
              {
                id: `log-bail-debt-${Date.now()}`,
                timestamp: Date.now(),
                playerId: activePlayer.id,
                playerName: activePlayer.name,
                message: `[CẢNH BÁO NỢ] ${activePlayer.name} không đủ tiền nộp bảo lãnh bắt buộc $${bailCost}M!`,
                type: 'WARNING',
              },
              ...state.logs,
            ],
          };
        }
      }
    }
  }

  // Case 2: Consecutive doubles jail check (Set detentionTurns to 3)
  const consecutiveDoubles = isDouble ? activePlayer.consecutiveDoubles + 1 : 0;
  if (consecutiveDoubles >= 3) {
    emitSound('payRent');
    const updatedPlayer: PlayerState = {
      ...activePlayer,
      position: 10,
      inDetention: true,
      detentionTurns: 3, // Fixed: 3 turns
      consecutiveDoubles: 0,
    };
    const updatedPlayers = [...state.players];
    updatedPlayers[state.activePlayerIndex] = updatedPlayer;

    return {
      ...state,
      players: updatedPlayers,
      dice,
      isDouble: false,
      turnPhase: 'ACTION_MENU',
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: Date.now(),
          playerId: activePlayer.id,
          playerName: activePlayer.name,
          message: `[CẢNH BÁO] ${activePlayer.name} lắc 3 lần đôi liên tiếp! Bị áp giải tới Khu Cách Ly An Ninh (3 lượt).`,
          type: 'WARNING',
        },
        ...state.logs,
      ],
    };
  }

  // Case 3: Normal Movement & Start Tile Rewards
  const { newPosition, passedStart } = calculateNewPosition(activePlayer.position, sum, BOARD_SIZE);
  const isGoldenHour = (state.chaosModifiers?.goldenHourTurns || 0) > 0;
  const salaryMultiplier = isGoldenHour ? 2 : 1;

  let earnedSalary = 0;
  let salaryLog = '';
  if (newPosition === 0) {
    // Landed directly on START -> $400k (or $800k if golden hour)
    earnedSalary = (state.config.salaryOnStart * 2) * salaryMultiplier;
    salaryLog = ` Đáp trúng Cổng Khởi Hành nhận thưởng lớn $${earnedSalary}M${isGoldenHour ? ' (x2 Giờ Vàng)!' : '!'}`;
  } else if (passedStart) {
    // Passed START -> $200k (or $400k if golden hour)
    earnedSalary = state.config.salaryOnStart * salaryMultiplier;
    salaryLog = ` Đi qua Cổng Khởi Hành nhận $${earnedSalary}M trợ cấp${isGoldenHour ? ' (x2 Giờ Vàng)!' : '!'}`;
  }

  const updatedPlayer: PlayerState = {
    ...activePlayer,
    position: newPosition,
    cash: activePlayer.cash + earnedSalary,
    consecutiveDoubles,
    stats: {
      ...activePlayer.stats,
      tilesTraveled: activePlayer.stats.tilesTraveled + sum,
    },
  };
  // ... continue normal reduction ...
}
```

#### C. `USE_DETENTION_CARD` Action Handler
```typescript
case 'USE_DETENTION_CARD': {
  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer.inDetention || (activePlayer.jailFreeCards || 0) <= 0) {
    return state;
  }

  emitSound('buyProperty');
  const updatedPlayer: PlayerState = {
    ...activePlayer,
    inDetention: false,
    detentionTurns: 0,
    jailFreeCards: activePlayer.jailFreeCards - 1,
  };

  const updatedPlayers = [...state.players];
  updatedPlayers[state.activePlayerIndex] = updatedPlayer;

  return {
    ...state,
    players: updatedPlayers,
    turnPhase: 'WAITING_FOR_ROLL',
    logs: [
      {
        id: `jail-card-${Date.now()}`,
        timestamp: Date.now(),
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        message: `[THẺ MIỄN GIAM] ${activePlayer.name} sử dụng Thẻ Miễn Giam để rời Khu Cách Ly (còn lại ${updatedPlayer.jailFreeCards} thẻ).`,
        type: 'INFO',
      },
      ...state.logs,
    ],
  };
}
```

#### D. Tile 30 (`GO_TO_JAIL`) in `resolveLandingTile`
```typescript
case 'GO_TO_JAIL': {
  emitSound('payRent');
  const updatedPlayer: PlayerState = {
    ...activePlayer,
    position: 10,
    inDetention: true,
    detentionTurns: 3, // Fixed: 3 turns
    consecutiveDoubles: 0,
  };
  updatedPlayers[state.activePlayerIndex] = updatedPlayer;

  newLogs.unshift({
    id: `jail-${Date.now()}`,
    timestamp: Date.now(),
    playerId: activePlayer.id,
    playerName: activePlayer.name,
    message: `[LỆNH BẮT TẠM GIAM] ${activePlayer.name} dừng tại [${landingTile.name}] và bị áp giải ngay về Khu Cách Ly Tạm Giam (3 lượt)!`,
    type: 'WARNING',
  });

  return {
    ...state,
    players: updatedPlayers,
    isDouble: false,
    turnPhase: 'ACTION_MENU',
    logs: newLogs,
  };
}
```

---

### 4.4 Turn Manager Fix (`src/game/turn-manager/turnManager.ts`)

Remove the automatic decrement of `detentionTurns` from lines 68–84:
```typescript
// BEFORE:
let updatedPlayer = { ...nextPlayer, consecutiveDoubles: 0 };
if (updatedPlayer.inDetention) {
  if (updatedPlayer.detentionTurns > 1) {
    updatedPlayer = {
      ...updatedPlayer,
      detentionTurns: updatedPlayer.detentionTurns - 1,
    };
  } else {
    updatedPlayer = {
      ...updatedPlayer,
      inDetention: false,
      detentionTurns: 0,
    };
  }
}

// AFTER:
// Detention countdown is managed strictly inside gameReducer when the player rolls.
// TurnManager only resets consecutiveDoubles.
const updatedPlayer = { ...nextPlayer, consecutiveDoubles: 0 };
```

---

### 4.5 Chaos Engine Card Grant Fix (`src/game/chaos-engine/chaosEngine.ts`)

```typescript
case 'DETENTION_IMMUNITY':
case 'DETENTION_RELEASE': {
  const newCardCount = (activePlayer.jailFreeCards || 0) + 1;
  updatedPlayers[state.activePlayerIndex] = {
    ...activePlayer,
    jailFreeCards: newCardCount,
  };
  logMsg += ` -> Nhận 1 Thẻ Miễn Trừ Giam Giữ đặc quyền! (Tổng số thẻ sở hữu: ${newCardCount})`;
  break;
}
```

---

## 5. Comprehensive Unit Test Specifications

The following test suites must be created/integrated in `src/game/__tests__/tier1_detention_start_fsm.test.ts` to independently verify all changes:

```typescript
import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { advanceTurn } from '../turn-manager/turnManager';
import { GameState, PlayerState } from '../types';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';

function setup2PGame(): GameState {
  return gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    players: [
      { name: 'Alice', token: DEFAULT_PLAYER_TOKENS[0] },
      { name: 'Bob', token: DEFAULT_PLAYER_TOKENS[1] },
    ],
  });
}

describe('M1-3: Jail & Detention Overhaul', () => {
  it('initializes detentionTurns to exactly 3 when sent to detention', () => {
    let state = setup2PGame();
    // Speeding: 3 doubles
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 2] });
    state = gameReducer(state, { type: 'END_TURN' });
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [3, 3] });
    state = gameReducer(state, { type: 'END_TURN' });
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });

    expect(state.players[0].inDetention).toBe(true);
    expect(state.players[0].detentionTurns).toBe(3);
    expect(state.players[0].position).toBe(10);
  });

  it('preserves detentionTurns across advanceTurn (no double-decrement bug)', () => {
    let state = setup2PGame();
    state.players[0].inDetention = true;
    state.players[0].detentionTurns = 3;
    state.activePlayerIndex = 1; // Bob's turn

    state = advanceTurn(state);
    expect(state.activePlayerIndex).toBe(0);
    // Alice's detentionTurns must still be 3, not decremented by advanceTurn
    expect(state.players[0].detentionTurns).toBe(3);
    expect(state.players[0].inDetention).toBe(true);
  });

  it('moves player by rolled dice sum and frees them when escaping via doubles', () => {
    let state = setup2PGame();
    state.players[0].inDetention = true;
    state.players[0].detentionTurns = 3;
    state.players[0].position = 10;

    // Roll double [4, 4] = 8
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [4, 4] });

    expect(state.players[0].inDetention).toBe(false);
    expect(state.players[0].detentionTurns).toBe(0);
    expect(state.players[0].position).toBe(18); // 10 + 8
    expect(state.isDouble).toBe(false); // No extra roll
    expect(state.turnPhase).toBe('ACTION_MENU');
  });

  it('decrements detentionTurns sequentially on non-doubles across 3 turns', () => {
    let state = setup2PGame();
    state.players[0].inDetention = true;
    state.players[0].detentionTurns = 3;
    state.players[0].position = 10;

    // Turn 1: roll non-doubles [1, 2]
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
    expect(state.players[0].inDetention).toBe(true);
    expect(state.players[0].detentionTurns).toBe(2);
    expect(state.players[0].position).toBe(10);

    // Turn 2: roll non-doubles [2, 3]
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
    expect(state.players[0].inDetention).toBe(true);
    expect(state.players[0].detentionTurns).toBe(1);
    expect(state.players[0].position).toBe(10);
  });

  it('enforces mandatory bail on the 3rd failed roll and moves player', () => {
    let state = setup2PGame();
    const initialCash = state.players[0].cash;
    state.players[0].inDetention = true;
    state.players[0].detentionTurns = 1; // 3rd and final attempt
    state.players[0].position = 10;

    // Turn 3: roll non-doubles [2, 4] = 6
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 4] });

    expect(state.players[0].inDetention).toBe(false);
    expect(state.players[0].detentionTurns).toBe(0);
    expect(state.players[0].cash).toBe(initialCash - 50); // $50k bail deducted
    expect(state.players[0].position).toBe(16); // 10 + 6
    expect(state.turnPhase).toBe('ACTION_MENU');
  });

  it('allows consuming a jailFreeCard via USE_DETENTION_CARD to walk free', () => {
    let state = setup2PGame();
    state.players[0].inDetention = true;
    state.players[0].detentionTurns = 2;
    state.players[0].jailFreeCards = 1;

    state = gameReducer(state, { type: 'USE_DETENTION_CARD' });
    expect(state.players[0].inDetention).toBe(false);
    expect(state.players[0].detentionTurns).toBe(0);
    expect(state.players[0].jailFreeCards).toBe(0);
    expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
  });
});

describe('M1-3: Start Tile Rewards (Passing vs Landing)', () => {
  it('awards standard $200k salary when passing tile 0', () => {
    let state = setup2PGame();
    const initialCash = state.players[0].cash;
    state.players[0].position = 38;

    // Roll [1, 2] = 3 -> lands on Tile 1 (passed tile 0)
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
    expect(state.players[0].position).toBe(1);
    expect(state.players[0].cash).toBe(initialCash + 200);
  });

  it('awards double salary ($400k) when passing tile 0 during Golden Hour', () => {
    let state = setup2PGame();
    const initialCash = state.players[0].cash;
    state.players[0].position = 38;
    state.chaosModifiers = { ...state.chaosModifiers!, goldenHourTurns: 1 };

    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
    expect(state.players[0].position).toBe(1);
    expect(state.players[0].cash).toBe(initialCash + 400);
  });

  it('awards $400k bonus when landing directly on tile 0', () => {
    let state = setup2PGame();
    const initialCash = state.players[0].cash;
    state.players[0].position = 38;

    // Roll [1, 1] = 2 -> lands directly on Tile 0
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 1] });
    expect(state.players[0].position).toBe(0);
    expect(state.players[0].cash).toBe(initialCash + 400);
  });

  it('awards $800k bonus when landing directly on tile 0 during Golden Hour', () => {
    let state = setup2PGame();
    const initialCash = state.players[0].cash;
    state.players[0].position = 38;
    state.chaosModifiers = { ...state.chaosModifiers!, goldenHourTurns: 1 };

    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 1] });
    expect(state.players[0].position).toBe(0);
    expect(state.players[0].cash).toBe(initialCash + 800);
  });
});

describe('M1-3: Turn Authorization & FSM Guards', () => {
  it('rejects action when senderPlayerId does not match active player', () => {
    let state = setup2PGame();
    expect(state.activePlayerIndex).toBe(0); // Alice's turn

    // Bob tries to roll dice
    const stateAttempt = gameReducer(state, {
      type: 'ROLL_DICE_START',
      senderPlayerId: state.players[1].id,
    });

    expect(stateAttempt).toBe(state); // Rejected
  });

  it('rejects actions from bankrupt players', () => {
    let state = setup2PGame();
    state.players[0].isBankrupt = true;

    const stateAttempt = gameReducer(state, {
      type: 'ROLL_DICE_START',
      senderPlayerId: state.players[0].id,
    });

    expect(stateAttempt).toBe(state);
  });

  it('drops duplicate actions with the same actionId (Idempotency Guard)', () => {
    let state = setup2PGame();
    const actionId = 'action-uuid-12345';

    // First dispatch
    state = gameReducer(state, {
      type: 'BUY_PROPERTY',
      tileId: 1,
      actionId,
    });
    expect(state.processedActionIds).toContain(actionId);
    const cashAfterFirstBuy = state.players[0].cash;

    // Duplicate dispatch
    state = gameReducer(state, {
      type: 'BUY_PROPERTY',
      tileId: 1,
      actionId,
    });
    // Cash must remain unchanged (not deducted again)
    expect(state.players[0].cash).toBe(cashAfterFirstBuy);
  });

  it('limits processedActionIds ring buffer to maximum 50 entries', () => {
    let state = setup2PGame();
    for (let i = 0; i < 60; i++) {
      state = gameReducer(state, {
        type: 'SELECT_TILE_DETAIL',
        tileId: i % 40,
        actionId: `action-${i}`,
      });
    }

    expect(state.processedActionIds?.length).toBe(50);
    expect(state.processedActionIds).not.toContain('action-0'); // Oldest evicted
    expect(state.processedActionIds).toContain('action-59'); // Newest retained
  });
});
```

---

## 6. Verification Method

1. **Verify Baseline Test Continuity**:
   ```bash
   npx vitest run
   ```
   All existing test suites must pass 100%.
2. **Verify New M1-3 Test Suite**:
   ```bash
   npx vitest run src/game/__tests__/tier1_detention_start_fsm.test.ts
   ```
   Must yield 13 passed tests with 0 failures.
3. **Verify Pure Reducer Sound Decoupling**:
   Run tests in an environment without browser Web Audio globals:
   ```bash
   npx vitest run --no-threads
   ```
   Must execute cleanly with zero Web Audio warnings or crashes.
4. **Production Build Compilation**:
   ```bash
   npm run build
   ```
   Must compile cleanly with zero TypeScript errors.
