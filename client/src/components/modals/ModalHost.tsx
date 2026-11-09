'use client';

import { Icon } from '@/components/icons/Icon';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useInventory } from '@/lib/hooks/use-inventory';
import { useUi } from '@/lib/store/ui-store';
import { BatchForm } from './BatchForm';
import { ProductView } from './ProductView';

/** The shared modal of the original interface: product card or the «Новая партия» form. */
export function ModalHost() {
  const { text } = useI18n();
  const modal = useUi((s) => s.modal);
  const viewedId = useUi((s) => s.viewedPurchaseId);
  const setModal = useUi((s) => s.setModal);
  const setViewed = useUi((s) => s.setViewedPurchase);
  const { products, batches } = useInventory();
  const selected = viewedId ? products.find((p) => p.id === viewedId) ?? null : null;
  if (!modal && !selected) return null;
  const close = () => {
    setModal(null);
    setViewed(null);
  };
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <section
        className={'modal panel' + (selected ? ' product-view' : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button className="icon-button modal-close" aria-label={text('Закрыть', 'Yopish')} onClick={close}>
          <Icon name="close" />
        </button>
        {selected ? <ProductView product={selected} batches={batches} /> : <BatchForm />}
      </section>
    </div>
  );
}
