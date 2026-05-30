'use client';
import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header/Header';
import Footer from './Footer/Footer';

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }
  return (
    <>
      {/* Header dùng useSearchParams → Suspense bắt buộc ở Next.js App Router. */}
      <Suspense fallback={<div style={{ height: 64 }} />}>
        <Header />
      </Suspense>
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </>
  );
}
