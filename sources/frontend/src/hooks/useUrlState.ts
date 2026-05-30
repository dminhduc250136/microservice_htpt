'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * URL search params làm single source of truth cho UI state có thể share/bookmark:
 * page, size, q/keyword, filter, sort, ... Mỗi lần `patch` ghi vào URL bằng
 * router.replace (không spam history) → useSearchParams re-emit → component đọc
 * lại + fetch lại tự nhiên.
 *
 * Design quyết:
 * - Truyền value rỗng/undefined/null vào patch → XOÁ key khỏi URL (sạch hơn so với để key=""
 *   gửi xuống BE). Truyền undefined cho key chưa có cũng là no-op.
 * - Không treat "default value" (vd page=0) đặc biệt — URL có thể verbose 1 chút nhưng đơn giản,
 *   tránh phân tán defaults qua nhiều nơi.
 * - Mảng dùng `patchArray` riêng (?brands=a&brands=b) — list rỗng cũng xoá key.
 * - `replace` mặc định: history không nhồi mỗi click pagination / phím gõ search.
 *   Khi cần điều hướng "có ý nghĩa" (vd mở detail) → dùng router.push thông thường.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const get = useCallback((key: string): string | null => params.get(key), [params]);

  const getNum = useCallback(
    (key: string, def: number, opts?: { min?: number; max?: number }): number => {
      const raw = params.get(key);
      if (raw == null) return def;
      const n = Number(raw);
      if (!Number.isFinite(n)) return def;
      let v = n;
      if (opts?.min != null && v < opts.min) v = opts.min;
      if (opts?.max != null && v > opts.max) v = opts.max;
      return v;
    },
    [params],
  );

  const getAll = useCallback((key: string): string[] => params.getAll(key), [params]);

  const patch = useCallback(
    (updates: Record<string, string | number | boolean | null | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === '') {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const patchArray = useCallback(
    (key: string, values: string[]) => {
      const next = new URLSearchParams(params.toString());
      next.delete(key);
      for (const v of values) {
        if (v != null && v !== '') next.append(key, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  /**
   * Patch scalar + array trong 1 lần router.replace để tránh 2 fetch liên tiếp
   * (vd. brand multi-select + reset page=0 cùng lúc). Truyền `arrays` với value
   * `string[]` (rỗng → xoá key).
   */
  const patchMany = useCallback(
    (
      scalars: Record<string, string | number | boolean | null | undefined>,
      arrays: Record<string, string[]>,
    ) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(scalars)) {
        if (v === null || v === undefined || v === '') next.delete(k);
        else next.set(k, String(v));
      }
      for (const [k, vs] of Object.entries(arrays)) {
        next.delete(k);
        for (const v of vs) {
          if (v != null && v !== '') next.append(k, v);
        }
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return { get, getNum, getAll, patch, patchArray, patchMany };
}
