'use client';

import { useEffect, useState } from 'react';
import { fetchCustomerSegments, type CustomerSegments, type SegmentGroup } from '@/services/charts';
import Modal from '@/components/ui/Modal/Modal';
import styles from './CustomerSegmentsPanel.module.css';

// Màu nhãn theo nhóm (giá trị cao → ấm/đậm).
const SEGMENT_COLOR: Record<string, string> = {
  VIP: '#7c3aed',
  'Trung thành': '#2563eb',
  'Khách mới / tiềm năng': '#059669',
  'Cần chăm sóc': '#d97706',
  'Nguy cơ rời bỏ': '#dc2626',
  'Đã ngủ đông': '#6b7280',
};

function formatVnd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}tr`;
  return n.toLocaleString('vi-VN');
}

/**
 * Panel "Phân khúc khách hàng (RFM)" trên dashboard admin (DSS).
 * Chia khách theo Recency/Frequency/Monetary → nhóm có tên + gợi ý hành động.
 * Query thuần (không gọi AI) nên auto-load như các chart khác. Tự ẩn nếu chưa có khách.
 */
export function CustomerSegmentsPanel() {
  const [data, setData] = useState<CustomerSegments | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [selected, setSelected] = useState<SegmentGroup | null>(null); // nhóm đang xem chi tiết

  useEffect(() => {
    let cancelled = false;
    fetchCustomerSegments()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setStatus('success');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className={styles.panel} aria-busy="true">
        <div className={styles.header}>
          <span className={styles.badge}>👥 Phân khúc khách hàng (RFM)</span>
        </div>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (status === 'error' || !data || data.totalCustomers === 0) {
    return null; // lỗi hoặc chưa có khách → ẩn
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.badge}>👥 Phân khúc khách hàng (RFM)</span>
        <span className={styles.total}>{data.totalCustomers} khách đã mua</span>
      </div>

      <div className={styles.grid}>
        {data.segments.map((s) => {
          const pct = Math.round((s.customerCount / data.totalCustomers) * 100);
          const color = SEGMENT_COLOR[s.name] ?? '#6b7280';
          return (
            <button
              key={s.name}
              type="button"
              className={styles.card}
              style={{ borderTopColor: color }}
              onClick={() => setSelected(s)}
              title="Bấm để xem danh sách khách trong nhóm"
            >
              <div className={styles.cardHead}>
                <span className={styles.dot} style={{ background: color }} />
                <span className={styles.name}>{s.name}</span>
              </div>
              <div className={styles.count}>
                {s.customerCount} <span className={styles.pct}>({pct}%)</span>
              </div>
              <div className={styles.revenue}>Doanh thu: {formatVnd(s.totalRevenue)}đ</div>
              <p className={styles.desc}>{s.description}</p>
              <span className={styles.viewMore}>Xem chi tiết →</span>
            </button>
          );
        })}
      </div>

      <p className={styles.note}>
        RFM = Recency (mua gần đây) · Frequency (số lần mua) · Monetary (chi tiêu). Tính từ đơn đã giao.
      </p>

      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title={`Nhóm: ${selected.name} (${selected.customerCount} khách)`}
          primaryAction={{ label: 'Đóng', onClick: () => setSelected(null) }}
        >
          <p className={styles.modalDesc}>{selected.description}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Khách</th>
                  <th>Lần cuối mua</th>
                  <th>Số đơn</th>
                  <th>Chi tiêu</th>
                  <th>RFM</th>
                </tr>
              </thead>
              <tbody>
                {selected.members.map((m) => (
                  <tr key={m.userId}>
                    <td className={styles.userId}>{m.userId}</td>
                    <td>{m.recencyDays} ngày trước</td>
                    <td>{m.frequency}</td>
                    <td>{formatVnd(m.monetary)}đ</td>
                    <td className={styles.rfm}>
                      {m.rScore}/{m.fScore}/{m.mScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
