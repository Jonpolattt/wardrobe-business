'use client';

import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { INVENTORY_QUERY } from '../graphql/queries';
import type { InventoryData } from '../types/api';
import { toUiBatch, toUiProduct } from '../types/inventory';

/** Purchase lots ("товары"), batches and categories from the backend. */
export function useInventory() {
  const { data, loading, error, refetch } = useQuery<InventoryData>(INVENTORY_QUERY);
  const products = useMemo(() => {
    const list = (data?.purchases ?? []).map(toUiProduct);
    // Best sellers first; lots without sales keep the newest-first order of the backend.
    return list.sort((a, b) => b.sold - a.sold);
  }, [data]);
  const batches = useMemo(() => (data?.batches ?? []).map(toUiBatch), [data]);
  return {
    products,
    batches,
    categories: data?.categories ?? [],
    loading: loading && !data,
    error: data ? undefined : error,
    refetch,
  };
}
