-- Avatar wire-up (hướng a): user-service lưu URL ảnh đại diện sau khi upload thành công.
-- URL public dạng /api/users/uploads/avatars/<file> — serve qua resource handler ở user-service.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512);
