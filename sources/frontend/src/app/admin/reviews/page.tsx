'use client';

/**
 * Phase 21 / Plan 21-04 (REV-06) — Admin moderation page cho reviews.
 *
 * Columns: Sản phẩm | Reviewer | Rating | Trích đoạn | Trạng thái | Ngày tạo | Hành động
 * Filter: Tất cả | Đang hiện | Đã ẩn | Đã xoá (default Tất cả)
 * Pagination: server-side ?page=&size=20
 *
 * Actions per row (D-17):
 *   - hidden=false → "Ẩn" → setReviewVisibility(id, true)
 *   - hidden=true  → "Bỏ ẩn" → setReviewVisibility(id, false)
 *   - "Xoá" (đỏ)   → window.confirm + hardDeleteReview(id)
 *   - deletedAt != null → chỉ hiện "Xoá" (admin hard-delete row đã soft-delete)
 *
 * Toast wording (CONTEXT specifics 240): "Đã ẩn review" / "Đã bỏ ẩn review" / "Đã xoá vĩnh viễn".
 * Hard-delete confirm (specifics 238): "Xoá vĩnh viễn review này? Không thể hoàn tác."
 */

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import Badge from '@/components/ui/Badge/Badge';
import RetrySection from '@/components/ui/RetrySection/RetrySection';
import { useToast } from '@/components/ui/Toast/Toast';
import Pagination from '@/components/ui/Pagination/Pagination';
import PageSizeSelect from '@/components/ui/Pagination/PageSizeSelect';
import type { PageSize } from '@/hooks/useClientPagination';
import { useUrlState } from '@/hooks/useUrlState';
import {
  listAdminReviews,
  setReviewVisibility,
  hardDeleteReview,
} from '@/services/reviews';
import type { AdminReview } from '@/types';

type FilterValue = 'all' | 'visible' | 'hidden' | 'deleted';

function statusBadge(r: AdminReview) {
  if (r.deletedAt) return <Badge variant="default">Đã xoá</Badge>;
  if (r.hidden) return <Badge variant="out-of-stock">Ẩn</Badge>;
  return <Badge variant="new">Hiện</Badge>;
}

function truncate(text: string | null | undefined, max = 60): string {
  const s = text ?? '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN');
  } catch {
    return iso;
  }
}

function AdminReviewsPageContent() {
  const { get, getNum, patch } = useUrlState();
  const page = getNum('page', 0, { min: 0 });
  const pageSizeRaw = get('size');
  const pageSize: PageSize = pageSizeRaw === 'all'
    ? 'all'
    : ([10, 25, 50] as const).includes(Number(pageSizeRaw) as 10 | 25 | 50)
      ? (Number(pageSizeRaw) as PageSize)
      : 10;
  const size = pageSize === 'all' ? 1000 : pageSize;
  const filterRaw = get('filter');
  const filter: FilterValue = (['visible', 'hidden', 'deleted'] as const).includes(filterRaw as 'visible' | 'hidden' | 'deleted')
    ? (filterRaw as FilterValue)
    : 'all';
  const setPage = (p: number) => patch({ page: p });
  const setPageSize = (s: PageSize) => patch({ size: s, page: 0 });
  const setFilter = (v: FilterValue) => patch({ filter: v === 'all' ? undefined : v, page: 0 });
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [meta, setMeta] = useState<{
    totalElements: number;
    totalPages: number;
    isLast: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const resp = await listAdminReviews(page, size, filter);
      setReviews(resp.content);
      setMeta({
        totalElements: resp.totalElements,
        totalPages: resp.totalPages,
        isLast: resp.isLast,
      });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [page, size, filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function onToggleHidden(r: AdminReview) {
    try {
      await setReviewVisibility(r.id, !r.hidden);
      showToast(r.hidden ? 'Đã bỏ ẩn review' : 'Đã ẩn review', 'success');
      await load();
    } catch {
      showToast('Không thể cập nhật trạng thái', 'error');
    }
  }

  async function onHardDelete(r: AdminReview) {
    if (!window.confirm('Xoá vĩnh viễn review này? Không thể hoàn tác.')) return;
    try {
      await hardDeleteReview(r.id);
      showToast('Đã xoá vĩnh viễn', 'success');
      await load();
    } catch {
      showToast('Không thể xoá review', 'error');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý đánh giá</h1>
        <div className={styles.filterRow}>
          <select
            className={styles.filterSelect}
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterValue)}
            aria-label="Lọc đánh giá"
          >
            <option value="all">Tất cả</option>
            <option value="visible">Đang hiện</option>
            <option value="hidden">Đã ẩn</option>
            <option value="deleted">Đã xoá (author)</option>
          </select>
          {meta && (
            <span className={styles.count}>{meta.totalElements} đánh giá</span>
          )}
          <PageSizeSelect value={pageSize} onChange={setPageSize} />
        </div>
      </div>

      {failed && <RetrySection onRetry={load} loading={loading} />}

      {!failed && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Reviewer</th>
                <th>Rating</th>
                <th>Nội dung</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                [...Array(5)].map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td colSpan={7}>
                      <div
                        className="skeleton"
                        style={{ height: 48, borderRadius: 'var(--radius-md)' }}
                      />
                    </td>
                  </tr>
                ))}

              {!loading && reviews.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <p className={styles.empty}>
                      Không có đánh giá nào trong bộ lọc hiện tại.
                    </p>
                  </td>
                </tr>
              )}

              {!loading &&
                reviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.productSlug ? (
                        <Link
                          href={`/products/${r.productSlug}`}
                          className={styles.productLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {r.productName ?? r.productSlug}
                        </Link>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td>{r.reviewerName}</td>
                    <td className={styles.rating}>
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(Math.max(0, 5 - r.rating))}
                    </td>
                    <td
                      title={r.content ?? ''}
                      className={styles.contentCell}
                    >
                      {truncate(r.content, 60)}
                    </td>
                    <td>{statusBadge(r)}</td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      <div className={styles.actions}>
                        {!r.deletedAt && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => onToggleHidden(r)}
                          >
                            {r.hidden ? 'Bỏ ẩn' : 'Ẩn'}
                          </button>
                        )}
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => onHardDelete(r)}
                        >
                          Xoá
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && (
        <Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} alwaysShow />
      )}
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 'var(--space-6)' }}>Đang tải...</div>}>
      <AdminReviewsPageContent />
    </Suspense>
  );
}
