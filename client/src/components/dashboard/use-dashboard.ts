'use client';

import { useQuery } from '@apollo/client/react';
import { DASHBOARD_QUERY } from '@/lib/graphql/queries';
import { useUi } from '@/lib/store/ui-store';
import type { DashboardData } from '@/lib/types/api';

export const PERIOD_DAYS: Record<string, number> = { 'Last 7 days': 7, 'Last 30 days': 30, 'Last 90 days': 90 };

/** Dashboard totals from the backend: for the period, or for the selected products / batches. */
export function useDashboard() {
  const period = useUi((s) => s.period);
  const purchaseIds = useUi((s) => s.selectedProducts);
  const batchIds = useUi((s) => s.selectedBatches);
  const hasSelection = purchaseIds.length > 0 || batchIds.length > 0;
  const { data, previousData, loading, error } = useQuery<DashboardData>(DASHBOARD_QUERY, {
    variables: {
      filter: {
        periodDays: PERIOD_DAYS[period] ?? 30,
        ...(hasSelection ? { purchaseIds, batchIds } : {}),
      },
    },
  });
  const current = data ?? previousData;
  return { dashboard: current?.dashboard ?? null, hasSelection, loading: loading && !current, error };
}
