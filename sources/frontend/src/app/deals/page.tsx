'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PageHero from '@/components/ui/PageHero/PageHero';
import ProductCard from '@/components/ui/ProductCard/ProductCard';
import RetrySection from '@/components/ui/RetrySection/RetrySection';
import { listProducts } from '@/services/products';
import type { Product } from '@/types';
import styles from './page.module.css';

export default function DealsPage() {
  const [deals, setDeals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const resp = await listProducts({ page: 0, size: 24, sort: 'createdAt,desc' }).catch(() =>
        listProducts({ page: 0, size: 24 }),
      );
      // Backend chưa có filter "đang giảm giá" — lọc client theo originalPrice > price.
      const onSale = (resp?.content ?? []).filter(
        (p) => p.originalPrice != null && p.originalPrice > p.price,
      );
      setDeals(onSale);
    } catch {
      setFailed(true);
      setDeals([]);
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
        eyebrow="Ưu đãi"
        title="Giảm giá công nghệ"
        description="Săn deal laptop, điện thoại và phụ kiện chính hãng với mức giá tốt nhất. Số lượng có hạn."
        image="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?fm=webp&q=80&w=1600"
        cta={{ label: 'Xem tất cả sản phẩm', href: '/products' }}
      />

      <section className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.heading}>Đang giảm giá</h2>

          {loading ? (
            <div className={styles.grid}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`${styles.skeleton} skeleton`} />
              ))}
            </div>
          ) : failed ? (
            <RetrySection onRetry={() => load()} loading={loading} />
          ) : deals.length === 0 ? (
            <div className={styles.empty}>
              <h3>Chưa có ưu đãi nào</h3>
              <p>Hiện chưa có sản phẩm giảm giá. Ghé lại sau hoặc xem toàn bộ sản phẩm.</p>
              <Link href="/products" className={styles.emptyCta}>Xem tất cả sản phẩm</Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {deals.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
