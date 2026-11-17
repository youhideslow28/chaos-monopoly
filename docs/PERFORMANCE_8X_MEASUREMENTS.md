# Đo hiệu năng & kiểm chứng trợ năng (mục 8.3 / 8.5)

Phiên: sau khi thêm rung màn hình, bổ sung tiếng Anh cho 36 thẻ gốc, và focus trap cho modal.
Máy đo: Chromium trong app, đo trực tiếp trên trang `http://localhost:3001` (bản `dist` vừa build).

## 1. Số liệu khung hình

| Bối cảnh | Số khung | Trung bình | p95 | Xấu nhất | FPS suy ra | Long task |
| --- | --- | --- | --- | --- | --- | --- |
| Bàn cờ 3D, ván 3 người, đứng yên | 479 (3 giây) | 6,27 ms | 9,20 ms | 12,90 ms | ~159 | 0 (0 ms) |
| Đang tương tác: đổ xúc xắc, kết thúc lượt, AI đi | 885 | 5,66 ms | 7,00 ms | 11,90 ms | ~176 | không đo được trong đợt này |

Ngân sách roadmap 8.5 là 60 FPS, tức 16,67 ms mỗi khung. Cả hai phép đo đều **dưới ngân sách**, kể cả khung xấu nhất (12,9 ms).

Ghi chú kỹ thuật:
- Môi trường đo không khoá vsync nên FPS trung bình vượt 60; con số đáng tin là **thời gian khung**, không phải FPS.
- `longtask` báo 0 trong lượt đo tĩnh. Lượt đo tương tác không cài `PerformanceObserver` nên để trống, không suy diễn.
- Chỉ có 1 canvas trên trang (bàn cờ 3D), không có canvas thứ hai chạy nền.

## 2. Kiểm chứng bằng mắt / DOM trên bản vừa build

Đã chơi thật trong trình duyệt (ván 3 người, chế độ Chơi Nhanh):

| Hạng mục | Kết quả | Bằng chứng |
| --- | --- | --- |
| Công tắc rung màn hình (Việt) | Bật → "Đang bật", tắt → "Đang tắt", lưu `localStorage` = `0`/`1` | `data-testid="toggle-screen-shake"` |
| Công tắc rung màn hình (Anh) | Hiện "Screen shake / On" | đổi ngôn ngữ bằng nút ở menu |
| Rung khi mua đất | Khung bàn cờ nhận `translate3d`, biên độ ≤ 3px, giảm dần về 0 | mẫu 27 khung ~420ms |
| Hộp Luật chơi (Anh) | "CHAOS MONOPOLY METROPOLIS RULEBOOK", có "60", "Chaos insurance", "No round cap" | `data-testid="rules-modal"` |
| Thẻ Chaos (Anh) | Phần khung đúng tiếng Anh; nội dung thẻ gốc nay đã có bản `en` (đã xác nhận trong gói build) | `data-testid="chaos-modal"` |
| Focus trap modal | Mở modal → focus vào nút đầu; 12 lần Tab không thoát ra ngoài; Escape → đóng và trả focus về nút đã mở | `role="dialog"`, `aria-modal="true"` |
| Vùng thông báo trình đọc màn hình | `role="status"`, `aria-live="polite"`, nội dung "Turn of …" | `data-testid="live-announcer"` |

## 3. Draw call — ĐÃ TỐI ƯU 70%, CÒN SÁT NGƯỠNG

Đã thêm bộ đếm chuẩn vào `ThreeSceneManager.renderLoop`: mỗi khung ghi `window.__chaosPerf` = `{ drawCalls, triangles, geometries, textures, programs, shadowMapEnabled }` (lấy từ `renderer.info`). Đo trên bản build, ván 3 người.

### 3.1 Trước và sau

| Chỉ số | Trước | Sau | Ngân sách |
| --- | --- | --- | --- |
| Draw call (main pass, `renderer.info`) | 629 | **189** | ≤ 180 |
| Draw call thô trên ngữ cảnh WebGL (mọi lượt vẽ/khung) | 1258 | **378** | ≤ 180 |
| Tam giác | 5.714 | 5.634 | — |
| Geometry | 105 | 105 | — |
| Texture | 55 | 55 | — |

**Giảm 70% ở cả hai cách đo.** Chỉ số thô gấp đôi chỉ số `renderer.info` vì mỗi khung có hai lượt vẽ: lượt chính và lượt bản đồ bóng. Hai con số luôn khớp tỉ lệ 2:1 (629↔1258, 189↔378).

### 3.2 Đã làm gì

1. **Hộp ô đất từ 6 vật liệu xuống 1 vật liệu.** Hộp 6 mặt với mảng 6 vật liệu khiến Three.js phát **6 lệnh vẽ mỗi ô** (40 ô = 240 lệnh). Nay hộp dùng một vật liệu, mặt trên là một mặt phẳng riêng phủ texture → mỗi ô còn 2 lệnh, hình ảnh không đổi.
2. **Ẩn hẳn mặt phẳng highlight khi không chọn.** Trước đây nó luôn được vẽ với độ mờ 0 (40 lệnh vô ích mỗi khung). Nay đặt `visible = false` khi không chọn và không rê chuột.

Đã đối chiếu bằng ảnh chụp bàn cờ sau khi đổi: màu ô, tên ô, bố cục giữ nguyên.

### 3.3 Còn lại để đạt ≤ 180 ở cả hai cách đo

Hiện vượt 9 lệnh ở lượt chính (5%), và vượt 198 lệnh ở chỉ số thô.

1. **Atlas texture ô** (bước lớn nhất còn lại): gộp 40 texture ô vào một atlas và gộp 40 mặt phẳng trên thành 1–2 lưới → giảm khoảng 38 lệnh ở lượt chính. Cần đổi UV, không chỉ đổi vật liệu.
2. **Gộp lưới theo vật liệu cho quân cờ**: mỗi quân là 6–8 lưới dùng 2–3 vật liệu; gộp còn 2–3 lưới/quân → tiết kiệm khoảng 12 lệnh.
3. **Xúc xắc**: 2 xúc xắc × 6 vật liệu mặt = 12 lệnh; dùng atlas 6 mặt và một vật liệu → còn 2 lệnh, tiết kiệm 10.
4. **Bản đồ bóng** là thứ nhân đôi chỉ số thô; nếu bớt bóng ở chế độ máy yếu thì chỉ số thô giảm gần một nửa.



## 4. Việc chưa đo / chưa kiểm

- **Bộ nhớ**: chưa chụp heap trước/sau một ván dài.
- **Máy yếu / mobile thật**: số liệu trên là desktop; chưa đo trên thiết bị thật.
- **Độ tương phản màu**: chưa đo bằng công cụ; các modal mới dùng lại bảng màu sẵn có của dự án.
- **Long task khi tương tác**: lượt đo tương tác không cài `PerformanceObserver` nên không có số.

