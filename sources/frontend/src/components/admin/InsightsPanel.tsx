'use client';

import { useState } from 'react';
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

// Cache cấp module — nhớ kết quả theo time window trong phiên (đổi range/từ chối
// gọi lại trừ khi bấm nút). Sống qua remount của dashboard.
type State = { status: 'success'; data: Insights } | { status: 'empty' };
const sessionCache = new Map<string, State>();
function windowKey(range: Range, from?: string, to?: string): string {
  return range === 'custom' ? `custom:${from ?? ''}~${to ?? ''}` : range;
}

/**
 * Panel DSS "Phân tích & Dự báo (AI)" trên dashboard admin (Đợt 3 #5+#6).
 *
 * MANUAL TRIGGER: KHÔNG tự gọi AI khi vào dashboard (tốn tài nguyên). Admin bấm
 * "Phân tích bằng AI" mới gọi. Kết quả NHỚ theo time window trong phiên → đổi
 * range/quay lại không gọi lại trừ khi bấm lại.
 */
export function InsightsPanel({ range, from, to }: InsightsPanelProps) {
  const key = windowKey(range, from, to);
  const [loading, setLoading] = useState(false);
  // Bộ đếm để ép re-render sau khi cập nhật sessionCache (cache cấp module).
  const [, forceRender] = useState(0);

  // Custom range chưa đủ ngày → chưa cho phân tích.
  const customIncomplete = range === 'custom' && !from && !to;

  // Đọc kết quả theo time window hiện tại từ cache (đổi range → key đổi → đọc lại).
  const cachedForKey = sessionCache.get(key);

  async function handleAnalyze() {
    setLoading(true);
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
      const insights: Insights | null = env?.data?.insights ?? null;
      sessionCache.set(key, insights ? { status: 'success', data: insights } : { status: 'empty' });
    } catch {
      sessionCache.set(key, { status: 'empty' });
    } finally {
      setLoading(false);
      forceRender((n) => n + 1);
    }
  }

  if (!cachedForKey) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.badge}>✨ Phân tích &amp; Dự báo (AI)</span>
        </div>
        <p className={styles.prompt}>
          AI phân tích doanh thu → dự báo xu hướng + nhận định + khuyến nghị cho khoảng thời gian đang chọn.
        </p>
        <button
          type="button"
          className={styles.triggerBtn}
          onClick={handleAnalyze}
          disabled={loading || customIncomplete}
        >
          {loading ? 'Đang phân tích…' : 'Phân tích bằng AI'}
        </button>
        {customIncomplete && (
          <p className={styles.hint}>Chọn khoảng ngày tùy chỉnh trước khi phân tích.</p>
        )}
      </div>
    );
  }

  if (cachedForKey.status === 'empty') {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.badge}>✨ Phân tích &amp; Dự báo (AI)</span>
        </div>
        <p className={styles.prompt}>Chưa đủ dữ liệu bán hàng để AI phân tích cho khoảng này.</p>
        <button type="button" className={styles.triggerBtn} onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Đang phân tích…' : 'Thử lại'}
        </button>
      </div>
    );
  }

  const data = cachedForKey.data;
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
