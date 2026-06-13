import type { Product } from '@/types';

/**
 * Xếp hạng "Sản phẩm liên quan" theo điểm chất lượng + độ phổ biến (Đợt 4 #4).
 * Thay vì hiện 4 SP cùng danh mục bất kỳ (theo updatedAt), ưu tiên SP đáng mua:
 *
 *   score = avgRating(0-5) × 2          // đánh giá cao
 *         + log10(soldCount + 1)         // bán chạy (log để 1 SP siêu hot không át hết)
 *         + (còn hàng ? 1.5 : 0)         // còn hàng ưu tiên rõ
 *         + (đang giảm giá ? 0.5 : 0)    // có sale → hấp dẫn hơn
 *
 * Lấy rộng (vd 20 SP cùng category) rồi rank + cắt topN — không cần backend mới.
 */
export function rankRelatedProducts(products: Product[], topN = 4): Product[] {
  const score = (p: Product): number => {
    const rating = p.avgRating ?? p.rating ?? 0;
    const sold = p.soldCount ?? 0;
    const inStock = p.status !== 'OUT_OF_STOCK' && (p.stock ?? 0) > 0;
    const onSale = (p.discount ?? 0) > 0 || (p.originalPrice != null && p.originalPrice > p.price);
    return (
      rating * 2 +
      Math.log10(sold + 1) +
      (inStock ? 1.5 : 0) +
      (onSale ? 0.5 : 0)
    );
  };
  return [...products].sort((a, b) => score(b) - score(a)).slice(0, topN);
}
