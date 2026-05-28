'use client';

/**
 * Pagination — thanh phân trang nút số (Trước / 1 2 3 … / Sau).
 *
 * Dùng cho danh sách có totalPages từ PaginatedResponse. Hiển thị tối đa 1 cửa
 * sổ trang quanh trang hiện tại + trang đầu/cuối, chèn dấu "…" khi cách quãng.
 * Trang đánh số 0-based ở props (khớp Spring Pageable) nhưng hiển thị 1-based.
 */

import React from 'react';
import styles from './Pagination.module.css';

interface PaginationProps {
  /** Trang hiện tại — 0-based (khớp backend Spring Pageable). */
  page: number;
  /** Tổng số trang. */
  totalPages: number;
  /** Gọi khi user chọn trang khác — nhận index 0-based. */
  onPageChange: (page: number) => void;
}

/**
 * Sinh danh sách item hiển thị: số trang (1-based) hoặc 'gap' cho dấu "…".
 *
 * Luôn giữ 2 trang ĐẦU (1, 2) và 2 trang CUỐI (total-1, total). Khi trang hiện
 * tại nằm ngoài vùng đầu/cuối, chèn nó vào giữa kèm dấu "…" hai bên — bấm
 * next/prev thì số ở giữa trượt theo. Ví dụ total=10:
 *   current 1-3 → "1 2 3 … 9 10"   (gần đầu, current đã nằm trong 2 đầu)
 *   current 6   → "1 2 … 6 … 9 10" (giữa)
 *   current 8-10→ "1 2 … 8 9 10"   (gần cuối)
 */
function buildPages(current1: number, total: number): (number | 'gap')[] {
  // Ít trang (≤6) → hiện hết, không cần "…".
  if (total <= 6) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'gap')[] = [1, 2];

  // current nằm sát đầu (≤4) → nối liền tới current, "…", 2 cuối.
  if (current1 <= 4) {
    for (let p = 3; p <= Math.max(3, current1); p++) pages.push(p);
    pages.push('gap');
  } else if (current1 >= total - 3) {
    // current sát cuối → "…", các trang từ current tới sát 2 cuối.
    pages.push('gap');
    for (let p = Math.min(total - 2, current1); p <= total - 2; p++) pages.push(p);
  } else {
    // current ở giữa → "1 2 … [current] … (total-1) total".
    pages.push('gap', current1, 'gap');
  }

  pages.push(total - 1, total);
  return pages;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  // Không có gì để phân trang.
  if (totalPages <= 1) return null;

  const current1 = page + 1; // 1-based để hiển thị
  const items = buildPages(current1, totalPages);

  return (
    <nav className={styles.pagination} aria-label="Phân trang">
      <button
        className={styles.navBtn}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 0}
        aria-label="Trang trước"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className={styles.navLabel}>Trước</span>
      </button>

      <ul className={styles.pageList}>
        {items.map((item, idx) =>
          item === 'gap' ? (
            <li key={`gap-${idx}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                className={`${styles.pageBtn} ${item === current1 ? styles.pageBtnActive : ''}`}
                onClick={() => onPageChange(item - 1)}
                aria-label={`Trang ${item}`}
                aria-current={item === current1 ? 'page' : undefined}
              >
                {item}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        className={styles.navBtn}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        aria-label="Trang sau"
      >
        <span className={styles.navLabel}>Sau</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </nav>
  );
}
