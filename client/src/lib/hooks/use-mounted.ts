'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => undefined;

/** false during the server render and hydration, true afterwards (browser-only state is safe to read). */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}
