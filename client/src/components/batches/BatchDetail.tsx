'use client';

import { Icon } from '@/components/icons/Icon';
import { LoadState } from '@/components/layout/LoadState';
import { ProductHead, ProductRow } from '@/components/products/ProductRows';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useInventory } from '@/lib/hooks/use-inventory';
import { useMoney } from '@/lib/hooks/use-money';
import { useNavigation } from '@/lib/hooks/use-navigation';

/** One batch: its totals (backend) and its purchase lots. */
export function BatchDetail({ id }: { id: string }) {
  const { text, tr, L, formatDate } = useI18n();
  const { amount } = useMoney();
  const { router } = useNavigation();
  const { products, batches, loading, error, refetch } = useInventory();
  if (loading || error) return <LoadState error={error} onRetry={() => void refetch()} />;
  const batch = batches.find((b) => b.id === id);
  if (!batch) {
    return (
      <section className="batch-detail">
        <button type="button" className="text-button batch-back" onClick={() => router.push('/batches')}>
          <Icon name="arrow" size={15} className="icon-flip" /> {text('Все партии', 'Barcha partiyalar')}
        </button>
        <div className="empty-state">
          <Icon name="box" size={26} />
          <h3>{text('Партия не найдена', 'Partiya topilmadi')}</h3>
          <p>{text('Возможно, она была удалена.', 'Ehtimol, u o‘chirilgan.')}</p>
        </div>
      </section>
    );
  }
  const list = products.filter((p) => p.batchId === batch.id);
  return (
    <section className="batch-detail" aria-labelledby="batch-detail-title">
      <button type="button" className="text-button batch-back" onClick={() => router.push('/batches')}>
        <Icon name="arrow" size={15} className="icon-flip" /> {text('Все партии', 'Barcha partiyalar')}
      </button>
      <div className="batches-heading">
        <div>
          <h1 id="batch-detail-title">
            {tr(batch.name)} <span className="batch-code">({batch.code})</span>
          </h1>
          <div className="batch-detail-meta">
            <span>{tr(batch.origin) || text('Не указано', 'Ko‘rsatilmagan')}</span>
            <span>·</span>
            <span>{formatDate(batch.date)}</span>
            <span className={'status ' + (batch.status === 'Delivered' ? '' : 'low')}>
              <i />
              {L(batch.status)}
            </span>
          </div>
        </div>
        <button className="button primary" onClick={() => router.push('/products/new?batch=' + batch.id)}>
          <Icon name="plus" size={18} />
          {text('Добавить товар', 'Mahsulot qo‘shish')}
        </button>
      </div>
      <div className="batch-stats">
        <div>
          <small>{text('Общий расход', 'Umumiy xarajat')}</small>
          <strong>{amount(batch.cost)}</strong>
        </div>
        <div>
          <small>{text('Чистая прибыль', 'Sof foyda')}</small>
          <strong>
            {amount(batch.profit)}
            <em className={batch.percent > 0 ? '' : batch.percent < 0 ? 'negative' : 'zero'}>{batch.percent}%</em>
          </strong>
        </div>
        <div>
          <small>{text('Общий оборот', 'Umumiy aylanma')}</small>
          <strong>{amount(batch.turnover)}</strong>
        </div>
      </div>
      <div className="batch-list" role="table" aria-label={text('Товары партии', 'Partiya mahsulotlari')}>
        <ProductHead showDate list={list} />
        <div className="batch-list-body">
          {list.length === 0 ? (
            <p className="batch-empty">{text('В этой партии пока нет товаров.', 'Bu partiyada hozircha mahsulot yo‘q.')}</p>
          ) : (
            list.map((p) => <ProductRow key={p.id} p={p} />)
          )}
        </div>
      </div>
    </section>
  );
}
