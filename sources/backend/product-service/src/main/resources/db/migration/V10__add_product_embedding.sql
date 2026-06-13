-- Vector search (semantic RAG) cho chatbot — Đợt 1 roadmap AI.
-- pgvector: lưu embedding 768 chiều (Gemini text-embedding-004) cho mỗi sản phẩm.
-- Yêu cầu image postgres có extension `vector` (pgvector/pgvector:pg16).
--
-- Nằm ở db/migration (chạy MỌI profile) vì cột embedding là SCHEMA thật,
-- không phải data demo. Cột nullable → backfill dần qua endpoint admin; SP chưa
-- có embedding sẽ bị bỏ qua ở vector-search (WHERE embedding IS NOT NULL) và
-- frontend tự fallback keyword → không phá tính năng đang chạy.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Index HNSW cosine để search nhanh theo độ gần ngữ nghĩa (toán tử <=>).
-- Tạo trên cột rỗng vẫn hợp lệ; pgvector tự build dần khi có data.
CREATE INDEX IF NOT EXISTS idx_products_embedding
  ON products USING hnsw (embedding vector_cosine_ops);
