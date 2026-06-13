-- Seed thêm đơn DELIVERED demo để dashboard DSS (Đợt 3 AI insight) có đủ dữ liệu
-- phân tích/dự báo. Trước đó chỉ 2 đơn DELIVERED (2 ngày) → panel ẩn vì < 3 ngày.
--
-- Tạo ~28 đơn rải đều 28 ngày gần nhất (mỗi ngày 1 đơn), tổng tiền theo xu hướng
-- TĂNG nhẹ + dao động → để AI nhận diện trend "tăng" và dự báo. Mỗi đơn có 1
-- order_item trỏ tới product thật (xoay vòng vài SP) để top-products có ý nghĩa.
-- Chỉ chạy ở profile seed-dev (demo data). ON CONFLICT DO NOTHING → idempotent.

-- 28 đơn: ord-rev-demo-01..28, ngày D = (28 - n) ngày trước, total tăng dần + nhiễu.
INSERT INTO orders (id, user_id, total, status, note, deleted, created_at, updated_at,
                    payment_method, discount_amount, payment_status)
SELECT
  'ord-rev-demo-' || LPAD(n::text, 2, '0'),
  '00000000-0000-0000-0000-000000000002',
  -- total: nền 6 triệu + xu hướng tăng (n * 180k) + dao động theo n (cuối tuần cao hơn)
  (6000000 + n * 180000 + (CASE WHEN n % 7 IN (0, 6) THEN 2500000 ELSE 0 END)
            + (n % 5) * 350000)::numeric(12,2),
  'DELIVERED',
  'Đơn demo doanh thu #' || n,
  FALSE,
  NOW() - ((28 - n) || ' days')::interval,
  NOW() - ((28 - n) || ' days')::interval,
  CASE WHEN n % 2 = 0 THEN 'COD' ELSE 'MOMO' END,
  0,
  'PAID'
FROM generate_series(1, 28) AS n
ON CONFLICT (id) DO NOTHING;

-- order_items: mỗi đơn 1 dòng, xoay vòng 6 SP thật (điện thoại/laptop/phụ kiện)
-- để top-products đa dạng. unit_price = total đơn (1 item/đơn cho gọn).
INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, line_total)
SELECT
  'oitem-rev-demo-' || LPAD(n::text, 2, '0'),
  'ord-rev-demo-' || LPAD(n::text, 2, '0'),
  prod.pid,
  prod.pname,
  1,
  o.total,
  o.total
FROM generate_series(1, 28) AS n
JOIN orders o ON o.id = 'ord-rev-demo-' || LPAD(n::text, 2, '0')
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['prod-lap-001','prod-pho-001','prod-mou-001','prod-key-001','prod-hea-002','prod-lap-005'])[1 + (n % 6)] AS pid,
    (ARRAY['Apple MacBook Pro 16 M3 Max 1TB','Apple iPhone 15 Pro Max 256GB','Logitech MX Master 3S','Keychron Q1 Pro Wireless','Sony WH-1000XM4 Black','Dell XPS 15 9530 i7 RTX 4060'])[1 + (n % 6)] AS pname
) AS prod
ON CONFLICT (id) DO NOTHING;
