'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LoadState } from '@/components/layout/LoadState';
import { emptyValues, ProductForm, valuesFromLot } from '@/components/products/ProductForm';
import { useInventory } from '@/lib/hooks/use-inventory';
import { usePreferences } from '@/lib/store/preferences-store';

function NewProduct() {
  const params = useSearchParams();
  const currency = usePreferences((s) => s.currency);
  const { products, batches, loading, error, refetch } = useInventory();
  if (loading || error) return <LoadState error={error} onRetry={() => void refetch()} />;
  const batchId = params.get('batch') ?? '';
  const source = params.get('from') ? products.find((p) => p.id === params.get('from')) : undefined;
  const backHref = batchId && batches.some((b) => b.id === batchId) ? '/batches/' + batchId : '/products';
  return (
    <ProductForm
      key={source?.id ?? 'new:' + batchId}
      mode="add"
      currency={source ? source.raw.currency : currency}
      initial={source ? valuesFromLot(source, true) : emptyValues(batches.some((b) => b.id === batchId) ? batchId : '')}
      product={source}
      products={products}
      batches={batches}
      backHref={backHref}
    />
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<LoadState />}>
      <NewProduct />
    </Suspense>
  );
}
