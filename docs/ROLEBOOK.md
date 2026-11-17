# CHAOS MONOPOLY — Rolebook (ai thấy gì, ai làm được gì)

Tài liệu này mô tả quyền hiển thị và quyền thao tác của từng vai trò trong ván chơi.
Nguyên tắc chung: **mỗi người chỉ thấy các nút và thông tin cần cho chính mình**. Ai không có lượt thì chỉ xem và chờ.

## 1. Các vai trò

| Vai trò | Là ai | Ghi chú |
| --- | --- | --- |
| **Người đang có lượt** | Người chơi có quân cờ đang tới lượt | Duy nhất được đổ xúc xắc, mua đất, nâng cấp, kết thúc lượt, xử lý nợ, xác nhận thẻ sự kiện |
| **Người chơi khác** | Những người còn lại | Chỉ xem diễn biến, bảng người chơi, bàn cờ; chỉ có thể trả lời giao dịch khi được yêu cầu |
| **Người nhận giao dịch** | Đối tác được đề nghị đổi tài sản | Đồng ý / Từ chối / Đổi số tiền một lần |
| **Người gửi giao dịch** | Người tạo đề nghị | Chờ, hoặc rút lại; sau khi đối tác đổi số tiền thì trả lời lần cuối |
| **Chủ phòng (online)** | Người tạo phòng | Cấu hình phòng, bấm bắt đầu ván |
| **Khách (online)** | Người vào phòng bằng mã | Sẵn sàng, chọn quân cờ |
| **Máy (AI)** | Người chơi do máy điều khiển | Không hiện nút nào cho con người; máy tự hành động |

Trong chơi **trên cùng một máy** (chơi với nhau), “người đang có lượt” là người đang cầm máy. Trong chơi **online**, mỗi người chỉ thấy điều khiển của **chính mình**.

## 2. Ai được làm gì trong lượt chơi

| Hành động | Người đang có lượt | Người khác | Máy (AI) |
| --- | --- | --- | --- |
| Đổ xúc xắc | Có | Không | Tự động |
| Mua đất, nâng cấp, xây dựng | Có | Không | Tự động |
| Thế chấp / chuộc / bán công trình | Có | Không | Tự động |
| Kết thúc lượt | Có | Không | Tự động |
| Trả nợ, bảo lãnh, phá sản | Có | Không | Tự động |
| Xác nhận thẻ sự kiện (Chaos) | Có | Chỉ xem | Tự động |
| Mở bảng giao dịch | Có | Không (trừ khi có đề nghị gửi tới) | Không |
| Đồng ý / từ chối đề nghị | Người nhận (hoặc người gửi sau điều chỉnh) | Không | Tự động |
| Xem chi tiết ô đất | Có | Có | — |
| Gửi biểu cảm | Có | Có | — |

Khi không phải lượt của mình, thanh hành động chỉ hiện dòng trạng thái: **“Đang chờ <tên> …”** hoặc **“Máy <tên> đang hành động …”**.

## 3. Đổi tài sản (giao dịch) — luật ngắn gọn

Mục tiêu: nhanh, rõ, và không kéo dài thương lượng.

1. **Người gửi** chọn đối tác, chọn **tiền và ô đất mình đưa**, rồi chọn **tiền và ô đất mình muốn nhận**. Một dòng tóm tắt hiện ngay bên dưới. Bấm **Gửi đề nghị**.
2. **Người nhận** thấy một câu tóm tắt và có ba lựa chọn:
   - **Đồng ý** → giao dịch hoàn tất ngay.
   - **Từ chối** → kết thúc.
   - **Đổi số tiền (1 lần)** → chỉ đổi hai số tiền. Tài sản và thẻ không đổi.
3. Sau khi người nhận đổi số tiền, **người gửi** trả lời lần cuối: **Đồng ý**, **Từ chối**, hoặc **Rút lại**. Không ai được đổi thêm.
4. Người gửi có thể **Rút lại** bất cứ lúc nào trước khi đối tác trả lời xong.

Ràng buộc: không được đưa đất đang có công trình, không được đưa đất trong phân khu còn công trình, và không được đưa nhiều tiền hơn số dư.

Với đối tác là máy: máy trả lời ngay. Nếu máy là người nhận, nó đồng ý khi đề nghị đủ hợp lý, hoặc đổi số tiền một lần. Nếu máy là người gửi, nó đồng ý khi chi phí ròng sau điều chỉnh không quá 150.

## 4. Kinh tế (áp lực để ván kết thúc)

- **Giá mua và giá nâng cấp** tăng 3% mỗi vòng so với giá gốc.
- **Tiền thuê tăng theo ván** để ván không kéo dài vô tận: từ vòng 25 trở đi, mỗi vòng tiền thuê nhân thêm 9% so với mức gốc, tối đa gấp 8 lần. Màn chi tiết ô có ghi chú mức đang áp dụng.
- Không giới hạn số vòng. Ván kết thúc khi chỉ còn một người chưa phá sản. Nhờ áp lực tiền thuê, ván thường kết thúc trong khoảng 50–100 vòng (3 người trung bình 72 vòng, 4 người trung bình 53 vòng, đo bằng mô phỏng 10 ván).

## 5. Camera (góc nhìn bàn cờ)

- **Bám người chơi:** camera chỉ bám một người — online là quân của chính bạn; chơi trên cùng máy là người đang có lượt nếu đó là người thật. Lượt máy không làm camera chạy theo. Bàn cờ vẫn hiển thị đầy đủ.
- **Chữ "CỜ TỶ PHÚ" luôn ở phía trên khung nhìn** và xoay theo camera. Tấm chữ được thu nhỏ vừa đủ để **không bao giờ bị ô đất che ở bất kỳ góc nào**, kể cả góc 45°, và không đè lên xúc xắc. Nó vẫn hiển thị liên tục khi bạn quay camera (không còn thu thành chấm).
- **Tên và biểu tượng các ô góc** (KHỞI HÀNH, NHÀ LAO, BÃI ĐỖ XE, VÀO TÙ) đều xoay theo camera nên luôn đọc ngang và nhìn đúng chiều, không còn bị dọc khi nhìn từ cạnh bên.
- **Xoay theo ô:** khi quân cờ sang cạnh mới, bàn cờ xoay 90° để cạnh đó hướng về phía bạn. Chữ “CỜ TỶ PHÚ” đi theo hướng xoay.
- **Nam châm góc:** khi bạn tự xoay bàn cờ rồi thả chuột, nếu góc gần một bậc 90° của chế độ đang chọn (ví dụ Iso thì bậc 45°, 135°…), bàn cờ tự khớp về đúng bậc đó.
- **Ngắt ghim:** khi bạn tự kéo, xoay hoặc zoom, camera ngừng bám. Bấm **Tâm điểm** để ghim lại.
- **Chế độ:** nút **2D/3D** chuyển phẳng/nghiêng; nút **Đổi góc nhìn** vòng qua các góc 3D (Chuẩn → Iso → Cine → Cao).

## 5. Tóm tắt một câu cho mỗi vai trò

- **Người có lượt:** bạn là người duy nhất được bấm nút trong lượt của mình.
- **Người chơi khác:** bạn xem, chờ, và chỉ trả lời khi có đề nghị gửi tới bạn.
- **Người nhận đề nghị:** đồng ý, từ chối, hoặc đổi số tiền một lần.
- **Người gửi đề nghị:** chờ, rút lại, hoặc trả lời lần cuối sau khi đối tác đổi số tiền.
- **Máy:** tự hành động, không có nút nào cho con người trong lượt của máy.
