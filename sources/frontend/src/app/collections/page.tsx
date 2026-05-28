'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PageHero from '@/components/ui/PageHero/PageHero';
import RetrySection from '@/components/ui/RetrySection/RetrySection';
import { listCategories } from '@/services/products';
import type { Category } from '@/types';
import styles from './page.module.css';

export default function CollectionsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const resp = await listCategories();
      setCategories(resp?.content ?? []);
    } catch {
      setFailed(true);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main>
      <PageHero
        eyebrow="Bộ sưu tập"
        title="Khám phá theo danh mục"
        description="Chọn nhanh nhóm sản phẩm bạn cần — laptop, điện thoại, chuột, bàn phím, tai nghe — tất cả chính hãng."
        image="https://images.unsplash.com/photo-1498049794561-7780e7231661?fm=webp&q=80&w=1600"
      />

      <section className={styles.section}>
        <div className={styles.inner}>
          {loading ? (
            <div className={styles.grid}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`${styles.skeleton} skeleton`} />
              ))}
            </div>
          ) : failed ? (
            <RetrySection onRetry={() => load()} loading={loading} />
          ) : categories.length === 0 ? (
            <p className={styles.empty}>Chưa có danh mục nào.</p>
          ) : (
            <div className={styles.grid}>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className={styles.card}
                >
                  <div className={styles.icon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  </div>
                  <span className={styles.name}>{cat.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
