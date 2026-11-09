'use client';

import { Icon } from '@/components/icons/Icon';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useMoney } from '@/lib/hooks/use-money';
import { useUi } from '@/lib/store/ui-store';
import { useDashboard } from './use-dashboard';

/** Totals of the selected products and batches (calculated by the backend). */
export function SelectionBar() {
  const { text } = useI18n();
  const { amount } = useMoney();
  const selectedProducts = useUi((s) => s.selectedProducts);
  const selectedBatches = useUi((s) => s.selectedBatches);
  const clearSelection = useUi((s) => s.clearSelection);
  const { dashboard, hasSelection } = useDashboard();
  if (!hasSelection) return null;
  const totals = dashboard?.selection ? dashboard.current : null;
  const value = (v: string | undefined) => (totals && v !== undefined ? amount(Number(v)) : '…');
  const profit = totals ? Number(totals.profit) : 0;
  return (
    <div className="selection-bar" role="status">
      <span className="selection-bar-count">
        <Icon name="check" size={15} />
        {text('Выбрано', 'Tanlangan')}:{' '}
        {[
          selectedProducts.length ? text('товаров — ', 'mahsulot — ') + selectedProducts.length : '',
          selectedBatches.length ? text('партий — ', 'partiya — ') + selectedBatches.length : '',
        ]
          .filter(Boolean)
          .join(', ')}
      </span>
      <span className="selection-bar-stats">
        <span>
          {text('Выручка', 'Tushum')} <strong>{value(totals?.revenue)}</strong>
        </span>
        <span>
          {text('Расходы', 'Xarajatlar')} <strong>{value(totals?.expenses)}</strong>
        </span>
        <span>
          {text('Прибыль', 'Foyda')} <strong className={profit < 0 ? 'negative' : ''}>{value(totals?.profit)}</strong>
        </span>
      </span>
      <button type="button" className="button secondary selection-clear" onClick={clearSelection}>
        <Icon name="close" size={15} />
        {text('Сбросить выбор', 'Tanlovni bekor qilish')}
      </button>
    </div>
  );
}
