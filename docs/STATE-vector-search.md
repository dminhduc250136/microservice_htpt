# STATE: Vector Search cho Chatbot RAG — Theo dõi tiến độ

> ✅ **HOÀN THÀNH 2026-06-13** — semantic search chạy thật trên VM (131/131 SP).
> Ký hiệu: ⬜ chưa làm · 🔄 đang làm · ✅ xong · ⏸️ tạm dừng · ❌ lỗi/bỏ
> Plan chi tiết: [PLAN-vector-search.md](PLAN-vector-search.md)

---

## Quyết định đã chốt
- Hướng: theo **Nhóm 04 (BlueSky)** — semantic vector search cho RAG.
- Embed query ở **frontend** (Gemini `text-embedding-004`, 768d); backend không có Gemini key.
- pgvector: đổi image `postgres:16-alpine` → `pgvector/pgvector:pg16` (giữ data volume).
- Backfill 131 SP: script frontend + endpoint admin.
- Cách làm: **lập kế hoạch trước** (đã có PLAN), chờ duyệt mới code.

## Hiện trạng đã verify (VM)
- ✅ postgres-product: PostgreSQL 16.14 alpine, PG_VERSION=16, **131 sản phẩm**.
- ✅ pgvector CHƯA có trong image hiện tại → phải đổi image.
- ✅ Gemini SDK `@google/genai@2.8.0` có `embedContent` (text-embedding-004).
- ✅ Gateway `/api/products/**` route sẵn tới product-service.
- ✅ Chat đã chạy Gemini ổn trên VM (đã verify trả lời tiếng Việt).

---

## CÔNG VIỆC CẦN LÀM (theo thứ tự — verify trước khi sang bước sau)

### Giai đoạn 0 — Chuẩn bị / an toàn
| # | Việc | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 0.1 | Backup data postgres-product (pg_dump products DB ra file) | ⬜ | Phòng lỗi khi đổi image alpine→debian |
| 0.2 | Duyệt kế hoạch PLAN-vector-search.md | ⬜ | Chờ xác nhận trước khi đụng prod |

### Giai đoạn 1 — Hạ tầng DB (PR-1, NHẠY CẢM)
| # | Việc | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 1.1 | Đổi image postgres-product → `pgvector/pgvector:pg16` trong docker-compose.yml | ✅ | Giữ nguyên volume/env/ports |
| 1.2 | Restart postgres-product, verify 131 SP còn nguyên | ✅ | VM: total=131, không mất data sau đổi image |
| 1.3 | Test pgvector SQL thủ công trên VM (extension, `<=>`) | ✅ | vector v0.8.2, cột vector(768) OK |
| 1.4 | Migration V10: cột `embedding vector(768)` + index HNSW cosine | ✅ | db/migration/V10__add_product_embedding.sql |

### Giai đoạn 2 — Backend product-service (PR-1)
| # | Việc | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 2.1 | ProductRepository: native query `searchByEmbedding` + `updateEmbedding` | ✅ | `<=>` cosine, `:vec` string, +countWithEmbedding |
| 2.2 | DTO `VectorSearchRequest` + `EmbeddingRequest` | ✅ | embedding: List<Float> |
| 2.3 | Endpoint `POST /products/vector-search` (public) | ✅ | Response shape = listProducts |
| 2.4 | Endpoint `PATCH /admin/products/{id}/embedding` (ADMIN) | ✅ | + GET embedding/count verify |
| 2.5 | Review chéo Java compile (không build local được) | ✅ | id()/deleted() OK, imports OK |
| 2.6 | Gateway: public route `POST /api/products/vector-search` | ✅ | application.yml public-endpoints |

### Giai đoạn 3 — Frontend (PR-2)
| # | Việc | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 3.1 | `lib/chat/gemini-embed.ts`: `embedText(text)` → vector 768d | ✅ | SDK field = `embeddings[0].values`; +taskType QUERY/DOCUMENT, verify 768d |
| 3.2 | `product-context.ts`: vector search + **FALLBACK keyword** | ✅ | vectorSearchForContext → fallback keywordSearchFallback |
| 3.3 | `npm run build` + lint sạch | ✅ | tsc --noEmit OK, eslint OK |

### Giai đoạn 4 — Deploy + Backfill
| # | Việc | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 4.1 | Merge + deploy PR-1 (hạ tầng) | ✅ | #42 fail compile → hotfix #44 deploy OK |
| 4.2 | Script backfill embed 131 SP → PATCH lên DB | ✅ | VM: 131/131 OK |
| 4.3 | Verify `count(embedding)` = 131 | ✅ | total=131, with_emb=131 |
| 4.4 | Merge + deploy PR-2 + fix model | ✅ | #44 frontend + #45 model |

### Giai đoạn 5 — Kiểm thử
| # | Việc | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 5.1 | "laptop pin trâu cho lập trình" | ✅ | Acer Swift OLED (pin 18h), Dell XPS, ThinkPad |
| 5.2 | "laptop gaming RTX" | ✅ | MSI Cyborg/AORUS/Predator RTX |
| 5.3 | "tai nghe chống ồn" | ✅ | Bose QC45, Sony WH-1000XM5 |
| 5.4 | Chat stream end-to-end (có JWT) | ✅ | HTTP 200, AI gợi ý đúng + card link |

---

## Rủi ro & phương án
| Rủi ro | Phương án |
|--------|-----------|
| Đổi image alpine→debian mất/lỗi data | Backup pg_dump trước (0.1); verify 131 SP (1.2); restore nếu lỗi |
| Vector search lỗi runtime | Fallback keyword (3.2) → chat không chết |
| embedText sai số chiều | Verify trả đúng 768 phần tử (3.1) trước khi tin |
| Gemini embed quota | 131 SP = 131 request, free tier 1500/ngày → OK |
| pgvector SQL sai cú pháp | Test thủ công trên Postgres VM (1.3) trước khi commit |

## PR liên quan
- #42 hạ tầng backend (deploy fail vì lỗi compile JavaDoc `*/`)
- #44 hotfix compile + frontend (cherry-pick từ #43) → deploy OK
- #45 fix model `text-embedding-004` → `gemini-embedding-001` (768d + L2-normalize)
- (#43 frontend đã merge nhầm vào nhánh #42, không lên main; nội dung đã gộp ở #44)

## Lỗi đã gặp & sửa
- **Compile fail**: `/api/*/admin/**` trong JavaDoc chứa `*/` đóng comment sớm → đổi mô tả.
- **Model 404**: `text-embedding-004` bị Google gỡ khỏi v1beta → đổi `gemini-embedding-001`.
- **Dim 3072**: model mới mặc định 3072 chiều → ép `outputDimensionality:768` + L2-normalize.
- **Backfill thiếu SP**: backend cap `size=100` → phân trang để lấy đủ 131.

## Nhật ký
- **2026-06-13 ✅ HOÀN THÀNH.** Hạ tầng pgvector + 131/131 SP embedding
  (`gemini-embedding-001`, 768d), endpoint + chat stream test thật trên VM đều OK.
  Có fallback keyword nếu vector lỗi.
