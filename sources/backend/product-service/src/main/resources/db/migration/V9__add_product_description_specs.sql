-- Thêm mô tả dài (description) và thông số kỹ thuật (specifications JSONB) cho products.
-- FE đã có sẵn UI tab "Mô tả" + "Thông số" — chỉ thiếu data từ backend.
-- specifications lưu JSON array: [{"label": "...", "value": "..."}].
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications TEXT;
