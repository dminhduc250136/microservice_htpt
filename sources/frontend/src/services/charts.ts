/**
 * Phase 19 / Plan 19-04 (ADMIN-01..05). Chart fetchers cho admin dashboard.
 * Endpoints backend Plans 19-01/02/03 — gateway routes /api/{orders,users,products}/admin/**.
 * Bearer token + ApiResponse envelope unwrap auto-handled bởi http.ts.
 */
import { httpGet } from './http';

export interface RevenuePoint {
  date: string;
  value: number;
}

export interface TopProductPoint {
  productId: string;
  name: string;
  brand: string | null;
  thumbnailUrl: string | null;
  qtySold: number;
}

export interface StatusPoint {
  status: string;
  count: number;
}

export interface SignupPoint {
  date: string;
  count: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  brand: string | null;
  thumbnailUrl: string | null;
  stock: number;
}

export type Range = '7d' | '30d' | '90d' | 'all' | 'custom';

/** Khoảng thời gian chart: hoặc range cố định, hoặc custom from/to (yyyy-MM-dd). */
export interface TimeWindow {
  range: Range;
  from?: string; // yyyy-MM-dd (chỉ dùng khi range='custom')
  to?: string;   // yyyy-MM-dd
}

/** Build query string ?range= hoặc ?from=&to= (Đợt 4: custom date range). */
function rangeQuery(w: TimeWindow): string {
  if (w.range === 'custom' && (w.from || w.to)) {
    const p = new URLSearchParams();
    if (w.from) p.set('from', w.from);
    if (w.to) p.set('to', w.to);
    return p.toString();
  }
  return `range=${w.range}`;
}

export const fetchRevenueChart = (w: TimeWindow) =>
  httpGet<RevenuePoint[]>(`/api/orders/admin/charts/revenue?${rangeQuery(w)}`);

export const fetchTopProducts = (w: TimeWindow) =>
  httpGet<TopProductPoint[]>(`/api/orders/admin/charts/top-products?${rangeQuery(w)}`);

export const fetchStatusDistrib = () =>
  httpGet<StatusPoint[]>(`/api/orders/admin/charts/status-distribution`);

export const fetchUserSignups = (w: TimeWindow) =>
  httpGet<SignupPoint[]>(`/api/users/admin/charts/signups?${rangeQuery(w)}`);

export const fetchLowStock = () =>
  httpGet<LowStockItem[]>(`/api/products/admin/charts/low-stock`);
