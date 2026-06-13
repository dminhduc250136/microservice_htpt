import { geminiClient } from './gemini';

/**
 * Model embedding của Gemini — text-embedding-004 sinh vector 768 chiều,
 * khớp cột `embedding vector(768)` ở product-service (migration V10).
 */
export const EMBED_MODEL = 'text-embedding-004';

/** Số chiều vector kỳ vọng (khớp DB). Dùng để verify trước khi tin kết quả. */
export const EMBED_DIM = 768;

/**
 * taskType tối ưu retrieval (gợi ý của Google cho RAG):
 *  - RETRIEVAL_QUERY: câu hỏi của user (lúc search).
 *  - RETRIEVAL_DOCUMENT: nội dung sản phẩm (lúc backfill).
 * Embed query & document cùng taskType "đối xứng" cho cùng không gian vector.
 */
export type EmbedTaskType = 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT';

/**
 * Embed 1 đoạn text → vector {@link EMBED_DIM} chiều. Trả `null` khi lỗi/sai số
 * chiều để caller TỰ FALLBACK keyword (chat không bao giờ chết — bài học vụ bytea).
 *
 * Server-only (geminiClient đọc GEMINI_API_KEY, không lộ ra client).
 */
export async function embedText(
  text: string,
  taskType: EmbedTaskType = 'RETRIEVAL_QUERY',
): Promise<number[] | null> {
  const input = text.trim();
  if (!input) return null;
  try {
    const res = await geminiClient.models.embedContent({
      model: EMBED_MODEL,
      contents: input,
      config: { taskType },
    });
    const values = res.embeddings?.[0]?.values;
    // Chỉ tin khi đúng số chiều — vector lệch chiều sẽ làm CAST vector(768) lỗi ở DB.
    if (Array.isArray(values) && values.length === EMBED_DIM) {
      return values;
    }
    return null;
  } catch {
    return null;
  }
}
