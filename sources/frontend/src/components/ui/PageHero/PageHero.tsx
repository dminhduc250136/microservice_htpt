import React from 'react';
import Link from 'next/link';
import styles from './PageHero.module.css';

interface PageHeroProps {
  /** Nhãn nhỏ phía trên tiêu đề (vd "Bộ sưu tập"). */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Ảnh nền (URL Unsplash). Overlay gradient tối để chữ dễ đọc. */
  image: string;
  cta?: { label: string; href: string };
}

/**
 * Hero dùng chung cho các trang tĩnh (Bộ sưu tập / Ưu đãi / Về chúng tôi):
 * ảnh nền + overlay + nội dung căn trái. Server component, tái dùng design tokens.
 */
export default function PageHero({ eyebrow, title, description, image, cta }: PageHeroProps) {
  return (
    <section
      className={styles.hero}
      style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.25)), url(${image})` }}
    >
      <div className={styles.inner}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
        {cta && (
          <Link href={cta.href} className={styles.cta}>
            {cta.label}
          </Link>
        )}
      </div>
    </section>
  );
}
