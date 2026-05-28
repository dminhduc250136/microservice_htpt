-- Seed bổ sung (profile=dev): sold_count hợp lý + nhiều reviews đa dạng cho catalog.
-- KHÔNG xoá data cũ — chỉ INSERT/UPDATE bổ sung. Idempotent (ON CONFLICT DO NOTHING + recompute).
--
-- reviews.user_id dùng mock-user-01..20 (seed ở user-service V105). reviews.user_id là
-- VARCHAR không có FK sang user DB (cross-service) nên an toàn.
-- Mỗi sản phẩm nhận tối đa 5 review từ các user khác nhau (partial unique product+user active).

-- ============================================================
-- 1) sold_count: số đã bán giả lập hợp lý.
--    Hàng rẻ bán nhiều, hàng đắt bán ít. Cộng nhiễu theo hash id cho tự nhiên.
-- ============================================================
UPDATE products
SET sold_count = GREATEST(
  0,
  (CASE
     WHEN price < 1000000   THEN 800
     WHEN price < 5000000   THEN 400
     WHEN price < 15000000  THEN 150
     WHEN price < 30000000  THEN 60
     ELSE 20
   END)
  + (('x' || substr(md5(id), 1, 6))::bit(24)::int % 120)   -- nhiễu 0..119 deterministic
)
WHERE deleted = false;

-- ============================================================
-- 2) Reviews đa dạng: tạo tối đa 5 review/sản phẩm từ mock users.
--    Dùng cross join products × danh sách (user, rating, content) rồi
--    lọc bằng ROW_NUMBER để mỗi sản phẩm lấy 3..5 review khác user.
-- ============================================================
WITH review_pool (seq, user_id, reviewer, rating, content) AS (
  VALUES
    (1, 'mock-user-01', 'Nguyễn Văn An',   5, 'Sản phẩm tuyệt vời, đóng gói cẩn thận, giao hàng nhanh. Rất hài lòng!'),
    (2, 'mock-user-02', 'Trần Thị Bích',   5, 'Chất lượng vượt mong đợi so với giá tiền. Sẽ ủng hộ shop tiếp.'),
    (3, 'mock-user-03', 'Lê Hoàng Cường',  4, 'Hàng đẹp, dùng ổn định. Trừ 1 sao vì giao hơi chậm chút.'),
    (4, 'mock-user-04', 'Phạm Thị Dung',   5, 'Mình rất thích, đúng mô tả, máy chạy mượt mà.'),
    (5, 'mock-user-05', 'Hoàng Văn Đệ',    4, 'Ổn trong tầm giá, thiết kế đẹp, pin dùng tốt.'),
    (6, 'mock-user-06', 'Vũ Thị Em',       5, 'Quá ưng, sẽ giới thiệu cho bạn bè. Cảm ơn shop!'),
    (7, 'mock-user-07', 'Đặng Văn Phúc',   4, 'Sản phẩm tốt, hỗ trợ nhiệt tình. Đáng mua.'),
    (8, 'mock-user-08', 'Bùi Thị Giang',   3, 'Tạm ổn, một vài chi tiết hoàn thiện chưa thật sự sắc sảo.'),
    (9, 'mock-user-09', 'Đỗ Văn Hải',      5, 'Dùng được 1 tuần thấy rất hài lòng, hiệu năng mạnh.'),
    (10,'mock-user-10', 'Ngô Thị Hoa',     4, 'Giá hợp lý, chất lượng tương xứng. Recommend.')
),
ranked AS (
  SELECT
    p.id AS product_id,
    rp.seq, rp.user_id, rp.reviewer, rp.rating, rp.content,
    -- offset xoay vòng theo product để mỗi SP chọn nhóm user khác nhau
    ((('x' || substr(md5(p.id), 1, 4))::bit(16)::int) + rp.seq) AS pick,
    -- mỗi SP lấy 3..5 review: dựa hash id
    (3 + (('x' || substr(md5(p.id), 5, 2))::bit(8)::int % 3)) AS take_n
  FROM products p
  CROSS JOIN review_pool rp
  WHERE p.deleted = false
),
chosen AS (
  SELECT
    product_id, user_id, reviewer, rating, content,
    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY pick) AS rn,
    take_n
  FROM ranked
)
INSERT INTO reviews (id, product_id, user_id, reviewer_name, rating, content, hidden, deleted_at, created_at, updated_at)
SELECT
  'rev-seed-' || product_id || '-' || user_id,
  product_id, user_id, reviewer, rating, content,
  FALSE, NULL,
  NOW() - (rn || ' days')::interval,
  NOW() - (rn || ' days')::interval
FROM chosen
WHERE rn <= take_n
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3) Recompute avg_rating + review_count từ reviews hợp lệ (visible, chưa xoá).
--    Bao trùm cả review demo cũ (V102) + review seed mới.
-- ============================================================
UPDATE products p
SET
  avg_rating = COALESCE(r.avg_r, 0),
  review_count = COALESCE(r.cnt, 0),
  updated_at = NOW()
FROM (
  SELECT product_id, ROUND(AVG(rating)::numeric, 1) AS avg_r, COUNT(*) AS cnt
  FROM reviews
  WHERE deleted_at IS NULL AND hidden = FALSE
  GROUP BY product_id
) r
WHERE p.id = r.product_id;
