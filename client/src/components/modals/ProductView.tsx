'use client';

import { useQuery } from '@apollo/client/react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { Garment } from '@/components/ui/Garment';
import { STORE_SYNC_STATUS_QUERY } from '@/lib/graphql/queries';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useMoney } from '@/lib/hooks/use-money';
import { useNavigation } from '@/lib/hooks/use-navigation';
import { useUi } from '@/lib/store/ui-store';
import type { StoreSyncStatusData } from '@/lib/types/api';
import type { UiBatch, UiProduct } from '@/lib/types/inventory';

/** Product (purchase lot) card: photos, stock, purchase figures and profit — all values come from the backend. */
export function ProductView({ product: p, batches }: { product: UiProduct; batches: UiBatch[] }) {
  const { text, tr, L, formatDateNumeric } = useI18n();
  const { amount } = useMoney();
  const { router } = useNavigation();
  const ui = useUi();
  const { data: sync } = useQuery<StoreSyncStatusData>(STORE_SYNC_STATUS_QUERY);
  const [viewPhoto, setViewPhoto] = useState(0);
  const swipeX = useRef<number | null>(null);
  const photos = p.photos;
  const count = photos.length;
  const idx = count ? Math.min(viewPhoto, count - 1) : 0;
  useEffect(() => setViewPhoto(0), [p.id]);
  useEffect(() => {
    if (count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setViewPhoto((i) => (i + 1) % count);
      if (e.key === 'ArrowLeft') setViewPhoto((i) => (i - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count]);
  const qty = p.quantity;
  const unitProfit = p.unitProfit;
  const pct = Math.round(p.markupPercent);
  const soldPct = qty ? Math.round((p.sold / qty) * 100) : 0;
  const go = (step: number) => setViewPhoto((idx + step + count) % count);
  const batch = p.batchId ? batches.find((b) => b.id === p.batchId) : undefined;
  const storeConfigured = sync?.storeSyncStatus.configured ?? false;
  const close = () => ui.setViewedPurchase(null);
  return (
    <div className="pv">
      <div
        className="pv-media"
        onTouchStart={(e) => {
          swipeX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (swipeX.current === null || count < 2) return;
          const dx = e.changedTouches[0].clientX - swipeX.current;
          swipeX.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        {count ? (
          <img className="pv-image" src={photos[idx]} alt={tr(p.name) + ' — ' + text('фото ', 'rasm ') + (idx + 1)} />
        ) : (
          <div className="pv-placeholder">
            <Garment product={{ ...p, photos: undefined }} />
            <span>{text('Фото ещё не загружены', 'Rasmlar hali yuklanmagan')}</span>
          </div>
        )}
        {count > 0 && <span className="pv-counter">{idx + 1 + ' / ' + count}</span>}
        {count > 1 && (
          <>
            <button type="button" className="pv-nav prev" aria-label={text('Предыдущее фото', 'Oldingi rasm')} onClick={() => go(-1)}>
              <Icon name="chevron" size={22} />
            </button>
            <button type="button" className="pv-nav next" aria-label={text('Следующее фото', 'Keyingi rasm')} onClick={() => go(1)}>
              <Icon name="chevron" size={22} />
            </button>
            <div className="pv-dots" role="tablist" aria-label={text('Фото товара', 'Mahsulot rasmlari')}>
              {photos.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  role="tab"
                  aria-selected={i === idx}
                  aria-label={text('Фото ', 'Rasm ') + (i + 1)}
                  className={i === idx ? 'active' : ''}
                  onClick={() => setViewPhoto(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="pv-info">
        <p className="eyebrow">
          {p.code} · {L(p.category)}
          {p.sku ? ' · SKU ' + p.sku : ''}
        </p>
        <h2 id="modal-title">{tr(p.name)}</h2>
        <div className="pv-price">
          <strong>{amount(p.price)}</strong>
          <span className={'markup-pill' + (unitProfit < 0 ? ' negative' : '')}>
            {pct + '% · ' + (unitProfit >= 0 ? '+' : '−') + amount(Math.abs(unitProfit)) + text(' / шт.', ' / dona')}
          </span>
        </div>
        <div className="pv-stock">
          <div className="pv-stock-top">
            <span className={'status ' + (p.stock === 0 ? 'out' : p.stock < 20 ? 'low' : '')}>
              <i />
              {p.stock === 0
                ? text('Распродано', 'Sotib bo‘lingan')
                : p.stock < 20
                  ? text('Мало на складе', 'Kam qoldi')
                  : text('На складе', 'Omborda')}
            </span>
            <span>{text('В наличии ', 'Mavjud ') + p.stock + text(' из ', ' / ') + qty + text(' шт.', ' dona')}</span>
          </div>
          <div className="pv-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={soldPct} aria-label={text('Продано', 'Sotilgan')}>
            <span style={{ width: soldPct + '%' }} />
          </div>
          <div className="pv-bar-caption">
            <span>{text('Продано ', 'Sotilgan ') + p.sold + text(' шт.', ' dona') + ' · ' + soldPct + '%'}</span>
            <span>{amount(p.revenue)}</span>
          </div>
        </div>
        <h3 className="detail-section">{text('Закупка', 'Xarid')}</h3>
        <dl className="pv-list">
          <div><dt>{text('Цена закупки за шт.', 'Dona xarid narxi')}</dt><dd>{amount(p.unitCost)}</dd></div>
          <div><dt>{text('Карго на шт.', 'Donaga kargo')}</dt><dd>{amount(p.cargoPerUnit)}</dd></div>
          <div><dt>{text('Полная себестоимость', 'To‘liq tannarx')}</dt><dd>{amount(p.fullCost)}</dd></div>
          <div><dt>{text('Общие затраты', 'Umumiy xarajat')}</dt><dd>{amount(p.totalCost)}</dd></div>
          <div><dt>{text('Дата заказа', 'Buyurtma sanasi')}</dt><dd>{p.orderDate ? formatDateNumeric(p.orderDate) : '—'}</dd></div>
          <div><dt>{text('Дата прибытия', 'Kelish sanasi')}</dt><dd>{p.arrivalDate ? formatDateNumeric(p.arrivalDate) : '—'}</dd></div>
        </dl>
        <h3 className="detail-section">{text('Прибыль', 'Foyda')}</h3>
        <dl className="pv-list">
          <div><dt>{text('Фактическая выручка', 'Haqiqiy tushum')}</dt><dd>{amount(p.revenue)}</dd></div>
          <div>
            <dt>{text('Фактическая прибыль', 'Haqiqiy foyda')}</dt>
            <dd className={p.actualProfit === null ? '' : p.actualProfit < 0 ? 'neg' : 'pos'}>{p.actualProfit === null ? '—' : amount(p.actualProfit)}</dd>
          </div>
          <div><dt>{text('Ожидаемая прибыль (остаток)', 'Kutilayotgan foyda (qoldiq)')}</dt><dd className={unitProfit < 0 ? 'neg' : 'pos'}>{amount(p.remainingProfit)}</dd></div>
          <div><dt>{text('Партия', 'Partiya')}</dt><dd>{batch ? tr(batch.name) : p.raw.batch ? tr({ ru: p.raw.batch.nameRu, uz: p.raw.batch.nameUz }) : '—'}</dd></div>
        </dl>
        <p className={'sync-status' + (p.syncedAt ? ' ok' : '')}>
          {p.syncedAt
            ? text('Продажи получены из магазина: ', 'Sotuvlar do‘kondan olingan: ') +
              formatDateNumeric(p.syncedAt.slice(0, 10)) +
              (p.raw.product.storeProduct
                ? text(' · остаток в магазине: ', ' · do‘kondagi qoldiq: ') + p.raw.product.storeProduct.stock + text(' шт.', ' dona')
                : '')
            : storeConfigured
              ? text(
                  'Товар ещё не связан с интернет-магазином: укажите его ID / SKU с wardrobestore.uz — продажи подтянутся при следующей синхронизации.',
                  'Mahsulot hali internet-do‘kon bilan bog‘lanmagan: wardrobestore.uz dagi ID / SKU ni kiriting — sotuvlar keyingi sinxronlashda olinadi.',
                )
              : text(
                  'Продажи ещё не получены из интернет-магазина: синхронизация с wardrobestore.uz пока не подключена.',
                  'Sotuvlar hali internet-do‘kondan olinmagan: wardrobestore.uz bilan sinxronlash hali ulanmagan.',
                )}
        </p>
        <div className="pv-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => {
              close();
              router.push('/products/' + p.id + '/edit');
            }}
          >
            <Icon name="edit" size={16} />
            {text('Изменить', 'Tahrirlash')}
          </button>
          <button
            type="button"
            className="button secondary"
            title={text('Новая закупка этого товара: 50 шт.', 'Bu mahsulotning yangi xaridi: 50 dona')}
            onClick={() => {
              close();
              router.push('/products/new?from=' + p.id);
            }}
          >
            <Icon name="plus" size={16} />
            {text('Пополнить · 50', 'To‘ldirish · 50')}
          </button>
          <button
            type="button"
            className="button danger icon-only"
            aria-label={text('Удалить товар', 'Mahsulotni o‘chirish')}
            title={text('Удалить товар', 'Mahsulotni o‘chirish')}
            onClick={() => ui.setPendingDelete({ kind: 'product', id: p.id, name: tr(p.name) })}
          >
            <Icon name="trash" size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
