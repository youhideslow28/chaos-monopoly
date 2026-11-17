# BRIEFING — 2026-10-31T09:59:00Z

## Mission
Formulate the authoritative Game Rules & Chaos Engine Specification for CHAOS MONOPOLY with 40 Vietnamese-themed tiles, complete hot-seat economy, and 30+ structured Chaos events.

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: explorer, game_designer, chaos_engine_architect
- Working directory: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_2
- Original parent: 5a96e09c-9d3f-4485-a785-45777085b755
- Milestone: survey_phase_game_and_chaos_spec

## 🔒 Key Constraints
- Read-only investigation — do NOT modify application source code
- Produce authoritative game specification in .agents/teamwork/teamwork_explorer_survey_2/
- Vietnamese default language themed after modern Vietnamese economic centers
- 40 tiles standard Monopoly layout with original Chaos additions
- 45-60 min match duration target, turn limit 60-80 turns
- Comprehensive Chaos engine with >= 30 distinct events, trigger mechanisms, and deterministic state transitions

## Current Parent
- Conversation ID: 5a96e09c-9d3f-4485-a785-45777085b755
- Updated: not yet

## Investigation State
- **Explored paths**: ORIGINAL_REQUEST.md, orchestrator/BRIEFING.md, src/game/ (types, board, chaos-engine, economy, property, turn-manager, dice, win-condition, __tests__)
- **Key findings**: Current codebase implemented a 24-tile prototype with 12 cards; our comprehensive specification delivers the full 40-tile modern Vietnamese board mapping, 36 structured Chaos cards, Mulberry32 PRNG engine, 5-level upgrade system, mortgage/debt liquidation rules, and turn limit anti-stall mechanics.
- **Unexplored areas**: None for survey phase; full specification delivered in `game_and_chaos_spec.md`.

## Key Decisions Made
- Standardize monetary unit on thousands VND (`k VND`, e.g., 1,500k starting, 200k GO bonus).
- Complete 40 tiles mapped across Cần Thơ, Nha Trang, Huế, Hải Phòng, Đà Nẵng, Phú Quốc, Hà Nội, TP.HCM, plus 4 transport hubs, 2 utilities, and 12 special/action tiles.
- 36 distinct Chaos events cataloged with categories (Positive, Negative, Personal, Global, Economic, Legendary), rarities, triggers, and state mutation payloads.
- Seedable PRNG (Mulberry32) specified for deterministic replayability and unit testing.

## Artifact Index
- c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_2\game_and_chaos_spec.md — Complete specification
- c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_2\progress.md — Heartbeat and progress
- c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_2\handoff.md — Self-contained handoff report
