-- Seed bổ sung (profile=dev): mã giảm giá demo. Idempotent (ON CONFLICT code DO NOTHING).
-- type: PERCENT (value = % giảm), FIXED (value = số tiền VND giảm).
-- expires_at để xa (90 ngày) cho mã active; 1 mã đã hết hạn + 1 mã inactive để test edge case.

INSERT INTO coupons (id, code, type, value, min_order_amount, max_total_uses, used_count, expires_at, active, created_at, updated_at)
VALUES
  ('cpn-seed-welcome10', 'WELCOME10',  'PERCENT', 10,      0,        1000, 0, NOW() + INTERVAL '90 days', TRUE,  NOW(), NOW()),
  ('cpn-seed-sale15',    'SALE15',     'PERCENT', 15,      2000000,  500,  0, NOW() + INTERVAL '60 days', TRUE,  NOW(), NOW()),
  ('cpn-seed-super20',   'SUPER20',    'PERCENT', 20,      10000000, 200,  0, NOW() + INTERVAL '45 days', TRUE,  NOW(), NOW()),
  ('cpn-seed-fix50k',    'GIAM50K',    'FIXED',   50000,   500000,   1000, 0, NOW() + INTERVAL '90 days', TRUE,  NOW(), NOW()),
  ('cpn-seed-fix200k',   'GIAM200K',   'FIXED',   200000,  3000000,  500,  0, NOW() + INTERVAL '60 days', TRUE,  NOW(), NOW()),
  ('cpn-seed-fix500k',   'GIAM500K',   'FIXED',   500000,  10000000, 100,  0, NOW() + INTERVAL '30 days', TRUE,  NOW(), NOW()),
  ('cpn-seed-freeship',  'FREESHIP',   'FIXED',   30000,   200000,   NULL, 0, NOW() + INTERVAL '90 days', TRUE,  NOW(), NOW()),
  ('cpn-seed-expired',   'HETHAN10',   'PERCENT', 10,      0,        100,  0, NOW() - INTERVAL '5 days',  TRUE,  NOW(), NOW()),
  ('cpn-seed-inactive',  'TAMNGUNG',   'PERCENT', 25,      0,        100,  0, NOW() + INTERVAL '90 days', FALSE, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
