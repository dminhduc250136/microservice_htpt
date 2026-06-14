/**
 * Gợi ý sản phẩm (Collaborative Filtering) — mục 7.6.6 nhóm 04.
 *
 * Endpoint order-service trả productId + score đồng-mua; ta enrich Product detail
 * qua getProductById (public). Trả về danh sách Product (đã enrich), bỏ id lỗi.
 */
import { httpGet } from './http';
import { getProductById } from './products';
import { getAccessToken } from './token';
import type { Product } from '@/types';

interface RecItem {
  productId: string;
  score: number;
}

/** Enrich list productId → Product[] (giữ thứ tự, bỏ id load lỗi). */
async function enrich(items: RecItem[]): Promise<Product[]> {
  const settled = await Promise.allSettled(items.map((it) => getProductById(it.productId)));
  const out: Product[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value) out.push(r.value);
  }
  return out;
}

/**
 * "Khách mua sản phẩm này cũng mua" (item-based, PUBLIC). Trả [] nếu lỗi/không có.
 */
export async function fetchCoPurchase(productId: string, limit = 8): Promise<Product[]> {
  try {
    const items = await httpGet<RecItem[]>(
      `/api/orders/recommend/co-purchase/${encodeURIComponent(productId)}?limit=${limit}`,
      undefined,
      true, // skipAuth: public endpoint
    );
    if (!items?.length) return [];
    return enrich(items);
  } catch {
    return [];
  }
}

/**
 * "Gợi ý cho bạn" (user-based) — cần đăng nhập. Trả [] nếu chưa login/lỗi/không có.
 */
export async function fetchRecommendForMe(limit = 8): Promise<Product[]> {
  if (!getAccessToken()) return [];
  try {
    const items = await httpGet<RecItem[]>(`/api/orders/recommend/for-me?limit=${limit}`);
    if (!items?.length) return [];
    return enrich(items);
  } catch {
    return [];
  }
}
