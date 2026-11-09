'use client';

import { Suspense } from 'react';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { useMounted } from '@/lib/hooks/use-mounted';

export default function LoginPage() {
  const mounted = useMounted();
  // Preferences (theme, language) live in the browser: render after hydration.
  if (!mounted) return <div className="auth-screen lg" />;
  return (
    <Suspense fallback={<div className="auth-screen lg" />}>
      <LoginScreen />
    </Suspense>
  );
}
