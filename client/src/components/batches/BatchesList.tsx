'use client';

import { Icon } from '@/components/icons/Icon';
import { SelectionBar } from '@/components/dashboard/SelectionBar';
import { LoadState } from '@/components/layout/LoadState';
import { stopRow } from '@/components/products/ProductRows';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useInventory } from '@/lib/hooks/use-inventory';
import { useMoney } from '@/lib/hooks/use-money';
import { useNavigation } from '@/lib/hooks/use-navigation';
import { useUi } from '@/lib/store/ui-store';
import { downloadCsv } from '@/lib/utils/csv';
import { moduleLabels } from '@/lib/utils/labels';

const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** «Партии»: list of shipments with totals calculated by the backend from their purchase lots. */
export function BatchesList() {
  const { text, tr, L, locale, formatDate, itemsLabel } = useI18n();
  const { amount, currency, fromUzs } = useMoney();
  const { router } = useNavigation();
  const ui = useUi();
  const { batches, loading, error, refetch } = useInventory();
  if (loading || error) return <LoadState error={error} onRetry={() => void refetch()} />;
  const selected = ui.selectedBatches;
  const all = batches.length > 0 && batches.every((b) => selected.includes(b.id));
  const money2 = (uzs: number) => Math.round(fromUzs(uzs) * 100) / 100;
  const exportData = () => {
    downloadCsv('wardrobe-batches.csv', [
      [
        text('Партия', 'Partiya'),
        text('Кол-во товаров', 'Mahsulotlar soni'),
        text('Общая цена', 'Umumiy narx') + ' (' + currency + ')',
        text('Статус', 'Holat'),
        text('Чистая прибыль', 'Sof foyda') + ' (' + currency + ')',
        '%',
      ],
      ...batches.map((b) => [tr(b.name), b.units, money2(b.cost), L(b.status), money2(b.profit), b.percent]),
    ]);
    ui.setToast(text('Отчёт по партиям скачан.', 'Partiyalar hisoboti yuklab olindi.'));
  };
  return (
    <section className="batches-page" aria-labelledby="batches-title">
      <div className="batches-heading">
        <h1 id="batches-title">{moduleLabels[locale].Batches}</h1>
        <div className="heading-actions">
          <button className="button secondary" onClick={exportData}>
            <Icon name="download" size={17} />
            {text('Скачать отчёт', 'Hisobotni yuklab olish')}
          </button>
          <button className="button primary" onClick={() => ui.setModal('batch')}>
            <Icon name="plus" size={18} />
            {text('Добавить', 'Qo‘shish')}
          </button>
        </div>
      </div>
      <SelectionBar />
      <div className="batch-list" role="table" aria-label={text('Список партий', 'Partiyalar ro‘yxati')}>
        <div className="batch-row batch-row-head" role="row">
          <span role="columnheader" className="head-select">
            <label className="row-select" {...stopRow}>
              <input
                type="checkbox"
                checked={all}
                disabled={batches.length === 0}
                onChange={() => {
                  const ids = batches.map((b) => b.id);
                  ui.setSelectedBatches((cur) => (all ? cur.filter((x) => !ids.includes(x)) : Array.from(new Set([...cur, ...ids]))));
                }}
                aria-label={text('Выбрать все партии', 'Barcha partiyalarni tanlash')}
              />
            </label>
            {text('Название партии', 'Partiya nomi')}
          </span>
          <span role="columnheader">{text('Кол-во товаров', 'Mahsulotlar soni')}</span>
          <span role="columnheader">{text('Общая цена', 'Umumiy narx')}</span>
          <span role="columnheader">{text('Статус', 'Holat')}</span>
          <span role="columnheader">{text('Чистая прибыль', 'Sof foyda')}</span>
          <span role="columnheader" className="batch-actions-head">
            {text('Действия', 'Amallar')}
          </span>
        </div>
        <div className="batch-list-body">
          {batches.length === 0 ? (
            <p className="batch-empty">{text('Партий пока нет.', 'Hozircha partiyalar yo‘q.')}</p>
          ) : (
            batches.map((b) => {
              const percent = b.percent;
              const open = () => router.push('/batches/' + b.id);
              return (
                <div
                  className={'batch-row batch-card is-clickable' + (selected.includes(b.id) ? ' is-selected' : '')}
                  role="row"
                  key={b.id}
                  tabIndex={0}
                  title={text('Открыть партию', 'Partiyani ochish')}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target === e.currentTarget) open();
                  }}
                >
                  <span role="cell" className="batch-name has-select">
                    <label className="row-select" {...stopRow}>
                      <input
                        type="checkbox"
                        checked={selected.includes(b.id)}
                        onChange={() => ui.setSelectedBatches((list) => toggleIn(list, b.id))}
                        aria-label={text('Выбрать партию «' + tr(b.name) + '»', '«' + tr(b.name) + '» partiyasini tanlash')}
                      />
                    </label>
                    <span className="batch-name-text">
                      <strong>{tr(b.name)}</strong>
                      <small>
                        {b.code} · {tr(b.origin) || text('Не указано', 'Ko‘rsatilmagan')} · {formatDate(b.date)}
                      </small>
                    </span>
                  </span>
                  <span role="cell">{itemsLabel(b.units)}</span>
                  <span role="cell">{amount(b.cost)}</span>
                  <span role="cell">
                    <span className={'status ' + (b.status === 'Delivered' ? '' : 'low')}>
                      <i />
                      {L(b.status)}
                    </span>
                  </span>
                  <span role="cell" className="batch-profit">
                    {amount(b.profit)}
                    <em className={percent > 0 ? '' : percent < 0 ? 'negative' : 'zero'}>{percent}%</em>
                  </span>
                  <span role="cell" className="batch-actions">
                    <button
                      type="button"
                      className="button secondary batch-add-product"
                      title={text('Добавить товар в партию «' + tr(b.name) + '»', '«' + tr(b.name) + '» partiyasiga mahsulot qo‘shish')}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/products/new?batch=' + b.id);
                      }}
                    >
                      <Icon name="plus" size={16} />
                      {text('Добавить товар', 'Mahsulot qo‘shish')}
                    </button>
                    <button
                      type="button"
                      className="icon-button row-delete"
                      aria-label={text('Удалить партию «' + tr(b.name) + '»', '«' + tr(b.name) + '» partiyasini o‘chirish')}
                      title={text('Удалить партию', 'Partiyani o‘chirish')}
                      onKeyDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        ui.setPendingDelete({ kind: 'batch', id: b.id, name: tr(b.name) });
                      }}
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
