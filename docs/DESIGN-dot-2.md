# DESIGN — Đợt 2: Intent Classification + Tóm tắt Review

> Hai chức năng customer-facing, **dễ**, hoàn thiện trải nghiệm chatbot + trang SP.
> Cùng hướng nhóm 04 (#2 intent). Nguyên tắc: **luôn có fallback**, không phá tính
> năng đang chạy (bài học Đợt 1).

---

## #2 — Intent Classification (phân loại ý định trước RAG)

### Vấn đề hiện tại
Mọi tin nhắn chat đều chạy `searchProductsForContext` ([route.ts](../sources/frontend/src/app/api/chat/stream/route.ts) bước 7) → embed query + vector search, **kể cả khi user chỉ chào hỏi** ("xin chào", "cảm ơn", "shop có ship không"). Lãng phí: 1 lần embed + 1 query DB cho câu không cần sản phẩm.

### Mục tiêu
Trước RAG, phân loại nhanh câu hỏi → chỉ chạy vector search khi THỰC SỰ hỏi sản phẩm.

| Intent | Xử lý |
|--------|-------|
| `PRODUCT` (hỏi/tư vấn sản phẩm) | → vector search (như hiện tại) |
| `CHITCHAT` (chào, cảm ơn, hỏi linh tinh) | → bỏ qua search, trả lời thẳng |
| `POLICY` (ship, đổi trả, bảo hành, thanh toán) | → bỏ search, prompt hướng chính sách |
| `ORDER` (hỏi đơn hàng của tôi) | → bỏ search, gợi ý vào trang đơn hàng |

### Thiết kế — 2 tầng (rẻ trước, AI sau)

**Tầng 1 — rule nhanh (0 token, 0 độ trễ):** regex/keyword cho case rõ ràng.
- CHITCHAT: chỉ chứa "chào/hi/hello/cảm ơn/thanks/ok/oke/tạm biệt" và ngắn (< 4 từ).
- POLICY: chứa "ship/giao hàng/đổi trả/bảo hành/hoàn tiền/thanh toán/cod".
- ORDER: chứa "đơn hàng của tôi/đơn của tôi/tra cứu đơn/mã đơn".
- Còn lại → để tầng 2.

**Tầng 2 — Gemini phân loại (chỉ khi tầng 1 không chắc):**
- 1 lần gọi `gemini-2.5-flash` (hoặc flash-lite) với prompt ép trả về **1 từ**: `PRODUCT|CHITCHAT|POLICY|ORDER`.
- `maxOutputTokens` nhỏ (~5), nhiệt độ 0.
- **Fallback**: nếu gọi lỗi / trả không khớp → mặc định `PRODUCT` (an toàn: vẫn chạy search như cũ, không mất tính năng).

> Cân nhắc: có thể bỏ tầng 2 lúc đầu, chỉ rule (tầng 1) → mặc định PRODUCT. Đơn giản,
> 0 token thêm, vẫn cải thiện ~80% case rõ ràng. Bật tầng 2 nếu thấy cần độ chính xác.

### File đụng
- **Mới** `lib/chat/intent.ts`: `classifyIntent(message): Promise<Intent>` (rule + optional Gemini).
- **Sửa** `route.ts` bước 7:
  ```ts
  const intent = await classifyIntent(message);
  const products = intent === 'PRODUCT' ? await searchProductsForContext(message) : [];
  ```
- **Sửa** system prompt: thêm hướng dẫn khi `<product_context>` rỗng + có intent
  (vd POLICY → trả lời chính sách; ORDER → mời vào trang đơn hàng).
  Có thể truyền intent vào userBlock: `<intent>POLICY</intent>`.

### Verify
- "xin chào" → intent CHITCHAT, KHÔNG có log vector search, AI chào lại.
- "laptop gaming" → PRODUCT, có search, ra sản phẩm.
- "shop ship mấy ngày" → POLICY, trả lời chính sách giao hàng.
- Gemini tầng 2 lỗi → mặc định PRODUCT (chat vẫn chạy).

### Lợi ích báo cáo
"Pipeline RAG có bước phân loại ý định" — đúng kiến trúc nhóm 04, tiết kiệm token/latency.

---

## #3 — Tóm tắt Review bằng AI (trang chi tiết SP)

### Mục tiêu
Trang chi tiết SP hiện panel **"Tóm tắt đánh giá từ AI"**: 2-3 câu điểm mạnh + điểm cần lưu ý, tổng hợp từ các review thật. Giúp khách đọc nhanh thay vì lướt hết review.

### Dữ liệu sẵn có
- `ReviewEntity`: `rating` (1-5), `content`, `reviewerName`, `createdAt` — [ReviewController](../sources/backend/product-service/src/main/java/com/ptit/htpt/productservice/web/ReviewController.java) `GET /products/{productId}/reviews`.
- Đã có `avgRating` + `reviewCount` trên product.

### Kiến trúc — embed ở FRONTEND (như chat, backend không có Gemini key)
```
Trang SP (client) → GET /api/chat/review-summary?productId=xxx   [Next.js route, server-side]
  → fetch reviews (gateway, public GET)
  → nếu < N review (vd 3): trả "chưa đủ đánh giá để tóm tắt" (không gọi AI)
  → Gemini tóm tắt (flash) → { strengths[], cautions[], oneLine }
  → CACHE theo productId (in-memory TTL 24h hoặc bảng review_summary)
  → trả JSON cho client render panel
```

### Quyết định cache (chọn 1)
| Phương án | Ưu | Nhược |
|-----------|----|----|
| **A. In-memory Map TTL 24h** (trong Next route) | đơn giản, 0 schema | mất khi restart container; mỗi instance riêng cache |
| **B. Bảng `review_summary`** (product-service) | bền, share | thêm migration + endpoint admin lưu |

> Đề xuất: **A trước** (đủ cho demo/học tập, 131 SP), nâng B nếu cần bền.
> Có thể invalidate khi `reviewCount` đổi (truyền reviewCount vào cache key).

### File đụng (phương án A)
- **Mới** `lib/chat/review-summary.ts`: `summarizeReviews(productId): Promise<Summary | null>`
  (fetch reviews + Gemini + cache Map). Trả null nếu < N review hoặc lỗi.
- **Mới** route `app/api/chat/review-summary/route.ts`: `GET ?productId=` → gọi hàm trên.
  (Public — không cần JWT; chỉ đọc review công khai.)
- **Sửa** trang `app/products/[slug]/page.tsx`: thêm panel "Tóm tắt từ AI" — fetch route,
  render strengths/cautions; ẩn panel nếu null (chưa đủ review).

### Prompt (rút gọn)
> "Dưới đây là các đánh giá (kèm sao) cho sản phẩm. Tóm tắt khách quan bằng tiếng Việt:
> 2-3 điểm khách khen, 1-2 điểm cần lưu ý. KHÔNG bịa thông tin ngoài review. Trả JSON
> `{oneLine, strengths:[], cautions:[]}`." (dùng `responseMimeType: application/json`).

### An toàn (rút kinh nghiệm)
- `responseMimeType: 'application/json'` + parse có try/catch → lỗi parse trả null (ẩn panel).
- escape nội dung review (chống prompt-injection qua review như đã làm ở product context).
- < N review → KHÔNG gọi AI (tiết kiệm quota + tránh tóm tắt vô nghĩa).

### Verify
- SP nhiều review → panel hiện điểm mạnh/yếu hợp lý, khớp nội dung review thật.
- SP < 3 review → panel ẩn.
- Gọi 2 lần cùng SP → lần 2 lấy cache (nhanh, không tốn token).
- Gemini lỗi → panel ẩn, trang SP vẫn render bình thường.

---

## THỨ TỰ LÀM ĐỢT 2
| # | Việc | PR |
|---|------|----|
| 1 | #2 Intent (tầng 1 rule + optional tầng 2 Gemini) | PR-A |
| 2 | #3 Review summary (route + lib + panel UI) | PR-B |

> 2 PR độc lập, mỗi cái có fallback riêng. Làm #2 trước (gọn, đụng đúng route chat),
> rồi #3 (thêm UI). Cùng dùng Gemini free tier đã có sẵn key trên VM.

## GHI CHÚ CHUNG
- Không đụng DB (cả 2 ở frontend) → KHÔNG rủi ro như Đợt 1 (đổi image). Deploy nhẹ.
- Quota Gemini free 1500/ngày: intent + summary đều cache/rule-first → dư sức.
- Sau Đợt 2: Đợt 3 = DSS admin (#5/#6) — sẽ có design riêng (đụng order data + chart).
