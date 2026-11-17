# CHAOS MONOPOLY — Game Rules & Chaos Engine Authoritative Specification
**Document Version**: 1.0.0 (Production Blueprint)  
**Author**: Game Design & Chaos Engine Architecture Team (`teamwork_explorer_survey_2`)  
**Target Platform**: Browser (Desktop & Mobile Hot-Seat 2–4 Players)  
**Language**: Vietnamese Default (`vi-VN`)  
**Architecture Standard**: Decoupled TypeScript Finite State Machine (FSM)

---

## 1. Executive Summary & Game Vision

**CHAOS MONOPOLY** is a high-tempo, competitive, turn-based board game that marries the classical real-estate trading foundations of Monopoly with an unpredictable, dynamic **Chaos Engine**. 

### Core Pillars
1. **Vietnamese Metropolis Theme**: The traditional Atlantic City board is reimagined as modern Vietnam's economic powerhouse corridors—from the ancient cultural centers of Hà Nội and Cố Đô Huế to the bustling nightlife of Cần Thơ, the maritime shipping lanes of Hải Phòng & Cảng Sài Gòn, the resort boomtowns of Đà Nẵng & Phú Quốc, and the towering skyscrapers of TP Hồ Chí Minh.
2. **Deterministic & Seedable Chaos**: Random events are not mere cosmetic notifications; they dynamically warp board physics, alter monetary velocity, induce market crashes, exchange player positions, and trigger high-stakes desperation gambles. A seedable PRNG guarantees full testability and anti-cheat consistency.
3. **Pacing & Anti-Stall Economy**: Traditional Monopoly matches stall for hours due to excessive liquidity and loose mortgage loops. CHAOS MONOPOLY strictly balances the money supply ($1,500k starting cash, $200k salary, targeted rent curves, and round caps of 60 rounds) to deliver a crisp, dramatic **45–60 minute match**.
4. **Hot-Seat First-Class UX**: Seamless local pass-and-play for 2 to 4 human or AI players with customizable avatars, colors, distinct audio-visual telemetry, and accessible interfaces.

---

## 2. Complete 40-Tile Modern Vietnamese Board Layout

The board consists of **40 perimeter tiles** numbered `0` through `39` arranged clockwise in a 10×10 grid layout with 4 corner anchor tiles.

```
+---------------------------------------------------------------------------------------------------+
|  [20] BÃI ĐỖ XE  | [21] Đà Nẵng 1 | [22] Chaos β | [23] Đà Nẵng 2 | ... | [30] VÀO TÙ           |
|  (Trạm Nghỉ Chân)| Mỹ Khê         |              | Sơn Trà        |     | (Lệnh Tạm Giam)       |
+------------------+----------------+--------------+----------------+-----+-----------------------+
|  [19] Hải Phòng 3|                                                      | [31] Hà Nội 1         |
|  Tuần Châu       |                                                      | Phố Cổ Tạ Hiện        |
+------------------+                                                      +-----------------------+
|  [18] Hải Phòng 2|                                                      | [32] Hà Nội 2         |
|  Đồ Sơn          |                     CHAOS MONOPOLY                   | Hồ Hoàn Kiếm          |
+------------------+                    BÀN CỜ ĐÔ THỊ VIỆT NAM            +-----------------------+
|  [17] Lễ Hội     |                                                      | [33] Khí Vận          |
|  Khí Vận         |                                                      | Sự Kiện               |
+------------------+                                                      +-----------------------+
|  [16] Hải Phòng 1|                                                      | [34] Hà Nội 3         |
|  Lạch Tray       |                                                      | Bán Đảo Tây Hồ        |
+------------------+                                                      +-----------------------+
|  [15] CẢNG       |                                                      | [35] SÂN BAY          |
|  Hải Phòng       |                                                      | Nội Bài - Tân Sơn Nhất|
+------------------+                                                      +-----------------------+
|  [14] Huế 3      |                                                      | [36] Chaos Ω          |
|  Phố Cổ Hội An   |                                                      | Cổng Vũ Trụ           |
+------------------+                                                      +-----------------------+
|  [13] Huế 2      |                                                      | [37] TP.HCM 1         |
|  Cầu Tràng Tiền  |                                                      | Phố Tài Chính Q.1     |
+------------------+                                                      +-----------------------+
|  [12] CẤP NƯỚC   |                                                      | [38] THUẾ TÀI SẢN     |
|  Chợ Lớn SAWACO  |                                                      | Đô Thị Cao Cấp        |
+------------------+                                                      +-----------------------+
|  [11] Huế 1      |                                                      | [39] TP.HCM 2         |
|  Đại Nội         |                                                      | Landmark 81 & Thủ Thiêm|
+------------------+----------------+--------------+----------------+-----+-----------------------+
|  [10] TẠM GIAM   | [9] Nha Trang 2| [8] Nha Trang| [7] Chaos α    | ... | [0] CỔNG KHỞI HÀNH    |
|  (Khu Cách Ly)   | Tháp Trầm Hương| Trần Phú     |                |     | (GO - Nhận $200k)     |
+---------------------------------------------------------------------------------------------------+
```

### 2.1 Complete 40-Tile Specification Table

*Monetary unit: thousands VND (`k VND`), e.g., 200k VND = $200k.*

| ID | Tên Ô (Vietnamese) | Tên Ngắn | Loại (Type) | Phân Khu / Nhóm | Giá Mua | Xây/Cấp | Tiền Thuê Gốc | Thuê 1★ | Thuê 2★ | Thuê 3★ | Thuê 4★ | Thuê Landmark | Cầm Cố |
|:---|:---|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **0** | **Cổng Khởi Hành** | Khởi Hành | `START` | Góc Đặc Biệt | - | - | - | - | - | - | - | - | - |
| **1** | Bến Ninh Kiều (Cần Thơ) | Bến Ninh Kiều | `PROPERTY` | Nâu (Đồng Bằng) | 60k | 50k | 2k | 10k | 30k | 90k | 160k | 250k | 30k |
| **2** | Lễ Hội Sông Nước | Lễ Hội 1 | `CHEST` | Khí Vận / Lễ Hội | - | - | - | - | - | - | - | - | - |
| **3** | Chợ Nổi Cái Răng (Cần Thơ) | Chợ Nổi | `PROPERTY` | Nâu (Đồng Bằng) | 60k | 50k | 4k | 20k | 60k | 180k | 320k | 450k | 30k |
| **4** | Thuế Thu Nhập Đô Thị | Thuế TN | `TAX` | Thuế Nhà Nước | - | - | 200k | - | - | - | - | - | - |
| **5** | Ga Hà Nội (Đường Sắt Bắc Nam) | Ga Hà Nội | `TRANSPORT` | Trục Vận Tải | 200k | - | 25k | 50k | 100k | 200k | - | - | 100k |
| **6** | Bãi Sau Vũng Tàu | Vũng Tàu | `PROPERTY` | Lam Nhạt (Biển Đông)| 100k | 50k | 6k | 30k | 90k | 270k | 400k | 550k | 50k |
| **7** | Cổng Hỗn Loạn Alpha | Chaos α | `CHAOS` | Vòng Xoáy Hỗn Độn| - | - | - | - | - | - | - | - | - |
| **8** | Đường Trần Phú (Nha Trang) | Trần Phú | `PROPERTY` | Lam Nhạt (Biển Đông)| 100k | 50k | 6k | 30k | 90k | 270k | 400k | 550k | 50k |
| **9** | Tháp Trầm Hương (Nha Trang) | Trầm Hương | `PROPERTY` | Lam Nhạt (Biển Đông)| 120k | 50k | 8k | 40k | 100k | 300k | 450k | 600k | 60k |
| **10**| **Khu Cách Ly Tạm Giam** | Tạm Giam | `DETENTION` | Góc Đặc Biệt | - | - | - | - | - | - | - | - | - |
| **11**| Đại Nội Kinh Thành Huế | Đại Nội | `PROPERTY` | Tím Hồng (Cố Đô) | 140k | 100k | 10k | 50k | 150k | 450k | 625k | 750k | 70k |
| **12**| Cấp Nước Chợ Lớn (SAWACO) | Cấp Nước | `UTILITY` | Hạ Tầng Năng Lượng| 150k | - | *x4 Dice*| *x10 Dice*| - | - | - | - | 75k |
| **13**| Cầu Tràng Tiền (Huế) | Tràng Tiền | `PROPERTY` | Tím Hồng (Cố Đô) | 140k | 100k | 10k | 50k | 150k | 450k | 625k | 750k | 70k |
| **14**| Phố Cổ Hội An | Hội An | `PROPERTY` | Tím Hồng (Cố Đô) | 160k | 100k | 12k | 60k | 180k | 500k | 700k | 900k | 80k |
| **15**| Cảng Quốc Tế Hải Phòng | Cảng HP | `TRANSPORT` | Trục Vận Tải | 200k | - | 25k | 50k | 100k | 200k | - | - | 100k |
| **16**| Phố Cảng Lạch Tray (Hải Phòng)| Lạch Tray | `PROPERTY` | Cam (Công Nghiệp) | 180k | 100k | 14k | 70k | 200k | 550k | 750k | 950k | 90k |
| **17**| Khí Vận Doanh Nhân | Khí Vận 1 | `CHANCE` | Khí Vận / May Rủi | - | - | - | - | - | - | - | - | - |
| **18**| Bán Đảo Đồ Sơn (Hải Phòng) | Đồ Sơn | `PROPERTY` | Cam (Công Nghiệp) | 180k | 100k | 14k | 70k | 200k | 550k | 750k | 950k | 90k |
| **19**| Bến Du Thuyền Tuần Châu | Tuần Châu | `PROPERTY` | Cam (Công Nghiệp) | 200k | 100k | 16k | 80k | 220k | 600k | 800k | 1,000k| 100k |
| **20**| **Trạm Nghỉ Chân Miễn Phí** | Nghỉ Chân | `REST_ZONE` | Góc Đặc Biệt | - | - | - | - | - | - | - | - | - |
| **21**| Bãi Biển Mỹ Khê (Đà Nẵng) | Mỹ Khê | `PROPERTY` | Đỏ (Kỳ Quan Biển) | 220k | 150k | 18k | 90k | 250k | 700k | 875k | 1,050k| 110k |
| **22**| Cổng Hỗn Loạn Beta | Chaos β | `CHAOS` | Vòng Xoáy Hỗn Độn| - | - | - | - | - | - | - | - | - |
| **23**| Bán Đảo Sơn Trà (Đà Nẵng) | Sơn Trà | `PROPERTY` | Đỏ (Kỳ Quan Biển) | 220k | 150k | 18k | 90k | 250k | 700k | 875k | 1,050k| 110k |
| **24**| Cầu Vàng Bà Nà Hills | Cầu Vàng | `PROPERTY` | Đỏ (Kỳ Quan Biển) | 240k | 150k | 20k | 100k | 300k | 750k | 925k | 1,100k| 120k |
| **25**| Cảng Quốc Tế Sài Gòn | Cảng SG | `TRANSPORT` | Trục Vận Tải | 200k | - | 25k | 50k | 100k | 200k | - | - | 100k |
| **26**| Bãi Sao (Phú Quốc) | Bãi Sao | `PROPERTY` | Vàng (Đảo Ngọc) | 260k | 150k | 22k | 110k | 330k | 800k | 975k | 1,150k| 130k |
| **27**| Thị Trấn Hoàng Hôn Sunset | Sunset Town | `PROPERTY` | Vàng (Đảo Ngọc) | 260k | 150k | 22k | 110k | 330k | 800k | 975k | 1,150k| 130k |
| **28**| Điện Lực Quốc Gia EVN | Điện EVN | `UTILITY` | Hạ Tầng Năng Lượng| 150k | - | *x4 Dice*| *x10 Dice*| - | - | - | - | 75k |
| **29**| Thành Phố Không Ngủ Grand World| Grand World| `PROPERTY` | Vàng (Đảo Ngọc) | 280k | 150k | 24k | 120k | 360k | 850k | 1,025k| 1,200k| 140k |
| **30**| **Lệnh Giam Giữ (Vào Tù)** | Vào Tù | `GO_TO_JAIL`| Góc Đặc Biệt | - | - | - | - | - | - | - | - | - |
| **31**| Phố Cổ Tạ Hiện (Hà Nội) | Phố Tạ Hiện| `PROPERTY` | Lục (Thủ Đô) | 300k | 200k | 26k | 130k | 390k | 900k | 1,100k| 1,275k| 150k |
| **32**| Bờ Hồ Hoàn Kiếm (Hà Nội) | Hồ Hoàn Kiếm| `PROPERTY`| Lục (Thủ Đô) | 300k | 200k | 26k | 130k | 390k | 900k | 1,100k| 1,275k| 150k |
| **33**| Lễ Hội Ngàn Năm Thăng Long | Lễ Hội 2 | `CHEST` | Khí Vận / Lễ Hội | - | - | - | - | - | - | - | - | - |
| **34**| Bán Đảo Tây Hồ (Hà Nội) | Tây Hồ | `PROPERTY` | Lục (Thủ Đô) | 320k | 200k | 28k | 150k | 450k | 1,000k| 1,200k| 1,400k| 160k |
| **35**| Sân Bay Quốc Tế Nội Bài - TSN | Sân Bay QT | `TRANSPORT` | Trục Vận Tải | 200k | - | 25k | 50k | 100k | 200k | - | - | 100k |
| **36**| Cổng Hỗn Loạn Omega | Chaos Ω | `CHAOS` | Vòng Xoáy Hỗn Độn| - | - | - | - | - | - | - | - | - |
| **37**| Phố Tài Chính Nguyễn Huệ (Q.1) | Nguyễn Huệ | `PROPERTY` | Lam Thẫm (Kinh Tế Vàng)| 350k | 200k | 35k | 175k | 500k | 1,100k| 1,300k| 1,500k| 175k |
| **38**| Thuế Tài Sản Đô Thị Cao Cấp | Thuế Tài Sản| `TAX` | Thuế Nhà Nước | - | - | 100k | - | - | - | - | - | - |
| **39**| Tòa Tháp Landmark 81 & Thủ Thiêm| Landmark 81 | `PROPERTY`| Lam Thẫm (Kinh Tế Vàng)| 400k | 200k | 50k | 200k | 600k | 1,400k| 1,700k| 2,000k| 200k |

---

### 2.2 Special Tile Rules & Mechanics

1. **Tile 0: Cổng Khởi Hành (GO)**
   - Mỗi khi người chơi đi ngang qua hoặc dừng đúng ô này, Ngân Hàng cấp ngay **$200k VND** trợ cấp thành phố.
   - Nếu bị dịch chuyển trực tiếp bằng hiệu ứng Chaos tới Tile 0, người chơi vẫn được nhận đủ $200k VND.
2. **Tile 10: Tạm Giam (Khu Cách Ly An Ninh)**
   - Nếu người chơi di chuyển thông thường và dừng tại ô 10: Trạng thái là **Thăm Viếng (Just Visiting)**, không mất phí và tiếp tục lượt sau bình thường.
   - Nếu bị bắt vào tù (từ Tile 30, hoặc đổ xúc xắc xúc đôi 3 lần, hoặc do Thẻ Chaos): Trạng thái là **Bị Giam (In Detention)** trong tối đa 3 lượt.
   - Cơ chế thoát khỏi Tạm Giam:
     1. Đổ được Xúc Xắc Đôi ở lượt kế tiếp (tự do đi số bước tương ứng, không được roll thêm lần thứ 2).
     2. Nộp tiền bảo lãnh **$100k VND** trước khi đổ xúc xắc.
     3. Sử dụng Thẻ "Miễn Trừ Giam Giữ" (Get Out of Jail Free) nếu sở hữu.
     4. Nếu sau 3 lượt đổ xúc xắc vẫn không ra xúc đôi, người chơi bắt buộc phải nộp $100k VND và di chuyển theo kết quả xúc xắc của lượt thứ 3.
   - *Lưu ý*: Khi đang ở trong Tạm Giam, người chơi **vẫn được thu tiền thuê nhà**, tham gia đấu giá, mua bán và giao dịch bất động sản bình thường.
3. **Tile 20: Trạm Nghỉ Chân Miễn Phí (Rest Zone)**
   - Điểm dừng chân an toàn tuyệt đối. Không có khoản phạt hay tiền thưởng cố định, nhưng tạo nhịp nghỉ chiến thuật giữa trận đấu căng thẳng.
4. **Tile 30: Vào Tù (Lệnh Bắt Tạm Giam)**
   - Người chơi dừng tại đây bị áp giải lập tức về Tile 10 (Khu Cách Ly).
   - **Không được nhận $200k VND** của Cổng Khởi Hành (dù bay qua ô 0). Lượt chơi kết thúc ngay lập tức.
5. **Tile 4 & 38: Thuế Nhà Nước**
   - Tile 4 (Thuế Thu Nhập): Người chơi nộp ngay $200k VND cho Ngân Hàng (hoặc 10% tổng tài sản, lấy mốc tròn cố định $200k cho tính dứt khoát).
   - Tile 38 (Thuế Tài Sản Cao Cấp): Người chơi nộp ngay $100k VND cho Ngân Hàng.
6. **Tile 5, 15, 25, 35: 4 Trạm Vận Tải Quốc Gia**
   - Giá mua: $200k VND/trạm.
   - Tiền thuê phụ thuộc vào số lượng Trạm mà người đó đang sở hữu:
     - Sở hữu 1 trạm: **$25k VND**
     - Sở hữu 2 trạm: **$50k VND**
     - Sở hữu 3 trạm: **$100k VND**
     - Sở hữu 4 trạm: **$200k VND**
7. **Tile 12 & 28: 2 Công Trình Tiện Ích Hạ Tầng (SAWACO & EVN)**
   - Giá mua: $150k VND/công trình.
   - Tiền thuê biến thiên theo tổng điểm 2 xúc xắc của người chơi vừa dừng lại:
     - Sở hữu 1 công trình tiện ích: Tiền thuê = **4 × (Tổng điểm 2 xúc xắc)** [Ví dụ đổ 8 điểm -> nộp $32k VND].
     - Sở hữu cả 2 công trình tiện ích: Tiền thuê = **10 × (Tổng điểm 2 xúc xắc)** [Ví dụ đổ 8 điểm -> nộp $80k VND].
8. **Tile 7, 22, 36: 3 Cổng Hỗn Loạn (Chaos Portals α, β, Ω)**
   - Kích hoạt rút Thẻ Chaos ngay lập tức! Thẻ này tác động trực tiếp lên người chơi, toàn bàn cờ hoặc nền kinh tế.

---

## 3. Core Game Mechanics & Hot-Seat Economy

### 3.1 Player Setup & Hot-Seat Flow
- **Số lượng người chơi**: 2 đến 4 người chơi cùng 1 thiết bị (Local Hot-Seat).
- **Thiết lập người chơi**: Tùy chỉnh Tên, Màu sắc đại diện, và Token linh vật (Robot Cyber, Xe Đua Neon, Tàu Vũ Trụ Aero, Vương Miện Apex).
- **Vốn khởi điểm**: Mỗi người chơi bắt đầu với **$1,500k VND** tiền mặt.
- **Thứ tự lượt**: Xác định tự động hoặc quay xúc xắc chọn người chơi đầu tiên, sau đó luân phiên theo chiều kim đồng hồ (hoặc bị đảo chiều bởi Chaos).

### 3.2 Turn State Machine (FSM)

```
[WAITING_FOR_ROLL] ──(ROLL_DICE_START)──> [ROLLING]
         │                                    │
         │                            (ROLL_DICE_RESULT)
         │                                    ▼
         │                                [MOVING]
         │                                    │
         │                            (STEP_MOVE_COMPLETE)
         │                                    ▼
         │                            [RESOLVING_TILE]
         │                                    │
         ├────────────────────────────────────┼───────────────────────────────────┐
         ▼                                    ▼                                   ▼
   [BUY/ACTION_MENU]                   [CHAOS_EVENT]                       [BANKRUPTCY_CHECK]
         │                                    │                                   │
   (BUY/UPGRADE/END)                   (RESOLVE_CHAOS)                     (LIQUIDATE/BANKRUPT)
         ▼                                    ▼                                   ▼
         └────────────────────────────────────┴───────────────────────────────────┘
                                              ▼
                                      [WAITING_FOR_ROLL]
                                    (Next or Extra Turn)
```

### 3.3 Dice Rolling & Doubles Rule
- Sử dụng **2 xúc xắc 6 mặt (2d6)**.
- **Xúc Xắc Đôi (Doubles)**:
  - Nếu kết quả xúc xắc là đôi (ví dụ: 2-2, 5-5), người chơi được quyền **Đổ Tiếp (Roll Again)** sau khi hoàn thành hành động tại ô vừa đáp.
  - **Luật 3 Lần Xúc Đôi**: Nếu đổ được xúc đôi liên tiếp **3 lần trong cùng 1 lượt**, người chơi lập tức bị áp giải vào **Tạm Giam (Khu Cách Ly)**, hủy bỏ mọi bước đi của lần đổ thứ 3, và lượt kết thúc ngay lập tức.

### 3.4 Quy Chế Độc Quyền Khu Vực & Nâng Cấp Công Trình
- **Bonus Độc Quyền (Monopoly Bonus)**:
  - Khi một người chơi thâu tóm toàn bộ các ô đất trong cùng một Phân Khu Màu (Color District):
    - **Tiền thuê đất trống (Level 0) được nhân đôi (x2)** tự động!
    - Mở khóa quyền **Xây Dựng Nâng Cấp** các công trình trên toàn phân khu đó.
- **Các Cấp Nâng Cấp (5 Cấp Độ)**:
  - **Level 0**: Đất trống (Unimproved Land)
  - **Level 1**: Nhà phố 1 Sao (1★)
  - **Level 2**: Biệt thự 2 Sao (2★)
  - **Level 3**: Trung tâm thương mại 3 Sao (3★)
  - **Level 4**: Cao ốc phức hợp 4 Sao (4★)
  - **Level 5**: Đại Công Trình / Khách Sạn Apex (Landmark 5★)
- **Quy Tắc Xây Dựng Đồng Đều (Even Building Rule)**:
  - Không được nâng cấp một bất động sản lên Level `N + 1` nếu các bất động sản còn lại trong cùng phân khu màu đó chưa đạt tối thiểu Level `N`.
  - Không được phép nâng cấp bất động sản nếu có bất kỳ ô đất nào trong phân khu đang bị **Cầm Cố (Mortgaged)**.

### 3.5 Cầm Cố (Mortgage) & Mua Bán Giữa Người Chơi
- **Cầm Cố Bất Động Sản**:
  - Người chơi có thể thế chấp bất động sản trống (Level 0) cho Ngân Hàng để nhận ngay **50% Giá Gốc** (`basePrice / 2`).
  - Trước khi thế chấp, toàn bộ nhà/công trình xây dựng trên phân khu đó phải được bán lại cho Ngân Hàng với giá **50% Phí Xây Dựng**.
  - Bất động sản đang thế chấp **không thu được tiền thuê**.
- **Giải Chấp (Chuộc Lại - Unmortgage)**:
  - Phí chuộc lại = **Giá thế chấp + 10% Lãi suất** = `(basePrice / 2) * 1.10 = 55% Giá Gốc`.
- **Giao Dịch Trực Tiếp (Hot-Seat Trading)**:
  - Người chơi trong lượt có thể đề xuất trao đổi tài sản với người chơi khác: Tiền mặt, Bất động sản chưa xây nhà, Thẻ miễn giam giữ.

### 3.6 Xử Lý Vỡ Nợ (Debt Liquidation) & Phá Sản (Bankruptcy)
- **Tuyệt đối không cho phép số dư tiền mặt bị âm trong trạng thái ổn định!**
- **Quy trình Thanh Khoản Khẩn Cấp (Liquidation Phase)**:
  - Khi một người chơi đối mặt với khoản nợ (tiền thuê, thuế, phạt Chaos) vượt quá số tiền mặt hiện có:
    1. Trò chơi chuyển sang trạng thái cảnh báo nợ khẩn cấp.
    2. Người chơi có thể bán công trình (thu về 50% vốn xây) và cầm cố bất động sản để gom đủ tiền mặt.
    3. Nếu gom đủ tiền -> Hoàn tất thanh toán nợ, tiếp tục ván đấu.
    4. Nếu sau khi bán toàn bộ công trình và cầm cố hết tài sản mà vẫn không đủ trả -> Người chơi bắt buộc phải **Tuyên Bố Phá Sản**.
- **Giải Quyết Tài Sản Khi Phá Sản**:
  - **Phá sản do nợ Người Chơi khác**: Toàn bộ tiền mặt còn lại và tất cả bất động sản (kể cả đang cầm cố) được chuyển nhượng cho chủ nợ. Chủ nợ nhận bất động sản cầm cố có thể chọn giải chấp ngay (trả 55%) hoặc giữ nguyên trạng thái thế chấp (trả 10% phí lưu kho).
  - **Phá sản do nợ Ngân Hàng / Thuế / Chaos**: Toàn bộ bất động sản bị tịch thu, hủy toàn bộ công trình xây dựng, xóa thế chấp và đưa về trạng thái Đất Trống không chủ sở hữu, cho phép người chơi khác dừng lại mua tiếp.
  - Người chơi phá sản bị **loại vĩnh viễn** khỏi ván đấu.

### 3.7 Kiểm Soát Tốc Độ Ván Đấu (Pacing 45–60 Phút)
1. **Tiền Lương Khởi Hành Cân Bằng**: $200k VND đủ để duy trì thanh khoản nhưng không tạo lạm phát vô tận.
2. **Độ Dốc Tiền Thuê Cao (Aggressive Rent Curve)**: Rents ở cấp Landmark đạt $1,000k – $2,000k VND, bảo đảm ván đấu có tính sát phạt cao ở giai đoạn cuối trận.
3. **Giới Hạn Số Vòng Chơi (Turn Limit)**:
   - Chế độ Mặc định: Tối đa **60 Vòng (60 Rounds)**.
   - Chế độ Nhanh (Fast Mode): **40 Vòng**, phát ngẫu nhiên 2–3 ô đất đầu trận cho mỗi người chơi.
4. **Điều Kiện Thắng (Victory Conditions)**:
   - **Người Sống Sót Duy Nhất (Last Man Standing)**: Tất cả đối thủ đã phá sản -> Chiến thắng tuyệt đối!
   - **Hết Giới Hạn Vòng (Max Rounds Reached)**: Người chơi có **Tổng Tài Sản Ròng (Net Worth)** cao nhất sẽ chiến thắng.
     * Công thức Tính Tổng Tài Sản Ròng:  
       $$\text{Net Worth} = \text{Tiền mặt} + \sum \text{Giá gốc BĐS sở hữu} + \sum (\text{Cấp công trình} \times \text{Phí xây}) - \sum \text{Nợ cầm cố}$$

---

## 4. Chaos Engine Deep Specification

Trái tim tạo nên sự khác biệt của **CHAOS MONOPOLY** là cỗ máy biến cố ngẫu nhiên đa chiều **Chaos Engine**.

```
+---------------------------------------------------------------------------------------------------+
|                                         CHAOS ENGINE V1.0                                         |
+---------------------------------------------------------------------------------------------------+
|  [Deterministic PRNG (Mulberry32)]                                                                 |
|         │                                                                                         |
|         ├──> Trigger Evaluator                                                                    |
|         │       ├── 1. Tile Trigger (Landed on Tile 7, 22, 36)                                    |
|         │       ├── 2. Double Dice Surge (Snake Eyes 1-1 / Boxcars 6-6 / 2x Doubles)             |
|         │       ├── 3. Global Interval Trigger (Every 5 Rounds)                                   |
|         │       └── 4. Player Crisis Trigger (Cash < $100k Desperation Gamble)                    |
|         │                                                                                         |
|         ├──> Event Deck Selector & Filter (Category, Rarity, Conditions)                           |
|         │                                                                                         |
|         ├──> Effect Resolver (Pure Reducer State Mutation)                                        |
|         │       ├── Immediate Cash Transactions (Safe solvency check)                             |
|         │       ├── Spatial Warp & Token Re-positions                                             |
|         │       ├── Market Modifiers (Rent Multiplier, Construction Grants)                       |
|         │       └── Global Physics (Reverse Clockwise, Musical Chairs)                            |
|         │                                                                                         |
|         └──> Telemetry & Event History Logger                                                     |
+---------------------------------------------------------------------------------------------------+
```

### 4.1 Seedable Deterministic PRNG Engine
Sử dụng thuật toán **Mulberry32** hoặc **Xoshiro128** độc lập, cho phép truyền hạt giống `seed` ngẫu nhiên hoặc cố định để phục vụ tự động hóa kiểm thử Vitest và khả năng phát lại ván cờ (replayability).

```typescript
export class SeededPRNG {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed >>> 0;
  }

  // Returns float in [0, 1)
  nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  pickOne<T>(items: readonly T[]): T {
    return items[Math.floor(this.nextFloat() * items.length)];
  }

  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.nextFloat() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
```

### 4.2 Dynamic Trigger Architecture
Chaos Engine lắng nghe 4 kênh kích hoạt sự kiện:

1. **Tile Trigger (`TILE_LANDED`)**: Khi người chơi dừng lại tại một trong 3 Cổng Hỗn Loạn:
   - Tile 7: **Chaos Alpha (α)** — Tỷ lệ thẻ Common / Uncommon cao.
   - Tile 22: **Chaos Beta (β)** — Tỷ lệ thẻ Uncommon / Rare cao.
   - Tile 36: **Chaos Omega (Ω)** — Tỷ lệ thẻ Rare / Calamity / Legendary cao nhất.
2. **Double Dice Trigger (`DOUBLE_DICE`)**:
   - Khi đổ ra đôi đặc biệt: `1-1` (Mắt rắn - Snake Eyes) hoặc `6-6` (Đỉnh cao - Boxcars), có 50% kích hoạt một biến cố Chaos tức thời.
3. **Global Interval Trigger (`ROUND_INTERVAL`)**:
   - Định kỳ mỗi **5 vòng chơi (Rounds 5, 10, 15, 20, 25...)**, toàn thành phố đón nhận một Biến Cố Kinh Tế Quy Mô Lớn (`GLOBAL` hoặc `ECONOMIC`).
4. **Crisis Desperation Trigger (`CRISIS_DESPERATION`)**:
   - Khi tiền mặt của người chơi tụt xuống dưới ngưỡng nguy cấp (`< $100k VND`), hệ thống mở giao diện kích hoạt "Cược Đổi Đời" (Desperation Gamble) cho phép đặt cược vận may.

### 4.3 6 Phân Loại Sự Kiện (Event Classifications)
1. **DƯƠNG TÍNH (`POSITIVE`)**: Thưởng tiền mặt, giảm thuế, hỗ trợ đầu tư, tặng cấp công trình miễn phí.
2. **ÂM TÍNH (`NEGATIVE`)**: Bão quét, thanh tra xây dựng, phạt vi phạm, sự cố hỏng hóc.
3. **CÁ NHÂN (`PERSONAL`)**: Nhắm thẳng vào người chơi hiện tại hoặc một mục tiêu cụ thể do người chơi lựa chọn.
4. **TOÀN CẦU (`GLOBAL`)**: Đổi chiều bàn cờ, hoán đổi vị trí người chơi, đóng băng xúc xắc, siêu lạm phát.
5. **KINH TẾ (`ECONOMIC`)**: Biến động tiền thuê toàn sàn (x2 hoặc x0.5), tăng/giảm lãi suất ngân hàng, kích cầu tiêu dùng.
6. **HUYỀN THOẠI HIẾM (`LEGENDARY`)**: Tỷ lệ xuất hiện cực thấp (< 5%), đảo ngược thế cờ, càn quét đại hồng thủy, cổng dịch chuyển vũ trụ.

---

### 4.4 Data Model & TypeScript Schemas

```typescript
export type ChaosCategory =
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'PERSONAL'
  | 'GLOBAL'
  | 'ECONOMIC'
  | 'LEGENDARY';

export type ChaosRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'CALAMITY' | 'LEGENDARY';

export type ChaosTriggerType =
  | 'TILE_LANDED'
  | 'DOUBLE_DICE'
  | 'ROUND_INTERVAL'
  | 'CRISIS_DESPERATION'
  | 'MANUAL';

export interface ChaosCardModel {
  id: string;
  name_vi: string;
  tagline_vi: string;
  description_vi: string;
  category: ChaosCategory;
  rarity: ChaosRarity;
  triggerType: ChaosTriggerType;
  durationInTurns?: number; // 0 or undefined for instant, > 0 for sustained effects
  iconName: string;
  effectPayload: {
    type:
      | 'CASH_SELF'
      | 'CASH_ALL'
      | 'CASH_STEAL'
      | 'TELEPORT'
      | 'RENT_MULTIPLIER'
      | 'FREE_UPGRADE'
      | 'DOWNGRADE_PROPERTY'
      | 'PROPERTY_TAX'
      | 'REVERSE_DIRECTION'
      | 'SWAP_POSITIONS'
      | 'GO_TO_DETENTION'
      | 'DETENTION_IMMUNITY'
      | 'REDISTRIBUTE_WEALTH'
      | 'EARTHQUAKE'
      | 'DESPERATION_GAMBLE';
    value: number;
    targetTileId?: number;
    extraData?: Record<string, any>;
  };
}
```

---

### 4.5 Danh Mục 36 Thẻ Chaos Độc Quyền (Chaos Catalog)

Dưới đây là 36 sự kiện Chaos được thiết kế chi tiết với văn hóa, kinh tế và ngôn ngữ Việt Nam hiện đại:

#### Nhóm 1: Dương Tính (Positive — Lợi Thế & Tài Lộc)
1. **`pos-vietlott-jackpot`**:
   - **Tên**: Trúng Độc Đắc Vietlott Power 6/55
   - **Mô tả**: Tấm vé số đỏ rực mang lại giải độc đắc khủng cho bạn!
   - **Phân loại**: `POSITIVE` | **Độ hiếm**: `RARE`
   - **Hiệu ứng**: `CASH_SELF`, nhận ngay **+$400k VND**.
2. **`pos-fdi-boost`**:
   - **Tên**: Làn Sóng FDI Công Nghệ Bán Dẫn
   - **Mô tả**: Tập đoàn công nghệ toàn cầu rót vốn khủng vào dự án khởi nghiệp của bạn.
   - **Phân loại**: `POSITIVE` | **Độ hiếm**: `UNCOMMON`
   - **Hiệu ứng**: `CASH_SELF`, nhận ngay **+$250k VND**.
3. **`pos-green-grant`**:
   - **Tên**: Tài Trợ Đô Thị Xanh Net-Zero
   - **Mô tả**: Quỹ phát triển xanh quốc tế nâng cấp miễn phí 1 cấp công trình cho bạn.
   - **Phân loại**: `POSITIVE` | **Độ hiếm**: `RARE`
   - **Hiệu ứng**: `FREE_UPGRADE`, nâng cấp 1 công trình ngẫu nhiên lên thêm 1 sao (nếu không có công trình nhận $150k).
4. **`pos-tax-exemption`**:
   - **Tên**: Chính Sách Ưu Đãi Miễn Thuế Doanh Nghiệp
   - **Mô tả**: Dự án của bạn nằm trong diện kích cầu công nghệ cao, nhận hoàn thuế.
   - **Phân loại**: `POSITIVE` | **Độ hiếm**: `COMMON`
   - **Hiệu ứng**: `CASH_SELF`, nhận ngay **+$150k VND**.
5. **`pos-stimulus-package`**:
   - **Tên**: Gói Kích Cầu Tiêu Dùng Toàn Quốc
   - **Mô tả**: Ngân sách phát tiền mặt hỗ trợ tiêu dùng cho toàn bộ công dân thành phố.
   - **Phân loại**: `POSITIVE` | **Độ hiếm**: `COMMON`
   - **Hiệu ứng**: `CASH_ALL`, mỗi người chơi trên bàn nhận **+$100k VND**.
6. **`pos-vip-flight`**:
   - **Tên**: Chuyến Bay Chuyên Cơ Khởi Hành
   - **Mô tả**: Chuyên cơ đưa bạn bay thẳng về Cổng Khởi Hành (Tile 0) và nhận lương.
   - **Phân loại**: `POSITIVE` | **Độ hiếm**: `UNCOMMON`
   - **Hiệu ứng**: `TELEPORT` đến Tile 0, nhận **+$200k VND**.

#### Nhóm 2: Âm Tính (Negative — Chi Phí & Thử Thách)
7. **`neg-construction-audit`**:
   - **Tên**: Thanh Tra Xây Dựng Đột Xuất
   - **Mô tả**: Cơ quan kiểm tra giấy phép toàn bộ công trình bất động sản bạn sở hữu.
   - **Phân loại**: `NEGATIVE` | **Độ hiếm**: `UNCOMMON`
   - **Hiệu ứng**: `PROPERTY_TAX`, nộp phạt **$30k VND/mỗi cấp sao** công trình đang sở hữu.
8. **`neg-typhoon-central`**:
   - **Tên**: Bão Nhiệt Đới Đổ Bộ Miền Trung
   - **Mô tả**: Bão lớn gây tốc mái và ngập úng hạ tầng, cần chi phí trùng tu khẩn cấp.
   - **Phân loại**: `NEGATIVE` | **Độ hiếm**: `COMMON`
   - **Hiệu ứng**: `CASH_ALL`, tất cả người chơi nộp **-$60k VND** vào quỹ cứu trợ.
9. **`neg-cyber-scam`**:
   - **Tên**: Đột Nhập Ví Lượng Tử (Cyber Heist)
   - **Mô tả**: Hacker quốc tế xâm nhập hệ thống ví điện tử và chiếm đoạt tiền mặt.
   - **Phân loại**: `NEGATIVE` | **Độ hiếm**: `UNCOMMON`
   - **Hiệu ứng**: `CASH_SELF`, mất **-$150k VND** (hoặc toàn bộ tiền mặt nếu ít hơn).
10. **`neg-traffic-fine`**:
    - **Tên**: Phạt Nguội Vi Phạm Giao Thông Cao Tốc
    - **Mô tả**: Camera AI ghi nhận phương tiện di chuyển quá tốc độ trên cao tốc Bắc Nam.
    - **Phân loại**: `NEGATIVE` | **Độ hiếm**: `COMMON`
    - **Hiệu ứng**: `CASH_SELF`, nộp phạt **-$80k VND**.
11. **`neg-quarantine-order`**:
    - **Tên**: Lệnh Tạm Giữ Điều Tra Kinh Tế
    - **Mô tả**: Thanh tra tài chính phát hiện dòng tiền bất minh, tạm giam để làm việc!
    - **Phân loại**: `NEGATIVE` | **Độ hiếm**: `UNCOMMON`
    - **Hiệu ứng**: `GO_TO_DETENTION`, di chuyển thẳng vào Khu Cách Ly Tạm Giam (Tile 10) trong 2 lượt.
12. **`neg-supply-shortage`**:
    - **Tên**: Đứt Gãy Chuỗi Cung Ứng Vật Liệu
    - **Mô tả**: Giá xi măng và sắt thép leo thang, bạn phải chi trả phụ phí xây dựng.
    - **Phân loại**: `NEGATIVE` | **Độ hiếm**: `COMMON`
    - **Hiệu ứng**: `CASH_SELF`, nộp **-$100k VND**.

#### Nhóm 3: Cá Nhân (Personal — Tác Động & Tương Tác)
13. **`per-robin-hack`**:
    - **Tên**: Tấn Công Hút Ví Đối Thủ
    - **Mô tả**: Bạn cài mã độc rút bớt tiền mặt từ ví của tất cả các đối thủ!
    - **Phân loại**: `PERSONAL` | **Độ hiếm**: `RARE`
    - **Hiệu ứng**: `CASH_STEAL`, hút **$60k VND** từ mỗi đối thủ còn tiền mặt chuyển vào tài khoản của bạn.
14. **`per-vip-charity-gala`**:
    - **Tên**: Đêm Tiệc Từ Thiện Doanh Nhân
    - **Mô tả**: Thể hiện đẳng cấp nhà tài phiệt hào phóng tặng tiền cho các đối thủ.
    - **Phân loại**: `PERSONAL` | **Độ hiếm**: `COMMON`
    - **Hiệu ứng**: `CASH_STEAL` (Negative), tặng mỗi đối thủ **$40k VND**.
15. **`per-quantum-leap`**:
    - **Tên**: Cổng Dịch Chuyển Lượng Tử
    - **Mô tả**: Bạn kích hoạt vòng xoay bước nhảy không gian, di chuyển tiến thêm 6 ô.
    - **Phân loại**: `PERSONAL` | **Độ hiếm**: `UNCOMMON`
    - **Hiệu ứng**: `TELEPORT`, tiến thêm 6 bước từ vị trí hiện tại (kèm tính năng đi qua Start nếu vượt qua 40).
16. **`per-get-out-jail-card`**:
    - **Tên**: Thẻ Miễn Trừ Trách Nhiệm Đặc Quyền
    - **Mô tả**: Tấm vé vàng miễn chấp hành tạm giam, có thể giữ lại dùng khi cần hoặc bán lại.
    - **Phân loại**: `PERSONAL` | **Độ hiếm**: `UNCOMMON`
    - **Hiệu ứng**: `DETENTION_IMMUNITY`, trao 1 thẻ "Miễn Giam Giữ" cho người chơi.
17. **`per-monopoly-hostile-takeover`**:
    - **Tên**: Thâu Tóm Cổ Phần Doanh Nghiệp
    - **Mô tả**: Bạn mua lại một ô đất trống của đối thủ với giá 150% giá gốc niêm yết.
    - **Phân loại**: `PERSONAL` | **Độ hiếm**: `RARE`
    - **Hiệu ứng**: Chuyển nhượng 1 ô đất Level 0 của đối thủ có giá thấp nhất sang cho bạn sau khi trả 1.5x tiền mặt.
18. **`per-desperation-roulette`**:
    - **Tên**: Ván Cược Đổi Đời Tại Sòng Bạc
    - **Mô tả**: 50/50: Được ăn cả ngã về không! Nhân đôi số tiền đặt cược hoặc mất trắng.
    - **Phân loại**: `PERSONAL` | **Độ hiếm**: `UNCOMMON`
    - **Hiệu ứng**: `DESPERATION_GAMBLE`, cược $100k: 50% thắng nhận $200k, 50% thua mất $100k.

#### Nhóm 4: Toàn Cầu (Global — Đảo Lộn Quy Tắc Bàn Cờ)
19. **`glo-reverse-dimension`**:
    - **Tên**: Nghịch Đảo Thời Gian (Đổi Chiều Đi)
    - **Mô tả**: Toàn bộ người chơi sẽ di chuyển **NGƯỢC CHIỀU KIM ĐỒNG HỒ** trong 3 lượt tới!
    - **Phân loại**: `GLOBAL` | **Độ hiếm**: `CALAMITY`
    - **Hiệu ứng**: `REVERSE_DIRECTION`, đảo chiều di chuyển trên bàn cờ trong 3 vòng.
20. **`glo-musical-chairs`**:
    - **Tên**: Hoán Đổi Vị Trí Ngẫu Nhiên
    - **Mô tả**: Hệ thống giao thông gặp sự cố lượng tử! Tất cả người chơi hoán đổi vị trí cho nhau.
    - **Phân loại**: `GLOBAL` | **Độ hiếm**: `RARE`
    - **Hiệu ứng**: `SWAP_POSITIONS`, xáo trộn vị trí của toàn bộ người chơi đang solvent.
21. **`glo-hyper-inflation`**:
    - **Tên**: Cơn Sốt Đất Đô Thị (Siêu Lạm Phát)
    - **Mô tả**: Tiền thuê toàn bộ bất động sản trên bàn cờ tăng gấp đôi (x2) trong 2 vòng!
    - **Phân loại**: `GLOBAL` | **Độ hiếm**: `CALAMITY`
    - **Hiệu ứng**: `RENT_MULTIPLIER`, hệ số tiền thuê toàn cầu = `2.0`, kéo dài 2 vòng.
22. **`glo-solar-emp-blackout`**:
    - **Tên**: Bão Từ Vũ Trụ (Solar EMP)
    - **Mô tả**: Thiết bị thanh toán tê liệt tạm thời, tiền thuê toàn sàn giảm một nửa (x0.5).
    - **Phân loại**: `GLOBAL` | **Độ hiếm**: `UNCOMMON`
    - **Hiệu ứng**: `RENT_MULTIPLIER`, hệ số tiền thuê toàn cầu = `0.5`, kéo dài 2 vòng.
23. **`glo-golden-hour`**:
    - **Tên**: Giờ Vàng Đô Thị (Double Salary)
    - **Mô tả**: Chính quyền nâng mức thưởng Cổng Khởi Hành lên gấp đôi ($400k) trong 1 vòng!
    - **Phân loại**: `GLOBAL` | **Độ hiếm**: `UNCOMMON`
    - **Hiệu ứng**: Lương Cổng Khởi Hành tăng lên $400k VND cho đến hết vòng hiện tại.
24. **`glo-curfew-lockdown`**:
    - **Tên**: Lệnh Giới Nghiêm Toàn Thành Phố
    - **Mô tả**: Giới hạn tốc độ di chuyển, mỗi lần đổ xúc xắc tối đa chỉ được đi 4 bước trong vòng này.
    - **Phân loại**: `GLOBAL` | **Độ hiếm**: `RARE`
    - **Hiệu ứng**: Giới hạn xúc xắc tối đa 4 bước đi trong 1 vòng.

#### Nhóm 5: Kinh Tế (Economic — Bất Động Sản & Tài Chính)
25. **`eco-real-estate-boom`**:
    - **Tên**: Sóng Sốt Đất Thủ Thiêm & Tây Hồ
    - **Mô tả**: Giá trị và tiền thuê của Phân khu Hà Nội & TP.HCM tăng thêm 50% trong 3 vòng.
    - **Phân loại**: `ECONOMIC` | **Độ hiếm**: `RARE`
    - **Hiệu ứng**: Tăng 1.5x tiền thuê riêng cho các ô đất thuộc Quận Hà Nội và TP.HCM.
26. **`eco-bank-interest-hike`**:
    - **Tên**: Ngân Hàng Nhà Nước Tăng Lãi Suất
    - **Mô tả**: Chi phí giải chấp chuộc lại bất động sản cầm cố tăng lên 70% giá gốc.
    - **Phân loại**: `ECONOMIC` | **Độ hiếm**: `UNCOMMON`
    - **Hiệu ứng**: Lãi suất chuộc đất tăng lên 20% trong 3 vòng.
27. **`eco-subsidized-mortgage`**:
    - **Tên**: Gói Cứu Trợ Tín Dụng Bất Động Sản
    - **Mô tả**: Ngân hàng hỗ trợ vay cầm cố nhận ngay 75% giá trị gốc (thay vì 50%).
    - **Phân loại**: `ECONOMIC` | **Độ hiếm**: `UNCOMMON`
    - **Hiệu ứng**: Nâng tỷ lệ vay cầm cố lên 75% giá gốc trong 2 vòng.
28. **`eco-freeze-market`**:
    - **Tên**: Đóng Băng Thị Trường Mua Bán
    - **Mô tả**: Tạm ngừng quyền mua đất mới và quyền nâng cấp trong 1 vòng tiếp theo.
    - **Phân loại**: `ECONOMIC` | **Độ hiếm**: `RARE`
    - **Hiệu ứng**: Khóa hành động `BUY_PROPERTY` và `UPGRADE_PROPERTY` trên toàn sàn trong 1 vòng.
29. **`eco-transport-boom`**:
    - **Tên**: Đại Lễ Khánh Thành Đường Sắt Tốc Độ Cao
    - **Mô tả**: Toàn bộ 4 Trạm Vận Tải Quốc Gia (Ga, Cảng, Sân Bay) thu tiền gấp đôi (x2)!
    - **Phân loại**: `ECONOMIC` | **Độ hiếm**: `UNCOMMON`
    - **Hiệu ứng**: Nhân đôi tiền thuê tại các ô Transport Hub trong 3 vòng.
30. **`eco-utility-energy-tax`**:
    - **Tên**: Điều Chỉnh Giá Điện & Biểu Giá Nước
    - **Mô tả**: Hệ số tính tiền thuê của EVN và SAWACO tăng gấp đôi (x8 và x20 điểm xúc xắc)!
    - **Phân loại**: `ECONOMIC` | **Độ hiếm**: `UNCOMMON`
    - **Hiệu ứng**: Nhân đôi tiền thuê các ô Utility trong 2 vòng.

#### Nhóm 6: Huyền Thoại Hiếm (Legendary & Calamity — Cục Diện Chấn Động)
31. **`leg-robin-hood`**:
    - **Tên**: Tái Cân Bằng Tài Sản (Robin Hood)
    - **Mô tả**: Người giàu nhất bàn cờ phải chuyển 25% tiền mặt của mình cho người nghèo nhất!
    - **Phân loại**: `LEGENDARY` | **Độ hiếm**: `LEGENDARY`
    - **Hiệu ứng**: `REDISTRIBUTE_WEALTH`, tính toán người có Net Worth cao nhất và chuyển 25% tiền mặt sang người có Net Worth thấp nhất.
32. **`leg-mega-earthquake`**:
    - **Tên**: Động Đất San Phẳng Công Trình
    - **Mô tả**: Rung chấn dữ dội làm sập 1 cấp công trình của tất cả các bất động sản trên bàn cờ!
    - **Phân loại**: `LEGENDARY` | **Độ hiếm**: `LEGENDARY`
    - **Hiệu ứng**: `DOWNGRADE_PROPERTY`, toàn bộ bất động sản đang có cấp Level >= 1 bị giảm đi 1 cấp sao (Level 1 về đất trống, Landmark về Level 4).
33. **`leg-black-hole-warp`**:
    - **Tên**: Cổng Hút Lỗ Đen Không Gian
    - **Mô tả**: Hút toàn bộ người chơi trên bàn cờ về cùng một ô đất có giá thuê đắt nhất!
    - **Phân loại**: `LEGENDARY` | **Độ hiếm**: `CALAMITY`
    - **Hiệu ứng**: `TELEPORT_ALL`, đưa mọi người chơi đến ô đất có cấp độ nâng cấp cao nhất trên bàn cờ.
34. **`leg-deathmatch-duel`**:
    - **Tên**: Đấu Trường Sinh Tử 1 Đổi 1
    - **Mô tả**: Bạn và người chơi giàu nhất đổ xúc xắc đối đầu. Kẻ thua nộp cho người thắng $300k VND!
    - **Phân loại**: `LEGENDARY` | **Độ hiếm**: `LEGENDARY`
    - **Hiệu ứng**: Tung 2 xúc xắc đối kháng trực tiếp, người điểm thấp nộp $300k cho người điểm cao.
35. **`leg-national-jubilee`**:
    - **Tên**: Đại Ân Xá Quốc Gia (Debt Jubilee)
    - **Mô tả**: Toàn bộ bất động sản đang bị cầm cố trên toàn bàn cờ được giải chấp miễn phí 100%!
    - **Phân loại**: `LEGENDARY` | **Độ hiếm**: `LEGENDARY`
    - **Hiệu ứng**: Xóa bỏ toàn bộ trạng thái `isMortgaged` của tất cả người chơi mà không tốn phí chuộc.
36. **`leg-alien-mothership`**:
    - **Tên**: Phi Thuyền Không Gian Xâm Chiếm
    - **Mô tả**: Tàu mẹ vũ trụ phong tỏa ô đất Landmark 81 và biến nó thành Cổng Chaos Vĩnh Cửu trong 5 vòng!
    - **Phân loại**: `LEGENDARY` | **Độ hiếm**: `LEGENDARY`
    - **Hiệu ứng**: Biến ô 39 thành ô Chaos đặc biệt không thu tiền thuê trong 5 vòng tiếp theo.

---

### 4.6 State Validation & Integrity Invariants

Nhằm đảm bảo chất lượng kỹ thuật cao theo chuẩn Enterprise Game Engine, Chaos Engine và Core Reducer phải tuân thủ nghiêm ngặt 5 bất biến trạng thái:

1. **Non-Negative Cash Invariant (Bất Biến Tiền Mặt Không Âm)**:
   - Trong trạng thái ổn định giữa các lượt, giá trị `player.cash` **LUÔN LUÔN >= 0**.
   - Nếu một giao dịch trừ tiền mặt lớn hơn số dư hiện có, hệ thống lập tức khóa các hành động khác và ép buộc người chơi bước vào giai đoạn `DEBT_LIQUIDATION`.
   - Nếu thanh lý không đủ, kích hoạt hành động `DECLARE_BANKRUPTCY` trước khi kết thúc lượt.
2. **Deterministic PRNG Invariant**:
   - Mọi kết quả ngẫu nhiên (đổ xúc xắc, rút thẻ Chaos, lựa chọn ô ngẫu nhiên) chỉ được sinh ra qua thể hiện của `SeededPRNG`, nghiêm cấm gọi trực tiếp `Math.random()` trong logic game thuần túy.
3. **Property Ownership Integrity Invariant**:
   - Mỗi ô đất tại một thời điểm chỉ có tối đa 1 chủ sở hữu (`ownerId`).
   - Cấp độ nâng cấp `level` chỉ nằm trong đoạn số nguyên `[0, 5]`.
   - Không thể nâng cấp ô đất nếu ô đó đang thế chấp (`isMortgaged === true`) hoặc không đủ bộ độc quyền.
4. **Single Active Player Invariant**:
   - Tại mọi thời điểm chỉ có duy nhất 1 người chơi đang có quyền thao tác (`activePlayerIndex`).
   - Người chơi đã phá sản (`isBankrupt === true`) bị loại bỏ hoàn toàn khỏi chu trình lượt.
5. **Decay & Expiry Invariant**:
   - Mọi hiệu ứng có thời hạn (`durationInTurns > 0`, ví dụ như đảo chiều hay nhân đôi tiền thuê) phải tự động giảm số vòng sau mỗi chu kỳ vòng chơi (`advanceTurn`) và tự động phục hồi về trạng thái ban đầu khi hết hạn.

---

### 4.7 Event History Log Schema & Telemetry

Mọi sự kiện diễn ra trên bàn cờ đều được ghi nhận vào nhật ký sự kiện có cấu trúc để hiển thị lên bảng tin giao diện (Game Log HUD) và phục vụ replay/debug:

```typescript
export type LogEntryType =
  | 'INFO'
  | 'DICE'
  | 'MOVEMENT'
  | 'PURCHASE'
  | 'UPGRADE'
  | 'RENT'
  | 'TAX'
  | 'CHAOS'
  | 'MORTGAGE'
  | 'BANKRUPT'
  | 'WARNING'
  | 'VICTORY';

export interface GameLogEntry {
  id: string;
  timestamp: number;
  roundNumber: number;
  turnNumber: number;
  playerId?: string;
  playerName?: string;
  type: LogEntryType;
  title?: string;
  message: string;
  deltaCash?: number;
  tileId?: number;
  chaosCardId?: string;
}
```

---

## 5. Architectural Implementation Blueprint

### 5.1 File & Module Directory Structure

```
src/game/
├── types/
│   ├── index.ts              # Core domain interfaces, branded types, FSM phases
│   └── chaosTypes.ts         # Chaos models, triggers, effect payloads
├── core/
│   ├── prng.ts               # Seeded deterministic Mulberry32 PRNG
│   ├── gameReducer.ts        # Pure reducer state machine (State, Action) => State
│   └── stateValidator.ts     # Invariant assertions and anti-corruption validation
├── board/
│   ├── boardData.ts          # Complete 40-tile modern Vietnamese board definition
│   └── districts.ts          # 8 color districts, transport hubs, utilities mapping
├── dice/
│   └── diceEngine.ts         # 2d6 rolling, doubles tracking, 3-doubles Jail logic
├── economy/
│   ├── economyEngine.ts      # Net worth, transactions, liquidation, bankruptcy
│   └── rentCalculator.ts     # Rent curves, monopolies, transport/utility math
├── property/
│   └── propertyEngine.ts     # Buy, upgrade, mortgage, unmortgage, trade rules
├── chaos-engine/
│   ├── chaosCards.ts         # 36 fully defined Chaos events catalog
│   ├── chaosEngine.ts        # Trigger evaluator and effect mutation dispatcher
│   └── activeModifiers.ts    # Sustained global effects and turn decay manager
├── turn-manager/
│   └── turnManager.ts        # Clockwise/counter-clockwise next player, round advance
├── win-condition/
│   └── winCondition.ts       # Last man standing, turn limit net worth tie-breakers
└── sound/
    └── soundEngine.ts        # Procedural Web Audio API sound triggers
```

### 5.2 Migration Roadmap from Existing Prototype to 40-Tile Production
1. **Board Data Update**: Nâng cấp `BOARD_SIZE` từ `24` lên `40` trong `src/game/board/boardData.ts` với đầy đủ 40 ô đất Việt Nam, 8 phân khu màu, 4 trạm vận tải, 2 tiện ích.
2. **Expand Upgrade Levels**: Chuyển đổi mô hình nâng cấp từ 3 cấp (cũ) lên 5 cấp (`Level 1-4 Biệt thự/Cao ốc, Level 5 Landmark 81`).
3. **Integrate Seeded PRNG**: Thay thế `Math.random()` bằng `SeededPRNG` trong `diceEngine.ts` và `chaosEngine.ts`.
4. **Deploy 36-Card Chaos Catalog**: Nạp toàn bộ 36 thẻ Chaos vào `src/game/chaos-engine/chaosCards.ts`.
5. **State Invariant Guards**: Bổ sung hàm kiểm tra tính toàn vẹn tài chính và thanh khoản nợ khẩn cấp trong `gameReducer.ts`.

---

## 6. Verification & Test Criteria

Một phiên bản CHAOS MONOPOLY hoàn chỉnh bắt buộc phải vượt qua các tiêu chí kiểm thử sau:

1. **Board Wrap-Around**: Người chơi tại Tile 38 đổ được 4 điểm phải đến Tile 2 và nhận đúng $200k tiền thưởng Cổng Khởi Hành (Tile 0).
2. **Monopoly Rent Doubling**: Khi sở hữu đủ 2 ô Quận 1 (Tile 37 & 39), tiền thuê đất trống phải tự động gấp đôi.
3. **Even Building Rule**: Không thể xây Level 2 trên Tile 37 nếu Tile 39 vẫn đang ở Level 0.
4. **Transport Hub Scaling**: Sở hữu 1, 2, 3, 4 trạm vận tải lần lượt tính tiền thuê là $25k, $50k, $100k, $200k.
5. **Utility Formula**: Dừng tại Tile 28 khi đối thủ sở hữu cả 2 tiện ích với tổng xúc xắc 9 điểm phải trả đúng $90k VND (10 x 9).
6. **3 Doubles Jail**: Đổ xúc đôi 3 lần trong 1 lượt lập tức chuyển trạng thái sang `inDetention === true` tại Tile 10.
7. **Deterministic Chaos Reproducibility**: Sử dụng cùng 1 `seed` phải rút ra chuỗi thẻ Chaos và kết quả xúc xắc hoàn toàn đồng nhất.
8. **Bankruptcy Liquidation**: Người chơi nợ tiền thuê vượt số dư phải thanh lý tài sản, và nếu phá sản thì toàn bộ tài sản được chuyển giao hợp lệ.
9. **Round Cap Victory**: Tại vòng 60, trò chơi tự động kết thúc và vinh danh người chơi có Net Worth cao nhất.

---
*Tài liệu này là thông số kỹ thuật chuẩn (Authoritative Specification) dành cho toàn bộ đội ngũ phát triển và kiểm thử của dự án CHAOS MONOPOLY.*
