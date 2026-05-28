-- Seed bổ sung (profile=dev): mô tả dài + thông số kỹ thuật theo category.
-- KHÔNG ghi đè nếu đã có data thật (chỉ set khi description IS NULL).
-- specifications: JSON array [{label, value}] khớp FE PDP tab "Thông số".

-- ============================================================
-- PHONE
-- ============================================================
UPDATE products SET
  description = name || ' là chiếc điện thoại cao cấp đến từ ' || COALESCE(brand,'thương hiệu uy tín')
    || '. Máy sở hữu thiết kế sang trọng, màn hình sắc nét, hiệu năng mạnh mẽ cùng hệ thống camera ấn tượng. '
    || 'Sản phẩm phù hợp cho cả nhu cầu giải trí, công việc lẫn nhiếp ảnh di động. Hàng chính hãng, bảo hành 12 tháng.',
  specifications = '[
    {"label":"Màn hình","value":"6.1\" - 6.7\" OLED, tần số quét 120Hz"},
    {"label":"Chip xử lý","value":"Flagship 8 nhân, tiến trình 4nm"},
    {"label":"RAM / Bộ nhớ","value":"8GB / 128GB - 512GB"},
    {"label":"Camera sau","value":"Camera kép/ba 48MP, quay video 4K"},
    {"label":"Pin","value":"4500 mAh, sạc nhanh"},
    {"label":"Hệ điều hành","value":"iOS / Android mới nhất"},
    {"label":"Bảo hành","value":"12 tháng chính hãng"}
  ]'
WHERE category_id = 'cat-phone' AND deleted = false AND description IS NULL;

-- ============================================================
-- LAPTOP
-- ============================================================
UPDATE products SET
  description = name || ' từ ' || COALESCE(brand,'thương hiệu uy tín')
    || ' là lựa chọn lý tưởng cho công việc, học tập và sáng tạo nội dung. '
    || 'Cấu hình mạnh, màn hình đẹp, thời lượng pin dài và thiết kế mỏng nhẹ dễ mang theo. '
    || 'Máy chạy mượt các tác vụ nặng như lập trình, dựng phim, đồ họa. Hàng chính hãng, bảo hành 12 tháng.',
  specifications = '[
    {"label":"CPU","value":"Intel Core i7 / Apple M-series / AMD Ryzen 7"},
    {"label":"RAM","value":"16GB - 32GB"},
    {"label":"Ổ cứng","value":"512GB - 1TB SSD NVMe"},
    {"label":"Màn hình","value":"14\" - 16\" độ phân giải cao"},
    {"label":"Card đồ họa","value":"GPU tích hợp / rời hiệu năng cao"},
    {"label":"Pin","value":"Lên đến 18 giờ sử dụng"},
    {"label":"Bảo hành","value":"12 tháng chính hãng"}
  ]'
WHERE category_id = 'cat-laptop' AND deleted = false AND description IS NULL;

-- ============================================================
-- HEADPHONE
-- ============================================================
UPDATE products SET
  description = name || ' của ' || COALESCE(brand,'thương hiệu uy tín')
    || ' mang đến trải nghiệm âm thanh sống động, chi tiết cùng công nghệ chống ồn chủ động hiệu quả. '
    || 'Thiết kế thoải mái khi đeo lâu, kết nối ổn định và thời lượng pin ấn tượng. '
    || 'Phù hợp nghe nhạc, gọi điện và làm việc. Hàng chính hãng, bảo hành 12 tháng.',
  specifications = '[
    {"label":"Kiểu dáng","value":"Over-ear / In-ear không dây"},
    {"label":"Chống ồn","value":"ANC chủ động"},
    {"label":"Kết nối","value":"Bluetooth 5.3, đa điểm"},
    {"label":"Thời lượng pin","value":"Lên đến 30 giờ"},
    {"label":"Driver","value":"Màng loa động chất lượng cao"},
    {"label":"Tính năng","value":"Chống nước, điều khiển cảm ứng"},
    {"label":"Bảo hành","value":"12 tháng chính hãng"}
  ]'
WHERE category_id = 'cat-headphone' AND deleted = false AND description IS NULL;

-- ============================================================
-- MOUSE
-- ============================================================
UPDATE products SET
  description = name || ' từ ' || COALESCE(brand,'thương hiệu uy tín')
    || ' là con chuột được thiết kế công thái học, cảm biến chính xác cao, phù hợp cho làm việc và chơi game. '
    || 'Kết nối không dây ổn định, pin lâu và nhiều nút bấm tùy chỉnh tiện lợi. Hàng chính hãng, bảo hành 12 tháng.',
  specifications = '[
    {"label":"Cảm biến","value":"Quang học độ chính xác cao, tối đa 8000 DPI"},
    {"label":"Kết nối","value":"Bluetooth / 2.4GHz / có dây"},
    {"label":"Số nút","value":"6 - 8 nút lập trình được"},
    {"label":"Pin","value":"Sạc USB-C, dùng nhiều tuần"},
    {"label":"Thiết kế","value":"Công thái học, chống mỏi tay"},
    {"label":"Tương thích","value":"Windows, macOS, Linux"},
    {"label":"Bảo hành","value":"12 tháng chính hãng"}
  ]'
WHERE category_id = 'cat-mouse' AND deleted = false AND description IS NULL;

-- ============================================================
-- KEYBOARD
-- ============================================================
UPDATE products SET
  description = name || ' của ' || COALESCE(brand,'thương hiệu uy tín')
    || ' là bàn phím cơ cao cấp với cảm giác gõ tuyệt vời, độ bền cao và thiết kế tinh tế. '
    || 'Hỗ trợ kết nối linh hoạt, đèn nền RGB và keycap chất lượng. Phù hợp cho gõ văn bản, lập trình và gaming. '
    || 'Hàng chính hãng, bảo hành 12 tháng.',
  specifications = '[
    {"label":"Loại switch","value":"Cơ học (Red/Brown/Blue) hot-swap"},
    {"label":"Layout","value":"75% / TKL / Full-size"},
    {"label":"Kết nối","value":"Bluetooth / 2.4GHz / USB-C"},
    {"label":"Đèn nền","value":"RGB tùy chỉnh"},
    {"label":"Keycap","value":"PBT double-shot bền màu"},
    {"label":"Pin","value":"Dung lượng lớn, dùng lâu"},
    {"label":"Bảo hành","value":"12 tháng chính hãng"}
  ]'
WHERE category_id = 'cat-keyboard' AND deleted = false AND description IS NULL;
