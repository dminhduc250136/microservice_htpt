import { geminiClient } from './gemini';

/**
 * Model embedding của Gemini — `gemini-embedding-001` (text-embedding-004 đã bị
 * gỡ khỏi API v1beta → 404). Model này mặc định 3072 chiều; ta ép về 768 qua
 * `outputDimensionality` để khớp cột `embedding vector(768)` (migration V10).
 */
export const EMBED_MODEL = 'gemini-embedding-001';

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
 * Chuẩn hóa L2 (unit vector). gemini-embedding-001 khi `outputDimensionality < 3072`
 * KHÔNG tự normalize → phải tự chuẩn hóa để cosine distance chuẩn. Backfill cũng
 * normalize y hệt → query và document cùng "thước đo".
 */
function l2Normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum);
  return norm > 0 ? v.map((x) => x / norm) : v;
}

/**
 * Embed 1 đoạn text → vector {@link EMBED_DIM} chiều (đã L2-normalize). Trả `null`
 * khi lỗi/sai số chiều để caller TỰ FALLBACK keyword (chat không bao giờ chết).
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
      config: { taskType, outputDimensionality: EMBED_DIM },
    });
    const values = res.embeddings?.[0]?.values;
    // Chỉ tin khi đúng số chiều — vector lệch chiều sẽ làm CAST vector(768) lỗi ở DB.
    if (Array.isArray(values) && values.length === EMBED_DIM) {
      return l2Normalize(values);
    }
    return null;
  } catch {
    return null;
  }
}
