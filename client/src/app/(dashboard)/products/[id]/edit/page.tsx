'use client';

import { useParams } from 'next/navigation';
import { Icon } from '@/components/icons/Icon';
import { LoadState } from '@/components/layout/LoadState';
import { ProductForm, valuesFromLot } from '@/components/products/ProductForm';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useInventory } from '@/lib/hooks/use-inventory';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { text } = useI18n();
  const { products, batches, loading, error, refetch } = useInventory();
  if (loading || error) return <LoadState error={error} onRetry={() => void refetch()} />;
  const lot = products.find((p) => p.id === id);
  if (!lot) {
    return (
      <div className="empty-state page-state">
        <Icon name="search" size={26} />
        <h3>{text('Товар не найден', 'Mahsulot topilmadi')}</h3>
        <p>{text('Возможно, он был удалён.', 'Ehtimol, u o‘chirilgan.')}</p>
      </div>
    );
  }
  return (
    <ProductForm
      key={lot.id}
      mode="edit"
      currency={lot.raw.currency}
      initial={valuesFromLot(lot, false)}
      product={lot}
      editing={lot}
      products={products}
      batches={batches}
      backHref={lot.batchId ? '/batches/' + lot.batchId : '/products'}
    />
  );
}
