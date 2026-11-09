'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { refreshAccessToken } from '@/lib/auth/session';
import { useMounted } from '@/lib/hooks/use-mounted';
import { useRates } from '@/lib/hooks/use-money';
import { useAuthStore } from '@/lib/store/auth-store';

/**
 * Restores the session from the HttpOnly refresh cookie before the dashboard is
 * shown. This only decides what the browser renders — every request is still
 * authorised by the backend.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const status = useAuthStore((s) => s.status);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === 'unknown') void refreshAccessToken();
    if (status === 'anonymous') router.replace('/login?next=' + encodeURIComponent(pathname));
  }, [status, router, pathname]);
  if (!mounted || status !== 'authenticated') return <div className="app-boot" aria-busy="true" />;
  return <RatesReady>{children}</RatesReady>;
}

/** Amounts are shown in the chosen currency, so the shared rates are loaded first. */
function RatesReady({ children }: { children: ReactNode }) {
  const { rates, error } = useRates();
  if (!rates && !error) return <div className="app-boot" aria-busy="true" />;
  return <>{children}</>;
}
