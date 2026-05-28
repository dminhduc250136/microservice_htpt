'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button/Button';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Trang "Thông tin cá nhân" — chỉ render nội dung, sidebar + header do
 * profile/layout.tsx (ProfileShell) cung cấp. Chỉnh sửa + đổi mật khẩu dẫn sang
 * /profile/settings (nơi có logic thật) thay vì modal mock.
 */
export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const displayName = user?.name || 'Khách';
  const displayEmail = user?.email || '—';

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Thông tin cá nhân</h2>
      <div className={styles.profileGrid}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Họ tên</span>
          <span className={styles.infoValue}>{displayName}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Email</span>
          <span className={styles.infoValue}>{displayEmail}</span>
        </div>
      </div>
      <div className={styles.profileActions}>
        <Button variant="secondary" onClick={() => router.push('/profile/settings')}>
          Chỉnh sửa
        </Button>
        <Button variant="tertiary" onClick={() => router.push('/profile/settings#security')}>
          Đổi mật khẩu
        </Button>
      </div>
    </div>
  );
}
