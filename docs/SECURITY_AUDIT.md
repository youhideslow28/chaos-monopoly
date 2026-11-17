# BÁO CÁO KIỂM TOÁN AN NINH (SECURITY AUDIT REPORT)
**Dự Án:** CHAOS MONOPOLY  
**Phiên Bản Kiểm Toán:** v1.0.0-rc1  
**Ngày Thực Hiện:** 31/10/2026  
**Đơn Vị Thực Hiện:** Autonomous Security Engineering Team  

---

## 1. TỔNG QUAN VÀ PHẠM VI KIỂM TOÁN

Báo cáo này tài liệu hóa kết quả rà soát an ninh, mô hình hóa mối đe dọa (Threat Modeling) và các cơ chế phòng thủ đã được triển khai cho dự án **CHAOS MONOPOLY**, bao gồm cả phần Frontend SPA và Backend WebSocket Server.

### Phạm Vi Đánh Giá (Audit Scope)
1. **Frontend Web Client:** XSS, DOM Injection, LocalStorage Profile Tampering, Component Failure Isolation (ErrorBoundary).
2. **WebSocket & Network Layer:** Origin Verification, Cross-Site WebSocket Hijacking (CSWSH), DoS/Socket Flooding, Bounded Payloads.
3. **Game Mechanics & Anti-Cheat:** Server-Authoritative state machine, ngăn chặn dice forging, tiền ảo tự cấp, can thiệp thứ tự lượt, duplicate action replay.
4. **Cơ Sở Dữ Liệu & Lưu Trữ SQLite:** SQL Injection, PRAGMA manipulation, Transaction safety, Data at Rest integrity.
5. **Mật Mã & Nhận Dạng (Cryptography):** Reconnect Token entropy, Timing-safe SHA-256 hash comparison.

---

## 2. MA TRẬN ĐÁNH GIÁ OWASP TOP 10 (WEB & API)

| Mã Rủi Ro | Phân Loại Rủi Ro | Mức Độ | Trạng Thái | Biện Pháp Phòng Ngự Đã Triển Khai |
| :--- | :--- | :---: | :---: | :--- |
| **A01:2021** | Broken Access Control | Cao | **ĐÃ XỬ LÝ** | Server-authoritative: Mọi hành động kiểm tra `seat.sessionPlayerId` khớp với `activePlayerIndex` và vai trò chủ phòng (`isHost`). |
| **A02:2021** | Cryptographic Failures | Trung bình | **ĐÃ XỬ LÝ** | Reconnect token sinh bằng `crypto.randomBytes(24)`, lưu dạng SHA-256 hash, so sánh bằng `crypto.timingSafeEqual`. |
| **A03:2021** | Injection (SQL/XSS/Command) | Nghiêm trọng | **ĐÃ XỬ LÝ** | SQLite dùng Prepared Statements 100%; Input hiển thị được lọc qua `sanitizeDisplayText` loại bỏ HTML/script/quotes. |
| **A04:2021** | Insecure Design | Cao | **ĐÃ XỬ LÝ** | Mô hình Client-Server tin cậy 0%: Client chỉ gửi Intent (`ROLL_DICE`, `BUY_PROPERTY`), Server tính toán xúc xắc và cập nhật tiền. |
| **A05:2021** | Security Misconfiguration | Trung bình | **ĐÃ XỬ LÝ** | Dockerfile chạy non-root user `node`, tắt directory listing, cấu hình HTTP security headers trong Nginx. |
| **A06:2021** | Vulnerable Components | Trung bình | **ĐÃ XỬ LÝ** | 0 vulnerabilities từ `npm audit`, dependencies tối giản (Node 22 built-in sqlite, ws, react, tailwind). |
| **A07:2021** | Identification & Auth Failures | Cao | **ĐÃ XỬ LÝ** | Token kết nối lại có thời hạn ân hạn (grace period) có kiểm soát, hết hạn phòng tự động đóng. |
| **A08:2021** | Software & Data Integrity Failures | Cao | **ĐÃ XỬ LÝ** | `PRAGMA integrity_check`, atomic `VACUUM INTO`, kiểm tra `stateVersion` chống race-condition. |
| **A09:2021** | Security Logging & Monitoring | Thấp | **ĐÃ XỬ LÝ** | JSON structured logging, `/api/health` và `/api/ready` trả về telemetry sức khỏe DB và số phòng hoạt động. |
| **A10:2021** | Server-Side Request Forgery (SSRF) | Thấp | **KHÔNG ÁP DỤNG** | Server không thực hiện outbound HTTP request tới địa chỉ bên ngoài do client chỉ định. |

---

## 3. CƠ CHẾ CHỐNG GIAN LẬN CHUYÊN SÂU (SERVER-AUTHORITATIVE ANTI-CHEAT)

### 3.1. Danh Sách Đen Các Hành Động Bị Cấm (Forbidden Client Intents)
Máy chủ từ chối ngay lập tức (`FORBIDDEN_CLIENT_ACTION`) nếu client cố tình gửi các gói tin nhằm tự ấn định kết quả:
- `ROLL_DICE_RESULT`: Xúc xắc phải do máy chủ gieo ngẫu nhiên bằng PRNG Mulberry32 an toàn.
- `SET_CASH` / `SET_POSITION` / `SET_OWNER`: Client không được phép tự gán số dư, vị trí hay quyền sở hữu ô đất.
- `APPLY_CHAOS_EFFECT`: Hiệu ứng thẻ Chaos chỉ được bốc và kích hoạt bởi máy chủ.
- `START_GAME` / `RESTART_GAME` / `LOAD_SAVED_MATCH`: Chỉ chủ phòng mới có thể bắt đầu thông qua quy trình kiểm tra sẵn sàng.

### 3.2. Chặn Lừa Đảo Tham Số (Parameter Injection Filtering)
Nếu client gửi một hành động hợp lệ (như `ROLL_DICE` hoặc `BUY_PROPERTY`) nhưng nhồi các thuộc tính bất hợp pháp vào payload (như `cash: 999999`, `dice: [6, 6]`, `seed: 12345`), bộ kiểm tra `validateClientIntentPayload` trong `src/server/security.ts` sẽ phát hiện và loại bỏ gói tin ngay lập tức.

### 3.3. Bảo Vệ Ranh Giới Chỉ Số (Boundary Checks)
- `tileId` bắt buộc phải là số nguyên trong khoảng `[0 .. 39]`. Mọi giá trị âm, số thực, hoặc `tileId >= 40` đều bị chặn.
- `bidAmount` trong đấu giá phải là số nguyên dương và lớn hơn giá bid hiện tại.

### 3.4. Tính Bất Biến Của Hành Động (Action Idempotency)
- Mỗi hành động của client mang một `actionId` định danh duy nhất (UUID).
- `RoomManager` duy trì danh sách `processedActionIds`. Nếu một gói tin gửi lặp lại (do mạng chập chờn hoặc cố ý double-spending), máy chủ sẽ từ chối với mã lỗi `DUPLICATE_ACTION`, ngăn chặn việc nhân đôi thao tác.

---

## 4. BẢO VỆ TẦNG MẠNG & WEBSOCKET

### 4.1. Xác Thực Origin (WebSocket Origin Verification)
Tại bước WebSocket Handshake Upgrade, `ChaosMultiplayerServer` kiểm tra header `Origin`:
- Nếu cấu hình `ALLOWED_ORIGINS` tồn tại (ví dụ: `https://chaos-monopoly.io,http://localhost:3000`), bất kỳ kết nối nào có Origin không khớp sẽ bị hủy bỏ ngay lập tức với mã HTTP `403 Forbidden`.
- Ngăn chặn triệt để tấn công Cross-Site WebSocket Hijacking khi người dùng lướt web trên trang độc hại.

### 4.2. Khống Chế Tần Suất (Sliding Window Rate Limiter)
- Sử dụng thuật toán cửa sổ trượt (Sliding Window) quản lý số lượng tin nhắn trên mỗi kết nối client IP.
- Ngưỡng giới hạn: Tối đa 35 requests trong cửa sổ 5000ms.
- Tự động dọn dẹp các bucket cũ (`cleanup`) để tránh rò rỉ bộ nhớ (memory leak).

### 4.3. Giới Hạn Dung Lượng Gói Tin (Payload Bounds)
- `MAX_WS_MESSAGE_BYTES = 16 * 1024` (16 KB).
- Bất kỳ gói tin nào vượt quá 16 KB đều bị đóng kết nối hoặc trả về lỗi `MESSAGE_TOO_LARGE` trước khi phân tích cú pháp JSON, triệt tiêu nguy cơ DoS bằng chuỗi JSON khổng lồ (JSON bomb).

---

## 5. BẢO VỆ DỮ LIỆU ĐỊA PHƯƠNG (LOCALSTORAGE HARDENING)

Trong chế độ chơi đơn hoặc tài khoản khách (Guest Identity), hồ sơ người chơi được lưu trong LocalStorage của trình duyệt. Để ngăn chặn việc người chơi mở DevTools sửa tiền:
- Khi nạp dữ liệu (`loadPlayerProfileFromStorage` trong `src/cosmetics/storage.ts`), các giá trị đều bị ép vào ngưỡng an toàn:
  - `level`: `Math.max(1, Math.min(50, ...))`
  - `xp`: `Math.max(0, Math.min(500000, ...))`
  - `chaosCoins`: `Math.max(0, Math.min(1000000, ...))`
  - `cosmetics`: Phải nằm trong danh mục `COSMETICS_CATALOG` đã đăng ký hợp lệ.
  - Nếu payload JSON bị hỏng, hệ thống tự động reset về profile ban đầu an toàn.

---

## 6. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG BẢO MẬT

Tất cả 18 kịch bản kiểm thử bảo mật chuyên biệt trong `src/game/__tests__/phase07_security_audit.test.ts` đều đạt kết quả **100% PASS**:
- ✓ 1. Cho phép legitimate configured origins và từ chối forged cross-site origins.
- ✓ 2. SlidingWindowRateLimiter cho phép trong quota và chặn burst spam.
- ✓ 3. SlidingWindowRateLimiter tự động reset sau khi hết thời hạn cửa sổ.
- ✓ 4. Dọn dẹp stale rate-limit buckets không rò rỉ RAM.
- ✓ 5. Chặn gói tin vượt quá 16 KB (`MAX_WS_MESSAGE_BYTES`).
- ✓ 6. Xử lý an toàn JSON dị dạng / unparseable packet.
- ✓ 7. Từ chối phiên bản giao thức không khớp (`INVALID_PROTOCOL`).
- ✓ 8. Chặn tuyệt đối 9 loại forbidden action types (`ROLL_DICE_RESULT`, `SET_CASH`, v.v.).
- ✓ 9. Phát hiện và loại bỏ các keys gian lận nhồi vào intent (`dice`, `cash`, `seed`).
- ✓ 10. Kiểm tra ranh giới tileId [0..39].
- ✓ 11. XSS sanitation: Lọc bỏ script, html, backticks, control chars trong tên người chơi.
- ✓ 12. Sanitize cấu hình phòng (chặn startingCash âm, rounds dị dạng).
- ✓ 13. Khảo sát entropy token: 100 tokens sinh ra không trùng lặp.
- ✓ 14. Định dạng room code chuẩn `CHAOS-XXXX`.
- ✓ 15. So sánh mã SHA-256 hằng định thời gian chống timing attacks.
- ✓ 16. Chống thao túng LocalStorage: Giới hạn level 50, coins 1,000,000.
- ✓ 17. Phục hồi an toàn khi LocalStorage bị corrupt.
- ✓ 18. Xác thực catalog cosmetic ID hợp lệ.

---

## 7. KHUYẾN NGHỊ VẬN HÀNH STAGING & PRODUCTION

1. **Bật TLS/WSS Bắt Buộc:** Trong môi trường triển khai thực tế, luôn đặt server phía sau Nginx hoặc Cloudflare để buộc sử dụng `https://` và `wss://`.
2. **Cấu Hình Môi Trường Bí Mật:** Thiết lập biến môi trường `ALLOWED_ORIGINS` trỏ chính xác về domain của frontend sản xuất.
3. **Giám Sát Định Kỳ:** Theo dõi rate limiting logs để phát hiện sớm các IP có hành vi quét cổng hoặc tấn công từ chối dịch vụ.
