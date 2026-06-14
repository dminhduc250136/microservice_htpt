/**
 * Admin dashboard — chi tiết KPI/RFM cho modal "xem chi tiết".
 * Các endpoint trả danh sách/breakdown theo khoảng thời gian.
 */
import { httpGet } from './http';
import type { TimeWindow } from './charts';

function rangeQs(w?: TimeWindow): string {
  const p = new URLSearchParams();
  if (w && (w.from || w.to)) {
    if (w.from) p.set('from', w.from);
    if (w.to) p.set('to', w.to);
  }
  return p.toString();
}

export interface StatusBreakdown {
  status: string;
  count: number;
  revenue: number;
}

/** Chi tiết doanh thu: breakdown theo trạng thái trong khoảng. */
export function fetchRevenueDetail(w?: TimeWindow): Promise<{ byStatus: StatusBreakdown[] }> {
  const qs = rangeQs(w);
  return httpGet<{ byStatus: StatusBreakdown[] }>(
    `/api/orders/admin/revenue-detail${qs ? `?${qs}` : ''}`,
  );
}

export interface OrderRow {
  id: string;
  userId: string;
  total: number;
  status: string;
  createdAt: string;
}

/** Danh sách đơn trong khoảng (+ optional status) cho modal chi tiết đơn. */
export function fetchOrdersList(
  w?: TimeWindow,
  status?: string,
  limit = 100,
): Promise<{ orders: OrderRow[] }> {
  const p = new URLSearchParams(rangeQs(w));
  if (status) p.set('status', status);
  p.set('limit', String(limit));
  return httpGet<{ orders: OrderRow[] }>(`/api/orders/admin/orders-list?${p.toString()}`);
}

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

/** Danh sách khách đăng ký trong khoảng (modal "Khách mới"). */
export function fetchRecentUsers(w?: TimeWindow, limit = 100): Promise<{ users: UserRow[] }> {
  const p = new URLSearchParams(rangeQs(w));
  p.set('limit', String(limit));
  return httpGet<{ users: UserRow[] }>(`/api/users/admin/recent-list?${p.toString()}`);
}

export interface ProductRow {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

/** Danh sách SP tạo trong khoảng (modal "Sản phẩm mới"). */
export function fetchRecentProducts(w?: TimeWindow, limit = 100): Promise<{ products: ProductRow[] }> {
  const p = new URLSearchParams(rangeQs(w));
  p.set('limit', String(limit));
  return httpGet<{ products: ProductRow[] }>(`/api/products/admin/recent-list?${p.toString()}`);
}
