# STATE: Roadmap nâng cấp AI — Tất cả chức năng cần làm

> File trạng thái tổng thể các chức năng AI dự kiến cho dự án e-commerce.
> Ký hiệu: ⬜ chưa làm · 🔄 đang làm · ✅ xong · ⏸️ tạm dừng · ❌ bỏ
> Hướng tham chiếu: **Nhóm 04 (BlueSky)** — RAG chatbot + DSS admin.

---

## Hiện trạng nền tảng (đã có)
- ✅ Chat tư vấn RAG dùng **Google Gemini** (`gemini-2.5-flash`) — đã chạy trên VM.
- ✅ Card link sản phẩm trong chat (bấm → trang chi tiết).
- ✅ Search tách từ + ranking (keyword, chưa semantic).
- ✅ Data sẵn có: orders, products (soldCount/rating/description/specs), reviews, 131 SP.
- ✅ Hạ tầng: PostgreSQL 16, RabbitMQ, Gemini API (free tier), gateway.

---

## TỔNG QUAN CÁC CHỨC NĂNG (8 hạng mục)

| # | Chức năng | Tier | Đối tượng | Trạng thái | Ưu tiên |
|---|-----------|------|-----------|-----------|---------|
| 1 | Vector / Semantic Search cho RAG | 🟡 TB | Khách | ⬜ | ⭐⭐⭐ (đang chọn làm) |
| 2 | Phân loại ý định (intent) trước RAG | 🟢 Dễ | Khách | ⬜ | ⭐⭐ |
| 3 | Tóm tắt review bằng AI | 🟢 Dễ | Khách | ⬜ | ⭐⭐ |
| 4 | Gợi ý sản phẩm thông minh (ranking) | 🟢 Dễ | Khách | ⬜ | ⭐⭐ |
| 5 | Dự đoán doanh thu/nhu cầu (DSS admin) | 🟡 TB | Admin | ⬜ | ⭐⭐ |
| 6 | AI Insight + khuyến nghị (DSS admin) | 🟡 TB | Admin | ⬜ | ⭐⭐ |
| 7 | Collaborative Filtering ("mua X cũng mua Y") | 🔴 Khó | Khách | ⬜ | ⭐ |
| 8 | Theo dõi hành vi user (view/wishlist) | 🟡 TB | Hạ tầng | ⬜ | ⭐ (nền cho #7) |

> Nhóm 04 có: #1 (vector search) + #2 (intent) + #5/#6 (DSS). Làm các mục này
> để "ngang tầm" báo cáo nhóm 04.

---

## CHI TIẾT TỪNG CHỨC NĂNG

### 1. Vector / Semantic Search cho RAG ⭐⭐⭐ (ĐANG CHỌN LÀM)
> Plan + state riêng: [PLAN-vector-search.md](PLAN-vector-search.md), [STATE-vector-search.md](STATE-vector-search.md)
- **Mục tiêu**: "laptop pin trâu cho lập trình" → tìm máy RAM/pin cao dù tên không chứa từ đó.
- **Cần**: pgvector (đổi image) + Gemini embedding + cột vector(768) + endpoint + backfill 131 SP.
- **Đối tượng**: khách (chatbot).
- **Trạng thái**: ⬜ (đã có plan chi tiết, chờ duyệt).

### 2. Phân loại ý định (Intent classification) ⭐⭐
- **Mục tiêu**: trước khi RAG, phân loại câu hỏi: "hỏi sản phẩm" / "trò chuyện" / "hỏi đơn hàng" / "chính sách". Hỏi sản phẩm → RAG; trò chuyện → trả lời thẳng (đỡ tốn search).
- **Cần**: 1 bước gọi Gemini (hoặc rule đơn giản) phân loại trước trong `route.ts`.
- **Đối tượng**: khách (chatbot). Nhóm 04 có bước này.
- **Trạng thái**: ⬜.

### 3. Tóm tắt review bằng AI ⭐⭐
- **Mục tiêu**: trang chi tiết SP hiện "Tóm tắt đánh giá: điểm mạnh/yếu" do AI tổng hợp từ review.
- **Cần**: endpoint `/products/{id}/review-summary` → Gemini tóm tắt review → cache 24h.
- **Đối tượng**: khách. Data review đã đủ.
- **Trạng thái**: ⬜.

### 4. Gợi ý sản phẩm thông minh ⭐⭐
- **Mục tiêu**: "Sản phẩm liên quan" rank theo score (soldCount + rating + còn hàng + giảm giá), không chỉ cùng category.
- **Cần**: endpoint `/products/related/{id}` với ranking. Data đã có.
- **Đối tượng**: khách.
- **Trạng thái**: ⬜.

### 5. Dự đoán doanh thu/nhu cầu (DSS admin) ⭐⭐
- **Mục tiêu**: dashboard admin hiện "Dự đoán doanh thu tuần tới" + xu hướng, từ data orders.
- **Cần**: endpoint admin query revenue 90 ngày → Gemini phân tích/dự báo → chart. Cache 1h.
- **Đối tượng**: admin. Data orders đã đủ (OrderRepository có aggregate revenue).
- **Trạng thái**: ⬜.

### 6. AI Insight + khuyến nghị (DSS admin) ⭐⭐
- **Mục tiêu**: panel "Insight": "SP X doanh số bất thường", "Danh mục Y bán chậm → đề xuất giảm giá/quảng cáo".
- **Cần**: batch job phân tích trends → Gemini sinh insight. (Có thể gộp với #5.)
- **Đối tượng**: admin. Nhóm 04 có bước "sinh khuyến nghị".
- **Trạng thái**: ⬜.

### 7. Collaborative Filtering ⭐
- **Mục tiêu**: "Khách mua X cũng mua Y" — gợi ý cá nhân hóa từ lịch sử mua.
- **Cần**: job tính ma trận đồng-mua từ order_items + cache + endpoint. Phức tạp.
- **Đối tượng**: khách. Data order_items đã đủ.
- **Trạng thái**: ⬜.

### 8. Theo dõi hành vi user (view/wishlist) ⭐
- **Mục tiêu**: lưu lịch sử xem SP, wishlist → nền cho gợi ý cá nhân hóa (#7).
- **Cần**: bảng mới `user_product_views`, `user_favorites` + API tracking + frontend track.
- **Đối tượng**: hạ tầng (chưa có data hành vi). Hiện CHƯA có bảng này.
- **Trạng thái**: ⬜.

---

## THỨ TỰ TRIỂN KHAI ĐỀ XUẤT

| Đợt | Chức năng | Lý do |
|-----|-----------|-------|
| **Đợt 1** | #1 Vector search | Cốt lõi nhóm 04, ấn tượng nhất, fix điểm yếu search. ĐANG LÀM. |
| **Đợt 2** | #2 Intent + #3 Review summary | Dễ, customer-facing, hoàn thiện chatbot. |
| **Đợt 3** | #5 + #6 DSS admin | Mảng "hỗ trợ ra quyết định" của nhóm 04. |
| **Đợt 4** | #4 Gợi ý SP thông minh | Nhanh, bổ sung UX. |
| **Đợt 5** (tùy chọn) | #8 → #7 Behavior + CF | Phức tạp, cần data hành vi trước. Làm nếu còn thời gian. |

---

## NHẬT KÝ TIẾN ĐỘ
- (chưa bắt đầu — đang ở bước lập kế hoạch cho #1 Vector search)

## GHI CHÚ
- Tất cả dùng **Gemini free tier** (1500 req/ngày) — đủ cho học tập/demo.
- Mỗi chức năng nên tách PR riêng + có fallback (không phá tính năng đang chạy).
- Verify trên Postgres/VM thật trước khi commit (bài học vụ bytea, category filter).
