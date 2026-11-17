# KNOWN ISSUES & ARCHITECTURAL NOTES — CHAOS MONOPOLY (PHASE 07)

## Resolved in Phase 07 (Production Readiness & Hardening)
1. **Frontend Bundle Size & Code Splitting (Resolved)**:
   - *Previously*: Main bundle was 592.59 kB causing Vite warning (> 500 kB) because 13 modals and all world packs were eagerly loaded in the initial chunk.
   - *Resolution*: Implemented `React.lazy()` for all modals and world packs, plus Rollup `manualChunks` in `vite.config.ts`. Main chunk reduced by 56.5% to **257.90 kB** (gzip 73.82 kB). Zero bundle size warnings remaining.
2. **Runtime Exception Resilience (Resolved)**:
   - *Previously*: An uncaught React exception in a modal or child component could cause the whole page to blank screen.
   - *Resolution*: Added Cyberpunk/Neon styled `ErrorBoundary.tsx` wrapping the application root and Suspense modal blocks, allowing user-friendly recovery and error detail copying.
3. **WebSocket Origin Hardening (Resolved)**:
   - *Previously*: Server accepted WebSocket connections from any Origin header without verification.
   - *Resolution*: Added strict `ALLOWED_ORIGINS` whitelist validation in `isOriginAllowed` and handshake upgrade callback, returning HTTP 403 Forbidden for unauthorized origins.
4. **SQLite WAL Integrity & Atomic Backup (Resolved)**:
   - *Previously*: No programmatic database healthcheck or backup command existed.
   - *Resolution*: Added `checkIntegrity()` running `PRAGMA integrity_check`, integrated with `/api/health` and `/api/ready`, plus atomic `VACUUM INTO` backup routine and WAL non-blocking checkpoints.
5. **Anti-Cheat & Parameter Tampering (Resolved)**:
   - *Previously*: Client action validation relied primarily on action type checks.
   - *Resolution*: Added explicit rejection of 9 forbidden actions (`ROLL_DICE_RESULT`, `SET_CASH`, etc.), forbidden payload key stripping (`cash`, `dice`, `seed`), boundary checks [0..39], and duplicate actionId idempotency.

## Current Operational Posture & Staging Next Steps
1. **Môi Trường Staging Trước GA (General Availability)**:
   - Toàn bộ 469 automated tests đã pass 100% trong môi trường Node.js.
   - Khuyến nghị chạy kiểm thử trên môi trường Staging thực tế để ghi nhận độ trễ mạng thực (RTT) và thử nghiệm với nhiều thiết bị mạng di động trước khi mở rộng tải quy mô lớn.
2. **4 Worlds Held in `COMING_SOON` (`CONFIG_ONLY`) Status**:
   - `quang-tri-highlands`, `northwest-vietnam`, `fantasy-kingdom`, và `tropical-island` vẫn được giữ ở trạng thái chờ mở rộng trong các mùa giải tiếp theo.
3. **Đồng Bộ Tài Khoản Đám Mây (Cloud Account Sync)**:
   - Hồ sơ hiện tại hoạt động theo mô hình Guest Identity trong LocalStorage với cơ chế chống chỉnh sửa an toàn. Tính năng OAuth 2.0 / Google Sign-in sẽ được xem xét trong các bản cập nhật v1.1+.
