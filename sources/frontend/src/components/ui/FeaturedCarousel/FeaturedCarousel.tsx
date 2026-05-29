'use client';

/**
 * FeaturedCarousel — danh sách sản phẩm nổi bật cuộn ngang + nút prev/next +
 * autoplay theo thời gian.
 *
 * Tách khỏi page.tsx để giữ trang chủ gọn. Dùng native scroll (overflow-x)
 * cho cảm giác vuốt mượt + scroll-snap; nút mũi tên gọi scrollBy theo chiều
 * rộng 1 card. Nút tự ẩn (disabled) khi đã ở đầu/cuối — fix việc card cuối bị
 * che mép phải mà không có cách điều hướng.
 *
 * Autoplay: cứ AUTOPLAY_MS lại cuộn sang phải 1 bước; tới cuối thì quay về đầu.
 * Tạm dừng khi hover/focus (tránh giật khi người dùng đang xem) và khi chỉ có
 * 1 màn hình sản phẩm (không có gì để cuộn).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ProductCard from '@/components/ui/ProductCard/ProductCard';
import type { Product } from '@/types';
import styles from './FeaturedCarousel.module.css';

interface FeaturedCarouselProps {
  products: Product[];
}

// Khoảng cuộn mỗi lần (nút bấm hoặc autoplay) ~ 1 card + gap.
const SCROLL_STEP = 296;
const AUTOPLAY_MS = 3500;

export default function FeaturedCarousel({ products }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [paused, setPaused] = useState(false);

  // Cập nhật trạng thái nút theo vị trí cuộn hiện tại.
  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    // Trừ 1px để bù sai số làm tròn của trình duyệt.
    setAtEnd(el.scrollLeft >= maxScroll - 1);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
    };
  }, [updateEdges, products.length]);

  const scrollByStep = useCallback((dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' });
  }, []);

  // Autoplay: cuộn phải đều đặn, tới cuối thì quay về đầu. Dừng khi hover/focus.
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 1) return; // không có gì để cuộn
      if (el.scrollLeft >= maxScroll - 1) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
      }
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div
      className={styles.wrapper}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <button
        type="button"
        className={`${styles.navArrow} ${styles.navPrev}`}
        onClick={() => scrollByStep(-1)}
        disabled={atStart}
        aria-label="Sản phẩm trước"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div
        ref={scrollRef}
        className={styles.featuredScroll}
        role="region"
        aria-label="Sản phẩm nổi bật — vuốt ngang hoặc dùng nút để xem thêm"
        tabIndex={0}
      >
        {products.map((product) => (
          <div key={product.id} className={styles.featuredCard}>
            <ProductCard product={product} variant="featured" />
          </div>
        ))}
      </div>

      <button
        type="button"
        className={`${styles.navArrow} ${styles.navNext}`}
        onClick={() => scrollByStep(1)}
        disabled={atEnd}
        aria-label="Sản phẩm kế tiếp"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
