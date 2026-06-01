/**
 * Shared types for chat helpers + route handlers (Wave 2).
 * Kept independent of pg / anthropic so client components can import safely if needed.
 */

/** 1 dòng thông số kỹ thuật (vd { label: "CPU", value: "Apple M3 Max" }). */
export interface ChatSpec {
  label: string;
  value: string;
}

export interface ChatProduct {
  id: string;
  name: string;
  price: number;
  /** Giá gốc (gạch ngang) nếu đang giảm — để AI biết sản phẩm có khuyến mãi. */
  originalPrice: number | null;
  /** % giảm so với giá gốc (nếu có). */
  discount: number | null;
  brand: string | null;
  stock: number | null;
  /** Trạng thái: ACTIVE / OUT_OF_STOCK / INACTIVE — AI biết còn bán hay không. */
  status: string | null;
  shortDescription: string | null;
  /** Mô tả dài (PDP tab "Mô tả") — chi tiết tính năng/lợi ích để AI tư vấn sâu. */
  description: string | null;
  /** Thông số kỹ thuật (CPU/RAM/GPU/màn hình...) — quan trọng để tư vấn cấu hình. */
  specifications: ChatSpec[];
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  soldCount: number | null;
}

export interface ChatMessageRow {
  role: 'user' | 'assistant';
  content: string;
}
