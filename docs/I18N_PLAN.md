# Kế hoạch hoàn thiện đa ngôn ngữ (VI/EN)

## Trạng thái hiện tại (đã làm)

- Cơ chế ngôn ngữ: `src/worlds/i18n.ts` — `useLocale()` / `setLocale()`, lưu vào localStorage, mọi component đăng ký sẽ tự vẽ lại.
- Từ điển mới `GAME_UI` cho giao diện chơi. Đã áp dụng cho:
  - Thanh tiêu đề trong ván (Vòng, Luật chơi, Âm thanh, Cài đặt, Ván mới).
  - Thanh hành động (Đổ xúc xắc, Mua ô đất, Đấu giá, Nâng cấp, Xây dựng, Thế chấp, Giao dịch, Kết thúc lượt, Bảo lãnh, Thẻ miễn giam, Thanh toán nợ, các dòng "đang chờ…", hộp thoại phá sản).
  - Điều khiển camera (2D/3D, Đổi góc nhìn, Phóng to/Thu nhỏ, Tâm điểm, Đặt lại).
  - Nhật ký ván (tiêu đề, dòng trống).
  - Bảng người chơi (Lượt, Phá sản, Tạm giam, số ô, bảng chi tiết).
- Bấm **English** trong Cài đặt nay đổi ngay toàn bộ các phần trên (trước đây chỉ đổi vài chỗ).

## Hệ thống chữ (3 kiểu duy nhất)

`src/index.css` định nghĩa đúng ba lớp, dùng thay cho việc chỉnh font/size rải rác:

- `.t-title` — tiêu đề, số liệu lớn.
- `.t-body` — đoạn văn, giá trị thường.
- `.t-label` — nhãn nhỏ, chữ in hoa, nút.

Cả ba dùng chung một font stack có đủ dấu tiếng Việt: `Outfit → Segoe UI → Roboto → Helvetica Neue → Arial`. Không dùng font trang trí (serif/mono) cho nội dung tiếng Việt.

## Còn lại (theo thứ tự ưu tiên)

1. **Chuỗi do engine sinh ra** (nhật ký, thẻ Chaos, lý do AI, thông báo đấu giá/nợ). Hiện engine trả về câu tiếng Việt hoàn chỉnh. Cách làm đúng: engine trả về *khoá + tham số* (ví dụ `{ key: 'LOG_BUY', params: { name, tile, price } }`), tầng UI ghép câu theo ngôn ngữ. Việc này chạm vào `gameReducer`, `chaosEngine`, `auctionEngine`, `tradeEngine`, `aiDecisionEngine` và các test tương ứng.
2. **Các modal còn lại**: Đấu giá, Nợ, Chiến thắng, Luật, Chi tiết ô, Thương lượng (đã có một phần), Chaos.
3. **Màn ngoài ván**: Thiết lập ván, Lobby online, Menu chính, Hồ sơ, Cửa hàng, Tủ đồ (đã có `COSMETIC_UI` một phần).
4. **Tên ô đất theo thế giới**: đã có sẵn cơ chế (`worlds/packs/*` có `tileNames` VI/EN) — chỉ cần đảm bảo mọi nơi hiển thị đi qua `displayTileName`.
5. **Rà soát tự động**: thêm test quét chuỗi tiếng Việt có dấu trong JSX của các component đã chuyển đổi, để tránh quay lại tình trạng chuỗi cứng.

## Quy ước khi thêm chữ mới

- Mọi câu hiển thị phải nằm trong `GAME_UI`, `WORLD_UI` hoặc `COSMETIC_UI`, có đủ `vi` và `en`.
- Trong component: `const [locale] = useLocale(); const t = (k) => GAME_UI[k][locale];`
- Chỉ dùng ba lớp chữ `.t-title`, `.t-body`, `.t-label`.
- Không nối chuỗi tiếng Việt trong JSX.
