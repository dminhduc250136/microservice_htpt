import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/ui/PageHero/PageHero';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Về chúng tôi | LapTech Store',
  description:
    'LapTech Store — cửa hàng laptop, điện thoại và phụ kiện công nghệ chính hãng, bảo hành uy tín, giao nhanh toàn quốc.',
};

const VALUES = [
  { title: 'Chính hãng 100%', text: 'Mọi sản phẩm đều nguyên seal, đầy đủ hóa đơn VAT và bảo hành chính hãng từ nhà sản xuất.' },
  { title: 'Giá tốt mỗi ngày', text: 'Cập nhật giá liên tục theo thị trường, kèm ưu đãi thành viên và chương trình giảm giá thường xuyên.' },
  { title: 'Giao nhanh toàn quốc', text: 'Giao hàng nhanh trong 24h tại nội thành và 2–4 ngày trên toàn quốc, đóng gói an toàn.' },
  { title: 'Hỗ trợ tận tâm', text: 'Đội ngũ tư vấn am hiểu công nghệ, hỗ trợ trước và sau bán, đổi mới trong 7 ngày nếu lỗi nhà sản xuất.' },
];

const STATS = [
  { value: '100+', label: 'Sản phẩm công nghệ' },
  { value: '5', label: 'Danh mục chính' },
  { value: '24h', label: 'Giao hàng nội thành' },
  { value: '7 ngày', label: 'Đổi mới nếu lỗi' },
];

export default function AboutPage() {
  return (
    <main>
      <PageHero
        eyebrow="Về chúng tôi"
        title="LapTech Store"
        description="Cửa hàng công nghệ mang đến laptop, điện thoại và phụ kiện chính hãng với giá tốt, bảo hành uy tín và dịch vụ tận tâm."
        image="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?fm=webp&q=80&w=1600"
        cta={{ label: 'Khám phá sản phẩm', href: '/products' }}
      />

      <section className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.heading}>Giá trị của chúng tôi</h2>
          <div className={styles.valueGrid}>
            {VALUES.map((v) => (
              <div key={v.title} className={styles.valueCard}>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueText}>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.statSection}>
        <div className={styles.inner}>
          <div className={styles.statGrid}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.statCard}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Bắt đầu mua sắm cùng LapTech</h2>
            <p className={styles.ctaText}>Hàng nghìn sản phẩm chính hãng đang chờ bạn khám phá.</p>
            <Link href="/products" className={styles.ctaButton}>Mua sắm ngay</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
