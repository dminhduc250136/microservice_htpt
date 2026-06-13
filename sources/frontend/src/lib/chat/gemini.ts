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

// Model chat — gemini-flash-lite-latest (alias "latest"). ĐỔI từ phiên bản cố định
// gemini-2.5-flash-lite vì bản cố định free tier CHỈ 20 request/ngày (cạn rất nhanh
// khi demo chat+review+DSS). Alias -latest có quota free riêng dư dả. Trỏ tới bản
// flash-lite mới nhất Google phát hành → nhanh, rẻ, đủ cho tư vấn/tóm tắt/insight.
// Dùng chung cho chat (stream), review-summary và admin insights qua hằng số này.
export const GEMINI_CHAT_MODEL = 'gemini-flash-lite-latest';

// Tái dùng nguyên văn system prompt tiếng Việt đã tinh chỉnh cho RAG (giữ 1 nguồn
// duy nhất ở anthropic.ts để không lệch khi sửa). Prompt độc lập model.
export { SYSTEM_PROMPT_VN } from './anthropic';
