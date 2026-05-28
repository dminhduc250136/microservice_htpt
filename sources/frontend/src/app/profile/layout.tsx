import React from 'react';
import ProfileShell from '@/components/layout/ProfileShell/ProfileShell';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProfileShell>{children}</ProfileShell>;
}
