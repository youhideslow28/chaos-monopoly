# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG (DEPLOYMENT GUIDE)
**Dự Án:** CHAOS MONOPOLY  
**Phiên Bản Ứng Dụng:** v1.0.0-rc1  
**Ngày Cập Nhật:** 31/10/2026  

---

## 1. TỔNG QUAN KIẾN TRÚC TRIỂN KHAI

Trò chơi **CHAOS MONOPOLY** hỗ trợ 2 mô hình triển khai chính:

### Mô hình A: Container Độc Lập Toàn Diện (All-In-One Container)
- Một Docker container duy nhất chạy Node.js 22-alpine.
- Máy chủ Node.js tự động phục vụ cả frontend SPA đã đóng gói (tại thư mục `dist/`) và lắng nghe các API HTTP cùng WebSocket endpoint `/ws` trên cùng một cổng (ví dụ: `3001`).
- Phù hợp nhất cho: PaaS (Render, Railway, Fly.io), môi trường Staging, phát triển nội bộ hoặc Docker compose đơn giản.

```
[ Trình Duyệt / Điện Thoại ]
          │  (HTTP / WSS)
          ▼
   :3001 [ Node.js 22 Server ]
          ├── Static SPA Files (dist/index.html, dist/assets/*.js)
          ├── HTTP API (/api/health, /api/ready, /api/rooms)
          ├── WebSocket (/ws - Real-Time Server-Authoritative Engine)
          └── SQLite WAL (data/chaos-multiplayer.sqlite)
```

### Mô hình B: Mô Hình Phân Tầng Chuyên Nghiệp (Multi-Tier Production)
- **Nginx Reverse Proxy** đứng phía trước:
  - Phục vụ trực tiếp Static Files với HTTP/2, Gzip, cache dài hạn (`immutable`).
  - Xử lý SSL/TLS termination (HTTPS và WSS).
  - Chuyển tiếp proxy các yêu cầu `/api/` và WebSocket `/ws` sang cụm dịch vụ Node.js phía sau.
- **Node.js Multiplayer Server:** Chạy chuyên biệt xử lý game logic, AI và quản lý phòng chơi.

---

## 2. BẢNG BIẾN MÔI TRƯỜNG (ENVIRONMENT VARIABLES)

| Tên Biến | Mặc Định | Bắt Buộc | Mô Tả |
| :--- | :---: | :---: | :--- |
| `NODE_ENV` | `production` | Không | Chế độ chạy ứng dụng (`development` / `production`). |
| `PORT` hoặc `MULTIPLAYER_PORT` | `3001` | Không | Cổng mạng máy chủ lắng nghe. |
| `MULTIPLAYER_HOST` | `0.0.0.0` | Không | Địa chỉ IP bind (dùng `0.0.0.0` cho container). |
| `MULTIPLAYER_DB_PATH` | `./data/chaos-multiplayer.sqlite` | Không | Đường dẫn tới tệp tin cơ sở dữ liệu SQLite WAL. |
| `ALLOWED_ORIGINS` | `*` (dev) | Có (Prod) | Danh sách domain được phép kết nối WebSocket (cách nhau bởi dấu phẩy). |
| `RECONNECT_GRACE_MS` | `60000` | Không | Thời gian ân hạn cho phép người chơi kết nối lại (ms). |
| `ROOM_EXPIRATION_MS` | `7200000` | Không | Thời gian phòng tự hủy nếu không có hoạt động (ms). |
| `AI_ACTION_DELAY_MS` | `550` | Không | Độ trễ suy nghĩ của AI bot (ms) tạo nhịp chơi tự nhiên. |

---

## 3. TRIỂN KHAI VỚI DOCKER

### 3.1. Build Docker Image
```bash
docker build -t chaos-monopoly:latest .
```

### 3.2. Chạy Container với Thư Mục Dữ Liệu Bền Vững (Volume Mount)
Tạo thư mục dữ liệu cục bộ trên máy chủ chủ (host) để lưu trữ tệp tin SQLite:
```bash
mkdir -p ./chaos-data

docker run -d \
  --name chaos-monopoly-app \
  -p 3001:3001 \
  -v "$(pwd)/chaos-data:/app/data" \
  -e ALLOWED_ORIGINS="https://chaos.example.com,http://localhost:3001" \
  -e NODE_ENV=production \
  --restart unless-stopped \
  chaos-monopoly:latest
```

### 3.3. Kiểm Tra Trạng Thái Sức Khỏe Container
```bash
# Kiểm tra log khởi động
docker logs chaos-monopoly-app

# Kiểm tra probe ready qua HTTP
curl http://localhost:3001/api/ready
# Trả về: {"ready":true,"storage":"sqlite-wal","databaseIntegrity":"ok",...}
```

---

## 4. TRIỂN KHAI PHÂN TẦNG VỚI NGINX & SSL LET'S ENCRYPT

### 4.1. Cấu hình Nginx
Sao chép tệp tin cấu hình mẫu `nginx.conf` vào `/etc/nginx/conf.d/chaos.conf` và điều chỉnh `server_name`:

```nginx
server {
    listen 80;
    server_name chaos.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chaos.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/chaos.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chaos.yourdomain.com/privkey.pem;

    # Static assets cache
    location /assets/ {
        alias /app/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket Proxy (WSS)
    location /ws {
        proxy_pass http://127.0.0.1:3001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }

    # SPA Client Routing
    location / {
        root /app/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### 4.2. Cài Đặt Chứng Chỉ SSL Miễn Phí với Certbot
```bash
sudo certbot --nginx -d chaos.yourdomain.com
```

---

## 5. TRIỂN KHAI LÊN NỀN TẢNG ĐÁM MÂY (PAAS)

### 5.1. Triển Khai trên Render.com
1. Tạo một **Web Service** mới, liên kết với Git repository.
2. Chọn môi trường **Docker**.
3. Thêm một **Persistent Disk**:
   - Mount Path: `/app/data`
   - Size: 1 GB (đủ cho hàng triệu trận đấu).
4. Thiết lập Environment Variables:
   - `ALLOWED_ORIGINS`: `https://<ten-app>.onrender.com`
   - `PORT`: `3001`
5. Nhấn **Deploy**.

### 5.2. Triển Khai trên Railway.app
1. Khởi tạo project từ repo GitHub.
2. Railway tự động nhận diện `Dockerfile`.
3. Trong tab **Settings**, thêm Volume mount trỏ tới `/app/data`.
4. Thiết lập biến môi trường `ALLOWED_ORIGINS` tương ứng domain do Railway cấp.

### 5.3. Triển Khai Full-Stack trên Vercel (Frontend + Serverless API + SQLite WAL + Domain)
Dự án đã được tích hợp sẵn cấu hình `vercel.json` và Serverless Function `api/index.ts` hỗ trợ **Dual-Transport** (tự động chuyển đổi giữa WebSocket `/ws` và HTTP Polling `/api/multiplayer` khi chạy trên hạ tầng Serverless của Vercel):
1. Truy cập [Vercel Dashboard](https://vercel.com/new) và chọn **Import Git Repository** → chọn `youhideslow28/chaos-monopoly`.
2. Vercel sẽ tự động nhận diện `vercel.json`:
   - **Frontend SPA:** Build bằng `npm run build` và phân phối qua Edge CDN (`dist/`).
   - **Backend Multiplayer & Database:** Mọi request `/api/*` (`/api/multiplayer`, `/api/rooms/*`, `/api/health`, `/api/ready`, `/api/cron/maintenance`) được định tuyến tới `api/index.ts` với cơ sở dữ liệu SQLite WAL lưu tại `/tmp/chaos-multiplayer.sqlite` (hoặc `MULTIPLAYER_DB_PATH`).
   - **Vercel Cron Job:** Tự động chạy `/api/cron/maintenance` mỗi ngày lúc `03:00 UTC` để dọn phòng hết hạn và thực thi `PRAGMA wal_checkpoint(PASSIVE)`.
3. **Gắn Custom Domain:** Vào **Project Settings → Domains**, thêm tên miền của bạn (hoặc dùng domain mặc định `chaos-monopoly.vercel.app`).
4. *(Tuỳ chọn nâng cao)* Nếu bạn muốn chạy thêm cụm WebSocket chuyên biệt trên Railway/Render, chỉ cần thêm biến môi trường `VITE_WS_URL=wss://your-ws-backend.example.com/ws` trong Vercel Settings.

---

## 6. QUY TRÌNH KIỂM THỬ KHÓI SAU TRIỂN KHAI (POST-DEPLOYMENT SMOKE TEST)

Thực hiện 5 bước kiểm tra nhanh sau khi hệ thống lên sóng:
1. **Truy cập Giao Diện:** Mở URL trang chủ trên trình duyệt, đảm bảo màn hình Main Menu hiển thị mượt mà không có lỗi console.
2. **Kiểm tra Healthcheck:** Gửi GET request tới `/api/health`, xác nhận `status: "ok"` và `integrity: "ok"`.
3. **Thử Nghiệm Phòng Chơi Cục Bộ (Pass & Play):** Bắt đầu một trận đấu với 1 Người + 1 AI, hoàn thành 1 lượt gieo xúc xắc và mua đất.
4. **Thử Nghiệm Phòng Chơi Trực Tuyến:**
   - Tạo phòng Online, kiểm tra mã phòng dạng `CHAOS-XXXX`.
   - Mở cửa sổ ẩn danh thứ 2 (Incognito), nhập mã phòng và tham gia.
   - Bắt đầu trận đấu, xác nhận cả 2 thiết bị đồng bộ thời gian thực.
5. **Thử Nghiệm Mất Kết Nối:** Đóng tab thứ 2, sau đó mở lại và nhấn "Kết Nối Lại" (Resume/Reconnect), xác nhận khôi phục đúng vị trí và trạng thái lượt.
