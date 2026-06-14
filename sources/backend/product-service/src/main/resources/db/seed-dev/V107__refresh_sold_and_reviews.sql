-- Làm mới sold_count + reviews cho TOÀN BỘ catalog (profile=dev) để data đồng đều,
-- đầy đủ cho phân tích (DSS, review summary). Trước đó 30 laptop seed sau (V106) +
-- vài SP chưa có lượt bán/đánh giá → phân tích thiếu data.
--
-- Khác V103: pool review LỚN hơn (20 câu, rating đa dạng 3-5) + làm mới CẢ catalog
-- (không chỉ SP thiếu) để mỗi SP có 4-7 review. Idempotent qua id cố định +
-- ON CONFLICT DO NOTHING; recompute review_count/avg_rating cuối.

-- 0) Dọn SP rác "Mock test" (id ngẫu nhiên, không thuộc catalog seed).
DELETE FROM reviews WHERE product_id IN (SELECT id FROM products WHERE name = 'Mock test');
DELETE FROM products WHERE name = 'Mock test';

-- 1) sold_count: số đã bán giả lập hợp lý (hàng rẻ bán nhiều, đắt bán ít) + nhiễu
--    deterministic theo hash id. Làm mới TOÀN BỘ cho đồng đều.
UPDATE products
SET sold_count = GREATEST(
  0,
  (CASE
     WHEN price < 1000000   THEN 800
     WHEN price < 5000000   THEN 400
     WHEN price < 15000000  THEN 150
     WHEN price < 30000000  THEN 60
     ELSE 25
   END)
  + (('x' || substr(md5(id), 1, 6))::bit(24)::int % 150)   -- nhiễu 0..149 deterministic
)
WHERE deleted = false;

-- 2) Reviews: pool 20 câu đa dạng (rating 3-5), mỗi SP 4-7 review từ user khác nhau.
WITH review_pool (seq, user_id, reviewer, rating, content) AS (
  VALUES
    (1,  'mock-user-01', 'Nguyễn Văn An',   5, 'Sản phẩm tuyệt vời, đóng gói cẩn thận, giao hàng nhanh. Rất hài lòng!'),
    (2,  'mock-user-02', 'Trần Thị Bích',   5, 'Chất lượng vượt mong đợi so với giá tiền. Sẽ ủng hộ shop tiếp.'),
    (3,  'mock-user-03', 'Lê Hoàng Cường',  4, 'Hàng đẹp, dùng ổn định. Trừ 1 sao vì giao hơi chậm chút.'),
    (4,  'mock-user-04', 'Phạm Thị Dung',   5, 'Mình rất thích, đúng mô tả, máy chạy mượt mà.'),
    (5,  'mock-user-05', 'Hoàng Văn Đệ',    4, 'Ổn trong tầm giá, thiết kế đẹp, pin dùng tốt.'),
    (6,  'mock-user-06', 'Vũ Thị Em',       5, 'Quá ưng, sẽ giới thiệu cho bạn bè. Cảm ơn shop!'),
    (7,  'mock-user-07', 'Đặng Văn Phúc',   4, 'Sản phẩm tốt, hỗ trợ nhiệt tình. Đáng mua.'),
    (8,  'mock-user-08', 'Bùi Thị Giang',   3, 'Tạm ổn, một vài chi tiết hoàn thiện chưa thật sự sắc sảo.'),
    (9,  'mock-user-09', 'Đỗ Văn Hải',      5, 'Dùng được 1 tuần thấy rất hài lòng, hiệu năng mạnh.'),
    (10, 'mock-user-10', 'Ngô Thị Hoa',     4, 'Giá hợp lý, chất lượng tương xứng. Recommend.'),
    (11, 'mock-user-11', 'Trịnh Văn Khoa',  5, 'Máy đẹp, cấu hình mạnh, chơi game và làm việc đều mượt.'),
    (12, 'mock-user-12', 'Lý Thị Lan',      4, 'Sản phẩm chính hãng, bảo hành đầy đủ. Yên tâm mua.'),
    (13, 'mock-user-13', 'Phan Văn Minh',   3, 'Dùng tạm ổn nhưng pin tụt hơi nhanh so với kỳ vọng.'),
    (14, 'mock-user-14', 'Hồ Thị Nga',      5, 'Đáng đồng tiền, màn hình đẹp, loa to rõ. Rất ưng.'),
    (15, 'mock-user-15', 'Dương Văn Phong', 4, 'Thiết kế gọn gàng, cầm chắc tay, hoàn thiện tốt.'),
    (16, 'mock-user-16', 'Cao Thị Quỳnh',   5, 'Giao nhanh hơn dự kiến, sản phẩm nguyên seal. 10 điểm!'),
    (17, 'mock-user-17', 'Đinh Văn Sơn',    4, 'Hiệu năng ổn cho nhu cầu hàng ngày, đáng tiền.'),
    (18, 'mock-user-18', 'Tô Thị Trang',    3, 'Sản phẩm ổn, nhưng đóng gói có thể chắc chắn hơn.'),
    (19, 'mock-user-19', 'Mai Văn Uy',      5, 'Quá hài lòng, sẽ quay lại shop lần sau. Tư vấn nhiệt tình.'),
    (20, 'mock-user-20', 'Châu Thị Vy',     4, 'Đúng như mô tả, dùng mượt, giá tốt trong phân khúc.')
),
ranked AS (
  SELECT
    p.id AS product_id,
    rp.seq, rp.user_id, rp.reviewer, rp.rating, rp.content,
    -- offset xoay vòng theo product để mỗi SP chọn nhóm user khác nhau
    ((('x' || substr(md5(p.id), 1, 4))::bit(16)::int) + rp.seq) AS pick,
    -- mỗi SP lấy 4..7 review: dựa hash id
    (4 + (('x' || substr(md5(p.id), 5, 2))::bit(8)::int % 4)) AS take_n
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
  'rev-seed2-' || product_id || '-' || user_id,
  product_id, user_id, reviewer, rating, content,
  FALSE, NULL,
  NOW() - (rn || ' days')::interval,
  NOW() - (rn || ' days')::interval
FROM chosen
WHERE rn <= take_n
-- Target partial unique index (product_id, user_id) WHERE deleted_at IS NULL:
-- SP đã có review từ user đó (V103) → skip; SP mới / user mới → insert.
ON CONFLICT (product_id, user_id) WHERE deleted_at IS NULL DO NOTHING;

-- 3) Recompute avg_rating + review_count từ reviews hợp lệ (visible, chưa xoá).
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
