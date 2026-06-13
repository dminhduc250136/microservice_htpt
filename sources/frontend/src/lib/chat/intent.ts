import { geminiClient } from './gemini';
import { normalizeVn } from './vn-text';

/**
 * Phân loại ý định câu hỏi chat TRƯỚC bước RAG (Đợt 2 #2). Chỉ `PRODUCT` mới chạy
 * vector search → tiết kiệm token/latency cho câu xã giao, chính sách, hỏi đơn hàng.
 *
 *  - PRODUCT : hỏi/tư vấn sản phẩm → cần RAG.
 *  - CHITCHAT: chào hỏi, cảm ơn, nói chuyện phiếm → trả lời thẳng.
 *  - POLICY  : ship, đổi trả, bảo hành, thanh toán → trả lời chính sách.
 *  - ORDER   : hỏi đơn hàng của khách → mời vào trang đơn hàng.
 */
export type Intent = 'PRODUCT' | 'CHITCHAT' | 'POLICY' | 'ORDER';

/** Model phân loại — flash-lite rẻ/nhanh; chỉ cần trả 1 từ. */
const INTENT_MODEL = 'gemini-2.5-flash-lite';

/** Bật/tắt tầng 2 (gọi Gemini). Tắt → chỉ rule, mặc định PRODUCT. */
const USE_LLM_FALLBACK = true;

// Từ khóa rule tầng 1 (đã normalize: bỏ dấu, lowercase). Khớp theo ranh giới từ.
const POLICY_KW = [
  'ship', 'giao hang', 'van chuyen', 'doi tra', 'tra hang', 'bao hanh',
  'hoan tien', 'hoan hang', 'thanh toan', 'cod', 'phi giao', 'phi ship',
  'chinh sach', 'huy don',
];
const ORDER_KW = [
  'don hang cua toi', 'don cua toi', 'don hang cua minh', 'tra cuu don',
  'ma don', 'tinh trang don', 'don hang da dat', 'theo doi don',
];
const CHITCHAT_KW = [
  'xin chao', 'chao ban', 'chao shop', 'hello', 'hi', 'cam on', 'thanks',
  'thank you', 'tam biet', 'bye', 'ok', 'oke', 'okie', 'uh', 'vang',
];

/** Có chứa CỤM từ khóa (ranh giới từ) trong text đã normalize không. */
function hasKeyword(normText: string, keywords: string[]): boolean {
  const padded = ` ${normText} `;
  return keywords.some((kw) => padded.includes(` ${kw} `) || normText.includes(kw));
}

/**
 * Phân loại ý định. Tầng 1 rule (0 token); không chắc → tầng 2 Gemini (tùy chọn).
 * LUÔN trả về intent hợp lệ; mọi lỗi/không rõ → `PRODUCT` (an toàn: vẫn chạy RAG
 * như trước, không mất tính năng).
 */
export async function classifyIntent(message: string): Promise<Intent> {
  const norm = normalizeVn(message);
  const wordCount = norm.split(/\s+/).filter(Boolean).length;

  // --- Tầng 1: rule nhanh ---
  // ORDER/POLICY ưu tiên cao vì cụm từ đặc trưng, ít nhầm.
  if (hasKeyword(norm, ORDER_KW)) return 'ORDER';
  if (hasKeyword(norm, POLICY_KW)) return 'POLICY';
  // CHITCHAT: chỉ coi là phiếm khi câu NGẮN + có từ chào/cảm ơn (tránh nuốt câu dài
  // kiểu "cảm ơn shop, cho hỏi laptop nào tốt" — câu đó cần PRODUCT).
  if (wordCount <= 4 && hasKeyword(norm, CHITCHAT_KW)) return 'CHITCHAT';

  // --- Tầng 2: Gemini (nếu bật) ---
  if (USE_LLM_FALLBACK) {
    const llm = await classifyWithGemini(message);
    if (llm) return llm;
  }

  // --- Mặc định an toàn ---
  return 'PRODUCT';
}

/** Gọi Gemini phân loại, ép trả về đúng 1 nhãn. Trả null nếu lỗi/không khớp. */
async function classifyWithGemini(message: string): Promise<Intent | null> {
  try {
    const res = await geminiClient.models.generateContent({
      model: INTENT_MODEL,
      contents: [{ role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction:
          'Phân loại câu của khách trong shop bán điện thoại/laptop/phụ kiện thành ' +
          'ĐÚNG MỘT nhãn: PRODUCT (hỏi/tư vấn sản phẩm), CHITCHAT (chào, cảm ơn, ' +
          'nói chuyện phiếm), POLICY (giao hàng, đổi trả, bảo hành, thanh toán), ' +
          'ORDER (hỏi về đơn hàng của họ). Chỉ in ra nhãn, không giải thích.',
        maxOutputTokens: 5,
        temperature: 0,
      },
    });
    const out = (res.text ?? '').toUpperCase();
    if (out.includes('CHITCHAT')) return 'CHITCHAT';
    if (out.includes('POLICY')) return 'POLICY';
    if (out.includes('ORDER')) return 'ORDER';
    if (out.includes('PRODUCT')) return 'PRODUCT';
    return null;
  } catch {
    return null;
  }
}
