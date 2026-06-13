'use client';

import { useEffect, useState } from 'react';
import styles from './ReviewSummary.module.css';

interface Summary {
  oneLine: string;
  strengths: string[];
  cautions: string[];
  basedOn: number;
}

interface ReviewSummaryProps {
  productId: string;
  /** reviewCount hiện tại — đổi → refetch (cache invalidate theo count). */
  reviewCount: number;
}

/**
 * Panel "Tóm tắt từ AI" đầu tab Đánh giá (Đợt 2 #3). Fetch /api/chat/review-summary;
 * tự ẩn (render null) khi: đang tải, lỗi, hoặc chưa đủ review (summary=null). KHÔNG
 * bao giờ chặn phần đánh giá thật bên dưới.
 */
export default function ReviewSummary({ productId, reviewCount }: ReviewSummaryProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(
          `/api/chat/review-summary?productId=${encodeURIComponent(productId)}`,
          { cache: 'no-store' },
        );
        const env = r.ok ? await r.json() : null;
        if (!cancelled) setSummary(env?.data?.summary ?? null);
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // reviewCount trong deps: review thay đổi → tóm tắt lại.
  }, [productId, reviewCount]);

  if (loading) {
    return (
      <div className={styles.panel} aria-busy="true">
        <div className={styles.header}>
          <span className={styles.badge}>✨ Tóm tắt từ AI</span>
        </div>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLineShort} />
      </div>
    );
  }

  if (!summary) return null; // chưa đủ review hoặc lỗi → ẩn panel

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
