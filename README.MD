# PTIT HTPT — TMĐT Microservices

Hệ thống sàn thương mại điện tử theo kiến trúc microservices, gồm frontend Next.js, API Gateway, 6 backend Spring Boot, 7 PostgreSQL (database-per-service) và RabbitMQ cho giao tiếp bất đồng bộ.

## Tinh gọn ý tưởng

- API Gateway là cổng vào duy nhất của backend (JWT verify ở edge).
- Mỗi service sở hữu database riêng để cô lập lỗi và tự chủ schema.
- RabbitMQ xử lý các luồng bất đồng bộ như OrderPlaced -> inventory/notification.

## Thành phần chính

- Frontend: Next.js (UI người dùng + admin)
- API Gateway: Spring Cloud Gateway
- Backend services: user, product, order, payment, inventory, notification
- Databases: 7 PostgreSQL độc lập
- Message broker: RabbitMQ

## Kiến trúc chi tiết

Xem mô tả đầy đủ, sơ đồ và luồng giao tiếp tại [docs/KIEN-TRUC-HE-THONG.md](docs/KIEN-TRUC-HE-THONG.md).

## Yêu cầu

- Docker Desktop (mới nhất)
- Git
- Node.js >= 18 (chỉ cần khi chạy E2E)

Chi tiết tại [SETUP.md](SETUP.md).

## Cấu hình nhanh (.env)

Tạo file .env từ mẫu .env.example và điền:

- MAIL_SMTP_HOST, MAIL_SMTP_PORT, MAIL_SMTP_USERNAME, MAIL_SMTP_PASSWORD
- MAIL_FROM_ADDRESS
- APP_BASE_URL
- MOMO_IPN_URL (URL public cho IPN, vd: tunnel ngrok trỏ về api-gateway)

Xem hướng dẫn chi tiết tại [SETUP.md](SETUP.md).

## Chạy toàn bộ hệ thống

```bash
docker compose up -d --build
```

Kiểm tra trạng thái:

```bash
docker compose ps
```

## Cổng truy cập

- Frontend: http://localhost:3000
- API Gateway: http://localhost:8080
- RabbitMQ Management UI: http://localhost:15672 (guest/guest)

## Tài khoản seed dev

- Admin: admin@tmdt.local / admin123
- User: demo@tmdt.local / admin123

## E2E tests (Playwright)

Chỉ chạy khi stack đang up.

```bash
cd sources/frontend
npm install
npx playwright install chromium
npx playwright test
```

Chi tiết test và kịch bản xem [sources/frontend/e2e/README.md](sources/frontend/e2e/README.md).

## Demo RabbitMQ + Database Per Service

Tài liệu demo và kịch bản bảo vệ: [docs/DEMO-RABBITMQ-DB.md](docs/DEMO-RABBITMQ-DB.md).

## Cấu trúc repo (tóm tắt)

- sources/backend: các service Spring Boot + api-gateway
- sources/frontend: Next.js app + E2E
- db/init: schema khởi tạo (nếu cần đối chiếu)
- docs: tài liệu kiến trúc và demo

## Gợi ý troubleshoot

- Lỗi migration / checksum: chạy `docker compose down -v` rồi `up -d --build` lại.
- Port bận (3000/8080/15672): dừng app khác hoặc đổi mapping trong docker-compose.
- Chatbot lỗi: kiểm tra ANTHROPIC_API_KEY trong .env.

Chi tiết đầy đủ tại [SETUP.md](SETUP.md).
