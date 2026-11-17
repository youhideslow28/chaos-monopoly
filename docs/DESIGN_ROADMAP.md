# CHAOS MONOPOLY — Roadmap & Bàn giao kỹ thuật

> Tài liệu này là **nguồn sự thật duy nhất** cho phiên làm việc tiếp theo.
> Đọc mục 1 và 2 trước khi viết bất kỳ dòng code nào.

---

## 1. Trạng thái dự án & cách chạy

### Hiện trạng (cuối phiên này)
- `npx tsc --noEmit`: sạch.
- `npx vitest run`: **834 test / 53 tệp — tất cả xanh**, gồm cả hai benchmark cân bằng AI (trước đây từng đỏ).
- `npm run build`: thành công. Bản `dist` mới nhất đang được server phục vụ.
- Server multiplayer đang chạy ở cổng **3001** và tunnel công khai `https://tribunal-soonest-performs-quiet.trycloudflare.com` (quick tunnel, **URL sẽ đổi** mỗi lần khởi động lại).
- Trò chơi đã được chơi thử tự động từ đầu đến cuối một ván: **kết thúc ở vòng 65, 7 phút 33 giây**, không có lỗi console.
- Game đang chơi được: chơi nhanh với AI, chơi online qua tunnel, tiếng Việt/tiếng Anh, 4 thế giới đang mở.

### Lệnh thường dùng
```
npx vite --port 3000 --strictPort      # dev server (dùng khi phát triển UI)
npm run build                          # build dist (BẮT BUỘC chạy lại sau mỗi lần sửa,
                                        # vì server phục vụ dist từ đĩa)
npm run server                         # server multiplayer cổng 3001 (phục vụ luôn dist)
npx vitest run                         # toàn bộ test
npx vitest run <đường-dẫn-tệp-test>    # một tệp test
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3001
```

### Cách kiểm tra nhanh sau khi sửa
1. `npx tsc --noEmit` — bắt lỗi kiểu trước tiên.
2. `npx vitest run` — phải giữ 787 test xanh (hoặc nhiều hơn nếu thêm test mới).
3. `npm run build` — nếu sửa bất cứ thứ gì ảnh hưởng giao diện.
4. Mở `http://localhost:3000`, bấm **Chơi Nhanh**, kiểm tra thay đổi bằng mắt.

### Ghi chú môi trường
- **Công cụ trình duyệt trong app (`browser.*`) KHÔNG còn khả dụng** kể từ khi kết thúc phiên này (catalog công cụ đã đổi, skill `browser` bị gỡ). Muốn kiểm tra bằng mắt, dùng một trong hai cách:
  1. viết script Playwright theo skill `webapp-testing` / `playwright-e2e` (chạy `python .agents/skills/game-testing/scripts/with_server.py --help` để biết cách dùng), hoặc
  2. nhờ người dùng mở trang và mô tả/chụp màn hình lại.
- Trước đây `browser.screenshot` cũng từng lỗi `Screenshot needs a visible tab` khi cửa sổ desktop không hiển thị — nếu sau này công cụ được bật lại, hãy `browser.tabs.focus` trước khi chụp.
- Shell là **PowerShell**: không dùng `&&`; dùng `;` hoặc `Select-Object -Last n`.

---

## 2. Quy ước bắt buộc (đừng phá vỡ)

### 2.1 Chữ — đúng ba kiểu
`src/index.css` định nghĩa ba lớp, dùng thay cho mọi chỉnh font/size rải rác:
`.t-title` (tiêu đề, số lớn) · `.t-body` (đoạn văn, giá trị) · `.t-label` (nhãn nhỏ, in hoa, nút).
Cả ba dùng chung font stack đủ dấu tiếng Việt: `Outfit → Segoe UI → Roboto → Helvetica Neue → Arial`.
**Không** dùng font serif/mono cho nội dung tiếng Việt.

### 2.2 Ngôn ngữ
- Mọi chuỗi hiển thị phải nằm trong `GAME_UI`, `WORLD_UI` hoặc `COSMETIC_UI` (`src/worlds/i18n.ts`), luôn có đủ `vi` và `en`.
- Trong component: `const [locale] = useLocale(); const t = (k) => GAME_UI[k][locale];`
- Chi tiết phần còn thiếu và kế hoạch: `docs/I18N_PLAN.md`.

### 2.3 Tiền
- Engine lưu **số nguyên** (1500 = $1,500). Hiển thị **luôn** qua `formatMoney` (`src/utils/money.ts`).
- Không viết `$...M` hay `$...k VND` trong chuỗi mới. Nhật ký engine đi qua `localizeMoneyText`.

### 2.4 Nghệ thuật "hướng về camera"
> **Cập nhật (phiên này): tấm chữ "CỜ TỶ PHÚ" ở sân giữa đã bị xoá** theo yêu cầu người dùng — sân đấu để trống cho sạch. Sân giữa giờ chỉ còn màu nền cộng hai đường viền mảnh theo màu thế giới; **không vẽ chữ nào lên mặt sân** (kể cả "CHAOS MONOPOLY", tên thế giới hay tagline). Xúc xắc vẫn lệch nhẹ về phía người xem (`diceCenterOffset = plazaWidth * 0,069`). Test canh chừng việc xoá này: `src/game/__tests__/title_banner_orientation.test.ts`.
> Mẫu "hướng về camera" **vẫn áp dụng cho nhãn 4 ô góc** (xem dưới).
- Tấm phẳng (`PlaneGeometry` + `rotateX(-π/2)`) nằm trên ô.
- Mỗi khung hình: `rotation.y = rig.current.theta` (nhãn ô góc: trừ thêm `labelBaseRotY`).
- **Kích thước nhãn góc phải đảm bảo** `offset + nửa_đường_chéo ≤ bán_kính_ô − lề`, nếu không sẽ bị ô đất che (đây từng là lỗi thật).

### 2.5 Luật kinh tế (đã chốt)
- **Chaos chỉ xảy ra khi người chơi đạp vào ô** (ô Chaos 7/22/36, Rương, Cơ hội; sự kiện riêng của thế giới cũng đi qua ô Chaos). Không có trigger nào khác — không bão theo vòng, không xúc xắc đôi, không khủng hoảng, không chuỗi dư chấn. Đã xoá toàn bộ trigger không-đạp-ô theo yêu cầu "chỉ giữ sự kiện khi đạp ô". Test khoá: `chaos_m2_cards_protection.test.ts` (describe "Chaos is tile-triggered only").
- **Không giới hạn vòng** (`maxRounds = 0`); ván kết thúc khi chỉ còn một người chưa phá sản.
- **Giá mua/nâng cấp** tăng 3%/vòng so với giá gốc (`getBuyPrice`, `getUpgradeCost`).
- **Tiền thuê tăng theo ván**: từ vòng 25, mỗi vòng +9%, tối đa ×8 (`getRentEscalationMultiplier`). Không có áp lực này, ván từng chạy 272 vòng không kết thúc.
- **Mỗi công trình nâng tối đa 1 lần/vòng** (`lastUpgradeRound` trong `PropertyOwnership`).
- **Khiên chống dẫn đầu**: mỗi 5 vòng, người xếp cuối nhận $150 qua sổ cái, loại `CHAOS_EFFECT`.
- Kết quả đo: ván 3 người ~72 vòng (cao nhất 99), 4 người ~53 vòng (cao nhất 57).

### 2.6 Giao dịch (đã chốt, có UI + server kiểm quyền)
- Người gửi chỉ đề nghị và có thể **Rút lại**; **không** thấy nút đồng ý/từ chối/điều chỉnh.
- Người nhận: **Đồng ý · Từ chối · Đổi số tiền đúng 1 lần** (chỉ hai con số tiền; tài sản và thẻ giữ nguyên).
- Sau điều chỉnh, **người gửi** trả lời lần cuối: đồng ý / từ chối / rút lại. Không ai điều chỉnh thêm.
- Quyền được xác định bởi `getTradeResponderId(trade)` (target trước, sender sau khi `countered`), kiểm tra ở **cả** `roomManager` và UI.
- Test: `src/game/__tests__/trade_one_counter.test.ts`.

### 2.7 Phân quyền hiển thị (đã chốt)
- Chỉ người đang có lượt (và là người thật) thấy nút hành động. Lượt AI/lượt người khác chỉ hiện dòng trạng thái.
- Modal nợ và thẻ Chaos: chỉ người có lượt thao tác (`humanActs` trong `App.tsx`), người khác thấy dòng "Đang chờ …".
- Chi tiết bảng vai trò: `docs/ROLEBOOK.md`.

### 2.8 Camera
- Camera **chỉ bám một người**: online là quân của chính bạn (`myOnlinePlayerId`), chơi chung máy là người đang có lượt nếu là người thật.
- Nam châm góc: thả chuột gần bội số 90° của chế độ đang chọn thì tự khớp (`settleYaw`). Mỗi chế độ có lưới riêng (Iso lệch 45°).
- Bộ điều khiển đã rút gọn: nút 2D/3D, nút Đổi góc nhìn (Chuẩn→Iso→Cine→Cao), zoom, Tâm điểm, Đặt lại.

---

## 3. Bản đồ tệp quan trọng

| Khu vực | Tệp |
| --- | --- |
| Điểm vào & vòng đời ván | `src/App.tsx` (rất lớn — sửa cẩn thận, tìm theo `data-testid`) |
| Luật game | `src/game/gameReducer.ts`, `property/propertyEngine.ts`, `turn-manager/turnManager.ts`, `win-condition/winCondition.ts` |
| Kinh tế | `economy/ledgerEngine.ts` (kiểm toán), `economy/economicModifiers.ts` |
| Chaos | `chaos-engine/chaosCards.ts` (36 thẻ), `chaos-engine/chaosEngine.ts` |
| Giao dịch | `trade/tradeEngine.ts` + `components/modals/TradeModal.tsx` |
| 3D | `components/board/three/*` — `ThreeSceneManager.ts` (điều phối), `ThreeTileMeshes.ts` (texture ô + nhãn góc), `ThreeDiceMeshes.ts`, `ThreeCameraRig.ts`, `ThreeTokenManager.ts` |
| UI trong ván | `components/action-panel/ActionPanel.tsx`, `components/camera/CameraControls.tsx`, `components/player-panel/PlayerLeaderboard.tsx`, `components/event-feed/EventFeed.tsx` |
| Xã hội | `game/social/quickChat.ts`, `components/emotes/*`, `components/common/ActionTicker.tsx` |
| Nhiệm vụ | `game/quests/dailyQuests.ts`, `components/quests/DailyQuestsPanel.tsx` |
| Hồ sơ/thẩm mỹ | `cosmetics/storage.ts`, `cosmetics/catalog.ts` |
| Thế giới | `worlds/catalog.ts`, `worlds/packs/*.ts`, `worlds/i18n.ts`, `worlds/runtime.ts` |
| Server | `server/roomManager.ts`, `server/multiplayerServer.ts`, `server/security.ts` |
| Test | `src/game/__tests__/*` (46 tệp) |

---

## 4. Đã hoàn thành (không cần làm lại)

### 4.1 Sửa lỗi & luật
- [x] Gỡ trần vòng (60/45/40) → 0 = không giới hạn, ở cả client và server.
- [x] Giá mua/nâng cấp tăng 3%/vòng; tiền thuê tăng từ vòng 25 (9%/vòng, trần ×8) → ván kết thúc trong 50–100 vòng.
- [x] Nâng cấp nhiều cấp, mỗi công trình 1 lần/vòng; thêm bảng **Xây dựng** độc lập ở ActionPanel.
- [x] Thống nhất tiền tệ toàn bộ (`formatMoney`), bỏ hết `$NM` và `$Nk VND`.
- [x] Xúc xắc luôn hiện đúng mặt kể cả khi tab bị ẩn (timer dự phòng trong `ThreeDiceMeshes.rollTo`).
- [x] Ván kéo vô hạn (272 vòng) — đã chặn bằng leo thang tiền thuê.
- [x] Cân bằng AI: HARD phải ≥ EASY (hai benchmark xanh trở lại).
- [x] Lỗi type-check `HeaderBar` (prop cũ) — đã bỏ prop thừa, chuyển tốc độ AI vào Cài đặt.
- [x] Sửa mojibake chuỗi lỗi server.
- [x] Tên người chơi online không trùng; tên rỗng → "Người chơi N".
- [x] Mã phòng dán được (chuẩn hoá `CHAOS-XXXX`), banner xoay màn hình tự ẩn sau 8 giây.

### 4.2 3D & hình ảnh
- [x] **Xoá tấm chữ "CỜ TỶ PHÚ" và mọi chữ vẽ trên sân đấu** (phiên này, theo yêu cầu): sân giữa chỉ còn màu nền + hai đường viền mảnh. Test `title_banner_orientation.test.ts` nay canh chừng việc không được vẽ lại chữ, và kiểm tra cụm xúc xắc vẫn nằm gọn trong sân ở mọi góc camera.
- [x] Chữ "CỜ TỶ PHÚ" luôn ở phía trên khung nhìn, xoay theo camera, **không bao giờ bị ô đất che** (kích thước được tính để vừa trong sân ở mọi góc), có test bất biến. *(đã thay bằng mục xoá ở trên)*
- [x] Xúc xắc tách khỏi chữ (đẩy 0.42×offset về phía người xem).
- [x] Nhãn **và** biểu tượng 4 ô góc xoay theo camera (tấm nhãn riêng, trong suốt ở giữa).
- [x] Bỏ khung xanh quanh sân, bỏ viền lồng trong ô góc (từng gây cảm giác "2 ô").
- [x] Mũi tên KHỞI HÀNH: chỉ còn một mũi tên gọn chỉ hướng đi.
- [x] Camera bám đúng một người + nam châm 90° theo từng chế độ.

### 4.3 Online & xã hội
- [x] Khiên chống dẫn đầu ($150 mỗi 5 vòng cho người xếp cuối, qua sổ cái, có test).
- [x] Chat nhanh 12 câu (`game/social/quickChat.ts`) đi chung kênh emote; server chấp nhận id `qc-*`; người nhận đọc bằng ngôn ngữ của mình.
- [x] Bảng tin "vừa xảy ra" (`ActionTicker`) trên bàn cờ.
- [x] Thông báo khi tới lượt (online, tab ẩn).
- [x] Nhiệm vụ hằng ngày + panel ở menu chính; sửa lỗi hồ sơ ghi sai số công trình nâng cấp.
- [x] Giao dịch một lần điều chỉnh + phân quyền hai phía ở client và server.
- [x] Nút 2D/3D, đổi góc nhìn, zoom, tâm điểm hoạt động ở WebGL.

### 4.4 i18n & chữ
- [x] English hoạt động thật cho: header trong ván, thanh hành động, điều khiển camera, nhật ký, bảng người chơi, chat nhanh, nhiệm vụ, hộp thoại phá sản.
- [x] Ba kiểu chữ `.t-title/.t-body/.t-label` đã áp dụng ở các thành phần trên.

---

## 5. Việc đang mở — thiết kế chi tiết để triển khai

### A. Đồng hồ lượt có máy chủ xác nhận *(ưu tiên 1 — khép gói online)*
> **Trạng thái: ✅ Đã làm (phần máy chủ + online).** Test: `src/game/__tests__/turn_clock_authority.test.ts` (8 test).
> Khác với thiết kế ban đầu:
> - Hạn được đưa vào `RoomPublicSummary.turnDeadlineAt` (không chỉ `STATE_SYNC`), nên mọi thông điệp có `room` đều mang theo.
> - Không lưu cờ `turnTimerPaused`; trạng thái tạm dừng được suy ra từ dữ liệu (ghế AI / đang mất kết nối / phòng không `IN_GAME` → hạn = `null`).
> - Pha `ROLLING` cũng được tự đổ xúc xắc khi hết giờ (ngoài yêu cầu gốc, để tránh treo).
> - Mục 7 (chế độ chung một máy): **đã làm theo quyết định người dùng** — chỉ bật khi có từ 2 người thật trở lên trong bàn, thời gian **60 giây**. HUD chỉ hiện khi có hạn.
> - Hạn máy chủ: **60 giây** (đổi từ 45 giây theo quyết định người dùng).
> - Máy chủ cần khởi động lại để nhận thay đổi; tunnel sẽ đổi URL.

Thiết kế:
1. `RoomRecord` thêm `turnDeadlineAt: number | null` và `turnTimerPaused: boolean`.
2. Sau mỗi lần phát `STATE_SYNC` khi phòng `PLAYING`: nếu ghế đang có lượt là **người thật**, đặt `turnDeadlineAt = Date.now() + 45_000`; nếu là ghế AI, đặt `null` (vòng lặp AI tự đi).
3. `setInterval(1000)` quét: phòng nào quá hạn thì thực thi hành động mặc định qua đúng đường `executeAuthoritativeIntent`:
   - `WAITING_FOR_ROLL` → `ROLL_DICE`;
   - `ACTION_MENU` → `END_TURN`;
   - pha khác (đấu giá, giao dịch, nợ, chaos) → **hoãn**, đặt lại hạn 30 giây, không tự quyết các quyết định lớn.
4. Tạm dừng đồng hồ khi: người đó mất kết nối (chờ `reconnectGraceMs`), phòng chưa `PLAYING`, hoặc ván `ENDED`.
5. Phát `turnDeadlineAt` trong `STATE_SYNC` để client hiện đếm ngược (không tự đếm cục bộ, tránh lệch giờ).
6. UI: vòng đếm ngược nhỏ cạnh tên người đang có lượt trong thanh hành động; đổi màu khi còn < 10 giây.
7. Chế độ chơi chung một máy: đồng hồ chạy phía client trong `App.tsx`, cùng quy tắc (chỉ tự đổ xúc xắc / tự kết thúc lượt).

Test bắt buộc:
- Hết giờ khi đang chờ đổ → server tự `ROLL_DICE`, ván tiếp tục.
- Hết giờ khi đang ở `ACTION_MENU` → server tự `END_TURN`, sang người kế.
- Đang mở đấu giá/giao dịch → đồng hồ hoãn, không tự quyết.
- Ghế AI → không kích hoạt đồng hồ.
- Mất kết nối rồi kết nối lại trong thời gian ân hạn → không bị coi là trì hoãn.

### B. M2 — mở khoá 2 thế giới đầu
> **Trạng thái: ✅ Đã làm (B.1–B.4).** Test: `src/game/__tests__/world_mechanics_m2.test.ts` (14) + `src/game/__tests__/world_balance_m2.test.ts` (30 ván/thế giới).
> - Luật thế giới tập trung ở `src/game/world-rules/worldRules.ts`, đọc `worldState` trong `GameState`. Thế giới khác trả về trung tính.
> - Quảng Trị: mùa khô (thuê x1,4, xây x1,2) / mùa mưa (thuê x0,8, xây x0,9) mỗi 6 vòng. Ô sạt lở (`blockedTiles`) không thu thuê.
> - Tây Bắc: phiên chợ mỗi 5 vòng — giao dịch, hạ giá và cầm cố không cần đúng lượt; bán công trình hoàn 100% (ngoài phiên 50%).
> - HUD: dòng trạng thái mùa/phiên chợ trong thanh hành động. Cân bằng (30 ván/thế giới, so Bản đồ Đô Thị, mô phỏng nay chạy trọn ván thật): Quảng Trị +7,9%, Tây Bắc −3,3%, cả hai trong ±10%. Mùa mưa hạ thuê từ ×0,85 xuống ×0,8 để về trong ngưỡng.
> - **Đã quyết định (phiên này): bỏ cơ chế sạt lở.** `blockedTiles` hiện vẫn nằm trong `WorldState` nhưng không còn nơi nào đặt ô; hàm `isTileBlocked` vẫn trung tính (không đóng ô nào) và không ảnh hưởng giá/tiền thuê. Giữ nguyên để tránh phá đổi B. Có thể quyết định lại sau.
> - `catalog.ts`: cả hai thế giới đã `AVAILABLE`/`FULL`; đã đăng ký loader pack, đã thêm `FREEZE_MARKET` vào kiểu hiệu ứng sự kiện.
**B.1 Dữ liệu (làm trước, rủi ro thấp).** Mỗi thế giới một tệp trong `worlds/packs/` theo mẫu `mekong-delta.ts`, gồm: 40 tên ô (vi/en), màu phân khu, bộ sự kiện riêng, plaza, particle, `chaosPresentation`.
**B.2 Cơ chế.**
- *Cao Nguyên Quảng Trị — "Mùa mưa, mùa khô"*: trường `seasonPhase: 'DRY' | 'WET'` trong `GameState`, đổi mỗi 6 vòng. Mùa khô: thuê nông nghiệp ×1,4, giá xây ×1,2. Mùa mưa: thuê ×0,8, giá xây ×0,9. Ô "Sạt lở" khoá 1 vòng. Sự kiện: bão lũ, hạn hán, được mùa, giá cà phê tăng vọt.
- *Tây Bắc Việt Nam — "Phiên chợ vùng cao"*: trường `marketOpen: boolean`, mở mỗi 5 vòng. Trong phiên chợ: giao dịch **không cần đúng lượt**, bán công trình hoàn 100% (ngoài phiên: hoàn 50%). Sự kiện: mưa đá, sương muối, khách du lịch bùng nổ, sạt lở đèo.
- HUD: một dòng trạng thái nhỏ hiện mùa/phiên chợ còn mấy vòng.
**B.3 Nghiệm thu.** Test đơn vị cho từng cơ chế; mô phỏng 30 ván/thế giới, chênh lệch thu nhập trung bình mỗi vòng so với Bản đồ Đô thị **≤ 10%**.
**B.4 Bật.** `worlds/catalog.ts`: `availability: 'AVAILABLE'`, `completeness: 'FULL'`.

### C. M2 — Chaos (đã cắt gọn theo yêu cầu)
> **Trạng thái: ✅ Đã cắt.** Test: `chaos_m2_cards_protection.test.ts` (14 test).
> **Đã xoá theo yêu cầu:** toàn bộ **Bảo hiểm Chaos** (nút mua, `insuranceTurns`, hiệu ứng `INSURANCE_GRANT`, thẻ "Hợp Đồng Bảo Hiểm Rủi Ro", khoá i18n, nhánh server, test) và **Phản đòn** (`counterCharges`, `COUNTER_GRANT`, thẻ "Khởi Kiện Phản Tố") — hai cơ chế chỉ tồn tại để bù trừ nhau. Thẻ tiêu cực **luôn có hiệu lực**; thứ duy nhất giới hạn thiệt hại là **trần 25% tiền mặt mỗi thẻ** (test quét toàn bộ thẻ vẫn xanh).
> **Đã xoá các trigger Chaos không đạp ô:** theo vòng mỗi 5 vòng, xúc xắc đôi, khủng hoảng tiền dưới $100, chuỗi dư chấn. Chaos chỉ xảy ra khi đạp ô (xem mục 2.5 và 2.6). Bộ đếm trong trình mô phỏng AI cũng bỏ, để mô phỏng khớp ván thật.
> Bộ thẻ còn **58 thẻ** (60 − 2). Nhóm JURIDICAL còn 4 thẻ. `ENVIRONMENT/TECH/SOCIAL/ECONOMIC` giữ nguyên 6 thẻ.
> Mọi thẻ vẫn có bản vi + en (test khoá bất biến).
1. Mở rộng `ChaosCategory` trong `game/types` thêm `SOCIAL | ENVIRONMENT | TECH | JURIDICAL`; thêm nhánh xử lý trong `chaosEngine.ts`.
2. Thêm 24 thẻ (6 mỗi loại) vào `chaosCards.ts`, luôn có `title/nameVi/taglineVi/flavorText/descriptionVi` + bản `en` tương ứng.
3. **Cập nhật test đang khẳng định 36 thẻ**: `src/game/__tests__/challenger_m3_adversarial_camera.test.tsx` (dòng ~213 và ~236) → đổi sang số mới, kèm ghi chú lý do.
4. Bảo hiểm: `pendingInsuranceTurns` trong `GameState`; nút mua ở ActionPanel (5% tài sản, 5 vòng); thẻ tiêu cực đầu tiên bị chặn, có log.
5. Phản đòn: thẻ dùng 1 lần huỷ thẻ vừa đánh vào mình.
6. **Trần thiệt hại**: mọi thẻ tiêu cực không lấy quá 25% tiền mặt người bị ảnh hưởng — viết một test quét toàn bộ thẻ để khẳng định.
7. Bốn cơ chế Chaos mới (chi tiết ở mục 6.2): chuỗi sự kiện, thẻ có 2 lựa chọn, người chơi tự kích hoạt bằng Chaos Coins, dự báo trước 1 vòng cho thảm hoạ.

### D. i18n — phần còn lại
> **Trạng thái: 🔶 Đã xong giao diện (mọi màn), còn chuỗi do engine sinh.**
> - **21 thành phần** đã chuyển hết sang `GAME_UI`/`COSMETIC_UI` và được test canh chừng (`i18n_hardcoded_guard.test.ts`): 6 modal trong ván, thanh hành động, điều khiển camera, bảng người chơi, banner xoay màn hình, menu chính, thiết lập ván, lobby online, hồ sơ, cửa hàng, tủ đồ, cài đặt, màn lỗi, nhiệm vụ ngày.
> - **36 thẻ Chaos gốc nay có bản tiếng Anh** (`chaosCardsEn.ts`) — trước đây người chơi English vẫn đọc nội dung thẻ tiếng Việt. Test khoá bất biến cho cả 60 thẻ.
> - Tên ô đất trong giao dịch đã đi qua `displayTileName` (đúng tên theo thế giới).
> - Sửa lỗi nội dung: menu lobby còn để "Giới hạn vòng 30/40/60" trái với luật **không giới hạn vòng** → nay chỉ còn một lựa chọn "Không giới hạn"; phía đối tác trong giao dịch ghi nhầm "bạn có" → nay là "đối tác có".
> - Đã kiểm chứng trên bản build: menu, thiết lập ván, lobby và modal giao dịch đều hiển thị đúng cả vi và en.
> - **Còn lại (D1):** chuỗi do engine sinh — lý do từ chối giao dịch (`tradeEngine`), nhật ký ván, lý do AI, thông báo đấu giá/nợ. Đã xác nhận còn lọt tiếng Việt ở dòng "Giao dịch phải bao gồm ít nhất tiền mặt, bất động sản…". Cần đổi engine trả khoá + tham số, làm theo từng nhóm log.
1. **Chuỗi do engine sinh** (nhật ký, mô tả thẻ, lý do AI, đấu giá, nợ): đổi engine trả **khoá + tham số** (ví dụ `{ key: 'LOG_BUY', params: { name, tile, price } }`), tầng UI ghép câu theo ngôn ngữ. Chạm vào `gameReducer`, `chaosEngine`, `auctionEngine`, `tradeEngine`, `aiDecisionEngine` và nhiều test — **làm theo từng nhóm log một**, giữ test xanh sau mỗi nhóm.
2. Các modal còn lại: Đấu giá, Nợ, Chiến thắng, Luật, Chi tiết ô, Chaos.
3. Màn ngoài ván: Thiết lập ván, Lobby online, Menu chính, Hồ sơ, Cửa hàng, Tủ đồ.
4. Đảm bảo mọi nơi hiển thị tên ô đi qua `displayTileName` (đã có hạ tầng vi/en theo thế giới).
5. Thêm test quét chuỗi tiếng Việt có dấu trong JSX của các thành phần **đã** chuyển đổi, để không tái phát.

### E. Điều đã kiểm chứng và chưa kiểm chứng
- [ ] Chơi online **hai người thật** sau đợt sửa phân quyền và giao dịch (mới chỉ test 1 người + AI).
- [x] Đồng hồ lượt (mục A) đã có và đã được khởi động lại server để dùng.
- [x] Vị trí xúc xắc và nhãn ô góc: đã nhìn qua ảnh chụp trên bản build (bàn cờ, xúc xắc không bị lệch, không lỗi console).
- [ ] Bố cục màn hẹp < 1024px: nhật ký nằm dưới bàn cờ, bàn cờ chỉ cao ~240px.

---

## 6. Thế giới & Chaos (chi tiết thiết kế)

### 6.1 Bốn thế giới đang khoá — mỗi nơi một cơ chế, không trùng nhau
| Thế giới | Cơ chế cốt lõi | Vì sao khác biệt |
| --- | --- | --- |
| Cao Nguyên Quảng Trị | Mùa mưa/khô mỗi 6 vòng, đổi thuê và giá xây | Phải canh mùa để mua bán |
| Tây Bắc Việt Nam | Chợ phiên mỗi 5 vòng, giao dịch ngoài lượt, hoàn tiền 100% | Lần duy nhất giao dịch không theo lượt |
| Vương Quốc Giả Tưởng | Chọn phe (Vương triều/Pháp sư/Thương đoàn), quyền đặc biệt mỗi 10 vòng, bỏ phiếu đổi luật nhỏ | Ngoại lệ luật có kiểm soát + chính trị giữa người chơi |
| Đảo Nhiệt Đới | Thuỷ triều mỗi 4 vòng: ô ven biển ngập mất thuê, triều thấp lộ ô mới | Bàn cờ đổi hình dạng theo chu kỳ |

Ô đặc thù gợi ý: Quảng Trị (đồi cà phê, hồ tiêu, trang trại điện gió, thác, cầu treo, sạt lở) · Tây Bắc (ruộng bậc thang, bản làng, đèo Ô Quy Hồ, cột mốc biên giới, suối nước nóng) · Giả tưởng (lâu đài, tháp phù thuỷ, chợ lùn, rừng tiên, cổng dịch chuyển) · Đảo (bãi san hô, cảng du lịch, khu lặn, làng chài, khu bảo tồn rùa).

### 6.2 Mở rộng Chaos
- Bốn loại mới: **SOCIAL** (liên minh chia thuê), **ENVIRONMENT** (đổi tầm nhìn, không đổi tiền), **TECH** (kỹ năng dùng 1 lần), **JURIDICAL** (luật tạm thời, ví dụ chống độc quyền).
- Bốn cơ chế: chuỗi sự kiện (bão nhỏ → lớn → siêu bão), thẻ 2 lựa chọn đánh đổi, người chơi tự kích hoạt bằng Chaos Coins (1 lần/ván, có cảnh báo trước), dự báo trước 1 vòng cho thảm hoạ.
- Bảo hiểm (5% tài sản, miễn 1 sự kiện tiêu cực trong 5 vòng) và phản đòn (1 lần).
- Lộ trình số lượng: +24 thẻ (giai đoạn 1) → +8 thẻ riêng mỗi thế giới (giai đoạn 2) → ~92 thẻ.

---

## 7. Ý tưởng làm online thú vị (người dùng sẽ chọn thêm)

| # | Ý tưởng | Chi phí | Trạng thái |
| --- | --- | --- | --- |
| 1 | Đồng hồ lượt 60s (máy chủ xác nhận) | Thấp–TB | ✅ Đã làm — mục A (online + chung máy khi 2 người thật trở lên) |
| 2 | Biểu cảm nhanh + 12 câu chat mẫu | Thấp | ✅ Đã làm |
| 3 | Bảng tin "vừa xảy ra" | Thấp | ✅ Đã làm |
| 4 | Chế độ 2v2 đồng đội (chia thuê, thắng chung) | TB | Chưa |
| 5 | Đấu giá thời gian thực (tăng giá theo nhịp) | TB | Chưa |
| 6 | Chợ đen giữa các ván (đổi vật phẩm thẩm mỹ) | TB | Chưa |
| 7 | Nhiệm vụ hằng ngày/tuần | Thấp | ✅ Đã làm (ngày) |
| 8 | Xem lại ván + chế độ khán giả | TB | Chưa |
| 9 | Bảng xếp hạng theo mùa | TB | Chưa |
| 10 | Chuông/thông báo khi tới lượt | Thấp | ✅ Đã làm |
| 11 | Thử thách bạn bè bằng mã ván cấu hình sẵn | Thấp | Chưa |
| 12 | Sự kiện cộng đồng toàn server | TB | Chưa |
| 13 | Khiên chống dẫn đầu | Thấp | ✅ Đã làm |
| 14 | Hợp đồng ngầm (không tấn công 5 vòng, phá bị phạt) | TB | Chưa |
| 15 | Tự động chụp khoảnh khắc đáng nhớ | Thấp | Chưa |

Thứ tự gợi ý tiếp theo: **4 (2v2)** dùng chung hạ tầng với đồng hồ lượt, rồi **5 (đấu giá thời gian thực)**, **8 (replay)**, **14 (hợp đồng ngầm)**.

---

## 8. 3D, UI/UX, rung lắc, âm thanh

### 8.1 Mô hình & vật thể
- 5 dáng công trình theo cấp (nhà phố → biệt thự → thương mại → cao ốc → landmark), thêm ăng-ten, sân thượng, biển hiệu.
- Chi tiết nhỏ: cột đèn, xe chạy vòng quanh bàn, chim, thuyền ở bản đồ sông nước.
- Vật liệu theo chất liệu (gỗ/kính/bê tông) thay vì một màu phẳng. LOD 3 mức theo khoảng cách camera.

### 8.2 Chuyển động
> **Trạng thái: 🔶 Đang làm — đã xong rung màn hình.**
> - `src/game/fx/screenShake.ts`: 3 mức (nhẹ 3px/220ms · vừa 7px/380ms · mạnh 14px/620ms), một vòng rAF duy nhất, giảm dần tuyến tính về 0.
> - Công tắc riêng trong Cài đặt (`data-testid="toggle-screen-shake"`), lưu localStorage; tôn trọng `prefers-reduced-motion` (tắt hẳn bất kể công tắc).
> - Rung mạnh không bị rung nhẹ cắt ngắn; rung nhẹ không thay thế được rung mạnh đang chạy.
> - Gắn sự kiện trong `App.tsx`: phá sản → MẠNH, phát sinh nợ/bị phạt → VỪA, tôi mua thêm đất → NHẸ.
> - Cách ly render: `components/fx/ScreenShakeBox.tsx` chỉ re-render khung bàn cờ, không kéo theo phần còn lại của app.
> - Test: `src/game/__tests__/screen_shake.test.ts` (5 test, đồng hồ giả nên đo được chính xác).
> - **Còn lại:** token nhảy parabol có squash-stretch; xúc xắc nảy 2 nhịp + tiếng lăn theo khoảng cách; thẻ Chaos lật 3D; số tiền bay từ quân cờ tới bảng người chơi.
- Token nhảy parabol có squash-stretch khi tiếp đất.
- Xúc xắc nảy 2 nhịp, tiếng lăn theo khoảng cách.
- Thẻ Chaos lật 3D như giấy thật, bóng đổ di chuyển theo.
- **Rung màn hình 3 mức** (nhẹ: mua đất · vừa: nộp phạt · mạnh: phá sản/siêu bão), có công tắc riêng, tôn trọng `prefers-reduced-motion`.
- Số tiền bay từ quân cờ tới bảng người chơi, đổi màu theo tăng/giảm.

### 8.3 UI/UX
> **Trạng thái: 🔶 Đang làm — trợ năng nền tảng đã xong.**
> - **Focus trap dùng chung** trong `useModalDismiss`: mở modal thì focus vào nút đầu tiên, Tab không thoát ra ngoài, đóng thì trả focus về nút đã mở. Áp dụng cho **mọi** modal vì sửa ở một chỗ. Đã kiểm chứng trên bản build: 12 lần Tab không thoát, Escape trả focus đúng.
> - **Vùng thông báo trình đọc màn hình** `LiveAnnouncer` (`role="status"`, `aria-live="polite"`): đọc lượt hiện tại và tên người phá sản. `ActionTicker` và `EventFeed` đã có `aria-live` từ trước.
> - Ba kiểu chữ `.t-title/.t-body/.t-label` đã áp cho nhóm modal trong ván (xem mục D).
> - **Còn lại:** trạng thái nút ba mức (thường/đang xử lý/thành công) trong ≤ 150ms; rà tương phản màu bằng công cụ; "mỗi modal một hành động chính, hành động phụ mờ hơn" mới đúng ở một phần modal.
- Ba kiểu chữ áp cho mọi modal (đang mở dần — xem mục D).
- Mỗi modal một hành động chính; hành động phụ ở hàng dưới, mờ hơn.
- Mọi nút có 3 trạng thái (thường/đang xử lý/thành công) trong ≤ 150ms.
- Trợ năng: tương phản ≥ 4.5:1 chữ thường, ≥ 3:1 chữ lớn; điều hướng bàn phím cho mọi modal; thông báo qua `aria-live`.

### 8.4 Âm thanh
> **Trạng thái: 🔶 Đang làm — nhạc đã có 3 lớp và nhạc cụ riêng theo thế giới.**
> - Thêm hợp âm cho 2 thế giới mới (Quảng Trị, Tây Bắc) — trước đây rơi về nhạc của Đô Thị.
> - **Nhạc cụ theo thế giới** (`WORLD_VOICE`): đàn tranh (Quảng Trị, envelope gảy), khèn (Tây Bắc, square detune), cùng các màu sẵn có cho 4 thế giới kia.
> - **3 lớp theo tình huống** (`CALM`/`TENSE`/`CLIMAX`): số lớp 2/3/4, âm lượng 0,9/1,0/1,12 trên một bus chung, **crossfade 2 giây**. `App.tsx` tự chuyển mức: nợ/đấu giá/người sắp phá sản → CLIMAX; thẻ Chaos hoặc giao dịch → TENSE; còn lại → CALM.
> - Test: `src/game/__tests__/adaptive_music.test.ts` (4 test) khoá crossfade, thứ tự lớp/âm lượng và việc mọi thế giới chơi được đều có nhạc cụ.
> - **Còn lại:** âm thanh có vị trí (`PannerNode` — xúc xắc ở giữa bàn, token theo quân cờ); giới hạn "tối đa 3 âm cùng lúc, mỗi âm < 1,5 giây" cho hiệu ứng.
- Nhạc 3 lớp theo tình huống (bình thường/căng thẳng/cao trào), crossfade 2 giây.
- Nhạc cụ theo thế giới: đàn tranh (Quảng Trị), khèn (Tây Bắc), dàn dây (Giả tưởng), ukulele (Đảo).
- Âm thanh có vị trí (Web Audio `PannerNode`): xúc xắc ở giữa bàn, token ở vị trí quân cờ.
- Quy tắc: tối đa 3 âm cùng lúc, mỗi âm < 1,5 giây, có công tắc nhạc/hiệu ứng riêng (đã có).

### 8.5 Hiệu năng & đo đạc
> **Trạng thái: 🔶 Đã tối ưu 70% draw call, còn sát ngưỡng.** Chi tiết: `docs/PERFORMANCE_8X_MEASUREMENTS.md`.
> - **Draw call (lượt chính): 629 → 189** (ngân sách 180, còn vượt 5%). **Chỉ số thô WebGL: 1258 → 378.** Chỉ số thô gấp đôi vì mỗi khung có thêm lượt vẽ bản đồ bóng.
> - Cách làm: hộp ô đất từ 6 vật liệu → 1 vật liệu + mặt phẳng texture riêng (mỗi ô 6 → 2 lệnh vẽ); ẩn hẳn mặt phẳng highlight thay vì vẽ với độ mờ 0. Đã đối chiếu ảnh chụp, hình ảnh không đổi.
> - Thời gian khung cũng tốt lên: bàn cờ đứng yên **5,56 ms trung bình / 6,6 ms p95 / 8,7 ms xấu nhất** (trước tối ưu: 6,27 / 9,2 / 12,9). Ngân sách 16,67 ms.
> - Bộ đếm `window.__chaosPerf` (lấy từ `renderer.info`, cập nhật mỗi khung) đã có sẵn để đo lại sau từng bước.
> - **Việc tiếp theo:** gộp 40 texture ô thành atlas + gộp mặt phẳng trên thành 1–2 lưới (~38 lệnh); gộp lưới quân cờ theo vật liệu (~12); atlas 6 mặt xúc xắc (~10); cân nhắc giảm bóng đổ cho máy yếu. Chưa làm.
- Ngân sách: 60 FPS máy tầm trung, ≤ 180 draw call cảnh bàn cờ, texture ≤ 2048px.
- `InstancedMesh` cho công trình lặp và xe cộ; gộp texture ô thành atlas.
- **Đo trước/sau mỗi thay đổi** (trace của trình duyệt: FPS, thời gian khung) và ghi số liệu vào `docs/`.

---

## 9. Tiêu chí nghiệm thu chung

Mọi việc trên chỉ được coi là xong khi:
1. `npx tsc --noEmit` sạch.
2. `npx vitest run` xanh toàn bộ (không được giảm số test; việc thay luật thì **cập nhật test kèm ghi chú lý do**, không xoá test).
3. `npm run build` chạy lại và `dist` được cập nhật (server phục vụ từ đĩa).
4. Có ít nhất một lần kiểm tra trên **bản vừa build**: bằng script Playwright, hoặc do người dùng xem và xác nhận (công cụ `browser.*` đã bị gỡ, xem ghi chú ở mục 1).
5. Với thay đổi cân bằng: có số liệu mô phỏng trước/sau.
6. Không thêm chuỗi tiếng Việt cứng trong component; dùng `GAME_UI`/`WORLD_UI`/`COSMETIC_UI`.
