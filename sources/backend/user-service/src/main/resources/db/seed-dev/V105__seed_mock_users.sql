-- Seed bổ sung (profile=dev): tạo nhiều user mock để làm reviewer đa dạng.
-- Tên VN thật, email/username unique. Password chung = `admin123`
-- (BCrypt hash giống V100, đã verify). roles=USER, email_verified=TRUE.
--
-- id pattern: mock-user-01 .. mock-user-20 — cross-service dùng làm reviews.user_id ở product-service.
-- Idempotent: ON CONFLICT (id) DO NOTHING.

INSERT INTO users (id, username, email, password_hash, roles, deleted, full_name, phone, email_verified, created_at, updated_at)
VALUES
  ('mock-user-01', 'nguyenvanan',   'nguyenvanan@gmail.com',   '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Nguyễn Văn An',     '0901000001', TRUE, NOW() - INTERVAL '120 days', NOW()),
  ('mock-user-02', 'tranthibich',   'tranthibich@gmail.com',   '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Trần Thị Bích',     '0901000002', TRUE, NOW() - INTERVAL '118 days', NOW()),
  ('mock-user-03', 'lehoangcuong',  'lehoangcuong@gmail.com',  '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Lê Hoàng Cường',    '0901000003', TRUE, NOW() - INTERVAL '115 days', NOW()),
  ('mock-user-04', 'phamthidung',   'phamthidung@gmail.com',   '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Phạm Thị Dung',     '0901000004', TRUE, NOW() - INTERVAL '110 days', NOW()),
  ('mock-user-05', 'hoangvande',    'hoangvande@gmail.com',    '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Hoàng Văn Đệ',      '0901000005', TRUE, NOW() - INTERVAL '105 days', NOW()),
  ('mock-user-06', 'vuthiem',       'vuthiem@gmail.com',       '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Vũ Thị Em',         '0901000006', TRUE, NOW() - INTERVAL '100 days', NOW()),
  ('mock-user-07', 'dangvanphuc',   'dangvanphuc@gmail.com',   '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Đặng Văn Phúc',     '0901000007', TRUE, NOW() - INTERVAL '95 days', NOW()),
  ('mock-user-08', 'buithigiang',   'buithigiang@gmail.com',   '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Bùi Thị Giang',     '0901000008', TRUE, NOW() - INTERVAL '90 days', NOW()),
  ('mock-user-09', 'dovanhai',      'dovanhai@gmail.com',      '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Đỗ Văn Hải',        '0901000009', TRUE, NOW() - INTERVAL '85 days', NOW()),
  ('mock-user-10', 'ngothihoa',     'ngothihoa@gmail.com',     '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Ngô Thị Hoa',       '0901000010', TRUE, NOW() - INTERVAL '80 days', NOW()),
  ('mock-user-11', 'duongvankhoa',  'duongvankhoa@gmail.com',  '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Dương Văn Khoa',    '0901000011', TRUE, NOW() - INTERVAL '75 days', NOW()),
  ('mock-user-12', 'lythilan',      'lythilan@gmail.com',      '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Lý Thị Lan',        '0901000012', TRUE, NOW() - INTERVAL '70 days', NOW()),
  ('mock-user-13', 'maivanlong',    'maivanlong@gmail.com',    '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Mai Văn Long',      '0901000013', TRUE, NOW() - INTERVAL '65 days', NOW()),
  ('mock-user-14', 'caothimy',      'caothimy@gmail.com',      '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Cao Thị My',        '0901000014', TRUE, NOW() - INTERVAL '60 days', NOW()),
  ('mock-user-15', 'trinhvannam',   'trinhvannam@gmail.com',   '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Trịnh Văn Nam',     '0901000015', TRUE, NOW() - INTERVAL '55 days', NOW()),
  ('mock-user-16', 'phanthioanh',   'phanthioanh@gmail.com',   '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Phan Thị Oanh',     '0901000016', TRUE, NOW() - INTERVAL '50 days', NOW()),
  ('mock-user-17', 'tovanphong',    'tovanphong@gmail.com',    '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Tô Văn Phong',      '0901000017', TRUE, NOW() - INTERVAL '45 days', NOW()),
  ('mock-user-18', 'huynhthiquyen', 'huynhthiquyen@gmail.com', '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Huỳnh Thị Quyên',   '0901000018', TRUE, NOW() - INTERVAL '40 days', NOW()),
  ('mock-user-19', 'dinhvanson',    'dinhvanson@gmail.com',    '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Đinh Văn Sơn',      '0901000019', TRUE, NOW() - INTERVAL '35 days', NOW()),
  ('mock-user-20', 'truongthitam',  'truongthitam@gmail.com',  '$2a$10$TMH2spmmPRD90vJz8w5yz.G0o4AR/Hio2RU1yBwjjT1ClTLqF5lFu', 'USER', FALSE, 'Trương Thị Tâm',    '0901000020', TRUE, NOW() - INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;
