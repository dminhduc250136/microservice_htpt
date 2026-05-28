'use client';

import React from 'react';
import { PAGE_SIZE_OPTIONS, type PageSize } from '@/hooks/useClientPagination';
import styles from './PageSizeSelect.module.css';

interface PageSizeSelectProps {
  value: PageSize;
  onChange: (size: PageSize) => void;
}

const LABELS: Record<string, string> = { '10': '10', '25': '25', '50': '50', all: 'Tất cả' };

/** Bộ chọn số dòng hiển thị mỗi trang cho bảng admin (10 / 25 / 50 / Tất cả). */
export default function PageSizeSelect({ value, onChange }: PageSizeSelectProps) {
  return (
    <label className={styles.wrap}>
      <span className={styles.label}>Hiển thị</span>
      <select
        className={styles.select}
        value={String(value)}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === 'all' ? 'all' : (Number(v) as PageSize));
        }}
        aria-label="Số dòng mỗi trang"
      >
        {PAGE_SIZE_OPTIONS.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {LABELS[String(opt)]}
          </option>
        ))}
      </select>
      <span className={styles.label}>/ trang</span>
    </label>
  );
}
