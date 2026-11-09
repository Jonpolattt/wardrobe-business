'use client';

import type { ReactNode } from 'react';
import { AuthGate } from '@/components/auth/AuthGate';
import { AppShell } from '@/components/layout/AppShell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
