## 2026-10-31T11:30:43Z

You are Explorer M1-3 for CHAOS MONOPOLY Phase 02 (Milestone 1: Core Rules, Movement, Detention & FSM Guards).
Your working directory is: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_m1_3
Write your findings and strategy report (handoff.md) there.
Maintain progress.md with "Last visited: [timestamp]" in your working directory.

MANDATORY:
1. Read ORIGINAL_REQUEST.md at c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\ORIGINAL_REQUEST.md.
2. Read PROJECT.md at c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\orchestrator_p2\PROJECT.md.
3. Read Survey findings at c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_p2_survey_1\handoff.md and survey_3\handoff.md.

Task Scope:
Do NOT write production code. Recommend the exact implementation strategy, file changes, function signatures, and unit tests for:
1. Jail & Detention Overhaul:
   - Fix double-decrement bug in `gameReducer.ts` and `turnManager.ts` (jail detention must last up to 3 player turns max).
   - Add `jailFreeCards: number` to `PlayerState` interface in `types/index.ts`.
   - Wire `USE_DETENTION_CARD` action to release player and consume 1 card.
   - Fix doubles escape: when escaping via doubles, move player by rolled dice sum.
   - Enforce mandatory bail on 3rd turn if doubles fail.
2. Start Tile Rewards:
   - Passing START: $200k VND salary (or $400k if `goldenHourTurns > 0`).
   - Landing directly on START: $400k VND bonus (or $800k if `goldenHourTurns > 0`).
3. Turn Authorization & FSM Guards:
   - Add `senderPlayerId?: string` to `GameAction` envelopes.
   - Enforce action authorization (active player only, except for global responses).
   - Add action idempotency ring buffer (`processedActionIds: string[]`, max 50).
   - Decouple sound effects from pure reducer (wrap in optional side-effect callback or event emission).

Write handoff.md with complete details. Send message back when done.
