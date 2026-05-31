/**
 * Coupon service API — preview validate (D-13).
 * BE: POST /api/orders/coupons/validate body {code, cartTotal}.
 * Read-only: KHÔNG mutate state, atomic redemption diễn ra ở POST /api/orders.
 *
 * Phase 25 (gateway JWT edge auth): FE KHÔNG còn gửi `X-User-Id` thủ công —
 * API Gateway inject header tin cậy từ claim `sub` của Bearer JWT.
 *
 * Phase 20 / COUP-03 (D-13, D-18). Caller dùng useApplyCoupon hook (React Query
 * mutation) để wrap, hoặc gọi trực tiếp khi auto re-validate trong useEffect.
 */
import { httpGet, httpPost } from './http';
import type { AvailableCoupon, CouponPreview } from '@/types';

export interface CouponValidateBody {
  code: string;
  cartTotal: number;
}

export function validateCoupon(body: CouponValidateBody): Promise<CouponPreview> {
  return httpPost<CouponPreview>('/api/orders/coupons/validate', body);
}

/**
 * Danh sách mã giảm giá khả dụng để hiển thị dropdown gợi ý ở checkout.
 * GET /api/orders/coupons/available — public, không cần auth. Trả mã active +
 * chưa hết hạn + còn lượt dùng (KHÔNG lọc theo cartTotal; FE tự disable mã chưa
 * đủ điều kiện minOrderAmount).
 */
export function listAvailableCoupons(): Promise<AvailableCoupon[]> {
  return httpGet<AvailableCoupon[]>('/api/orders/coupons/available');
}
