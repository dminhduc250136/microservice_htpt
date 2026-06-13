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
| 1 | Vector / Semantic Search cho RAG | 🟡 TB | Khách | ✅ | ⭐⭐⭐ (XONG 2026-06-13) |
| 2 | Phân loại ý định (intent) trước RAG | 🟢 Dễ | Khách | ✅ | ⭐⭐ (XONG 2026-06-13) |
| 3 | Tóm tắt review bằng AI | 🟢 Dễ | Khách | ✅ | ⭐⭐ (XONG 2026-06-13) |
| 4 | Gợi ý sản phẩm thông minh (ranking) | 🟢 Dễ | Khách | ⬜ | ⭐⭐ |
| 5 | Dự đoán doanh thu/nhu cầu (DSS admin) | 🟡 TB | Admin | ⬜ | ⭐⭐ |
| 6 | AI Insight + khuyến nghị (DSS admin) | 🟡 TB | Admin | ⬜ | ⭐⭐ |
| 7 | Collaborative Filtering ("mua X cũng mua Y") | 🔴 Khó | Khách | ⬜ | ⭐ |
| 8 | Theo dõi hành vi user (view/wishlist) | 🟡 TB | Hạ tầng | ⬜ | ⭐ (nền cho #7) |

> Nhóm 04 có: #1 (vector search) + #2 (intent) + #5/#6 (DSS). Làm các mục này
> để "ngang tầm" báo cáo nhóm 04.

---

## CHI TIẾT TỪNG CHỨC NĂNG

### 1. Vector / Semantic Search cho RAG ⭐⭐⭐ ✅ HOÀN THÀNH (2026-06-13)
> Plan + state riêng: [PLAN-vector-search.md](PLAN-vector-search.md), [STATE-vector-search.md](STATE-vector-search.md)
- **Mục tiêu**: "laptop pin trâu cho lập trình" → tìm máy RAM/pin cao dù tên không chứa từ đó. ✅ đạt.
- **Đã làm**: pgvector image + cột `vector(768)` + index HNSW + `gemini-embedding-001`
  (768d, L2-normalize) + endpoint `POST /products/vector-search` + backfill 131/131 SP.
- **Đối tượng**: khách (chatbot). **Đã verify chat stream thật trên VM**.

### 2. Phân loại ý định (Intent classification) ⭐⭐ ✅ HOÀN THÀNH (2026-06-13)
> Design: [DESIGN-dot-2.md](DESIGN-dot-2.md) · PR #47
- **Đã làm**: `lib/chat/intent.ts` 2 tầng (rule + Gemini flash-lite 1 từ), fallback PRODUCT.
  Chỉ PRODUCT mới chạy vector search. Verify VM: "xin chào" → CHITCHAT (không search),
  "laptop gaming" → PRODUCT (search + gợi ý).
- **Đối tượng**: khách (chatbot). Nhóm 04 có bước này.

### 3. Tóm tắt review bằng AI ⭐⭐ ✅ HOÀN THÀNH (2026-06-13)
> Design: [DESIGN-dot-2.md](DESIGN-dot-2.md) · PR #48 + hotfix #49
- **Đã làm**: route `GET /api/chat/review-summary` (embed frontend) + Gemini tóm tắt JSON
  + cache TTL 24h. Panel "✨ Tóm tắt từ AI" trên trang SP, tự ẩn khi < 3 review/lỗi.
- **Lỗi đã sửa (#49)**: gemini-2.5 "thinking" cắt JSON → `thinkingBudget:0`; trả mảng → `responseSchema` object.
- **Đối tượng**: khách. Verify VM: SP 6 review → panel đầy đủ; SP 0 review → ẩn.

### 4. Gợi ý sản phẩm thông minh ⭐⭐
- **Mục tiêu**: "Sản phẩm liên quan" rank theo score (soldCount + rating + còn hàng + giảm giá), không chỉ cùng category.
- **Cần**: endpoint `/products/related/{id}` với ranking. Data đã có.
- **Đối tượng**: khách.
- **Trạng thái**: ⬜.

### 5. Dự đoán doanh thu/nhu cầu (DSS admin) ⭐⭐ — ĐỢT 3 (design xong)
> Design: [DESIGN-dot-3.md](DESIGN-dot-3.md). Gộp với #6 vào 1 route/panel.
- **Mục tiêu**: dashboard admin hiện "Dự báo doanh thu (AI)" + xu hướng, từ data orders.
- **Cần**: tái dùng `revenueByDay` (đã có) → Gemini phân tích/dự báo. Cache 1h.
- **Đối tượng**: admin. Data orders đã đủ.
- **Trạng thái**: ⬜ (đã có design, chờ làm).

### 6. AI Insight + khuyến nghị (DSS admin) ⭐⭐ — ĐỢT 3 (design xong)
> Design: [DESIGN-dot-3.md](DESIGN-dot-3.md). Gộp chung 1 lần gọi Gemini với #5.
- **Mục tiêu**: panel "Insight": SP doanh số bất thường, nhóm bán chậm → đề xuất hành động.
- **Cần**: cùng route #5 → Gemini trả luôn insights[] + recommendations[].
- **Đối tượng**: admin. Nhóm 04 có bước "sinh khuyến nghị".
- **Trạng thái**: ⬜ (đã có design, chờ làm).

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
| **Đợt 2** | #2 Intent + #3 Review summary | ✅ XONG 2026-06-13. → [DESIGN-dot-2.md](DESIGN-dot-2.md). |
| **Đợt 3** | #5 + #6 DSS admin | Mảng "hỗ trợ ra quyết định" của nhóm 04. **Design xong** → [DESIGN-dot-3.md](DESIGN-dot-3.md). |
| **Đợt 4** | #4 Gợi ý SP thông minh | Nhanh, bổ sung UX. |
| **Đợt 5** (tùy chọn) | #8 → #7 Behavior + CF | Phức tạp, cần data hành vi trước. Làm nếu còn thời gian. |

---

## NHẬT KÝ TIẾN ĐỘ
- **2026-06-13 — Đợt 1 (#1 Vector search) HOÀN THÀNH.** Semantic search chạy thật
  trên VM: 131/131 SP có embedding (`gemini-embedding-001`, 768d), chat stream test
  end-to-end OK ("pin trâu lập trình" → Acer Swift OLED pin 18h). Có fallback keyword.
  Lỗi đã sửa: compile JavaDoc `*/`, model 404, dim 3072→768, backfill phân trang.
- **2026-06-13 — Đợt 2 (#2 Intent + #3 Review summary) HOÀN THÀNH.** Cả 2 verify thật
  trên VM. #2: phân loại ý định, chỉ PRODUCT mới RAG. #3: panel tóm tắt review AI, tự ẩn
  khi thiếu review. Hotfix #49 (thinking budget + responseSchema).
- **Tiếp theo — Đợt 3**: #5 Dự đoán doanh thu + #6 AI Insight (DSS admin). Design xong:
  [DESIGN-dot-3.md](DESIGN-dot-3.md) — gộp #5+#6 vào 1 panel/route, tái dùng
  `revenueByDay` có sẵn, AI Gemini phân tích (thinkingBudget:0). KHÔNG đụng DB.

## GHI CHÚ
- Tất cả dùng **Gemini free tier** (1500 req/ngày) — đủ cho học tập/demo.
- Mỗi chức năng nên tách PR riêng + có fallback (không phá tính năng đang chạy).
- **Gemini 2.5 bật "thinking" mặc định** → với JSON/output ngắn phải `thinkingConfig:{thinkingBudget:0}`
  kẻo output bị cắt (finishReason MAX_TOKENS). Áp dụng cho mọi lần dùng 2.5 sau (Đợt 3 DSS).
- Verify trên Postgres/VM thật trước khi commit (bài học vụ bytea, category filter).
