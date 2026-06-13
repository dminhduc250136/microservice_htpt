# STATE: Vector Search cho Chatbot RAG — Theo dõi tiến độ

> File trạng thái các công việc. Cập nhật cột **Trạng thái** khi làm.
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
| 1.2 | Restart postgres-product, verify 131 SP còn nguyên | ⬜ | RỦI RO: alpine→debian collation — làm khi deploy VM |
| 1.3 | Test pgvector SQL thủ công trên VM: `CREATE EXTENSION vector`, `'[1,2,3]'::vector`, `<=>` | ⬜ | Xác nhận trước khi tin — làm khi deploy VM |
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
| 4.1 | Merge + deploy PR-1 (hạ tầng) | ⬜ | Có fallback → không phá chat |
| 4.2 | Script backfill embed 131 SP → PATCH lên DB | 🔄 | scripts/backfill-embeddings.mjs đã viết, chạy khi deploy |
| 4.3 | Verify: `SELECT count(*) WHERE embedding IS NOT NULL` = 131 | ⬜ | |
| 4.4 | Merge + deploy PR-2 (frontend dùng vector) | ⬜ | Sau khi backfill xong |

### Giai đoạn 5 — Kiểm thử
| # | Việc | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 5.1 | Test chat semantic: "laptop pin trâu cho lập trình" → ra máy RAM/pin cao | ⬜ | |
| 5.2 | Test "laptop gaming RTX" → ra laptop có RTX | ⬜ | |
| 5.3 | Test fallback: tắt vector (giả lập) → keyword vẫn chạy | ⬜ | |
| 5.4 | So sánh trước/sau: câu hỏi ngữ nghĩa keyword cũ trượt, vector ra đúng | ⬜ | Bằng chứng cho báo cáo |

---

## Rủi ro & phương án
| Rủi ro | Phương án |
|--------|-----------|
| Đổi image alpine→debian mất/lỗi data | Backup pg_dump trước (0.1); verify 131 SP (1.2); restore nếu lỗi |
| Vector search lỗi runtime | Fallback keyword (3.2) → chat không chết |
| embedText sai số chiều | Verify trả đúng 768 phần tử (3.1) trước khi tin |
| Gemini embed quota | 131 SP = 131 request, free tier 1500/ngày → OK |
| pgvector SQL sai cú pháp | Test thủ công trên Postgres VM (1.3) trước khi commit |

## PR liên quan (cập nhật khi tạo)
- PR-1 (hạ tầng): _đang code xong, chuẩn bị commit_
- PR-2 (frontend): _chưa tạo_

## Nhật ký
- Đã code PR-1 (hạ tầng): migration V10 (cột vector(768) + index HNSW), repo
  searchByEmbedding/updateEmbedding/countWithEmbedding, service vectorSearch +
  updateEmbedding (validate 768d, giữ thứ tự gần→xa), endpoint public
  POST /products/vector-search + admin PATCH /admin/products/{id}/embedding +
  GET embedding/count, đổi image pgvector, gateway public route.
- CÒN LẠI khi deploy VM: backup pg_dump (0.1), đổi image + verify 131 SP (1.2),
  test pgvector SQL thủ công (1.3) TRƯỚC khi tin.
