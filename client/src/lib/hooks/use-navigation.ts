'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useUi } from '../store/ui-store';
import { PAGE_ROUTES, pageFromPath } from '../utils/labels';

/** Page switching of the original interface mapped onto Next.js routes. */
export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const page = pageFromPath(pathname);
  const changePage = useCallback(
    (name: string) => {
      useUi.getState().set({ query: '', category: 'All categories', popover: '' });
      router.push(PAGE_ROUTES[name] ?? '/overview');
    },
    [router],
  );
  return { page, pathname, router, changePage };
}
