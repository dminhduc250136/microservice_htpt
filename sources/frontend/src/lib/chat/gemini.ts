import { GoogleGenAI } from '@google/genai';

/**
 * Singleton Google Gemini client (thay Claude cho chat tư vấn — free tier AI Studio).
 * Server-only: apiKey đọc GEMINI_API_KEY (không NEXT_PUBLIC_ — không lộ ra client).
 *
 * Lý do đổi: tài khoản Anthropic hết hạn/khóa; Gemini free tier (1500 req/ngày,
 * không cần thẻ) phù hợp dự án học tập. Wire format route↔client KHÔNG đổi —
 * route tự convert stream Gemini sang JSON-line {type:'delta'|'done'|'error'}.
 */
export const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY ?? '',
});

// Model chat — gemini-2.5-flash-lite. ĐỔI từ gemini-2.5-flash: free tier của flash
// CHỈ 20 request/ngày (RESOURCE_EXHAUSTED rất nhanh khi demo), flash-lite ~1000/ngày
// (gấp ~50 lần). Chất lượng thấp hơn chút nhưng đủ cho chat tư vấn + tóm tắt review.
// Dùng chung cho chat (route stream) và review-summary qua GEMINI_CHAT_MODEL.
export const GEMINI_CHAT_MODEL = 'gemini-2.5-flash-lite';

// Tái dùng nguyên văn system prompt tiếng Việt đã tinh chỉnh cho RAG (giữ 1 nguồn
// duy nhất ở anthropic.ts để không lệch khi sửa). Prompt độc lập model.
export { SYSTEM_PROMPT_VN } from './anthropic';
