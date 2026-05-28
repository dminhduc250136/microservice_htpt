-- Thêm cột sold_count (số lượng đã bán) vào products để hiển thị "Đã bán N" trên UI.
-- Default 0; seed giá trị hợp lý ở db/seed-dev/V103.
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_count INT NOT NULL DEFAULT 0;
