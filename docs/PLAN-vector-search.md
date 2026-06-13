# KẾ HOẠCH: Vector Search (Semantic) cho Chatbot RAG

> Mục tiêu: thay keyword search (chỉ khớp tên) bằng **semantic vector search** —
> hiểu ý nghĩa câu hỏi. VD "laptop pin trâu cho lập trình" → tìm máy RAM cao/pin
> tốt dù tên không chứa từ đó. Đây là cách **nhóm 04 (BlueSky)** làm RAG.

## Hiện trạng (đã verify trên VM)
- postgres-product: **PostgreSQL 16.14 alpine**, PG_VERSION=16, **131 sản phẩm**.
- pgvector **CHƯA có** trong image hiện tại → phải đổi image.
- Gemini SDK `@google/genai@2.8.0` có `models.embedContent` (model `text-embedding-004`, 768 chiều).
- Backend product-service KHÔNG có GEMINI key → embed ở **frontend**.
- Gateway: `/api/products/**` đã route tới product-service (POST đi qua được).

## Kiến trúc
```
User hỏi
 → [Frontend] embedText(câu hỏi) qua Gemini text-embedding-004 (768d)
 → POST /api/products/vector-search { embedding: number[768], topK: 8 }
 → [product-service] SELECT ... ORDER BY embedding <=> :vec LIMIT 8  (pgvector cosine)
 → top-8 SP gần nghĩa → buildContextXml (như cũ) → Gemini trả lời
```
**Quyết định:** embed query ở frontend; backfill 131 SP qua script frontend +
endpoint admin (backend không có Gemini key).

---

## RỦI RO LỚN NHẤT: đổi Postgres image (alpine → debian)

- Image pgvector chỉ có **debian** (bookworm/trixie), data hiện tại trên **alpine (musl)**.
- PG16 data format độc lập libc → **thường đọc được**, nhưng locale/collation khác có
  thể gây cảnh báo. Rủi ro thật, cần test.
- **Chiến lược an toàn:**
  1. **Backup data trước** (pg_dump products DB ra file).
  2. Đổi image → restart → kiểm tra data còn nguyên (131 SP).
  3. Nếu lỗi collation → có sẵn dump để restore.
- KHÔNG xóa volume. Đổi image giữ nguyên volume mount.

---

## PHẦN A — Backend product-service

### A1. docker-compose.yml
Đổi image postgres-product:
```yaml
postgres-product:
  image: pgvector/pgvector:pg16   # từ postgres:16-alpine — tương thích PG16, có pgvector
```
(Giữ nguyên volume, env, ports.)

### A2. Migration V10 (db/migration/V10__add_product_embedding.sql)
```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(768);
-- Index HNSW cosine (search nhanh). Tạo sau khi có data embedding cũng được,
-- nhưng tạo sẵn không sao (rỗng → vẫn hợp lệ).
CREATE INDEX IF NOT EXISTS idx_products_embedding
  ON products USING hnsw (embedding vector_cosine_ops);
```
> Lưu ý: migration này nằm `db/migration` (chạy MỌI profile), không phải seed-dev —
> vì cột embedding là schema thật, không phải data demo.

### A3. ProductEntity.java
- Thêm field `embedding` kiểu `float[]` (hoặc String tùy mapping pgvector).
- pgvector + Hibernate: đơn giản nhất là KHÔNG map embedding vào entity (tránh lệ
  thuộc Hibernate Vector type). Thay vào đó:
  - Vector search: native query trả về product (không cần đọc cột embedding ra entity).
  - Lưu embedding: native UPDATE (không qua entity setter).
- → **Không sửa ProductEntity**; xử lý embedding qua native query ở repository.

### A4. ProductRepository.java — 2 native query
```java
// Tìm top-K product gần nghĩa nhất (cosine distance <=>). Trả id theo thứ tự gần→xa.
@Query(value = """
    SELECT id FROM products
    WHERE deleted = false AND embedding IS NOT NULL
    ORDER BY embedding <=> CAST(:vec AS vector)
    LIMIT :topK
    """, nativeQuery = true)
List<String> searchByEmbedding(@Param("vec") String vec, @Param("topK") int topK);

// Lưu embedding cho 1 product (backfill / khi tạo SP).
@Modifying
@Query(value = "UPDATE products SET embedding = CAST(:vec AS vector) WHERE id = :id",
       nativeQuery = true)
int updateEmbedding(@Param("id") String id, @Param("vec") String vec);
```
> `:vec` truyền dạng string `"[0.1,0.2,...]"` (pgvector parse được). topK=8.
> searchByEmbedding trả về list id → service load full ProductEntity theo id (giữ thứ tự).

### A5. ProductController.java — 2 endpoint
```java
// Public: vector search cho chatbot RAG.
@PostMapping("/vector-search")
public ApiResponse<Map<String,Object>> vectorSearch(@RequestBody VectorSearchRequest req) {
  // req.embedding (List<Float> 768) → format "[...]" → searchByEmbedding → load products → response giống listProducts
}

// Admin: lưu embedding cho 1 SP (backfill). Cần ADMIN guard (như AdminProductController).
@PatchMapping("/admin/{id}/embedding")  // hoặc đặt ở AdminProductController
public ApiResponse<Object> setEmbedding(@PathVariable String id, @RequestBody EmbeddingRequest req) {
  // updateEmbedding(id, "[...]")
}
```
- DTO: `VectorSearchRequest(List<Float> embedding, Integer topK)`,
  `EmbeddingRequest(List<Float> embedding)`.
- Response vector-search: **cùng shape** với listProducts (content[] gồm ProductResponse)
  để frontend mapProduct tái dùng.

### A6. Gateway application.yml
Thêm public-endpoint (vector search không cần JWT — như GET /api/products):
```yaml
- { method: POST, pattern: "/api/products/vector-search" }
```
(Route `/api/products/**` đã tồn tại → POST tự forward.)

---

## PHẦN B — Frontend

### B1. lib/chat/gemini-embed.ts (mới)
```ts
import { geminiClient } from './gemini';
export const EMBED_MODEL = 'text-embedding-004';
/** Embed 1 đoạn text → vector 768d. Trả null nếu lỗi (caller fallback keyword). */
export async function embedText(text: string): Promise<number[] | null> {
  try {
    const r = await geminiClient.models.embedContent({
      model: EMBED_MODEL,
      contents: [{ parts: [{ text }] }],
    });
    return r.embeddings?.[0]?.values ?? null;
  } catch { return null; }
}
```
> Cần verify đúng field: `embeddings[0].values` vs `.embedding` (check SDK type trước khi code).

### B2. lib/chat/product-context.ts — đổi searchProductsForContext
```ts
export async function searchProductsForContext(userMessage: string): Promise<ChatProduct[]> {
  // 1. Thử vector search
  const vec = await embedText(userMessage);
  if (vec) {
    try {
      const res = await fetch(`${GATEWAY}/api/products/vector-search`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ embedding: vec, topK: CONTEXT_SIZE }), cache: 'no-store',
      });
      if (res.ok) {
        const env = await res.json();
        const products = (env?.data?.content ?? []).map(mapProduct);
        if (products.length > 0) return products;  // vector OK → dùng luôn
      }
    } catch { /* fall through */ }
  }
  // 2. FALLBACK: keyword search cũ (giữ nguyên code hiện tại) — chat KHÔNG BAO GIỜ chết
  return keywordSearchFallback(userMessage);
}
```
> Giữ toàn bộ logic keyword cũ thành `keywordSearchFallback`. An toàn tuyệt đối:
> vector lỗi/chưa backfill → tự về keyword. (Bài học từ vụ bytea: luôn có đường lui.)
> rankProducts có thể bỏ với vector (DB đã sort theo độ gần) hoặc giữ để re-rank nhẹ.

### B3. Script backfill (scripts/backfill-embeddings.mjs — chạy 1 lần)
```
1. GET /api/products?size=200 → 131 SP
2. Với mỗi SP: build text = name + shortDescription + description + flatten(specifications)
3. embedText(text) → vector
4. PATCH /api/products/admin/{id}/embedding {embedding} (kèm admin JWT)
5. Log tiến độ. Rate-limit nhẹ (Gemini free 1500/ngày, 131 OK).
```
> Chạy bằng node với GEMINI_API_KEY + admin token. Tái dùng khi thêm SP mới.

---

## PHẦN C — An toàn & Test (rút kinh nghiệm vụ bytea)

1. **Fallback keyword** trong B2 → chat không chết nếu vector lỗi.
2. **Test pgvector SQL trên Postgres thật** (sau khi đổi image) trước khi tin:
   - `CREATE EXTENSION vector` chạy được?
   - `SELECT '[1,2,3]'::vector;` parse được?
   - `ORDER BY embedding <=> '[...]'::vector` chạy?
3. **Backup data** trước khi đổi image (pg_dump).
4. **Verify 131 SP còn nguyên** sau đổi image.
5. **Verify embedText** trả đúng 768 phần tử (khớp vector(768)).
6. **Test vector search thật**: hỏi "laptop gaming RTX" → top-8 có laptop RTX không.

---

## Thứ tự triển khai (mỗi bước verify trước khi sang bước sau)

| # | Bước | Verify |
|---|------|--------|
| 1 | Backup postgres-product (pg_dump) | File dump tồn tại |
| 2 | Đổi image pgvector + restart | 131 SP còn nguyên |
| 3 | Test pgvector SQL thủ công trên VM | extension + `<=>` chạy |
| 4 | Migration V10 (cột + index) | cột embedding tồn tại |
| 5 | Backend: repo query + endpoint + DTO | build (review chéo Java) |
| 6 | Gateway public route | — |
| 7 | Frontend: gemini-embed + product-context fallback | build + lint |
| 8 | Deploy backend + frontend | services up |
| 9 | Script backfill 131 SP | embedding IS NOT NULL count=131 |
| 10 | Test chat semantic thật | hỏi ngữ nghĩa → ra đúng SP |

## Phạm vi PR (đề xuất tách)
- **PR-1**: hạ tầng (image pgvector + V10 migration + endpoint backend + gateway). Có fallback nên deploy không phá chat.
- **PR-2**: frontend dùng vector search (+ script backfill). Sau khi PR-1 deploy + backfill xong.

> Tách 2 PR để PR-1 (đụng DB/image — nhạy cảm) merge + verify ổn rồi mới bật frontend dùng.
