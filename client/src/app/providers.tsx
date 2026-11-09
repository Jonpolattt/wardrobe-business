'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AppApolloProvider } from '@/lib/apollo/provider';
import { useTheme } from '@/lib/hooks/use-theme';
import { usePreferences } from '@/lib/store/preferences-store';

/** Keeps <html data-theme / data-palette / lang> in sync with the preferences (smooth switch, no flash on load). */
function ThemeController() {
  const theme = useTheme();
  const palette = usePreferences((s) => s.palette);
  const locale = usePreferences((s) => s.locale);
  const mounted = useRef(false);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.palette = palette;
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    root.classList.add('theme-transition');
    const timer = window.setTimeout(() => root.classList.remove('theme-transition'), 260);
    return () => window.clearTimeout(timer);
  }, [theme, palette]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppApolloProvider>
      <ThemeController />
      {children}
    </AppApolloProvider>
  );
}
