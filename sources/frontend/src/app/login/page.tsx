'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Banner from '@/components/ui/Banner/Banner';
import { login, loginWithGoogle } from '@/services/auth';
import { ApiError } from '@/services/errors';
import { useAuth } from '@/providers/AuthProvider';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Sanitize `returnTo` query param.
 *
 * - T-04-03 open-redirect hardening: chỉ chấp nhận relative path bắt đầu bằng '/'
 *   và KHÔNG bắt đầu '//' (chặn protocol-relative URL như '//evil.example.com').
 * - BUG-FIX (login-success-redirect-loop): từ chối returnTo trỏ về chính các trang
 *   auth (/login, /register) — nếu không, một lần 401 trên endpoint không-auth khi
 *   user đang ở /login sẽ tạo URL `/login?returnTo=%2Flogin`, và sau khi đăng nhập
 *   thành công router.replace(returnTo) sẽ đưa về lại /login (vòng lặp).
 */
function sanitizeReturnTo(raw: string | null): string {
  if (!raw) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  // So sánh phần pathname (bỏ query/hash) với danh sách auth pages.
  const pathOnly = raw.split('?')[0].split('#')[0].toLowerCase();
  const normalized = pathOnly.endsWith('/') && pathOnly.length > 1
    ? pathOnly.slice(0, -1)
    : pathOnly;
  if (normalized === '/login' || normalized === '/register') return '/';
  return raw;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));

  const { login: authLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // After client-side navigation, the GIS script may already be present.
  // If so, mark it as loaded to trigger button rendering without needing a full refresh.
  useEffect(() => {
    if (!scriptLoaded && typeof window !== 'undefined' && window.google) {
      setScriptLoaded(true);
    }
  }, [scriptLoaded]);

  // Điều hướng sau khi đăng nhập thành công — dùng chung cho cả password và Google.
  const finishLogin = useCallback(
    async (data: { user: { id: string; email: string; username?: string; roles?: string; role?: string } }) => {
      // Phase 18 / D-13: await để cart merge xong trước khi chuyển trang.
      await authLogin({ id: data.user.id, email: data.user.email, name: data.user.username ?? data.user.email });
      const isAdmin = Boolean(data.user?.roles?.includes('ADMIN') || data.user?.role === 'ADMIN');
      router.replace(isAdmin ? '/admin' : returnTo);
    },
    [authLogin, router, returnTo],
  );

  // Callback GIS trả về khi user chọn tài khoản Google — credential là ID token.
  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      setApiError(null);
      setLoading(true);
      try {
        const data = await loginWithGoogle(response.credential);
        await finishLogin(data);
      } catch {
        setApiError('Đăng nhập bằng Google thất bại, vui lòng thử lại');
      } finally {
        setLoading(false);
      }
    },
    [finishLogin],
  );

  // Khởi tạo Google Identity Services + render nút thật khi script đã load.
  useEffect(() => {
    if (!scriptLoaded || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return;
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      // Tắt FedCM cho nút → account chooser mở dạng popup cửa sổ thật (trình duyệt
      // tự căn GIỮA màn hình) thay vì khung FedCM neo góc phải. Vẫn trả ID token.
      use_fedcm_for_button: false,
      ux_mode: 'popup',
    });
    // Re-render safely in case the container has stale content after navigation.
    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 392,
    });
  }, [scriptLoaded, handleGoogleCredential]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Vui lòng nhập email';
    if (!password.trim()) newErrors.password = 'Vui lòng nhập mật khẩu';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setApiError(null);
    setLoading(true);
    try {
      const data = await login({ email, password });
      await finishLogin(data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        // Per UI-SPEC: 401 → Banner form-level (không highlight field)
        setApiError('Email hoặc mật khẩu không chính xác. Vui lòng thử lại');
      } else {
        setApiError('Có lỗi xảy ra, vui lòng thử lại');
      }
    } finally {
      setLoading(false);
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className={styles.page}>
      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <h1 className={styles.formTitle}>Đăng nhập</h1>
          <p className={styles.formSubtitle}>
            Chào mừng trở lại! Đăng nhập để tiếp tục mua sắm
          </p>
        </div>

        {apiError && <Banner count={1}>{apiError}</Banner>}
        {errorCount > 0 && <Banner count={errorCount} />}

        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            fullWidth
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            }
          />

          <Input
            label="Mật khẩu"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            fullWidth
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
          />

          <div className={styles.formOptions}>
            <label className={styles.checkbox}>
              <input type="checkbox" />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <Link href="/forgot-password" className={styles.forgotLink}>
              Quên mật khẩu?
            </Link>
          </div>

          <Button type="submit" size="lg" fullWidth loading={loading} disabled={loading}>
            Đăng nhập
          </Button>
        </form>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className={styles.divider}>
              <span>hoặc</span>
            </div>
            <Script
              src="https://accounts.google.com/gsi/client"
              strategy="afterInteractive"
              onLoad={() => setScriptLoaded(true)}
            />
            <div ref={googleButtonRef} className={styles.googleButton} />
          </>
        )}

        <p className={styles.switchAuth}>
          Chưa có tài khoản?{' '}
          <Link href="/register" className={styles.switchLink}>Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <LoginPageContent />
    </Suspense>
  );
}
