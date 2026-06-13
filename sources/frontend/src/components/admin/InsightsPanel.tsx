'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from '@/services/token';
import styles from './InsightsPanel.module.css';

type Range = '7d' | '30d' | '90d' | 'all' | 'custom';

interface Insights {
  forecast: { trend: string; summary: string; nextPeriodEstimate: string };
  insights: string[];
  recommendations: string[];
  basedOn: { days: number; totalRevenue: number };
}

interface InsightsPanelProps {
  range: Range;
  /** Đợt 4: custom date range (chỉ dùng khi range='custom'). */
  from?: string;
  to?: string;
}

const TREND_ICON: Record<string, string> = {
  tăng: '📈',
  giảm: '📉',
  'ổn định': '➡️',
};

/**
 * Panel DSS "Phân tích & Dự báo (AI)" trên dashboard admin (Đợt 3 #5+#6).
 * AI phân tích doanh thu → dự báo + insight + khuyến nghị. Đồng bộ với dropdown
 * range của dashboard. Tự ẩn nếu thiếu data/lỗi (charts vẫn chạy bình thường).
 */
export function InsightsPanel({ range, from, to }: InsightsPanelProps) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  // Custom range chưa đủ ngày → chưa gọi (tránh phân tích rỗng).
  const customIncomplete = range === 'custom' && !from && !to;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      if (customIncomplete) {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
        return;
      }
      try {
        const token = getAccessToken();
        const qs =
          range === 'custom'
            ? new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()
            : `range=${range}`;
        const res = await fetch(`/api/admin/insights?${qs}`, {
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          cache: 'no-store',
        });
        const env = res.ok ? await res.json() : null;
        if (!cancelled) setData(env?.data?.insights ?? null);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [range, from, to, customIncomplete]);

  if (loading) {
    return (
      <div className={styles.panel} aria-busy="true">
        <div className={styles.header}>
          <span className={styles.badge}>✨ Phân tích &amp; Dự báo (AI)</span>
        </div>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLineShort} />
      </div>
    );
  }

  if (!data) return null; // thiếu data hoặc lỗi → ẩn panel

  const trendIcon = TREND_ICON[data.forecast.trend.toLowerCase()] ?? '📊';

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.badge}>✨ Phân tích &amp; Dự báo (AI)</span>
        <span className={styles.basedOn}>{data.basedOn.days} ngày dữ liệu</span>
      </div>

      <div className={styles.forecast}>
        <span className={styles.trendIcon}>{trendIcon}</span>
        <div>
          <div className={styles.trendLabel}>
            Xu hướng: <strong>{data.forecast.trend || '—'}</strong>
          </div>
          {data.forecast.summary && <p className={styles.summary}>{data.forecast.summary}</p>}
          {data.forecast.nextPeriodEstimate && (
            <p className={styles.estimate}>🔮 {data.forecast.nextPeriodEstimate}</p>
          )}
        </div>
      </div>

      <div className={styles.cols}>
        {data.insights.length > 0 && (
          <div className={styles.col}>
            <h4 className={styles.colTitle}>💡 Nhận định</h4>
            <ul className={styles.list}>
              {data.insights.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {data.recommendations.length > 0 && (
          <div className={styles.col}>
            <h4 className={styles.colTitle}>✅ Khuyến nghị</h4>
            <ul className={styles.list}>
              {data.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className={styles.disclaimer}>
        Dự báo do AI tạo từ số liệu thật, chỉ mang tính tham khảo cho ra quyết định.
      </p>
    </div>
  );
}
