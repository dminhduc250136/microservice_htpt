'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal/Modal';
import {
  fetchOrdersList,
  fetchRecentUsers,
  fetchRecentProducts,
  type OrderRow,
  type UserRow,
  type ProductRow,
} from '@/services/admin-detail';
import type { TimeWindow } from '@/services/charts';
import styles from './CustomerSegmentsPanel.module.css';

/** Loại modal danh sách: đơn (mọi/chờ), khách mới, SP mới. */
export type DetailKind = 'orders' | 'pending' | 'users' | 'products';

const TITLE: Record<DetailKind, string> = {
  orders: 'Danh sách đơn hàng',
  pending: 'Danh sách đơn chờ xử lý',
  users: 'Khách hàng mới',
  products: 'Sản phẩm mới',
};

const STATUS_LABEL: Record<string, string> = {
  DELIVERED: 'Đã giao',
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  CANCELLED: 'Đã hủy',
};

function formatVnd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}tr`;
  return n.toLocaleString('vi-VN');
}
function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN');
  } catch {
    return iso;
  }
}

interface Props {
  kind: DetailKind;
  window: TimeWindow;
  onClose: () => void;
}

/** Modal danh sách chi tiết cho các card KPI (đơn / khách mới / SP mới). */
export function DetailListModal({ kind, window, onClose }: Props) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [products, setProducts] = useState<ProductRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (kind === 'orders' || kind === 'pending') {
          const d = await fetchOrdersList(window, kind === 'pending' ? 'PENDING' : undefined, 200);
          if (!cancelled) setOrders(d.orders ?? []);
        } else if (kind === 'users') {
          const d = await fetchRecentUsers(window, 200);
          if (!cancelled) setUsers(d.users ?? []);
        } else {
          const d = await fetchRecentProducts(window, 200);
          if (!cancelled) setProducts(d.products ?? []);
        }
      } catch {
        if (!cancelled) {
          setOrders([]);
          setUsers([]);
          setProducts([]);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [kind, window]);

  const loading =
    (kind === 'orders' || kind === 'pending') ? orders === null
      : kind === 'users' ? users === null
      : products === null;

  return (
    <Modal open onClose={onClose} title={TITLE[kind]} primaryAction={{ label: 'Đóng', onClick: onClose }}>
      {loading ? (
        <p>Đang tải…</p>
      ) : (
        <div className={styles.tableWrap}>
          {(kind === 'orders' || kind === 'pending') && (
            <OrdersTable rows={orders ?? []} />
          )}
          {kind === 'users' && <UsersTable rows={users ?? []} />}
          {kind === 'products' && <ProductsTable rows={products ?? []} />}
        </div>
      )}
    </Modal>
  );
}

function OrdersTable({ rows }: { rows: OrderRow[] }) {
  if (rows.length === 0) return <p>Không có đơn nào trong khoảng này.</p>;
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Mã đơn</th>
          <th>Khách</th>
          <th>Tổng tiền</th>
          <th>Trạng thái</th>
          <th>Ngày</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => (
          <tr key={o.id}>
            <td className={styles.userId}>{o.id.slice(0, 12)}</td>
            <td className={styles.userId}>{o.userId.slice(0, 12)}</td>
            <td>{formatVnd(o.total)}đ</td>
            <td>{STATUS_LABEL[o.status] ?? o.status}</td>
            <td>{shortDate(o.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UsersTable({ rows }: { rows: UserRow[] }) {
  if (rows.length === 0) return <p>Không có khách mới trong khoảng này.</p>;
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Họ tên</th>
          <th>Email</th>
          <th>Ngày đăng ký</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((u) => (
          <tr key={u.id}>
            <td>{u.fullName || '—'}</td>
            <td className={styles.userId}>{u.email}</td>
            <td>{shortDate(u.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProductsTable({ rows }: { rows: ProductRow[] }) {
  if (rows.length === 0) return <p>Không có sản phẩm mới trong khoảng này.</p>;
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Tên</th>
          <th>Giá</th>
          <th>Tồn kho</th>
          <th>Ngày tạo</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>{formatVnd(p.price)}đ</td>
            <td>{p.stock}</td>
            <td>{shortDate(p.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
