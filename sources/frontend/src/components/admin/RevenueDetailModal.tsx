'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal/Modal';
import { fetchRevenueDetail, type StatusBreakdown } from '@/services/admin-detail';
import type { TimeWindow } from '@/services/charts';
import styles from './CustomerSegmentsPanel.module.css';

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

interface Props {
  window: TimeWindow;
  onClose: () => void;
}

/**
 * Modal chi tiết doanh thu: breakdown theo trạng thái đơn trong khoảng đang chọn.
 * Doanh thu thực = đơn "Đã giao"; các trạng thái khác cho thấy tiềm năng/thất thoát.
 */
export function RevenueDetailModal({ window, onClose }: Props) {
  const [rows, setRows] = useState<StatusBreakdown[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRevenueDetail(window)
      .then((d) => {
        if (!cancelled) setRows(d.byStatus ?? []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  const delivered = rows?.find((r) => r.status === 'DELIVERED');

  return (
    <Modal
      open
      onClose={onClose}
      title="Chi tiết doanh thu theo trạng thái đơn"
      primaryAction={{ label: 'Đóng', onClick: onClose }}
    >
      {rows === null ? (
        <p>Đang tải…</p>
      ) : rows.length === 0 ? (
        <p>Không có dữ liệu trong khoảng này.</p>
      ) : (
        <>
          {delivered && (
            <p className={styles.modalDesc}>
              Doanh thu thực (đơn đã giao): <strong>{formatVnd(delivered.revenue)}đ</strong> từ{' '}
              {delivered.count} đơn.
            </p>
          )}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Trạng thái</th>
                  <th>Số đơn</th>
                  <th>Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.status}>
                    <td>{STATUS_LABEL[r.status] ?? r.status}</td>
                    <td>{r.count}</td>
                    <td>{formatVnd(r.revenue)}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
