'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import styles from './ProfileShell.module.css';

/**
 * Khung chung cho mọi trang /profile/* — sidebar 3 mục luôn hiển thị, nội dung
 * route con render trong <main>. Active state suy ra từ pathname nên chuyển mục
 * chỉ là điều hướng route bình thường (sidebar cố định, không "trang mới").
 */

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavLink[] = [
  {
    href: '/profile',
    label: 'Thông tin cá nhân',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: '/profile/orders',
    label: 'Đơn hàng',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
      </svg>
    ),
  },
  {
    href: '/profile/addresses',
    label: 'Địa chỉ',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    href: '/profile/settings',
    label: 'Cài đặt bảo mật',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

const TITLES: Record<string, string> = {
  '/profile': 'Tài khoản của tôi',
  '/profile/orders': 'Lịch sử đơn hàng',
  '/profile/addresses': 'Sổ địa chỉ',
  '/profile/settings': 'Cài đặt tài khoản',
};

/** Một link là active khi pathname trùng, hoặc là route con của nó (vd /profile/orders/123). */
function isActive(pathname: string, href: string): boolean {
  if (href === '/profile') return pathname === '/profile';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ProfileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const displayName = user?.name || 'Khách';
  const displayEmail = user?.email || '—';
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  // Title khớp prefix dài nhất (vd /profile/orders/123 → "Lịch sử đơn hàng").
  const title =
    TITLES[pathname] ??
    Object.entries(TITLES)
      .filter(([key]) => key !== '/profile' && pathname.startsWith(key))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    'Tài khoản của tôi';

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>{title}</h1>
        </div>
      </div>

      <div className={`${styles.container} ${styles.content}`}>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.userCard}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" className={styles.avatar} />
                : <div className={styles.avatar}>{initial}</div>}
              <div>
                <p className={styles.userName}>{displayName}</p>
                <p className={styles.userEmail}>{displayEmail}</p>
              </div>
            </div>
            <nav className={styles.sideNav}>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive(pathname, item.href) ? styles.navActive : ''}`}
                  aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </div>
  );
}
