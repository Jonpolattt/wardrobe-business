'use client';

import { useSyncExternalStore } from 'react';
import { usePreferences, type Theme } from '../store/preferences-store';

const QUERY = '(prefers-color-scheme: light)';

function subscribe(callback: () => void) {
  try {
    const media = window.matchMedia(QUERY);
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
  } catch {
    return () => undefined;
  }
}

const systemSnapshot = (): Theme => {
  try {
    return window.matchMedia(QUERY).matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

/** Light / dark mode actually applied: the saved choice or, for "Система", the OS setting. */
export function useTheme(): Theme {
  const modePref = usePreferences((s) => s.modePref);
  const system = useSyncExternalStore(subscribe, systemSnapshot, () => 'dark' as Theme);
  return modePref === 'system' ? system : modePref;
}
