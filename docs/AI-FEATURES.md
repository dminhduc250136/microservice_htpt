# Tài liệu các tính năng AI đã xây dựng

> Tổng hợp toàn bộ phần ứng dụng AI + DSS cho hệ thống e-commerce microservices.
> Hướng tham chiếu: **Nhóm 04 (BlueSky)** — RAG chatbot + DSS (hệ hỗ trợ ra quyết định).
> Cập nhật: 2026-06-14 (bổ sung CF #7, RFM #9, nâng cấp dashboard DSS).

---

## 1. Tổng quan

Hệ thống tích hợp **Google Gemini** (free tier, AI Studio) làm lõi AI, phục vụ 2 nhóm
đối tượng:

- **Khách hàng**: chatbot tư vấn (RAG semantic), tóm tắt đánh giá, gợi ý sản phẩm
  (ranking + collaborative filtering "mua X cũng mua Y" / "gợi ý cho bạn").
- **Admin**: dashboard DSS — dự báo & phân tích doanh thu (AI), phân khúc khách RFM,
  KPI lọc theo thời gian, bấm card xem chi tiết.

Nguyên tắc xuyên suốt khi xây dựng:
1. **Luôn có fallback** — AI lỗi/hết quota thì tính năng vẫn chạy (không phá UX).
2. **Tái dùng dữ liệu/endpoint có sẵn** — AI là tầng phân tích, không xây lại hạ tầng.
3. **Verify trên VM thật** trước khi coi là xong.

### Bảng tổng kết

| # | Tính năng | Đối tượng | Trạng thái | Có gọi LLM? |
|---|-----------|-----------|-----------|-------------|
| 1 | Vector / Semantic Search (RAG) | Khách | ✅ | Có (embedding) |
| 2 | Phân loại ý định (Intent) | Khách | ✅ | Có (rule + LLM) |
| 3 | Tóm tắt review bằng AI | Khách | ✅ | Có |
| 4 | Gợi ý sản phẩm thông minh (ranking) | Khách | ✅ | Không (thuật toán) |
| 5 | Dự báo doanh thu (DSS) | Admin | ✅ | Có |
| 6 | AI Insight + khuyến nghị (DSS) | Admin | ✅ | Có (gộp với #5) |
| 7 | Collaborative Filtering ("mua X cũng mua Y") | Khách | ✅ | Không (SQL đồng-mua) |
| 8 | Theo dõi hành vi user (view/wishlist) | Hạ tầng | ⬜ chưa làm | — |
| 9 | Phân khúc khách hàng RFM (DSS) | Admin | ✅ | Không (thuật toán) |

→ **8/9 tính năng đã hoàn thành.** Bao trùm **trọn vẹn 3 mảng DSS của nhóm 04**:
phân tích AI (#6) + phân khúc khách (#9) · dự báo doanh thu (#5) · gợi ý sản phẩm (#4, #7).
Cộng thêm RAG semantic + intent + review summary mà báo cáo nhóm 04 chỉ mô tả.

> **Phần AI (gọi Gemini): #1, #2, #3, #5, #6.** Phần **thuật toán/dữ liệu (không gọi
> AI nhưng vẫn là DSS/gợi ý thông minh): #4 ranking, #7 CF, #9 RFM** — nhẹ, không tốn quota.

### Mô hình AI sử dụng

| Mục đích | Model | Ghi chú |
|----------|-------|---------|
| Embedding (vector search) | `gemini-embedding-001` | 768 chiều (ép từ 3072), L2-normalize |
| Chat / tóm tắt / insight | `gemini-flash-lite-latest` | alias "latest" — quota free dư dả |
| Phân loại intent | `gemini-flash-lite-latest` | trả 1 từ, thinking tắt |

> **Lưu ý quota**: model phiên bản cố định (vd `gemini-2.5-flash`) free tier chỉ
> ~20 request/ngày. Dùng alias `*-latest` để có quota dư cho demo.

---

## 2. Chi tiết từng tính năng

### #1 — Vector / Semantic Search cho RAG chatbot

**Mục tiêu**: chatbot hiểu **ý nghĩa** câu hỏi, không chỉ khớp từ khóa. Ví dụ
"laptop pin trâu cho lập trình" → tìm máy RAM/pin cao dù tên sản phẩm không chứa
các từ đó.

**Kiến trúc**:
```
User hỏi
 → [Frontend] embed câu hỏi (Gemini text-embedding, 768d, L2-normalize)
 → POST /api/products/vector-search { embedding, topK: 8 }
 → [product-service] SELECT ... ORDER BY embedding <=> :vec  (pgvector cosine)
 → top-8 SP gần nghĩa → đưa vào prompt → Gemini tư vấn
```

**Thành phần đã xây**:
- DB: extension `pgvector`, cột `products.embedding vector(768)`, index HNSW cosine
  (migration `V10`). Image postgres đổi sang `pgvector/pgvector:pg16`.
- Backend: `POST /products/vector-search` (public), `PATCH /admin/products/{id}/embedding`
  (backfill), native query cosine distance `<=>`.
- Frontend: `lib/chat/gemini-embed.ts` (embed query), `product-context.ts` ưu tiên
  vector search, **fallback keyword** nếu vector lỗi.
- Backfill: script embed 131/131 sản phẩm.

**Fallback**: vector lỗi / sản phẩm chưa có embedding → tự về keyword search cũ →
chat không bao giờ chết.

**Đã verify (VM)**: "laptop pin trâu cho lập trình" → Acer Swift Go OLED (pin 18h);
"laptop gaming RTX" → MSI/AORUS/Predator RTX; "tai nghe chống ồn" → Bose/Sony.

---

### #2 — Phân loại ý định (Intent classification)

**Mục tiêu**: trước khi chạy RAG (tốn embedding + truy vấn DB), phân loại câu hỏi →
chỉ câu hỏi sản phẩm mới tìm kiếm. Tiết kiệm tài nguyên cho câu xã giao/chính sách.

**4 loại ý định**:
| Intent | Xử lý |
|--------|-------|
| `PRODUCT` | → vector search (RAG) |
| `CHITCHAT` | chào hỏi/cảm ơn → trả lời thẳng |
| `POLICY` | ship/đổi trả/bảo hành → trả lời chính sách |
| `ORDER` | hỏi đơn hàng → mời vào "Đơn hàng của tôi" |

**Thiết kế 2 tầng** (`lib/chat/intent.ts`):
- **Tầng 1 — rule** (0 token): bắt nhanh các trường hợp rõ ràng bằng từ khóa.
- **Tầng 2 — Gemini**: phân loại 1 từ khi rule không chắc.
- **Fallback = PRODUCT**: lỗi/không rõ → vẫn chạy RAG như cũ.

System prompt được bổ sung hướng dẫn xử lý riêng cho từng intent.

**Đã verify (VM)**: "xin chào" → CHITCHAT (không tìm kiếm); "laptop gaming" →
PRODUCT (tìm kiếm + gợi ý).

---

### #3 — Tóm tắt đánh giá bằng AI

**Mục tiêu**: trang chi tiết sản phẩm hiển thị panel **"✨ Tóm tắt từ AI"** — tổng
hợp điểm mạnh/điểm cần lưu ý từ các review thật, giúp khách đọc nhanh.

**Kiến trúc** (embed ở frontend như chat — backend không có Gemini key):
```
Trang SP → GET /api/chat/review-summary?productId=xxx
  → fetch reviews → Gemini tóm tắt (JSON) → cache TTL 24h → render panel
```

**Output**: `{ oneLine, strengths[], cautions[] }`.

**Thành phần**:
- `lib/chat/review-summary.ts`: fetch review + Gemini + cache in-memory (key theo
  productId + reviewCount → review đổi thì tóm tắt lại).
- Route `GET /api/chat/review-summary` (public).
- `ReviewSummary.tsx`: panel client, **tự ẩn** khi < 3 review hoặc lỗi.

**An toàn**:
- < 3 review → KHÔNG gọi AI (ẩn panel, tiết kiệm quota).
- escape nội dung review (chống prompt-injection).
- `responseSchema` ép JSON object + `thinkingBudget:0` (tránh JSON bị cắt).

**Đã verify (VM)**: SP 6 review → panel đầy đủ (điểm mạnh: chất lượng/hiệu năng/thiết
kế; điểm lưu ý: giá cao/giao hàng); SP 0 review → ẩn panel.

---

### #4 — Gợi ý sản phẩm thông minh (ranking)

**Mục tiêu**: mục "Sản phẩm liên quan" cuối trang SP ưu tiên sản phẩm **đáng mua**
thay vì lấy đại sản phẩm cùng danh mục (mới nhất).

**Cách làm** (`lib/products/rank-related.ts`): lấy rộng (20 SP cùng category) rồi xếp
hạng, cắt 4 tốt nhất:
```
score = avgRating×2 + log10(soldCount+1) + (còn hàng ? 1.5 : 0) + (giảm giá ? 0.5 : 0)
```

> Đây là **thuật toán ranking thuần client-side** — KHÔNG gọi AI/Gemini → nhẹ,
> nhanh, không tốn quota. "Thông minh" theo nghĩa xếp hạng đa tiêu chí.
> Bổ trợ cho **#7 Collaborative Filtering** (gợi ý theo hành vi mua) ở cùng trang SP.

---

### #5 + #6 — DSS Admin: Dự báo doanh thu + AI Insight

**Mục tiêu**: dashboard admin có panel **"✨ Phân tích & Dự báo (AI)"** — AI đọc dữ
liệu bán hàng → dự báo xu hướng + nhận định + khuyến nghị hành động. Đây là mảng
"hỗ trợ ra quyết định" (DSS) của nhóm 04. Gộp #5 và #6 vào **1 panel / 1 lần gọi AI**.

**Kiến trúc** (tái dùng endpoint chart có sẵn — KHÔNG query backend mới):
```
Dashboard admin → GET /api/admin/insights?range=30d   (requireAdmin)
  → fetch revenue + top-products + status (đã có sẵn)
  → Gemini phân tích → { forecast, insights[], recommendations[] }
  → cache TTL 1h → render panel
```

**Output**:
- `forecast`: xu hướng (tăng/giảm/ổn định) + nhận định + ước tính doanh thu kỳ tới
  (ghi rõ "tham khảo").
- `insights[]`: 2-4 quan sát từ dữ liệu.
- `recommendations[]`: 1-3 đề xuất hành động.

**Thành phần**:
- `lib/admin/insights.ts`: fetch chart data + Gemini (JSON schema, thinking tắt) +
  cache 1h theo time window.
- Route `GET /api/admin/insights` — **requireAdmin** (dữ liệu doanh thu nhạy cảm).
- `InsightsPanel.tsx`: panel dashboard, đồng bộ với dropdown thời gian, tự ẩn khi
  thiếu dữ liệu (< 3 ngày có doanh thu) hoặc lỗi.

**Đã verify (VM)**: AI ra trend "ổn định", ước tính 350-400tr, và **tự phát hiện**
"32 đơn PENDING cao → rủi ro tồn đọng" + khuyến nghị xử lý đơn / tái lập chiến dịch
ngày doanh thu đột biến. Đúng tinh thần DSS.

> **Trigger thủ công**: panel AI KHÔNG tự gọi Gemini khi vào dashboard (tốn quota).
> Admin bấm nút **"Phân tích bằng AI"** mới gọi; kết quả nhớ trong phiên theo time window.

#### Nâng cấp dashboard kèm theo DSS
- **Bộ lọc thời gian tùy chỉnh**: dropdown thêm option "Tùy chỉnh" → 2 ô date from/to,
  áp dụng cho TẤT CẢ chart + KPI + panel AI.
- **KPI lọc theo thời gian + doanh số**: 6 thẻ KPI (Doanh thu / Đơn hàng / Giá trị đơn
  TB (AOV) / Khách mới / Đơn chờ / SP mới) đều đổi theo dropdown thời gian. Backend 3
  stats endpoint nhận `from`/`to`; order stats thêm revenue + AOV.
- **Bấm card xem chi tiết** (modal): bấm thẻ KPI hoặc nhóm RFM → popup danh sách/
  breakdown chi tiết (doanh thu theo trạng thái, danh sách đơn/khách/SP, thành viên RFM).

---

### #7 — Collaborative Filtering (gợi ý sản phẩm cá nhân hóa)

**Mục tiêu**: mục 7.6.6 nhóm 04 — gợi ý sản phẩm theo hành vi mua. 2 kiểu, tính từ
`order_items` (đồng-mua trong cùng đơn):

- **Item-based "Khách mua X cũng mua Y"** (trang chi tiết SP, public): SP thường được
  mua cùng SP đang xem.
- **User-based "Gợi ý cho bạn"** (trang chủ, khách đã login): SP đồng-mua với những
  SP khách từng mua, trừ SP đã có.

**Thành phần**:
- Backend (order-service): `coPurchasedWith` + `recommendForUser` (self-join order_items);
  `GET /orders/recommend/co-purchase/{id}` (public) + `/for-me` (X-User-Id).
- Frontend: `services/recommend.ts` (fetch + enrich product detail); 2 section tự ẩn nếu rỗng.

> **CF thuần SQL — KHÔNG gọi AI** → không tốn quota. Đã verify VM: laptop → đồng-mua
> tai nghe/chuột/bàn phím (hợp lý).

---

### #9 — Phân khúc khách hàng RFM (DSS admin)

**Mục tiêu**: mục 7.6.4 nhóm 04 — phân nhóm khách theo hành vi mua. Panel
**"👥 Phân khúc khách hàng (RFM)"** trên dashboard.

**RFM** = Recency (mua gần đây) / Frequency (số lần mua) / Monetary (chi tiêu). Mỗi
chiều chấm 1-5 điểm theo ngũ phân vị → gộp **6 nhóm** có tên + gợi ý hành động:
VIP · Trung thành · Khách mới/tiềm năng · Cần chăm sóc · Nguy cơ rời bỏ · Đã ngủ đông.

**Thành phần**: order-service `aggregateRfm()` + `CustomerSegmentService`;
endpoint `GET /admin/orders/charts/customer-segments`. Bấm nhóm → modal danh sách khách
+ R/F/M từng người.

> **Thuật toán RFM thuần — KHÔNG gọi AI.** Đã verify VM: VIP 4 khách (DT 1.33 tỷ),
> "ngủ đông" 4 khách (DT thấp) → phân khúc hợp lý.

---

## 3. Các tính năng chưa làm (tùy chọn)

| # | Tính năng | Lý do để lại |
|---|-----------|--------------|
| 8 | Theo dõi hành vi user (view/wishlist) | Hạ tầng; cần bảng mới + thu thập data trước. (CF #7 hiện dựa trên lịch sử MUA, chưa dùng view/wishlist.) |

---

## 4. Bài học kỹ thuật (đã đúc kết khi build)

1. **Quota Gemini free tier thấp** (~20 req/ngày cho model phiên bản cố định) → dùng
   alias `gemini-flash-lite-latest`.
2. **Gemini 2.5 bật "thinking" mặc định** → với output JSON/ngắn phải đặt
   `thinkingConfig: { thinkingBudget: 0 }`, nếu không output bị cắt giữa chừng
   (finishReason MAX_TOKENS).
3. **Structured output**: dùng `responseMimeType: application/json` + `responseSchema`
   để ép đúng cấu trúc (Gemini đôi khi bọc kết quả trong mảng).
4. **Embedding model** `gemini-embedding-001` mặc định 3072 chiều → ép
   `outputDimensionality: 768` + tự **L2-normalize** (model không tự normalize khi
   giảm chiều) để cosine distance chuẩn.
5. **Luôn fallback**: mọi tính năng AI đều có đường lui (keyword search, ẩn panel,
   intent mặc định PRODUCT) → AI lỗi/hết quota không phá hệ thống.

---

## 5. Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [STATE-ai-features.md](STATE-ai-features.md) | Roadmap + trạng thái tổng thể 8 tính năng |
| [PLAN-vector-search.md](PLAN-vector-search.md) | Kế hoạch kỹ thuật chi tiết #1 |
| [STATE-vector-search.md](STATE-vector-search.md) | Theo dõi tiến độ #1 |
| [DESIGN-dot-2.md](DESIGN-dot-2.md) | Thiết kế #2 Intent + #3 Review summary |
| [DESIGN-dot-3.md](DESIGN-dot-3.md) | Thiết kế #5/#6 DSS admin |
