# SỔ TAY VẬN HÀNH HỆ THỐNG (OPERATIONS RUNBOOK)
**Dự Án:** CHAOS MONOPOLY  
**Đối Tượng Sử Dụng:** SRE, DevOps Engineers, System Administrators  
**Phiên Bản Áp Dụng:** v1.0.0-rc1  
**Ngày Ban Hành:** 31/10/2026  

---

## 1. GIÁM SÁT SỨC KHỎE VÀ ĐO LƯỜNG HỆ THỐNG (MONITORING & TELEMETRY)

### 1.1. Health & Readiness Endpoints

Máy chủ cung cấp 2 endpoint HTTP tiêu chuẩn cho Kubernetes, Docker hoặc dịch vụ giám sát (Uptime Kuma, Datadog, Prometheus Blackbox):

#### 1. Liveness Probe: `GET /api/health`
- **Mục đích:** Xác minh máy chủ Node.js đang chạy và kiểm tra tính toàn vẹn của tệp tin SQLite.
- **Mã phản hồi bình thường:** `200 OK`
- **Mã phản hồi suy thoái:** `500 Internal Server Error` (nếu DB integrity check thất bại)
- **Cấu trúc JSON phản hồi mẫu:**
  ```json
  {
    "status": "ok",
    "service": "chaos-monopoly-multiplayer",
    "version": 1,
    "activeRooms": 14,
    "connectedClients": 28,
    "database": {
      "integrity": "ok",
      "roomCount": 14,
      "auditCount": 182,
      "journalMode": "wal"
    },
    "timestamp": 1730419200000
  }
  ```

#### 2. Readiness Probe: `GET /api/ready`
- **Mục đích:** Xác định máy chủ đã sẵn sàng tiếp nhận kết nối mạng từ Load Balancer.
- **Mã phản hồi bình thường:** `200 OK` (`{"ready": true, "storage": "sqlite-wal", ...}`)

### 1.2. Định Dạng Nhật Ký Hoạt Động (Structured JSON Logs)
Máy chủ ghi log dạng JSON một dòng (newline-delimited JSON) giúp các hệ thống gom log (Grafana Loki, ELK, CloudWatch) dễ dàng bóc tách:
```json
{"level":"INFO","timestamp":"2026-10-31T15:30:00.000Z","event":"MULTIPLAYER_SERVER_LISTENING","host":"0.0.0.0","port":3001}
{"level":"INFO","timestamp":"2026-10-31T15:31:12.000Z","event":"ROOM_CREATED","roomCode":"CHAOS-A8K2","capacity":4}
{"level":"INFO","timestamp":"2026-10-31T15:32:05.000Z","event":"WS_ORIGIN_REJECTED","origin":"https://malicious.org"}
```

---

## 2. QUY TRÌNH BẢO TRÌ ĐỊNH KỲ (ROUTINE MAINTENANCE)

### 2.1. Sao Lưu Cơ Sở Dữ Liệu Tự Động (Automated Atomic Backup)
Cơ sở dữ liệu SQLite trong chế độ WAL cho phép tạo bản sao lưu snapshot nguyên tử (atomic) ngay trong lúc trò chơi đang diễn ra bằng lệnh SQLite chuẩn `VACUUM INTO`.

#### Lệnh Thực Hiện Thủ Công Hoặc Cron Job:
Có thể thiết lập cron job chạy mỗi 6 giờ sao lưu ra thư mục backup:
```bash
# Tạo bản sao lưu an toàn với dấu thời gian
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/app/data/backups/chaos_backup_${TIMESTAMP}.sqlite"

# Sử dụng công cụ dòng lệnh sqlite3
sqlite3 /app/data/chaos-multiplayer.sqlite "VACUUM INTO '${BACKUP_FILE}';"

# Nén gzip để tiết kiệm dung lượng
gzip -9 "${BACKUP_FILE}"

# Giữ lại các bản sao lưu trong 14 ngày gần nhất
find /app/data/backups -name "*.gz" -mtime +14 -delete
```

### 2.2. Kiểm Tra Toàn Vẹn Tệp Tin SQLite (Integrity Check)
```bash
sqlite3 /app/data/chaos-multiplayer.sqlite "PRAGMA integrity_check;"
# Kết quả mong muốn: ok
```

### 2.3. Giải Phóng Nhật Ký WAL (Checkpointing)
Mặc dù máy chủ tự động điều phối checkpoint, người vận hành có thể ép giải phóng file `-wal` khi cần bảo trì:
```bash
sqlite3 /app/data/chaos-multiplayer.sqlite "PRAGMA wal_checkpoint(PASSIVE);"
```

---

## 3. QUY TRÌNH KHÔI PHỤC SAU SỰ CỐ (DISASTER RECOVERY)

### Kịch Bản: Tệp Tin Dữ Liệu Bị Hỏng Hoặc Máy Chủ Gặp Sự Cố Phần Cứng

**Bước 1:** Dừng container hiện tại:
```bash
docker stop chaos-monopoly-app
```

**Bước 2:** Di chuyển tệp tin lỗi sang thư mục cách ly:
```bash
mv /app/data/chaos-multiplayer.sqlite /app/data/corrupted_$(date +%s).sqlite
rm -f /app/data/chaos-multiplayer.sqlite-wal /app/data/chaos-multiplayer.sqlite-shm
```

**Bước 3:** Khôi phục từ bản sao lưu gần nhất:
```bash
gunzip -c /app/data/backups/chaos_backup_LATEST.sqlite.gz > /app/data/chaos-multiplayer.sqlite
```

**Bước 4:** Xác minh tính toàn vẹn của tệp đã khôi phục:
```bash
sqlite3 /app/data/chaos-multiplayer.sqlite "PRAGMA integrity_check;"
# Phải xuất ra "ok"
```

**Bước 5:** Khởi động lại container dịch vụ:
```bash
docker start chaos-monopoly-app
```
*Lưu ý:* Khi khởi động lại, `RoomManager` sẽ tự động tải lại toàn bộ phòng đang hoạt động và chuyển người chơi thật vào trạng thái tạm mất kết nối (grace period) để họ có thể nhấn "Kết nối lại" mà không mất dữ liệu trận đấu!

---

## 4. XỬ LÝ SỰ CỐ KHẨN CẤP (INCIDENT RESPONSE PLAYBOOK)

### 4.1. Sự Cố 1: CPU Tăng Cao Bất Thường (> 85%)
- **Nguyên Nhân Tiềm Ẩn:**
  1. Tấn công Socket Flooding / DoS từ một dải IP.
  2. Vòng lặp quyết định AI bot bị kẹt.
- **Biện Pháp Xử Lý:**
  1. Kiểm tra log lọc theo `WS_ORIGIN_REJECTED` hoặc các IP gửi lượng tin nhắn đột biến.
  2. Bổ sung IP vi phạm vào tường lửa máy chủ (iptables hoặc Cloudflare WAF).
  3. Kiểm tra số phòng đang chạy qua `/api/health`. Nếu có phòng bị kẹt vòng lặp, khởi động lại container nhẹ nhàng (`docker restart chaos-monopoly-app`).

### 4.2. Sự Cố 2: Tệp Tin SQLite Bị Khóa (`SQLITE_BUSY` hoặc `database is locked`)
- **Nguyên Nhân:** Một tiến trình ngoài đang mở tệp SQLite mà không ở chế độ WAL, hoặc NFS/SMB network share không hỗ trợ POSIX file locks.
- **Khắc Phục:**
  1. Tuyệt đối không mount thư mục SQLite qua mạng NFS không hỗ trợ WAL. Chỉ mount qua Block Storage cục bộ (Local SSD, AWS EBS, DigitalOcean Volume).
  2. Chạy `fuser /app/data/chaos-multiplayer.sqlite` để xem có tiến trình nào khác đang giữ tệp không.

### 4.3. Sự Cố 3: Client Hàng Loạt Gặp Lỗi "Không Thể Nâng Cấp WebSocket" (Error 403)
- **Nguyên Nhân:** Biến môi trường `ALLOWED_ORIGINS` không khớp với domain mà client đang truy cập (ví dụ: client truy cập `https://chaos.domain.com` nhưng cấu hình là `https://domain.com`).
- **Khắc Phục:** Cập nhật biến `ALLOWED_ORIGINS` bao gồm cả subdomain và giao thức tương ứng, sau đó reload container.

---

## 5. QUY TRÌNH NÂNG CẤP KHÔNG GIÁN ĐOẠN (ZERO-DOWNTIME UPDATE)

Khi phát hành phiên bản mới:
1. Máy chủ hỗ trợ cơ chế lưu phiên vào SQLite WAL.
2. Thiết lập `RECONNECT_GRACE_MS=120000` (2 phút).
3. Triển khai container mới (rolling restart).
4. Container mới khởi động trong vòng 2–3 giây, đọc lại trạng thái các phòng từ SQLite.
5. Người chơi trên trình duyệt chỉ thấy thông báo mạng chớp nhoáng (1–2 giây) và tự động kết nối lại (Auto-reconnect), trận đấu tiếp tục bình thường không bị hủy!
