-- Avatar wire-up (hướng a): user-service lưu URL ảnh đại diện sau khi upload thành công.
-- URL public dạng /api/users/uploads/avatars/<file> — serve qua resource handler ở user-service.
--
-- Lý do chọn version 106 thay vì V3:
-- Profile dev gộp db/migration + db/seed-dev (đã chạy đến V105). Đặt V3 sẽ làm Flyway
-- báo "Detected resolved migration not applied: 3" và refuse start (default out-of-order=false).
-- Đặt cao hơn version hiện tại tránh out-of-order. Schema migration thực sự dùng dải V1, V2,
-- V104 (email_verified) — tiếp tục theo dải V10x là OK miễn không trùng seed-dev.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512);
