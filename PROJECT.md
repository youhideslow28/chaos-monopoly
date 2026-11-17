# CHAOS MONOPOLY — PROJECT ARCHITECTURE & ROADMAP

## 1. Tổng Quan Dự Án (Project Overview)
**CHAOS MONOPOLY** là một nền tảng game cờ tỷ phú chiến thuật đa người chơi (2–4 người chơi trực tuyến hoặc tại máy kết hợp AI) trên trình duyệt, lấy bối cảnh đa thế giới (**Multi-World System**) kết hợp với hệ thống biến động vĩ mô **Chaos Engine**.

- **Ngôn ngữ hỗ trợ:** Tiếng Việt (`vi`) & Tiếng Anh (`en`) cho toàn bộ nội dung Thế giới
- **Nền tảng:** Web (React + TypeScript + Vite 6 + Tailwind CSS) + Authoritative Node.js WebSocket Server (`ws` + `node:sqlite`)
- **Kiến trúc lõi:** Deterministic Immutable Finite State Machine (`gameReducer.ts`) + Double-Entry Economy Ledger (`ledgerEngine.ts`) + Server-Authoritative Multiplayer (`multiplayerServer.ts`, `roomManager.ts`, `roomRepository.ts`) + Data-Driven World Engine (`src/worlds/`)

---

## 2. Kiến Trúc Hệ Thống (System Architecture)

```
src/
├── cosmetics/           # Hệ thống Ngoại Trang, Hồ Sơ & Cửa Hàng (Phase 06)
│   ├── types.ts               # Định nghĩa 7 loại danh mục, 5 bậc phẩm cấp, PlayerCosmetics
│   ├── catalog.ts             # Danh mục 35+ vật phẩm, tra cứu, kiểm tra ID & cơ chế sanitize
│   ├── storage.ts             # Hồ sơ Khách (guest), Cấp độ 1..50, công thức XP & 9 Thành tựu
│   ├── shop.ts                # Cửa hàng Thẩm mỹ (100% Non-Pay-To-Win, thanh toán bằng Chaos Coins)
│   ├── audioSettings.ts       # Điều khiển âm lượng Master/Music/SFX, Mute, Ambient Synth theo Thế giới
│   └── progression.ts         # Danh sách Thành tựu (Achievements) & phần thưởng ngoại trang
├── worlds/              # Hệ thống Đa Thế Giới Định Hướng Dữ Liệu (Phase 05)
│   ├── types.ts               # Kiểu dữ liệu WorldId, WorldCatalogEntry, WorldPack, WorldConfig, WorldEventDef
│   ├── catalog.ts             # Danh mục 8 thế giới (4 AVAILABLE/FULL + 4 COMING_SOON/CONFIG_ONLY)
│   ├── worldEvents.ts         # Sự kiện bản đồ đặc trưng từng thế giới & kết nối Chaos Engine
│   ├── validate.ts            # Kiểm định schema, bảng màu, 28 ô sở hữu & giới hạn cân bằng EVENT_BOUNDS
│   ├── registry.ts            # Lazy-loading (dynamic import), cache & cơ chế phục hồi FALLBACK_PACK
│   ├── runtime.ts             # Hook useWorldConfig & hiển thị tên ô đa ngôn ngữ (displayTileName)
│   ├── i18n.ts                # Chuyển đổi ngôn ngữ VI/EN (useLocale) & từ điển giao diện WORLD_UI
│   └── packs/                 # Các gói thế giới tách chunk riêng (modern-metropolis, cyberpunk-city, mekong-delta, space-colony)
├── multiplayer/         # Giao thức & Client WebSocket Thời gian thực (Phase 04 & 05)
│   ├── protocol.ts            # Định nghĩa lược đồ gói tin v1.0 (ClientIntentPayload, ServerToClientMessage)
│   └── client.ts              # Quản lý kết nối WebSocket, tự động kết nối lại (Reconnect) & lưu phiên
├── server/              # Máy chủ Authoritative Multiplayer & Lưu trữ SQLite (Phase 04 & 05)
│   ├── index.ts               # Điểm khởi chạy máy chủ độc lập (npm run server)
│   ├── multiplayerServer.ts   # Cổng HTTP (/api/health, /api/ready) & WebSocket (/ws)
│   ├── roomManager.ts         # Quản lý vòng đời phòng, xác thực World, uỷ quyền nước đi, chạy AI & PRNG trên server
│   ├── roomRepository.ts      # Lưu trữ bền vững SQLite WAL (rooms + action_audit_log)
│   └── security.ts            # Xác thực schema, chống gian lận (Anti-Cheat), băm SHA-256 & Rate Limiter
├── game/
│   ├── types/           # Hệ thống kiểu dữ liệu chặt chẽ (GameState, GameAction, AI, Chaos, Trade, Auction)
│   ├── ai/              # Hệ thống Trí tuệ Nhân tạo Chiến thuật (Phase 03 & 04)
│   ├── chaos-engine/    # Hệ thống Sự kiện Hỗn loạn & Biến số Thế giới (Chaos Intelligence)
│   ├── economy/         # Sổ cái kinh tế trung tâm (ledgerEngine.ts) & Định giá (economyEngine.ts)
│   ├── auction/         # Đấu giá công khai (auctionEngine.ts)
│   ├── trade/           # Thương lượng hai chiều (tradeEngine.ts)
│   ├── storage/         # Lưu/Tải trạng thái ván đấu tại máy (matchStorage.ts)
│   └── gameReducer.ts   # Bộ xử lý trạng thái trung tâm (Canonical Pure Deterministic Reducer)
└── components/
    ├── worlds/          # Giao diện Chọn Thế giới, Xem trước & Hiệu ứng Môi trường (WorldSelectionModal, WorldPicker, WorldEnvironment)
    ├── multiplayer/     # Giao diện Phòng chờ Trực tuyến (OnlineLobbyModal.tsx)
    ├── setup/           # Thiết lập trận đấu (Chơi Tại Máy / Tạo Phòng Online / Vào Phòng Online)
    ├── board/           # Bàn cờ tương tác 2.5D, xúc xắc, quân cờ, nâng cấp theo bảng màu Thế giới
    ├── action-panel/    # Bảng điều khiển hành động & khóa lượt khi chờ đối thủ online
    └── modals/          # Đấu giá (Auction), Thương lượng (Trade), Giải quyết nợ (Debt), Chaos Card
```

---

## 3. Lịch Sử Các Giai Đoạn (Development Phases)

| Giai đoạn | Tên Giai Đoạn | Trạng thái | Kết quả Kiểm thử |
| :--- | :--- | :---: | :--- |
| **Phase 01** | Core Board, Movement, Basic Economy & UI | **HOÀN THÀNH** | Pass |
| **Phase 02** | Complete Game Systems (Auctions, Trading, Debt, Persistence) | **HOÀN THÀNH** | 18/18 suites (370 tests) |
| **Phase 03** | AI Players & Chaos Intelligence | **HOÀN THÀNH** | 20/20 suites (386 tests) |
| **Phase 04** | Online Multiplayer & Social Platform | **HOÀN THÀNH** | 21/21 suites (394 tests) |
| **Phase 05** | Worlds, Maps & Content Expansion | **HOÀN THÀNH** | 22/22 suites (414 tests) |
| **Phase 06** | UI/UX, Cosmetics, Player Identity & Monetization | **HOÀN THÀNH** | 23/23 suites (441 tests) |
| **Phase 07** | Production Readiness, Security Audit & Deployment Preparation | **HOÀN THÀNH** | **26/26 suites (469 tests, 0 errors, Bundle -56.5%, Status: B. STAGING READY)** |
| **Phase 08** | Visual Polish, Mobile Title Wrap, Overlay Separation & Emoji Standardization (10/10 Quality) | **HOÀN THÀNH** | **Gate PASS (5/5 CLEAN/APPROVE). 59/59 suites (863 tests), tsc 0 errors, Tier 4 E2E 11/11, 11 Playwright screenshots captured. PID 24304 & 1604 uninterrupted.** |

---

## 4. Phase 08 Feature Inventory & Milestone Scope

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: Mobile Title Wrapping | Format "ĐẠI CHIẾN BẤT ĐỘNG SẢN" to wrap balanced lines ("ĐẠI CHIẾN" / "BẤT ĐỘNG SẢN") on 375×812 without orphan words | M_POLISH | Survey 1 |
| 2 | R2: WorldIntroOverlay Spacing | Clean vertical separation between intro title/card and 3D board ticker on 812×375 landscape | M_POLISH | Survey 1 |
| 3 | R3: Unicode Emoji Standardization | Replace currency 🪙 and other raw emojis with Lucide SVG icons in modals (Shop, Collection, Profile, Rulebook, VFX) | M_POLISH | Survey 2 |
| 4 | R4: Zero-Downtime Verification | Strict preservation of live server (port 3001) & Cloudflare tunnel; build & test validation | M_POLISH | Survey 3 |

## Code Layout Ownership (Phase 08)
Worker exclusive file ownership:
- `src/worlds/i18n.ts`
- `src/components/menu/MainMenu.tsx`
- `src/components/worlds/WorldEnvironment.tsx`
- `src/App.tsx`
- `src/components/cosmetics/ShopModal.tsx`
- `src/components/cosmetics/CollectionModal.tsx`
- `src/components/cosmetics/ProfileModal.tsx`
- `src/components/chaos/SpatialChaosVFX.tsx`
- `src/components/modals/VictoryModal.tsx`
- `src/components/modals/DebtSettlementModal.tsx`
- `src/components/modals/TradeModal.tsx`
- `src/components/modals/RulesModal.tsx`
- `src/cosmetics/shop.ts`

