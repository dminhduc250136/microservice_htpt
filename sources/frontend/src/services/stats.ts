/**
 * Phase 9 / Plan 09-04 (UI-02). Stats wrappers cho admin dashboard.
 * Endpoints backend: Plan 09-02 (per-svc /admin/stats with manual JWT role check).
 * Bearer token auto-attached bởi http.ts.
 *
 * Nâng cấp: nhận TimeWindow (range hoặc custom from/to) — KPI lọc theo thời gian,
 * đồng bộ dropdown dashboard. Order stats thêm doanh thu + AOV.
 */
import { httpGet } from './http';
import type { TimeWindow } from './charts';

export interface ProductStats {
  totalProducts: number;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  averageOrderValue: number;
}

export interface UserStats {
  totalUsers: number;
}

/** Build ?from=&to= từ TimeWindow custom; range cố định KHÔNG truyền (backend đếm toàn bộ).
 *  → KPI "theo khoảng" chỉ khi chọn custom date; range 7d/30d/90d/all hiện vẫn là tổng
 *  trừ khi backend nhận range. Để đồng bộ với chart, ta quy đổi range → from/to ở caller. */
function statsQuery(w?: TimeWindow): string {
  if (w && (w.from || w.to)) {
    const p = new URLSearchParams();
    if (w.from) p.set('from', w.from);
    if (w.to) p.set('to', w.to);
    return `?${p.toString()}`;
  }
  return '';
}

export function fetchProductStats(w?: TimeWindow): Promise<ProductStats> {
  return httpGet<ProductStats>(`/api/products/admin/stats${statsQuery(w)}`);
}

export function fetchOrderStats(w?: TimeWindow): Promise<OrderStats> {
  return httpGet<OrderStats>(`/api/orders/admin/stats${statsQuery(w)}`);
}

export function fetchUserStats(w?: TimeWindow): Promise<UserStats> {
  return httpGet<UserStats>(`/api/users/admin/stats${statsQuery(w)}`);
}
