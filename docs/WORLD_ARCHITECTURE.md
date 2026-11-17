# WORLD ARCHITECTURE — CHAOS MONOPOLY (PHASE 05)

## 1. Triết lý Kiến trúc: One Game Engine — Multiple Worlds — Data-Driven Content

Hệ thống **World Engine** trong Phase 05 được thiết kế tuân thủ nguyên tắc:

1. **Một bộ luật lõi duy nhất (`Canonical Game Engine`)**:
   - Mọi thế giới (World) dùng chung cùng một máy trạng thái hữu hạn bất biến (`src/game/gameReducer.ts`), cùng một sổ cái kinh tế kép (`src/game/economy/ledgerEngine.ts`), cùng hệ thống đấu giá (`src/game/auction/auctionEngine.ts`), thương lượng (`src/game/trade/tradeEngine.ts`), Chaos Engine (`src/game/chaos-engine/chaosEngine.ts`) và AI (`src/game/ai/aiDecisionEngine.ts`).
   - Không có bất kỳ nhánh `if (world === ...)` nào làm thay đổi luật chơi cốt lõi (số ô luôn là 40 ô chuẩn `ring-40`, trật tự lượt, cách tính tiền thuê, thế chấp, phá sản, độc quyền quận đều thống nhất).
2. **Dữ liệu định hướng (`Data-Driven World Configuration`)**:
   - Mỗi thế giới được định nghĩa qua `WorldCatalogEntry` (`src/worlds/catalog.ts`), gói hiển thị `WorldPack` (`src/worlds/packs/*.ts`) và danh sách sự kiện bản đồ `WorldEventDef` (`src/worlds/worldEvents.ts`).
3. **Tải lười theo yêu cầu (`Lazy-Loaded World Packs`) & Tự động Phục hồi (`Safe Fallback`)**:
   - Các gói tài nguyên thế giới được nạp động bằng `import()` thông qua `loadWorldConfig` (`src/worlds/registry.ts`).Vite tự động tách từng thế giới thành các chunk riêng biệt (`modern-metropolis-*.js`, `cyberpunk-city-*.js`, `mekong-delta-*.js`, `space-colony-*.js`).
   - Nếu quá trình nạp gói hiển thị gặp sự cố hoặc dữ liệu không hợp lệ, `loadWorldConfig` tự động chuyển sang `FALLBACK_PACK` (`fallbackUsed: true`) mà không làm gián đoạn ván đấu.

---

## 2. Cấu trúc Thư mục `src/worlds/`

```
src/worlds/
├── types.ts                  # Định nghĩa kiểu dữ liệu WorldId, WorldCatalogEntry, WorldPack, WorldConfig, WorldEventDef
├── catalog.ts                # Danh mục 8 thế giới (4 AVAILABLE/FULL + 4 COMING_SOON/CONFIG_ONLY)
├── worldEvents.ts            # Sự kiện đặc trưng từng thế giới & tích hợp với Chaos Engine (pickWorldEventCard)
├── validate.ts               # Bộ kiểm định schema, bảng màu, tên 28 ô sở hữu và giới hạn cân bằng EVENT_BOUNDS
├── registry.ts               # Bộ nạp lazy-load (dynamic import), bộ nhớ đệm (cache) và cơ chế FALLBACK_PACK
├── runtime.ts                # Hook useWorldConfig, bộ đồng bộ tên ô (displayTileName) theo thế giới & ngôn ngữ
├── i18n.ts                   # Quản lý ngôn ngữ nội dung thế giới (vi / en) và từ điển giao diện WORLD_UI
└── packs/
    ├── shared.ts             # Tiện ích khởi tạo gói thế giới và danh sách 28 ô bất động sản/bến/tiện ích (OWNABLE_TILE_IDS)
    ├── modern-metropolis.ts  # World 01: Siêu Đô Thị Hiện Đại (FULL)
    ├── cyberpunk-city.ts     # World 02: Thành Phố Cyberpunk — Neo-Saigon 2099 (FULL)
    ├── mekong-delta.ts       # World 03: Miền Tây Sông Nước (FULL)
    └── space-colony.ts       # World 08: Thuộc Địa Không Gian — Trạm Quỹ Đạo Helios (FULL)
```

---

## 3. Danh mục 8 Thế giới & Trạng thái Hoàn thiện Thực tế

| Mã Thế giới (`WorldId`) | Tên Tiếng Việt / Tiếng Anh | Trạng thái (`availability`) | Mức hoàn thiện (`completeness`) | Môi trường (`environment`) | Số Sự kiện Bản đồ |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `modern-metropolis` | Siêu Đô Thị Hiện Đại / Modern Metropolis | `AVAILABLE` | `FULL` | `none` | 3 sự kiện |
| `cyberpunk-city` | Thành Phố Cyberpunk / Cyberpunk City | `AVAILABLE` | `FULL` | `rain` (Mưa neon) | 3 sự kiện |
| `mekong-delta` | Miền Tây Sông Nước / Mekong Delta | `AVAILABLE` | `FULL` | `fireflies` (Đom đóm) | 3 sự kiện |
| `space-colony` | Thuộc Địa Không Gian / Space Colony | `AVAILABLE` | `FULL` | `stars` (Sao băng) | 4 sự kiện |
| `quang-tri-highlands` | Cao Nguyên Quảng Trị / Quang Tri Highlands | `COMING_SOON` | `CONFIG_ONLY` | — | Chờ hoàn thiện |
| `northwest-vietnam` | Tây Bắc Hùng Vĩ / Northwest Vietnam | `COMING_SOON` | `CONFIG_ONLY` | — | Chờ hoàn thiện |
| `fantasy-kingdom` | Vương Quốc Huyền Thoại / Fantasy Kingdom | `COMING_SOON` | `CONFIG_ONLY` | — | Chờ hoàn thiện |
| `tropical-island` | Đảo Nhiệt Đới / Tropical Island | `COMING_SOON` | `CONFIG_ONLY` | — | Chờ hoàn thiện |

> **Lưu ý về Văn hóa & Lịch sử (`quang-tri-highlands`)**: Thế giới *Cao Nguyên Quảng Trị* được định hướng tôn vinh thiên nhiên đại ngàn Trường Sơn, cầu Hiền Lương – sông Bến Hải, cà phê Khe Sanh và đảo Cồn Cỏ với thái độ trang trọng, tuyệt đối không thương mại hóa chiến tranh hay biến đau thương lịch sử thành trò đùa. Do yêu cầu thẩm định kỹ lưỡng tài nguyên hình ảnh và địa danh trước khi mở chơi, thế giới này được giữ ở trạng thái `COMING_SOON` (`CONFIG_ONLY`).

---

## 4. Cơ chế Sự kiện Bản đồ (`World Events`) & Bảo toàn Cân bằng Kinh tế

- Khi người chơi đi vào ô `CHAOS` (ô số 2, 7, 17, 22, 33, 36), `gameReducer.ts` gọi `pickWorldEventCard(state)` trước khi rút thẻ Chaos mặc định:
  - Nếu `state.config.worldId` không được đặt (`undefined`), hàm trả về `null` ngay lập tức mà **không tiêu thụ bất kỳ bước sinh số ngẫu nhiên (PRNG) nào**, đảm bảo tương thích ngược 100% với toàn bộ kiểm thử định sẵn của Phase 01–04.
  - Nếu ván đấu có `worldId` hợp lệ, hệ thống lọc các sự kiện của thế giới đó thỏa mãn điều kiện vòng đấu (`minRound`, `maxRound`) và không trùng với sự kiện vừa nổ gần nhất. Với xác suất `WORLD_EVENT_SHARE = 0.3` (30%), sự kiện đặc trưng của thế giới sẽ xuất hiện dưới dạng một `ChaosCard` chuẩn và được xử lý qua đúng bộ thực thi Chaos duy nhất (`applyChaosEffect`).
- **Giới hạn cân bằng nghiêm ngặt (`EVENT_BOUNDS` trong `src/worlds/validate.ts`)**:
  - `CASH_ALL`: `[-100, +100]` (tác động đối xứng lên mọi người chơi thông qua `executeLedgerTransaction`).
  - `TRANSPORT_BOOM` / `UTILITY_BOOM`: `[1.5x, 2.0x]`, tối đa `3` lượt.
  - `DISTRICT_BOOM`: `[1.25x, 1.5x]`, tối đa `3` lượt.
  - `CURFEW`: `[3, 6]`, tối đa `1` lượt.
  - `GOLDEN_HOUR`: `[+$200M, +$400M]`, tối đa `1` lượt.
  - `INTEREST_HIKE`: `[+10%, +20%]`, tối đa `3` lượt.
  - `SUBSIDIZED_MORTGAGE`: `[60%, 75%]`, tối đa `3` lượt.

---

## 5. Đồng bộ Multiplayer & Lưu trữ Bền vững

1. **Xác thực phía Server (`RoomManager`)**:
   - Khi tạo phòng (`CREATE_ROOM`) hoặc cấu hình phòng (`CONFIGURE_ROOM`), `roomManager.ts` kiểm tra `isWorldSelectable(worldId)`. Nếu client gửi `worldId` không tồn tại hoặc đang ở trạng thái `COMING_SOON`, server từ chối ngay với mã lỗi `INVALID_WORLD`.
   - Chỉ chủ phòng (`hostPlayerId`) mới được phép đổi thế giới khi phòng ở trạng thái `WAITING` hoặc `READY`. Khi trận đấu đã bắt đầu (`IN_GAME`), thế giới bị khóa cố định.
2. **Đồng bộ & Kết nối lại (`Reconnect` & `SQLite Recovery`)**:
   - `worldId` nằm trong `room.config.worldId` và `gameState.config.worldId`, được lưu nguyên tử vào cơ sở dữ liệu SQLite WAL (`src/server/roomRepository.ts`).
   - Khi người chơi tải lại trang, kết nối lại (`RECONNECT_ROOM`), hoặc khi máy chủ khởi động lại từ SQLite, đúng thế giới đã chọn được khôi phục nguyên vẹn.
