'use client';

import { useQuery } from '@apollo/client/react';
import { Icon } from '@/components/icons/Icon';
import { ProductHead, ProductRow } from '@/components/products/ProductRows';
import { EXPENSES_QUERY } from '@/lib/graphql/queries';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useInventory } from '@/lib/hooks/use-inventory';
import { useMoney } from '@/lib/hooks/use-money';
import { useNavigation } from '@/lib/hooks/use-navigation';
import { useUi } from '@/lib/store/ui-store';
import type { ExpensesData } from '@/lib/types/api';
import type { UiProduct } from '@/lib/types/inventory';
import { downloadCsv } from '@/lib/utils/csv';
import { moduleLabels } from '@/lib/utils/labels';
import { ActivityPanel } from './ActivityPanel';
import { CategoryPanel } from './CategoryPanel';
import { MetricsGrid } from './MetricsGrid';
import { RevenueChart } from './RevenueChart';
import { SelectionBar } from './SelectionBar';
import { PERIOD_DAYS } from './use-dashboard';
import { LoadState } from '@/components/layout/LoadState';

export function useFilteredProducts(products: UiProduct[]) {
  const { tr, L } = useI18n();
  const query = useUi((s) => s.query);
  const category = useUi((s) => s.category);
  return products.filter(
    (p) =>
      [tr(p.name), p.code, p.sku ?? '', L(p.category)].join(' ').toLowerCase().includes(query.toLowerCase()) &&
      (category === 'All categories' || p.category === category),
  );
}

const dateMinus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

/** Common layout of «Обзор», «Продажи», «Расходы», «Товары» and «Карго». */
export function DashboardView({ page }: { page: 'Overview' | 'Sales' | 'Expenses' | 'Products' | 'Cargo' }) {
  const { text, tr, L, locale, formatDate } = useI18n();
  const { amount, currency, fromUzs } = useMoney();
  const { changePage, router } = useNavigation();
  const ui = useUi();
  const { products, batches, loading, error, refetch } = useInventory();
  const filtered = useFilteredProducts(products);
  const periodDays = PERIOD_DAYS[ui.period] ?? 30;
  const expensesQuery = useQuery<ExpensesData>(EXPENSES_QUERY, { variables: { periodDays }, skip: page !== 'Expenses' });
  const expenses = (expensesQuery.data ?? expensesQuery.previousData)?.expenses ?? [];
  const batchesMode = page === 'Cargo';

  if (loading || error) return <LoadState error={error} onRetry={() => void refetch()} />;

  const money2 = (uzs: number) => Math.round(fromUzs(uzs) * 100) / 100;
  function exportData() {
    downloadCsv('wardrobe-report.csv', [
      [
        text('Артикул', 'Artikul'),
        text('Товар', 'Mahsulot'),
        text('Категория', 'Toifa'),
        text('Остаток', 'Qoldiq'),
        text('Продано', 'Sotilgan'),
        text('Цена', 'Narx') + ' (' + currency + ')',
      ],
      ...filtered.map((p) => [p.code, tr(p.name), L(p.category), p.stock, p.sold, money2(p.price)]),
    ]);
    ui.setToast(text('Отчёт экспортирован.', 'Hisobot eksport qilindi.'));
  }

  const visibleBatches = batches.filter((b) => tr(b.name).toLowerCase().includes(ui.query.toLowerCase()));

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{moduleLabels[locale][page] ?? page}</h1>
          <p>
            {page === 'Overview'
              ? text('Немного ясности — много возможностей. Весь ваш бизнес с первого взгляда.', 'Biroz aniqlik — ko‘p imkoniyat. Biznesingiz bir qarashda.')
              : text('Раздел «' + (moduleLabels.ru[page] ?? page) + '»: всё в одном месте.', '«' + (moduleLabels.uz[page] ?? page) + '» bo‘limi: hammasi bir joyda.')}
          </p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={exportData}>
            <Icon name="download" size={17} />
            {text('Экспорт отчёта', 'Hisobotni eksport qilish')}
          </button>
          <button
            className="button primary"
            onClick={() => {
              if (batchesMode) ui.setModal('batch');
              else router.push('/products/new');
            }}
          >
            <Icon name="plus" size={18} />
            {batchesMode ? text('Новая партия', 'Yangi partiya') : text('Добавить товар', 'Mahsulot qo‘shish')}
          </button>
        </div>
      </div>
      <div className="section-toolbar">
        <div className="overview-tabs">
          <button className={page === 'Overview' ? 'selected' : ''} onClick={() => changePage('Overview')}>
            {moduleLabels[locale].Overview}
          </button>
          <button className={page === 'Sales' ? 'selected' : ''} onClick={() => changePage('Sales')}>
            {text('Аналитика', 'Analitika')} <span className="new-label">{text('НОВОЕ', 'YANGI')}</span>
          </button>
        </div>
        <div className="date-select">
          <Icon name="calendar" size={16} />
          <select aria-label={text('Отчётный период', 'Hisobot davri')} value={ui.period} onChange={(e) => ui.set({ period: e.target.value })}>
            <option value="Last 30 days">{text('Последние 30 дней', 'Oxirgi 30 kun')}</option>
            <option value="Last 7 days">{text('Последние 7 дней', 'Oxirgi 7 kun')}</option>
            <option value="Last 90 days">{text('Последние 90 дней', 'Oxirgi 90 kun')}</option>
          </select>
          <span className="date-caption">
            {formatDate(dateMinus(periodDays - 1))}
            {' – '}
            {formatDate(dateMinus(0))}
          </span>
        </div>
      </div>
      <SelectionBar />
      <MetricsGrid />
      {page === 'Overview' || page === 'Sales' || page === 'Expenses' ? (
        <section className="charts-grid">
          <RevenueChart expensesMode={page === 'Expenses'} />
          <CategoryPanel />
        </section>
      ) : null}
      <section className={`bottom-grid ${page !== 'Overview' ? 'full-table' : ''}`}>
        <article className="panel products-panel">
          <div className="panel-heading">
            <div>
              <h2>
                {batchesMode
                  ? text('Карго и доставки', 'Kargo va yetkazib berish')
                  : page === 'Expenses'
                    ? text('Последние расходы', 'So‘nggi xarajatlar')
                    : text('Самые продаваемые товары', 'Eng ko‘p sotilgan mahsulotlar')}
                <span className="count-badge">{batchesMode ? batches.length : page === 'Expenses' ? expenses.length : products.length}</span>
              </h2>
              <p>
                {batchesMode
                  ? text('Следите за поставками — от отправки до получения', 'Yetkazib berishni jo‘natishdan qabulgacha kuzating')
                  : text('Товары, которые нравятся больше всего', 'Eng ko‘p yoqqan mahsulotlar')}
              </p>
            </div>
            <button
              className="text-button view-all"
              onClick={() => {
                if (page === 'Products') {
                  ui.set({ category: 'All categories', query: '' });
                  ui.setToast(text('Показаны все товары.', 'Barcha mahsulotlar ko‘rsatildi.'));
                } else changePage('Products');
              }}
            >
              {text('Смотреть все', 'Barchasi')} <Icon name="arrow" size={15} />
            </button>
          </div>
          <div className="table-toolbar">
            <div className="table-search">
              <Icon name="search" size={16} />
              <input
                placeholder={text('Поиск товаров...', 'Mahsulot qidirish...')}
                aria-label={text('Фильтр товаров', 'Mahsulotlarni filtrlash')}
                value={ui.query}
                onChange={(e) => ui.set({ query: e.target.value })}
              />
            </div>
            <select
              className="category-select"
              aria-label={text('Фильтр по категории', 'Toifa bo‘yicha filtr')}
              value={ui.category}
              onChange={(e) => ui.set({ category: e.target.value })}
            >
              {['All categories', 'T-shirts', 'Shirts', 'Trousers', 'Outerwear', 'Knitwear'].map((c) => (
                <option key={c} value={c}>
                  {L(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="table-overflow">
            {batchesMode ? (
              <table>
                <thead>
                  <tr>
                    <th>{text('Партия', 'Partiya')}</th>
                    <th>{text('Откуда', 'Qayerdan')}</th>
                    <th>{text('Кол-во', 'Soni')}</th>
                    <th>{text('Статус', 'Holat')}</th>
                    <th>{text('Прибытие', 'Yetib kelish')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBatches.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <strong>{tr(b.name)}</strong>
                        <small>{b.code}</small>
                      </td>
                      <td>{tr(b.origin) || text('Не указано', 'Ko‘rsatilmagan')}</td>
                      <td>{b.units}</td>
                      <td>
                        <span className={`status ${b.status === 'Delivered' ? '' : 'low'}`}>
                          <i />
                          {L(b.status)}
                        </span>
                      </td>
                      <td>{formatDate(b.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : page === 'Expenses' ? (
              <table>
                <thead>
                  <tr>
                    <th>{text('Расход', 'Xarajat')}</th>
                    <th>{text('Категория', 'Toifa')}</th>
                    <th>{text('Дата', 'Sana')}</th>
                    <th>{text('Сумма', 'Summa')}</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <strong>{locale === 'ru' ? e.titleRu : e.titleUz}</strong>
                      </td>
                      <td>{L(e.kind)}</td>
                      <td>{formatDate(e.date)}</td>
                      <td>{amount(Number(e.amountUzs))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="product-grid" role="table" aria-label={text('Товары', 'Mahsulotlar')}>
                <ProductHead showDate={false} list={filtered} />
                <div className="product-grid-body">
                  {filtered.map((p) => (
                    <ProductRow key={p.id} p={p} showDate={false} />
                  ))}
                </div>
              </div>
            )}
            {page === 'Expenses' && expensesQuery.data && expenses.length === 0 && (
              <div className="empty-state">
                <Icon name="wallet" size={26} />
                <h3>{text('Расходов за период нет', 'Bu davrda xarajatlar yo‘q')}</h3>
                <p>{text('Расходы появятся после добавления закупок.', 'Xaridlar qo‘shilgach xarajatlar paydo bo‘ladi.')}</p>
              </div>
            )}
            {batchesMode && visibleBatches.length === 0 && (
              <div className="empty-state">
                <Icon name="truck" size={26} />
                <h3>{batches.length ? text('Партии не найдены', 'Partiyalar topilmadi') : text('Партий пока нет', 'Hozircha partiyalar yo‘q')}</h3>
                <p>{text('Создайте партию, чтобы отслеживать поставку.', 'Yetkazib berishni kuzatish uchun partiya yarating.')}</p>
              </div>
            )}
            {!batchesMode && page !== 'Expenses' && filtered.length === 0 && (
              <div className="empty-state">
                <Icon name="search" size={26} />
                {products.length === 0 ? (
                  <>
                    <h3>{text('Товаров пока нет', 'Hozircha mahsulotlar yo‘q')}</h3>
                    <p>{text('Добавьте первую закупку — расчёты появятся сразу.', 'Birinchi xaridni qo‘shing — hisob-kitoblar darhol paydo bo‘ladi.')}</p>
                    <button className="text-button" onClick={() => router.push('/products/new')}>
                      {text('Добавить товар', 'Mahsulot qo‘shish')}
                    </button>
                  </>
                ) : (
                  <>
                    <h3>{text('Товары не найдены', 'Mahsulot topilmadi')}</h3>
                    <p>{text('Попробуйте другой запрос или категорию.', 'Boshqa so‘rov yoki toifani sinab ko‘ring.')}</p>
                    <button className="text-button" onClick={() => ui.set({ query: '', category: 'All categories' })}>
                      {text('Сбросить фильтры', 'Filtrlarni tozalash')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="table-footer">
            <span>
              {batchesMode
                ? text('Показано партий: ' + visibleBatches.length, 'Partiyalar: ' + visibleBatches.length)
                : page === 'Expenses'
                  ? text('Показано расходов: ' + expenses.length, 'Xarajatlar: ' + expenses.length)
                  : text(
                      'Показано ' + filtered.length + ' из ' + products.length + ' товаров',
                      products.length + ' tadan ' + filtered.length + ' ta mahsulot',
                    )}
            </span>
            <span>
              {text('Обновлено только что', 'Hozirgina yangilandi')} <i className="update-dot" />
            </span>
          </div>
        </article>
        {page === 'Overview' && <ActivityPanel />}
      </section>
    </>
  );
}
