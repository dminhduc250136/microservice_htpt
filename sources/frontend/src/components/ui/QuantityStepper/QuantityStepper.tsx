'use client';

/**
 * QuantityStepper — ô chọn số lượng dùng chung (product detail + cart).
 *
 * Controlled component: `value` (number) là nguồn sự thật từ parent, component
 * KHÔNG tự gọi API — debounce/optimistic do page quyết định.
 *
 * Tính năng:
 * - Nhập tay (input) ngoài 2 nút +/- → mua số lượng lớn không cần bấm nhiều lần.
 * - Luôn kẹp trong [min, max] (max = stock). Vượt max → clamp + gọi onClamp để
 *   page hiện toast.
 * - Fallback an toàn: nhập rỗng/chữ/số âm/thập phân → revert về `value` hợp lệ
 *   trước đó (không gọi onChange, không để input ở trạng thái hỏng).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './QuantityStepper.module.css';

interface QuantityStepperProps {
  value: number;
  /** Chỉ được gọi với giá trị ĐÃ hợp lệ + đã clamp trong [min, max]. */
  onChange: (next: number) => void;
  /** Giới hạn trên (= stock). undefined → không giới hạn. */
  max?: number;
  /** Giới hạn dưới. Mặc định 1. */
  min?: number;
  disabled?: boolean;
  /** Gọi khi giá trị bị kẹp về biên — để page hiện toast (vd "Chỉ còn N sản phẩm"). */
  onClamp?: (clampedTo: number, reason: 'max' | 'min') => void;
  size?: 'sm' | 'md';
  /** aria-label cho input (vd "Số lượng JBL Tour One M2"). */
  ariaLabel?: string;
}

/** Kẹp `n` vào [min, max]. Trả về cả lý do bị kẹp (nếu có) để parent báo toast. */
function clamp(n: number, min: number, max: number | undefined): { value: number; reason: 'max' | 'min' | null } {
  if (n < min) return { value: min, reason: 'min' };
  if (max !== undefined && n > max) return { value: max, reason: 'max' };
  return { value: n, reason: null };
}

export default function QuantityStepper({
  value,
  onChange,
  max,
  min = 1,
  disabled = false,
  onClamp,
  size = 'md',
  ariaLabel = 'Số lượng',
}: QuantityStepperProps) {
  // `draft` (string) cho phép user gõ tự do; đồng bộ lại theo `value` khi value đổi
  // (vd sau khi parent clamp, hoặc server trả số khác).
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  // Áp một giá trị số mới: kẹp trong [min,max], báo onClamp nếu bị kẹp, gọi onChange
  // nếu khác value hiện tại. Dùng chung cho nút +/- và commit input.
  const applyValue = useCallback(
    (raw: number) => {
      const { value: clamped, reason } = clamp(raw, min, max);
      if (reason) onClamp?.(clamped, reason);
      if (clamped !== value) onChange(clamped);
      // Luôn đồng bộ draft (kể cả khi clamp về đúng value cũ → cập nhật lại text).
      setDraft(String(clamped));
    },
    [min, max, value, onChange, onClamp],
  );

  // Commit input (blur / Enter): parse + validate. Không hợp lệ → revert về value.
  const commitDraft = useCallback(() => {
    const trimmed = draft.trim();
    // Chỉ chấp nhận chuỗi toàn chữ số (loại rỗng, chữ, dấu, số âm, thập phân).
    if (!/^\d+$/.test(trimmed)) {
      setDraft(String(value)); // fallback: giá trị hợp lệ trước đó
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isSafeInteger(parsed)) {
      setDraft(String(value));
      return;
    }
    applyValue(parsed);
  }, [draft, value, applyValue]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft();
      inputRef.current?.blur();
    }
  };

  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div className={`${styles.stepper} ${styles[size]}`} data-disabled={disabled || undefined}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => applyValue(value - 1)}
        disabled={disabled || atMin}
        aria-label="Giảm số lượng"
      >
        −
      </button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className={styles.input}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={handleInputKeyDown}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        className={styles.btn}
        onClick={() => applyValue(value + 1)}
        disabled={disabled || atMax}
        aria-label="Tăng số lượng"
      >
        +
      </button>
    </div>
  );
}
