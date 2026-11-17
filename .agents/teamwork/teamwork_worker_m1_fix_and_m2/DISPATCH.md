## 2026-10-31T10:29:17Z
You are a teamwork_worker.
Your working directory is: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_worker_m1_fix_and_m2\
Please create progress.md in your working directory to log your heartbeat.

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Domain Skill: Read and follow:
c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\skills\typescript-architecture\SKILL.md

Inputs to inspect:
- Master Project Specification: c:\Users\hxn\Desktop\CHAOS MONOPOLY\PROJECT.md
- Game & Board Specification: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_2\game_and_chaos_spec.md
- Reviewer 1 Findings: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_reviewer_m1_1\handoff.md
- Challenger 1 Findings: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_challenger_m1_1\handoff.md
- Challenger 2 Findings: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_challenger_m1_2\handoff.md

Your Objective is Twofold:
PART A: Apply M1 Consensus Remediation Fixes
1. In `src/game/gameReducer.ts`, allow `RESOLVE_DEBT` when `turnPhase === 'DEBT_LIQUIDATION'` OR `turnPhase === 'BANKRUPTCY_CHECK'`.
2. In `src/game/gameReducer.ts`, add a guard in `END_TURN` rejecting turn progression if `turnPhase === 'BANKRUPTCY_CHECK'` or `state.pendingDebt !== null`.
3. In `src/game/gameReducer.ts`, add a top-level guard when `state.status === 'ENDED'` or `state.turnPhase === 'GAME_OVER'`, rejecting subsequent gameplay mutations (`ROLL_DICE_START`, `ROLL_DICE_RESULT`, `BUY_PROPERTY`, `UPGRADE_PROPERTY`, etc. except `RESTART_GAME`).
4. In `src/game/economy/economyEngine.ts` and `src/game/gameReducer.ts`, in `DECLARE_BANKRUPTCY`, transfer any remaining player cash to the creditor (if creditor exists), instead of discarding/zeroing it out.
5. In `src/game/turn-manager/turnManager.ts` and `src/game/win-condition/winCondition.ts`, update the round cap check so all 60 rounds are played (`newRound > maxRounds`).
6. In `src/game/chaos-engine/chaosEngine.ts:89`, update `position: 6` to `position: 10` for Detention (`Khu Cách Ly Tạm Giam`).

PART B: Implement Milestone 2 (Chaos PRNG Engine & 36 Events)
1. Deterministic Mulberry32 PRNG:
   - Create `src/game/chaos-engine/prng.ts` exporting a seedable PRNG (`createPRNG(seed?: number)`) and seedable shuffle / random choice functions.
2. Complete 36 Vietnamese Chaos Cards Catalog:
   - Update `src/game/chaos-engine/chaosCards.ts` to implement all 36 distinct cards detailed in Section 4.2 of `game_and_chaos_spec.md` across all 6 categories: POSITIVE, NEGATIVE, PERSONAL, GLOBAL, ECONOMIC, RARE LEGENDARY.
3. Chaos Engine Triggers & Reducer Integration:
   - In `src/game/chaos-engine/chaosEngine.ts`, support the 4 trigger pathways (`TILE_LANDED`, `DOUBLE_DICE`, `ROUND_INTERVAL`, `CRISIS_DESPERATION`).
   - Implement deterministic effect resolvers in `chaosEngine.ts` and `gameReducer.ts` (`APPLY_CHAOS_EFFECT` / `RESOLVE_CHAOS`).
   - Export `ChaosEventPayload` and necessary types in `src/game/types/index.ts`.
4. Automated Verification:
   - Run `npm test` across all test suites (including `challenger_empirical_m1.test.ts` and `adversarial_stress.test.ts` if present). Ensure 100% test pass rate!
   - Run `npm run build` (`tsc && vite build`) and ensure 0 errors.

Output Requirements:
- Write comprehensive handoff report to `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_worker_m1_fix_and_m2\handoff.md`.
- Send completion message to parent with build and test outputs.
