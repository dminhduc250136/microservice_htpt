'use client';

import { useState } from 'react';
import styles from './ReviewSummary.module.css';

interface Summary {
  oneLine: string;
  strengths: string[];
  cautions: string[];
  basedOn: number;
}

interface ReviewSummaryProps {
  productId: string;
  /** reviewCount hiện tại — đổi → cho phép tóm tắt lại (cache theo count). */
  reviewCount: number;
}

/**
 * Panel "Tóm tắt từ AI" đầu tab Đánh giá (Đợt 2 #3).
 *
 * MANUAL TRIGGER: KHÔNG tự gọi AI khi vào trang (tốn tài nguyên). User bấm nút
 * "Tóm tắt đánh giá bằng AI" mới gọi. Kết quả NHỚ trong phiên (module cache theo
 * productId+reviewCount) → chuyển tab / mở lại không gọi lại.
 */

// Cache cấp module — sống qua remount/đổi tab trong cùng phiên trang.
type State = { status: 'success'; data: Summary } | { status: 'empty' };
const sessionCache = new Map<string, State>();
const cacheKey = (productId: string, reviewCount: number) => `${productId}:${reviewCount}`;

export default function ReviewSummary({ productId, reviewCount }: ReviewSummaryProps) {
  const key = cacheKey(productId, reviewCount);
  const [state, setState] = useState<State | null>(() => sessionCache.get(key) ?? null);
  const [loading, setLoading] = useState(false);

  async function handleSummarize() {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/chat/review-summary?productId=${encodeURIComponent(productId)}`,
        { cache: 'no-store' },
      );
      const env = r.ok ? await r.json() : null;
      const summary: Summary | null = env?.data?.summary ?? null;
      const next: State = summary ? { status: 'success', data: summary } : { status: 'empty' };
      sessionCache.set(key, next);
      setState(next);
    } catch {
      const next: State = { status: 'empty' };
      sessionCache.set(key, next);
      setState(next);
    } finally {
      setLoading(false);
    }
  }

  // Chưa bấm → hiện nút mời tóm tắt.
  if (state === null) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.badge}>✨ Tóm tắt từ AI</span>
        </div>
        <p className={styles.prompt}>Để AI tổng hợp nhanh điểm mạnh / điểm cần lưu ý từ các đánh giá.</p>
        <button type="button" className={styles.triggerBtn} onClick={handleSummarize} disabled={loading}>
          {loading ? 'Đang tóm tắt…' : 'Tóm tắt đánh giá bằng AI'}
        </button>
      </div>
    );
  }

  // Đã bấm nhưng chưa đủ review / lỗi.
  if (state.status === 'empty') {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.badge}>✨ Tóm tắt từ AI</span>
        </div>
        <p className={styles.prompt}>Chưa đủ đánh giá để AI tóm tắt (cần tối thiểu vài đánh giá).</p>
      </div>
    );
  }

  const summary = state.data;
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.badge}>✨ Tóm tắt từ AI</span>
        <span className={styles.basedOn}>dựa trên {summary.basedOn} đánh giá</span>
      </div>

      {summary.oneLine && <p className={styles.oneLine}>{summary.oneLine}</p>}

      <div className={styles.cols}>
        {summary.strengths.length > 0 && (
          <div className={styles.col}>
            <h4 className={styles.colTitle}>👍 Điểm được khen</h4>
            <ul className={styles.list}>
              {summary.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.cautions.length > 0 && (
          <div className={styles.col}>
            <h4 className={styles.colTitle}>⚠️ Điểm cần lưu ý</h4>
            <ul className={styles.list}>
              {summary.cautions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className={styles.disclaimer}>Tóm tắt do AI tạo từ đánh giá thật, chỉ mang tính tham khảo.</p>
    </div>
  );
}
