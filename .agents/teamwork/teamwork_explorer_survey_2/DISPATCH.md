# Dispatch for Explorer 2: Game Design & Chaos Mechanics Survey
Target directory: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_2\

## 2026-10-31T09:52:56Z
You are a teamwork_explorer.
Your working directory is: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_2\
Please create progress.md in your working directory to log your heartbeat.

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\ORIGINAL_REQUEST.md

Objective:
Formulate the complete, authoritative Game Rules & Chaos Engine Specification for CHAOS MONOPOLY.
- Board Layout:
  * 40 tiles standard Monopoly-inspired board themed after modern Vietnamese economic centers and landmarks:
    - Hà Nội (Phố Cổ, Hoàn Kiếm, Ba Đình, Tây Hồ...)
    - TP Hồ Chí Minh (Quận 1, Bến Thành, Landmark 81, Thủ Thiêm...)
    - Đà Nẵng (Cầu Vàng, Sơn Trà, Mỹ Khê...)
    - Hải Phòng, Cần Thơ, Nha Trang, Huế, Vũng Tàu, Phú Quốc...
    - 4 Transport Hubs (Sân bay Nội Bài, Sân bay Tân Sơn Nhất, Ga Hà Nội, Cảng Sài Gòn)
    - 2 Utilities (Điện Lực EVN, Cấp Nước Chợ Lớn)
    - Special tiles: Khởi Hành (GO - collect 200k VND), Tạm Giam (Jail/Khu Cách Ly), Lễ Hội / Khí Vận (Chance/Community), Cổng Hỗn Loạn (Chaos Portal), Thuế Thu Nhập / Thuế Tài Sản, Vào Tù (Go to Jail).
- Game Mechanics:
  * 2 to 4 players hot-seat, customizable player names and avatars/colors.
  * Starting cash balance (e.g. 1,500k VND / 1,500 Chaos Coins).
  * 2 six-sided dice rolling, doubles allow rolling again, 3 consecutive doubles sends player to Jail.
  * Property acquisition, full color-set bonus (double base rent), upgrade tiers (Level 1, 2, 3, 4, Landmark/Khách sạn).
  * Rent calculations, mortgage, unmortgage, trade/sell between players, debt liquidation, bankruptcy handling.
  * Target match duration: 45-60 min (balanced money supply and rent curve so matches resolve crisply without endless stalling).
  * Victory conditions: last standing solvent player OR highest net worth after turn limit (e.g., 60-80 turns).
- Chaos Engine Deep Specification:
  * Seedable, testable PRNG engine.
  * Dynamic triggers: tile landed (Chaos tile), double dice roll, turn interval (every X rounds a Global Chaos event occurs), player crisis (low cash triggers desperation gamble event).
  * Event classifications:
    1. Positive (Cơn sốt đất, Trúng số Vietlott, Trợ cấp chính phủ, Miễn thuế...)
    2. Negative (Thanh tra xây dựng, Bão quét, Trộm cắp công nghệ, Phạt vi phạm...)
    3. Personal (Cá nhân hóa theo người chơi hiện tại hoặc mục tiêu)
    4. Global (Đổi chiều kim đồng hồ, Hoán đổi vị trí, Siêu lạm phát, Giờ G...)
    5. Economic (Khủng hoảng bất động sản, Lãi suất ngân hàng tăng, Giảm 50% tiền thuê toàn sàn...)
    6. Rare Legendary (Cổng không gian vũ trụ, Đại hồng thủy, Đổi toàn bộ tài sản cho người nghèo nhất, Đấu trường sinh tử...)
  * Define at least 30 distinct Chaos events with explicit data models (id, name_vi, description_vi, category, rarity, triggerCondition, effectFunction logic, durationInTurns).
  * State validation: absolute prevention of negative cash without bankruptcy, duplicate turns, illegal property ownership.
  * Event history log schema.

Output: Write comprehensive specification to c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_2\game_and_chaos_spec.md and complete handoff.md.
Then send parent a message with summary and file path.
