'use client';

import type { KeyboardEvent, MouseEvent } from 'react';
import { Icon } from '@/components/icons/Icon';
import { Garment } from '@/components/ui/Garment';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useMoney } from '@/lib/hooks/use-money';
import { useNavigation } from '@/lib/hooks/use-navigation';
import { useUi } from '@/lib/store/ui-store';
import type { UiProduct } from '@/lib/types/inventory';

export const stopRow = {
  onClick: (e: MouseEvent) => e.stopPropagation(),
  onKeyDown: (e: KeyboardEvent) => e.stopPropagation(),
};

const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** Header of the product table — the same columns on every page. */
export function ProductHead({ showDate = true, list }: { showDate?: boolean; list: UiProduct[] }) {
  const { text } = useI18n();
  const selected = useUi((s) => s.selectedProducts);
  const setSelected = useUi((s) => s.setSelectedProducts);
  const all = list.length > 0 && list.every((p) => selected.includes(p.id));
  const ids = list.map((p) => p.id);
  return (
    <div className={'batch-row batch-items-row batch-row-head' + (showDate ? '' : ' no-date')} role="row">
      <span role="columnheader" className="head-select">
        <label className="row-select" {...stopRow}>
          <input
            type="checkbox"
            checked={all}
            disabled={list.length === 0}
            onChange={() => setSelected((cur) => (all ? cur.filter((x) => !ids.includes(x)) : Array.from(new Set([...cur, ...ids]))))}
            aria-label={text('Выбрать все товары', 'Barcha mahsulotlarni tanlash')}
          />
        </label>
        {text('Название товара', 'Mahsulot nomi')}
      </span>
      <span role="columnheader">{text('Кол-во', 'Soni')}</span>
      <span role="columnheader">{text('Общая цена', 'Umumiy narx')}</span>
      <span role="columnheader">{text('Цена за ед.', 'Dona narxi')}</span>
      <span role="columnheader">{text('Наценка', 'Ustama')}</span>
      <span role="columnheader">{text('Продано', 'Sotilgan')}</span>
      <span role="columnheader">{text('Статус', 'Holat')}</span>
      {showDate && <span role="columnheader">{text('Дата', 'Sana')}</span>}
      <span role="columnheader" className="batch-actions-head" />
    </div>
  );
}

/** One purchase lot ("товар") row. */
export function ProductRow({ p, showDate = true }: { p: UiProduct; showDate?: boolean }) {
  const { text, tr, L, formatDateNumeric } = useI18n();
  const { amount } = useMoney();
  const { router } = useNavigation();
  const selected = useUi((s) => s.selectedProducts);
  const setSelected = useUi((s) => s.setSelectedProducts);
  const setViewed = useUi((s) => s.setViewedPurchase);
  const setPendingDelete = useUi((s) => s.setPendingDelete);
  const qty = p.quantity;
  const soldPercent = qty ? Math.round((p.sold / qty) * 100) : 0;
  const unitProfit = p.unitProfit;
  const markup = Math.round(p.markupPercent);
  const isSelected = selected.includes(p.id);
  return (
    <div
      className={'batch-row batch-items-row batch-card is-clickable' + (showDate ? '' : ' no-date') + (isSelected ? ' is-selected' : '')}
      role="row"
      tabIndex={0}
      onClick={() => setViewed(p.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) setViewed(p.id);
      }}
    >
      <span role="cell" className="batch-product">
        <label className="row-select" {...stopRow}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => setSelected((list) => toggleIn(list, p.id))}
            aria-label={text('Выбрать товар «' + tr(p.name) + '»', '«' + tr(p.name) + '» mahsulotini tanlash')}
          />
        </label>
        <Garment product={p} />
        <span>
          <strong>{tr(p.name)}</strong>
          <small>
            {p.code} · {L(p.category)}
          </small>
        </span>
      </span>
      <span role="cell">{qty}</span>
      <span role="cell">{amount(p.expectedRevenue)}</span>
      <span role="cell" className="unit-price">
        {amount(p.price)}
        <small>{text('себест. ', 'tannarx ') + amount(p.fullCost)}</small>
      </span>
      <span role="cell" className={'markup' + (unitProfit < 0 ? ' negative' : '')}>
        <strong>{markup}%</strong>
        <small>{(unitProfit >= 0 ? '+' : '−') + amount(Math.abs(unitProfit)) + text(' / шт.', ' / dona')}</small>
      </span>
      <span role="cell">
        {soldPercent}% <small className="muted">({amount(p.revenue)})</small>
      </span>
      <span role="cell">
        <span className={'status ' + (p.stock === 0 ? 'out' : p.stock < 20 ? 'low' : '')}>
          <i />
          {p.stock === 0 ? text('Распродано', 'Sotib bo‘lingan') : p.stock < 20 ? text('Мало на складе', 'Kam qoldi') : text('На складе', 'Omborda')}
        </span>
      </span>
      {showDate && <span role="cell">{p.addedAt ? formatDateNumeric(p.addedAt) : '—'}</span>}
      <span role="cell" className="batch-actions">
        <button
          type="button"
          className="icon-button row-edit"
          aria-label={text('Изменить товар «' + tr(p.name) + '»', '«' + tr(p.name) + '» mahsulotini tahrirlash')}
          title={text('Изменить товар', 'Mahsulotni tahrirlash')}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            router.push('/products/' + p.id + '/edit');
          }}
        >
          <Icon name="edit" size={16} />
        </button>
        <button
          type="button"
          className="icon-button row-delete"
          aria-label={text('Удалить товар «' + tr(p.name) + '»', '«' + tr(p.name) + '» mahsulotini o‘chirish')}
          title={text('Удалить товар', 'Mahsulotni o‘chirish')}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setPendingDelete({ kind: 'product', id: p.id, name: tr(p.name) });
          }}
        >
          <Icon name="trash" size={17} />
        </button>
      </span>
    </div>
  );
}
