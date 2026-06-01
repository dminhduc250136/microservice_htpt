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
  /**
   * Luôn render thanh phân trang kể cả khi chỉ có 1 trang (mặc định false → ẩn
   * khi totalPages<=1). Bật cho bảng admin để UI ổn định: 1 trang vẫn hiện nút
   * "1" + Trước/Sau (cả hai tự disable vì page là first & last cùng lúc).
   */
  alwaysShow?: boolean;
}

/** Số trang lân cận hiển thị mỗi bên trang hiện tại (sliding window). */
const SIBLINGS = 2;

/**
 * Sinh danh sách item hiển thị: số trang (1-based) hoặc 'gap' cho dấu "…".
 *
 * Sliding window: hiển thị trang hiện tại ± {@link SIBLINGS} trang lân cận, cùng
 * trang ĐẦU (1) và trang CUỐI (total). Chỉ 1 dấu "…" mỗi bên khi có cách quãng.
 * Khác cách cũ (kẹp current giữa 2 ellipsis) — giờ thấy rõ các trang liền kề để
 * nhảy nhanh. Ví dụ total=15:
 *   current 2  → "1 2 3 4 5 … 15"        (sát đầu, không gap trái)
 *   current 6  → "1 … 4 5 6 7 8 … 15"    (giữa, gap 2 bên)
 *   current 14 → "1 … 11 12 13 14 15"    (sát cuối, không gap phải)
 */
function buildPages(current1: number, total: number): (number | 'gap')[] {
  // Tập trang luôn hiện: 1, total, và current ± SIBLINGS.
  const left = Math.max(1, current1 - SIBLINGS);
  const right = Math.min(total, current1 + SIBLINGS);

  const pages: (number | 'gap')[] = [];

  // Trang 1 + (gap HOẶC trang 2) ở bên trái cửa sổ.
  if (left > 1) {
    pages.push(1);
    // left=2 → window đã bắt đầu từ 2, không cần chèn gì (trang 1 liền window).
    // left=3 → trang 2 bị bỏ → hiện luôn "2" cho gọn (tránh "1 … 3").
    // left>3 → có khoảng cách thật → "…".
    if (left === 3) pages.push(2);
    else if (left > 3) pages.push('gap');
  }

  // Cửa sổ quanh current.
  for (let p = left; p <= right; p++) pages.push(p);

  // (gap HOẶC trang total-1) + trang cuối ở bên phải cửa sổ.
  if (right < total) {
    if (right === total - 2) pages.push(total - 1);
    else if (right < total - 2) pages.push('gap');
    pages.push(total);
  }

  return pages;
}

export default function Pagination({ page, totalPages, onPageChange, alwaysShow = false }: PaginationProps) {
  // Không có gì để phân trang → ẩn, trừ khi alwaysShow (admin muốn UI ổn định).
  if (totalPages <= 1 && !alwaysShow) return null;

  // Kẹp về tối thiểu 1 trang để render an toàn khi danh sách rỗng/1 trang.
  const safeTotal = Math.max(1, totalPages);
  const current1 = page + 1; // 1-based để hiển thị
  const items = buildPages(current1, safeTotal);

  return (
    <nav className={styles.pagination} aria-label="Phân trang">
      <div className={styles.controls}>
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
          disabled={page >= safeTotal - 1}
          aria-label="Trang sau"
        >
          <span className={styles.navLabel}>Sau</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <p className={styles.info}>
        Trang {current1} / {safeTotal}
      </p>
    </nav>
  );
}
