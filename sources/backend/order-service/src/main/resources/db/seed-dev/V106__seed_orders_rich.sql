-- Mock đơn hàng phong phú (profile=dev) để dashboard/DSS có data đa dạng:
-- ~90 đơn trải 90 ngày, đủ 5 trạng thái, 20 mock-user, 1-3 SP/đơn (giá thật snapshot).
-- Trước đó đơn chủ yếu DELIVERED + PENDING, thiếu CONFIRMED/SHIPPING/CANCELLED →
-- biểu đồ phân phối trạng thái nghèo + doanh thu chỉ ~28 ngày.
--
-- Idempotent: id cố định 'ord-mock-NNN' + ON CONFLICT DO NOTHING. order_items tính
-- total qua line_total; orders.total UPDATE lại = SUM(line_total) sau khi chèn items.

-- Pool 20 SP đại diện (id + name + giá thật từ product catalog) — snapshot vào order_items.
CREATE TEMP TABLE _prod_pool (idx int, pid varchar, pname varchar, price bigint) ON COMMIT DROP;
INSERT INTO _prod_pool VALUES
  (0,  'prod-pho-001', 'Apple iPhone 15 Pro Max 256GB', 34990000),
  (1,  'prod-pho-002', 'Apple iPhone 15 Pro 128GB',     28990000),
  (2,  'prod-pho-003', 'Apple iPhone 15 128GB',         22990000),
  (3,  'prod-pho-004', 'Apple iPhone 14 128GB',         18990000),
  (4,  'prod-lap-001', 'Apple MacBook Pro 16 M3 Max 1TB', 58990000),
  (5,  'prod-lap-002', 'Apple MacBook Pro 14 M3 Pro 512GB', 42990000),
  (6,  'prod-lap-003', 'Apple MacBook Air 15 M3 256GB',  32990000),
  (7,  'prod-lap-004', 'Apple MacBook Air 13 M2 256GB',  25990000),
  (8,  'prod-lap-005', 'Dell XPS 15 9530 i7 RTX 4060',   45990000),
  (9,  'prod-mou-001', 'Logitech MX Master 3S',          2490000),
  (10, 'prod-mou-002', 'Logitech MX Master 3 for Mac',   2390000),
  (11, 'prod-mou-003', 'Logitech G Pro X Superlight 2',  3290000),
  (12, 'prod-mou-004', 'Logitech G502 X Plus Lightspeed', 2890000),
  (13, 'prod-key-001', 'Keychron Q1 Pro Wireless',       4990000),
  (14, 'prod-key-002', 'Keychron K2 V2 RGB Hot-Swap',    2490000),
  (15, 'prod-key-003', 'Keychron K6 65% Aluminum',       2190000),
  (16, 'prod-hea-001', 'Sony WH-1000XM5 Black',          8990000),
  (17, 'prod-hea-002', 'Sony WH-1000XM4 Black',          6990000),
  (18, 'prod-hea-003', 'Sony WF-1000XM5 In-Ear',         6490000),
  (19, 'prod-hea-004', 'Sony LinkBuds S Earbuds',        3490000);

-- 1) Tạo 90 đơn: createdAt rải 90 ngày, status/user/payment deterministic theo n.
INSERT INTO orders (id, user_id, total, status, note, deleted, created_at, updated_at,
                    payment_method, discount_amount, payment_status)
SELECT
  'ord-mock-' || LPAD(n::text, 3, '0'),
  'mock-user-' || LPAD((1 + (n % 20))::text, 2, '0'),
  0,  -- total tạm, cập nhật sau từ order_items
  -- phân phối trạng thái theo n%20: ~55% DELIVERED, 15% PENDING, 12% CONFIRMED,
  -- 10% SHIPPING, 8% CANCELLED
  (CASE
     WHEN n % 20 < 11 THEN 'DELIVERED'
     WHEN n % 20 < 14 THEN 'PENDING'
     WHEN n % 20 < 16 THEN 'CONFIRMED'
     WHEN n % 20 < 18 THEN 'SHIPPING'
     ELSE 'CANCELLED'
   END),
  'Đơn mock #' || n,
  FALSE,
  NOW() - ((n * 89 / 90) || ' days')::interval - ((n % 24) || ' hours')::interval,
  NOW() - ((n * 89 / 90) || ' days')::interval,
  (CASE n % 3 WHEN 0 THEN 'COD' WHEN 1 THEN 'MOMO' ELSE 'VNPAY' END),
  0,
  (CASE WHEN n % 20 < 11 THEN 'PAID' ELSE 'PENDING' END)
FROM generate_series(1, 90) AS n
ON CONFLICT (id) DO NOTHING;

-- 2) order_items: mỗi đơn 1-3 SP (số lượng SP = 1 + n%3), chọn SP xoay vòng từ pool.
--    k = 0..(num_items-1); SP index = (n*7 + k*5) % 20 (rải đều). qty = 1 hoặc 2.
INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, line_total)
SELECT
  'oitem-mock-' || LPAD(n::text, 3, '0') || '-' || k,
  'ord-mock-' || LPAD(n::text, 3, '0'),
  pp.pid, pp.pname,
  qty,
  pp.price,
  pp.price * qty
FROM generate_series(1, 90) AS n
CROSS JOIN LATERAL generate_series(0, (n % 3)) AS k       -- 1..3 items
CROSS JOIN LATERAL (SELECT (1 + ((n % 2))) AS qty) AS q   -- qty 1 hoặc 2
JOIN _prod_pool pp ON pp.idx = ((n * 7 + k * 5) % 20)
JOIN orders o ON o.id = 'ord-mock-' || LPAD(n::text, 3, '0')  -- chỉ chèn nếu đơn tồn tại
ON CONFLICT (id) DO NOTHING;

-- 3) Cập nhật orders.total = SUM(line_total) của các order_items (cho đơn mock).
UPDATE orders o
SET total = t.sum_total, updated_at = o.updated_at
FROM (
  SELECT order_id, SUM(line_total) AS sum_total
  FROM order_items
  WHERE order_id LIKE 'ord-mock-%'
  GROUP BY order_id
) t
WHERE o.id = t.order_id AND o.total = 0;
