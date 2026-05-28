'use client';

import { useMemo, useState } from 'react';

/** 'all' = hiển thị toàn bộ trong 1 trang. */
export type PageSize = 10 | 25 | 50 | 'all';

export const PAGE_SIZE_OPTIONS: PageSize[] = [10, 25, 50, 'all'];

interface ClientPagination<T> {
  pageItems: T[];
  page: number;
  totalPages: number;
  pageSize: PageSize;
  setPage: (p: number) => void;
  setPageSize: (s: PageSize) => void;
}

/**
 * Phân trang client-side cho danh sách đã nằm sẵn trong bộ nhớ (các bảng admin
 * fetch toàn bộ rồi lọc trên client). Trả về lát cắt trang hiện tại + điều khiển.
 *
 * Khi `items` đổi (do search/filter) mà trang hiện tại vượt quá totalPages mới,
 * page được kẹp lại trong lúc cắt — nhưng KHÔNG tự setState ở đây để tránh render
 * thừa; caller reset page khi đổi bộ lọc nếu cần.
 */
export function useClientPagination<T>(items: T[], initialSize: PageSize = 10): ClientPagination<T> {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSizeRaw] = useState<PageSize>(initialSize);

  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(items.length / pageSize));

  // Kẹp page vào [0, totalPages-1] khi cắt (phòng items co lại sau filter).
  const safePage = Math.min(page, totalPages - 1);

  const pageItems = useMemo(() => {
    if (pageSize === 'all') return items;
    const start = safePage * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  // Đổi page-size → quay về trang đầu để không kẹt ngoài phạm vi.
  const setPageSize = (s: PageSize) => {
    setPageSizeRaw(s);
    setPage(0);
  };

  return { pageItems, page: safePage, totalPages, pageSize, setPage, setPageSize };
}
