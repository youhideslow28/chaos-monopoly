---
name: backend-api-design
description: >-
  Turn-based and real-time multiplayer backend API design. Covers WebSocket protocols, room management,
  authoritative server models, state reconciliation, and anti-cheat validation.
risk: none
source: community
date_added: "2026-03-01"
---

# Backend API Design for Turn-Based & Multiplayer Games

## 1. Authoritative Server Pattern
- Client only sends **Intent/Action** requests (`{ type: 'ROLL_DICE' }`, `{ type: 'PURCHASE_PROPERTY', tileId }`).
- Server validates action legality against current authoritative state.
- Server computes randomness (dice rolls, chaos card draws) server-side to prevent tampering.
- Server broadcasts state patches or full snapshots to all connected peers.

## 2. Room & Session Lifecycle
- Room creation with unique join code (e.g., `CHAOS-7892`).
- Heartbeat / ping-pong for disconnect detection.
- Graceful reconnection: 60-second player disconnect buffer before AI takeover or match forfeiture.
