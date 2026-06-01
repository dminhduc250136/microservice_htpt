-- Seed bổ sung (profile=dev): thêm 30 laptop (prod-lap-021..050) để catalog laptop
-- phong phú hơn (đa dạng gaming / văn phòng / đồ họa / sinh viên / ultrabook).
--
-- Mỗi laptop có description dài + specifications JSON RIÊNG (CPU/RAM/GPU/màn hình thật)
-- để chat AI (RAG) tư vấn cấu hình chính xác. Ảnh dùng Unsplash (fm=webp&q=80&w=800).
-- Idempotent: ON CONFLICT (id) DO NOTHING. Status ACTIVE, category_id = 'cat-laptop'.
--
-- Stock: rải 1 row stock=0, vài row <10, còn lại 15-120 để demo trạng thái tồn kho.

INSERT INTO products (
  id, name, slug, category_id, brand,
  price, original_price, short_description, description, specifications,
  thumbnail_url, stock, status, deleted, created_at, updated_at
) VALUES
  ('prod-lap-021', 'ASUS ROG Strix SCAR 18 i9 RTX 4090', 'asus-rog-strix-scar-18-i9-rtx-4090', 'cat-laptop', 'ASUS',
   89990000.00, 99990000.00, 'Laptop gaming đầu bảng: i9-14900HX, RTX 4090, màn 18" QHD+ 240Hz',
   'ASUS ROG Strix SCAR 18 từ ASUS là quái vật gaming dành cho game thủ chuyên nghiệp và streamer. Cấu hình cực mạnh với CPU Intel thế hệ mới và GPU RTX 4090 xử lý mọi tựa game AAA ở thiết lập tối đa, dựng phim và render 3D mượt mà. Màn hình 18 inch 240Hz cho trải nghiệm hình ảnh đỉnh cao. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core i9-14900HX (24 nhân)"},{"label":"RAM","value":"32GB DDR5 5600MHz"},{"label":"Ổ cứng","value":"2TB SSD PCIe 4.0"},{"label":"Card đồ họa","value":"NVIDIA GeForce RTX 4090 16GB"},{"label":"Màn hình","value":"18\" QHD+ 2560x1600 240Hz"},{"label":"Pin","value":"90Wh, sạc nhanh 330W"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1603302576837-37561b2e2302?fm=webp&q=80&w=800',
   12, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-022', 'Apple MacBook Pro 14 M3 Max 1TB', 'apple-macbook-pro-14-m3-max-1tb', 'cat-laptop', 'Apple',
   72990000.00, 79990000.00, 'M3 Max 14 nhân, 36GB RAM, màn Liquid Retina XDR 14" cho đồ họa chuyên nghiệp',
   'Apple MacBook Pro 14 M3 Max từ Apple là lựa chọn hàng đầu cho dân sáng tạo: dựng phim 4K/8K, render đồ họa và lập trình nặng. Chip M3 Max hiệu năng vượt trội, pin cực bền, màn hình Liquid Retina XDR màu sắc chuẩn. Thiết kế nhôm nguyên khối sang trọng. Hàng chính hãng, bảo hành 12 tháng.',
   '[{"label":"CPU","value":"Apple M3 Max (14 nhân CPU, 30 nhân GPU)"},{"label":"RAM","value":"36GB Unified Memory"},{"label":"Ổ cứng","value":"1TB SSD"},{"label":"Card đồ họa","value":"GPU 30 nhân tích hợp"},{"label":"Màn hình","value":"14.2\" Liquid Retina XDR 120Hz"},{"label":"Pin","value":"Lên đến 18 giờ"},{"label":"Bảo hành","value":"12 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?fm=webp&q=80&w=800',
   20, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-023', 'Dell XPS 17 9730 i9 RTX 4080', 'dell-xps-17-9730-i9-rtx-4080', 'cat-laptop', 'Dell',
   68990000.00, NULL, 'XPS 17" InfinityEdge, i9-13900H, RTX 4080, màn UHD+ cảm ứng',
   'Dell XPS 17 từ Dell là ultrabook 17 inch cao cấp dành cho công việc sáng tạo và doanh nhân. Màn hình InfinityEdge viền siêu mỏng UHD+ sắc nét, cấu hình mạnh đủ cho dựng phim và đồ họa. Thiết kế nhôm CNC và sợi carbon sang trọng, bền bỉ. Hàng chính hãng, bảo hành 12 tháng.',
   '[{"label":"CPU","value":"Intel Core i9-13900H (14 nhân)"},{"label":"RAM","value":"32GB DDR5"},{"label":"Ổ cứng","value":"1TB SSD NVMe"},{"label":"Card đồ họa","value":"NVIDIA RTX 4080 12GB"},{"label":"Màn hình","value":"17\" UHD+ 3840x2400 cảm ứng"},{"label":"Pin","value":"97Wh"},{"label":"Bảo hành","value":"12 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?fm=webp&q=80&w=800',
   15, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-024', 'Lenovo Legion Pro 7i Gen 9 RTX 4080', 'lenovo-legion-pro-7i-gen-9-rtx-4080', 'cat-laptop', 'Lenovo',
   62990000.00, 67990000.00, 'Legion Pro 7i: i9-14900HX, RTX 4080, màn 16" WQXGA 240Hz',
   'Lenovo Legion Pro 7i từ Lenovo là laptop gaming flagship cân bằng giữa hiệu năng và tản nhiệt. Hệ thống ColdFront mát mẻ giúp duy trì xung nhịp cao khi chơi game lâu. Bàn phím TrueStrike gõ đã tay, màn hình 240Hz mượt mà. Phù hợp game thủ và người làm đồ họa. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core i9-14900HX"},{"label":"RAM","value":"32GB DDR5 5600MHz"},{"label":"Ổ cứng","value":"1TB SSD PCIe 4.0"},{"label":"Card đồ họa","value":"NVIDIA RTX 4080 12GB"},{"label":"Màn hình","value":"16\" WQXGA 2560x1600 240Hz"},{"label":"Pin","value":"99.99Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?fm=webp&q=80&w=800',
   18, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-025', 'MSI Raider GE78 HX i9 RTX 4070', 'msi-raider-ge78-hx-i9-rtx-4070', 'cat-laptop', 'MSI',
   54990000.00, 59990000.00, 'MSI Raider 17": i9-14900HX, RTX 4070, màn QHD+ 240Hz',
   'MSI Raider GE78 HX từ MSI là laptop gaming cao cấp với dải LED Mystic Light nổi bật. Hiệu năng mạnh mẽ cho game AAA và sáng tạo nội dung, tản nhiệt Cooler Boost 5 hiệu quả. Màn hình lớn 17 inch QHD+ 240Hz cho trải nghiệm đắm chìm. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core i9-14900HX"},{"label":"RAM","value":"32GB DDR5"},{"label":"Ổ cứng","value":"1TB SSD NVMe"},{"label":"Card đồ họa","value":"NVIDIA RTX 4070 8GB"},{"label":"Màn hình","value":"17\" QHD+ 240Hz"},{"label":"Pin","value":"99.9Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?fm=webp&q=80&w=800',
   14, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-026', 'Apple MacBook Air 15 M3 512GB', 'apple-macbook-air-15-m3-512gb', 'cat-laptop', 'Apple',
   36990000.00, 39990000.00, 'MacBook Air 15" M3, 16GB RAM, mỏng nhẹ pin trâu cho văn phòng',
   'Apple MacBook Air 15 M3 từ Apple là ultrabook mỏng nhẹ lý tưởng cho dân văn phòng, sinh viên và người di chuyển nhiều. Chip M3 mạnh, chạy êm không quạt, pin cả ngày dài. Màn hình Liquid Retina 15 inch rộng rãi, màu đẹp. Hàng chính hãng, bảo hành 12 tháng.',
   '[{"label":"CPU","value":"Apple M3 (8 nhân CPU, 10 nhân GPU)"},{"label":"RAM","value":"16GB Unified Memory"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"GPU 10 nhân tích hợp"},{"label":"Màn hình","value":"15.3\" Liquid Retina 2880x1864"},{"label":"Pin","value":"Lên đến 18 giờ"},{"label":"Bảo hành","value":"12 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?fm=webp&q=80&w=800',
   40, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-027', 'ASUS Zenbook 14 OLED Ultra 7', 'asus-zenbook-14-oled-ultra-7', 'cat-laptop', 'ASUS',
   28990000.00, 31990000.00, 'Zenbook 14 OLED: Core Ultra 7, 16GB, màn OLED 2.8K mỏng nhẹ 1.2kg',
   'ASUS Zenbook 14 OLED từ ASUS là ultrabook cao cấp với màn hình OLED 2.8K màu sắc rực rỡ, lý tưởng cho công việc văn phòng và giải trí. Chip Intel Core Ultra tích hợp NPU cho tác vụ AI, pin bền, trọng lượng chỉ 1.2kg dễ mang theo. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core Ultra 7 155H"},{"label":"RAM","value":"16GB LPDDR5X"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"Intel Arc Graphics tích hợp"},{"label":"Màn hình","value":"14\" OLED 2.8K 120Hz"},{"label":"Pin","value":"75Wh, lên đến 16 giờ"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?fm=webp&q=80&w=800',
   35, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-028', 'Dell Inspiron 16 Plus 7640 RTX 4060', 'dell-inspiron-16-plus-7640-rtx-4060', 'cat-laptop', 'Dell',
   31990000.00, NULL, 'Inspiron 16 Plus: Core Ultra 7, RTX 4060, màn 16" 2.5K cho sáng tạo',
   'Dell Inspiron 16 Plus từ Dell là laptop tầm trung mạnh mẽ cho người làm sáng tạo và sinh viên kỹ thuật. Màn hình 16 inch 2.5K rộng rãi, có card RTX 4060 đủ chơi game và dựng phim cơ bản. Thiết kế gọn gàng, pin ổn. Hàng chính hãng, bảo hành 12 tháng.',
   '[{"label":"CPU","value":"Intel Core Ultra 7 155H"},{"label":"RAM","value":"16GB DDR5"},{"label":"Ổ cứng","value":"1TB SSD"},{"label":"Card đồ họa","value":"NVIDIA RTX 4060 8GB"},{"label":"Màn hình","value":"16\" 2.5K 2560x1600"},{"label":"Pin","value":"64Wh"},{"label":"Bảo hành","value":"12 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?fm=webp&q=80&w=800',
   22, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-029', 'HP Omen 16 Ryzen 9 RTX 4070', 'hp-omen-16-ryzen-9-rtx-4070', 'cat-laptop', 'HP',
   42990000.00, 46990000.00, 'HP Omen 16: Ryzen 9 7940HS, RTX 4070, màn QHD 165Hz gaming',
   'HP Omen 16 từ HP là laptop gaming mạnh mẽ với CPU AMD Ryzen 9 và GPU RTX 4070, chiến mượt mọi tựa game phổ biến. Tản nhiệt OMEN Tempest cho hiệu năng ổn định, màn hình QHD 165Hz sắc nét. Thiết kế tối giản, phù hợp cả gaming lẫn làm việc. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"AMD Ryzen 9 7940HS (8 nhân)"},{"label":"RAM","value":"16GB DDR5"},{"label":"Ổ cứng","value":"1TB SSD PCIe 4.0"},{"label":"Card đồ họa","value":"NVIDIA RTX 4070 8GB"},{"label":"Màn hình","value":"16\" QHD 2560x1440 165Hz"},{"label":"Pin","value":"83Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1602080858428-57174f9431cf?fm=webp&q=80&w=800',
   16, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-030', 'Lenovo ThinkPad X1 Yoga Gen 8', 'lenovo-thinkpad-x1-yoga-gen-8', 'cat-laptop', 'Lenovo',
   38990000.00, 42990000.00, 'ThinkPad X1 Yoga: i7 Evo, 2-in-1 xoay gập, màn 14" 2.8K OLED cảm ứng',
   'Lenovo ThinkPad X1 Yoga từ Lenovo là laptop doanh nhân 2-in-1 cao cấp, bản lề xoay 360 độ linh hoạt dùng như tablet. Bàn phím gõ tuyệt vời, bảo mật cao, độ bền chuẩn quân đội. Màn hình OLED cảm ứng kèm bút stylus. Hàng chính hãng, bảo hành 36 tháng.',
   '[{"label":"CPU","value":"Intel Core i7-1355U Evo"},{"label":"RAM","value":"16GB LPDDR5"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"Intel Iris Xe tích hợp"},{"label":"Màn hình","value":"14\" 2.8K OLED cảm ứng"},{"label":"Pin","value":"57Wh, lên đến 15 giờ"},{"label":"Bảo hành","value":"36 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1531297484001-80022131f5a1?fm=webp&q=80&w=800',
   19, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-031', 'Acer Predator Helios Neo 16 RTX 4060', 'acer-predator-helios-neo-16-rtx-4060', 'cat-laptop', 'Acer',
   33990000.00, 37990000.00, 'Predator Helios Neo 16: i7-13700HX, RTX 4060, màn WQXGA 165Hz',
   'Acer Predator Helios Neo 16 từ Acer là laptop gaming giá tốt với cấu hình mạnh i7 và RTX 4060. Tản nhiệt kép, bàn phím LED 4 vùng, màn hình WQXGA 165Hz mượt. Lựa chọn cân bằng cho game thủ và sinh viên ngành kỹ thuật. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core i7-13700HX (16 nhân)"},{"label":"RAM","value":"16GB DDR5"},{"label":"Ổ cứng","value":"512GB SSD NVMe"},{"label":"Card đồ họa","value":"NVIDIA RTX 4060 8GB"},{"label":"Màn hình","value":"16\" WQXGA 2560x1600 165Hz"},{"label":"Pin","value":"90Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?fm=webp&q=80&w=800',
   21, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-032', 'ASUS TUF Gaming A15 Ryzen 7 RTX 4060', 'asus-tuf-gaming-a15-ryzen-7-rtx-4060', 'cat-laptop', 'ASUS',
   27990000.00, 30990000.00, 'TUF Gaming A15: Ryzen 7 7735HS, RTX 4060, bền chuẩn quân đội',
   'ASUS TUF Gaming A15 từ ASUS là laptop gaming bền bỉ chuẩn quân đội MIL-STD-810H, giá hợp lý cho game thủ phổ thông. CPU Ryzen 7 và RTX 4060 chiến tốt game eSports và AAA. Tản nhiệt hiệu quả, pin lớn. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"AMD Ryzen 7 7735HS (8 nhân)"},{"label":"RAM","value":"16GB DDR5"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"NVIDIA RTX 4060 8GB"},{"label":"Màn hình","value":"15.6\" FHD 144Hz"},{"label":"Pin","value":"90Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1542393545-10f5cde2c810?fm=webp&q=80&w=800',
   28, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-033', 'HP Spectre x360 16 OLED Ultra 7', 'hp-spectre-x360-16-oled-ultra-7', 'cat-laptop', 'HP',
   44990000.00, NULL, 'Spectre x360 16" OLED 2-in-1, Core Ultra 7, thiết kế sang trọng',
   'HP Spectre x360 16 từ HP là laptop 2-in-1 cao cấp với thiết kế kim loại tinh xảo, màn hình OLED 16 inch cảm ứng tuyệt đẹp. Phù hợp người làm sáng tạo cần màn lớn và sự linh hoạt xoay gập. Chip Intel Core Ultra mạnh, pin bền. Hàng chính hãng, bảo hành 12 tháng.',
   '[{"label":"CPU","value":"Intel Core Ultra 7 155H"},{"label":"RAM","value":"16GB LPDDR5"},{"label":"Ổ cứng","value":"1TB SSD"},{"label":"Card đồ họa","value":"Intel Arc Graphics"},{"label":"Màn hình","value":"16\" OLED 2.8K cảm ứng"},{"label":"Pin","value":"83Wh"},{"label":"Bảo hành","value":"12 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1629131726692-1accd0c53ce0?fm=webp&q=80&w=800',
   17, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-034', 'Dell Latitude 7440 i7 Business', 'dell-latitude-7440-i7-business', 'cat-laptop', 'Dell',
   29990000.00, 32990000.00, 'Latitude 7440: i7 Evo, 16GB, laptop doanh nghiệp bảo mật cao',
   'Dell Latitude 7440 từ Dell là laptop doanh nghiệp mỏng nhẹ, tập trung vào bảo mật và độ tin cậy. Phù hợp nhân viên văn phòng, quản lý cần thiết bị ổn định, pin bền và kết nối đầy đủ. Bàn phím thoải mái, webcam FHD. Hàng chính hãng, bảo hành 36 tháng.',
   '[{"label":"CPU","value":"Intel Core i7-1365U Evo"},{"label":"RAM","value":"16GB DDR5"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"Intel Iris Xe"},{"label":"Màn hình","value":"14\" FHD+ chống chói"},{"label":"Pin","value":"54Wh, lên đến 14 giờ"},{"label":"Bảo hành","value":"36 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1484788984921-03950022c9ef?fm=webp&q=80&w=800',
   24, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-035', 'Lenovo IdeaPad Pro 5 14 OLED Ryzen 7', 'lenovo-ideapad-pro-5-14-oled-ryzen-7', 'cat-laptop', 'Lenovo',
   23990000.00, 26990000.00, 'IdeaPad Pro 5: Ryzen 7 8845HS, màn 14" 2.8K OLED, giá tốt',
   'Lenovo IdeaPad Pro 5 từ Lenovo là laptop tầm trung đáng giá với màn OLED 2.8K đẹp mắt và CPU Ryzen 7 mạnh mẽ. Phù hợp sinh viên, dân văn phòng và người sáng tạo nội dung nhẹ nhàng. Thiết kế kim loại chắc chắn, pin tốt. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"AMD Ryzen 7 8845HS (8 nhân)"},{"label":"RAM","value":"16GB LPDDR5X"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"AMD Radeon 780M tích hợp"},{"label":"Màn hình","value":"14\" 2.8K OLED 120Hz"},{"label":"Pin","value":"73Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1593305841991-05c297ba4575?fm=webp&q=80&w=800',
   30, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-036', 'ASUS ProArt Studiobook 16 OLED RTX 4070', 'asus-proart-studiobook-16-oled-rtx-4070', 'cat-laptop', 'ASUS',
   58990000.00, 64990000.00, 'ProArt Studiobook 16: i9, RTX 4070, màn OLED 3.2K cho đồ họa chuyên nghiệp',
   'ASUS ProArt Studiobook 16 từ ASUS là máy trạm di động dành riêng cho nhà thiết kế, dựng phim và họa sĩ 3D. Màn hình OLED 3.2K chuẩn màu Pantone, núm xoay ASUS Dial hỗ trợ phần mềm sáng tạo. Cấu hình workstation mạnh mẽ. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core i9-13980HX"},{"label":"RAM","value":"32GB DDR5"},{"label":"Ổ cứng","value":"1TB SSD"},{"label":"Card đồ họa","value":"NVIDIA RTX 4070 8GB"},{"label":"Màn hình","value":"16\" OLED 3.2K chuẩn màu Pantone"},{"label":"Pin","value":"90Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?fm=webp&q=80&w=800',
   9, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-037', 'Acer Swift Edge 16 OLED Ryzen 7', 'acer-swift-edge-16-oled-ryzen-7', 'cat-laptop', 'Acer',
   25990000.00, 28990000.00, 'Swift Edge 16: màn OLED 3.2K 16", siêu nhẹ 1.23kg, Ryzen 7',
   'Acer Swift Edge 16 từ Acer là ultrabook màn lớn nhưng siêu nhẹ chỉ 1.23kg, hiếm có ở phân khúc 16 inch. Màn hình OLED 3.2K rực rỡ, phù hợp người cần màn rộng mà vẫn di động. Pin bền, hiệu năng tốt cho văn phòng. Hàng chính hãng, bảo hành 12 tháng.',
   '[{"label":"CPU","value":"AMD Ryzen 7 7840U (8 nhân)"},{"label":"RAM","value":"16GB LPDDR5"},{"label":"Ổ cứng","value":"1TB SSD"},{"label":"Card đồ họa","value":"AMD Radeon 780M"},{"label":"Màn hình","value":"16\" OLED 3.2K 120Hz"},{"label":"Pin","value":"54Wh"},{"label":"Bảo hành","value":"12 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1611078489935-0cb964de46d6?fm=webp&q=80&w=800',
   26, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-038', 'MSI Prestige 13 AI Evo Ultra 7', 'msi-prestige-13-ai-evo-ultra-7', 'cat-laptop', 'MSI',
   30990000.00, NULL, 'Prestige 13 AI Evo: Core Ultra 7, 1kg siêu nhẹ, pin 24 giờ',
   'MSI Prestige 13 AI Evo từ MSI là laptop doanh nhân siêu di động chỉ 1kg với thời lượng pin lên đến 24 giờ. Chip Intel Core Ultra tích hợp AI, màn OLED đẹp. Lý tưởng cho người di chuyển nhiều, họp hành liên tục. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core Ultra 7 155H"},{"label":"RAM","value":"32GB LPDDR5"},{"label":"Ổ cứng","value":"1TB SSD"},{"label":"Card đồ họa","value":"Intel Arc Graphics"},{"label":"Màn hình","value":"13.3\" OLED FHD+"},{"label":"Pin","value":"75Wh, lên đến 24 giờ"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1543069190-9d3261b4b6d3?fm=webp&q=80&w=800',
   23, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-039', 'HP Victus 16 Ryzen 5 RTX 4050', 'hp-victus-16-ryzen-5-rtx-4050', 'cat-laptop', 'HP',
   21990000.00, 24990000.00, 'HP Victus 16: Ryzen 5 7640HS, RTX 4050, gaming giá rẻ',
   'HP Victus 16 từ HP là laptop gaming nhập môn giá tốt, phù hợp game thủ và sinh viên ngân sách hạn chế. CPU Ryzen 5 và RTX 4050 chiến mượt game eSports và AAA ở thiết lập trung bình. Màn 16 inch 144Hz, tản nhiệt ổn. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"AMD Ryzen 5 7640HS (6 nhân)"},{"label":"RAM","value":"16GB DDR5"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"NVIDIA RTX 4050 6GB"},{"label":"Màn hình","value":"16.1\" FHD 144Hz"},{"label":"Pin","value":"70Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?fm=webp&q=80&w=800',
   32, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-040', 'Apple MacBook Pro 16 M3 Pro 512GB', 'apple-macbook-pro-16-m3-pro-512gb', 'cat-laptop', 'Apple',
   54990000.00, 59990000.00, 'MacBook Pro 16" M3 Pro, 18GB RAM, màn XDR cho dân chuyên nghiệp',
   'Apple MacBook Pro 16 M3 Pro từ Apple là máy tính xách tay mạnh mẽ cho lập trình viên, nhà dựng phim và nhạc sĩ. Chip M3 Pro cân mọi tác vụ nặng, màn hình Liquid Retina XDR 16 inch màu chuẩn, loa 6 driver chất lượng cao. Pin cực bền. Hàng chính hãng, bảo hành 12 tháng.',
   '[{"label":"CPU","value":"Apple M3 Pro (12 nhân CPU, 18 nhân GPU)"},{"label":"RAM","value":"18GB Unified Memory"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"GPU 18 nhân"},{"label":"Màn hình","value":"16.2\" Liquid Retina XDR 120Hz"},{"label":"Pin","value":"Lên đến 22 giờ"},{"label":"Bảo hành","value":"12 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?fm=webp&q=80&w=800',
   13, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-041', 'ASUS Vivobook S 14 OLED Ultra 5', 'asus-vivobook-s-14-oled-ultra-5', 'cat-laptop', 'ASUS',
   18990000.00, 21990000.00, 'Vivobook S 14 OLED: Core Ultra 5, màn OLED, sinh viên giá tốt',
   'ASUS Vivobook S 14 OLED từ ASUS là laptop sinh viên giá tốt với màn hình OLED đẹp hiếm thấy ở tầm giá. Chip Intel Core Ultra 5 đủ cho học tập, văn phòng và giải trí. Thiết kế trẻ trung, nhiều màu, pin ổn. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core Ultra 5 125H"},{"label":"RAM","value":"16GB LPDDR5"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"Intel Arc Graphics"},{"label":"Màn hình","value":"14\" OLED FHD+ 120Hz"},{"label":"Pin","value":"75Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1498050108023-c5249f4df085?fm=webp&q=80&w=800',
   38, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-042', 'Lenovo LOQ 15 i5 RTX 4050', 'lenovo-loq-15-i5-rtx-4050', 'cat-laptop', 'Lenovo',
   19990000.00, 22990000.00, 'Lenovo LOQ 15: i5-12450HX, RTX 4050, gaming phổ thông',
   'Lenovo LOQ 15 từ Lenovo là laptop gaming phổ thông giá hợp lý, phù hợp game thủ mới và sinh viên. CPU Intel i5 và RTX 4050 chơi tốt các tựa game phổ biến. Tản nhiệt ổn định, bàn phím có đèn. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core i5-12450HX (8 nhân)"},{"label":"RAM","value":"16GB DDR5"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"NVIDIA RTX 4050 6GB"},{"label":"Màn hình","value":"15.6\" FHD 144Hz"},{"label":"Pin","value":"60Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1599658880436-c61792e70672?fm=webp&q=80&w=800',
   29, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-043', 'Dell XPS 14 9440 Ultra 7 RTX 4050', 'dell-xps-14-9440-ultra-7-rtx-4050', 'cat-laptop', 'Dell',
   46990000.00, NULL, 'XPS 14 mới: Core Ultra 7, RTX 4050, thiết kế tối giản cao cấp',
   'Dell XPS 14 từ Dell là ultrabook cao cấp thế hệ mới với thiết kế tối giản, bàn phím zero-lattice và touchpad ẩn. Chip Intel Core Ultra kèm RTX 4050 đủ cho sáng tạo nhẹ và đa nhiệm. Màn hình InfinityEdge tuyệt đẹp. Hàng chính hãng, bảo hành 12 tháng.',
   '[{"label":"CPU","value":"Intel Core Ultra 7 155H"},{"label":"RAM","value":"16GB LPDDR5X"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"NVIDIA RTX 4050 6GB"},{"label":"Màn hình","value":"14.5\" 3.2K OLED cảm ứng"},{"label":"Pin","value":"69.5Wh"},{"label":"Bảo hành","value":"12 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1588702547919-26089e690ecc?fm=webp&q=80&w=800',
   11, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-044', 'Acer Aspire 7 i5 RTX 2050', 'acer-aspire-7-i5-rtx-2050', 'cat-laptop', 'Acer',
   16990000.00, 18990000.00, 'Aspire 7: i5-13420H, RTX 2050, đa năng giá rẻ cho sinh viên',
   'Acer Aspire 7 từ Acer là laptop đa năng giá rẻ phù hợp sinh viên cần máy vừa học vừa giải trí nhẹ. CPU i5 và card RTX 2050 đủ cho lập trình, đồ họa cơ bản và game nhẹ. Màn hình FHD, thiết kế gọn. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core i5-13420H (8 nhân)"},{"label":"RAM","value":"16GB DDR4"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"NVIDIA RTX 2050 4GB"},{"label":"Màn hình","value":"15.6\" FHD IPS"},{"label":"Pin","value":"50Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1610465299993-e6675c9f9efa?fm=webp&q=80&w=800',
   34, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-045', 'HP EliteBook 840 G11 Ultra 5', 'hp-elitebook-840-g11-ultra-5', 'cat-laptop', 'HP',
   27990000.00, 30990000.00, 'EliteBook 840 G11: Core Ultra 5, laptop doanh nghiệp bảo mật cao',
   'HP EliteBook 840 G11 từ HP là laptop doanh nghiệp cao cấp với bảo mật Wolf Security, webcam 5MP và micro khử ồn AI cho họp online. Chip Intel Core Ultra tiết kiệm điện, vỏ nhôm bền đẹp. Phù hợp doanh nghiệp và quản lý. Hàng chính hãng, bảo hành 36 tháng.',
   '[{"label":"CPU","value":"Intel Core Ultra 5 125U"},{"label":"RAM","value":"16GB DDR5"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"Intel Graphics tích hợp"},{"label":"Màn hình","value":"14\" WUXGA chống chói"},{"label":"Pin","value":"56Wh, lên đến 16 giờ"},{"label":"Bảo hành","value":"36 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?fm=webp&q=80&w=800',
   20, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-046', 'ASUS ROG Flow Z13 Ultra 9 RTX 4060', 'asus-rog-flow-z13-ultra-9-rtx-4060', 'cat-laptop', 'ASUS',
   49990000.00, 54990000.00, 'ROG Flow Z13: tablet gaming 2-in-1, Core Ultra 9, RTX 4060',
   'ASUS ROG Flow Z13 từ ASUS là máy tính bảng gaming 2-in-1 độc đáo, mỏng nhẹ nhưng cấu hình mạnh với RTX 4060. Có thể tháo bàn phím dùng như tablet, hỗ trợ bút cảm ứng. Phù hợp game thủ và người sáng tạo cần tính di động cao. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core Ultra 9 185H"},{"label":"RAM","value":"32GB LPDDR5X"},{"label":"Ổ cứng","value":"1TB SSD"},{"label":"Card đồ họa","value":"NVIDIA RTX 4060 8GB"},{"label":"Màn hình","value":"13.4\" QHD+ 180Hz cảm ứng"},{"label":"Pin","value":"56Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1593642634367-d91a135587b5?fm=webp&q=80&w=800',
   8, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-047', 'Lenovo Yoga Pro 9i 16 Ultra 9 RTX 4060', 'lenovo-yoga-pro-9i-16-ultra-9-rtx-4060', 'cat-laptop', 'Lenovo',
   51990000.00, 56990000.00, 'Yoga Pro 9i 16: Core Ultra 9, RTX 4060, màn mini-LED 3.2K cho sáng tạo',
   'Lenovo Yoga Pro 9i từ Lenovo là laptop sáng tạo cao cấp với màn hình mini-LED 3.2K rực rỡ chuẩn màu. Chip Intel Core Ultra 9 và RTX 4060 mạnh mẽ cho dựng phim, đồ họa 3D. Loa Bowers & Wilkins, thiết kế kim loại sang trọng. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core Ultra 9 185H"},{"label":"RAM","value":"32GB LPDDR5X"},{"label":"Ổ cứng","value":"1TB SSD"},{"label":"Card đồ họa","value":"NVIDIA RTX 4060 8GB"},{"label":"Màn hình","value":"16\" mini-LED 3.2K 165Hz"},{"label":"Pin","value":"84Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1593305841991-05c297ba4575?fm=webp&q=80&w=800',
   10, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-048', 'MSI Cyborg 15 i7 RTX 4060', 'msi-cyborg-15-i7-rtx-4060', 'cat-laptop', 'MSI',
   24990000.00, 27990000.00, 'MSI Cyborg 15: i7-13620H, RTX 4060, gaming thiết kế trong suốt',
   'MSI Cyborg 15 từ MSI là laptop gaming tầm trung với thiết kế trong suốt độc đáo, trẻ trung. CPU i7 và RTX 4060 chiến tốt đa số game. Mỏng nhẹ so với laptop gaming, dễ mang đi. Phù hợp game thủ trẻ. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core i7-13620H (10 nhân)"},{"label":"RAM","value":"16GB DDR5"},{"label":"Ổ cứng","value":"512GB SSD"},{"label":"Card đồ họa","value":"NVIDIA RTX 4060 8GB"},{"label":"Màn hình","value":"15.6\" FHD 144Hz"},{"label":"Pin","value":"53.5Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1542393545-10f5cde2c810?fm=webp&q=80&w=800',
   0, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-049', 'Acer Chromebook Plus 515 i3', 'acer-chromebook-plus-515-i3', 'cat-laptop', 'Acer',
   8990000.00, 10990000.00, 'Chromebook Plus 515: i3, ChromeOS, học tập online giá rẻ',
   'Acer Chromebook Plus 515 từ Acer là laptop ChromeOS giá rẻ lý tưởng cho học sinh, học online và lướt web. Khởi động nhanh, pin cực bền cả ngày, nhẹ nhàng dễ mang. Tích hợp các ứng dụng Google và AI. Hàng chính hãng, bảo hành 12 tháng.',
   '[{"label":"CPU","value":"Intel Core i3-1215U (6 nhân)"},{"label":"RAM","value":"8GB LPDDR5"},{"label":"Ổ cứng","value":"128GB UFS"},{"label":"Card đồ họa","value":"Intel UHD Graphics"},{"label":"Màn hình","value":"15.6\" FHD IPS"},{"label":"Pin","value":"Lên đến 10 giờ"},{"label":"Hệ điều hành","value":"ChromeOS"}]',
   'https://images.unsplash.com/photo-1593642532744-d377ab507dc8?fm=webp&q=80&w=800',
   5, 'ACTIVE', FALSE, NOW(), NOW()),

  ('prod-lap-050', 'Gigabyte AORUS 16X i7 RTX 4070', 'gigabyte-aorus-16x-i7-rtx-4070', 'cat-laptop', 'Gigabyte',
   39990000.00, 43990000.00, 'AORUS 16X: i7-14650HX, RTX 4070, màn 16" 165Hz gaming hiệu năng cao',
   'Gigabyte AORUS 16X từ Gigabyte là laptop gaming hiệu năng cao giá cạnh tranh, CPU i7 thế hệ 14 và RTX 4070 mạnh mẽ. Tản nhiệt WINDFORCE Infinity cho hiệu suất ổn định, màn hình 16 inch 165Hz mượt. Lựa chọn tốt cho game thủ nghiêm túc. Hàng chính hãng, bảo hành 24 tháng.',
   '[{"label":"CPU","value":"Intel Core i7-14650HX (16 nhân)"},{"label":"RAM","value":"16GB DDR5"},{"label":"Ổ cứng","value":"1TB SSD PCIe 4.0"},{"label":"Card đồ họa","value":"NVIDIA RTX 4070 8GB"},{"label":"Màn hình","value":"16\" WUXGA 165Hz"},{"label":"Pin","value":"99Wh"},{"label":"Bảo hành","value":"24 tháng chính hãng"}]',
   'https://images.unsplash.com/photo-1603302576837-37561b2e2302?fm=webp&q=80&w=800',
   15, 'ACTIVE', FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Recompute KHÔNG cần ở đây: 30 laptop mới chưa có review nên review_count/avg_rating
-- mặc định 0 — đúng. sold_count để 0 (chưa bán). Nếu muốn sold_count giả lập, chạy lại
-- logic V103 nhưng để đơn giản giữ 0 cho hàng mới.
