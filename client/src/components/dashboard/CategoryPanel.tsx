'use client';

import { useQuery } from '@apollo/client/react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Icon } from '@/components/icons/Icon';
import { SALES_BY_CATEGORY_QUERY } from '@/lib/graphql/queries';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useNavigation } from '@/lib/hooks/use-navigation';
import { useUi } from '@/lib/store/ui-store';
import type { SalesByCategoryData } from '@/lib/types/api';
import { PERIOD_DAYS } from './use-dashboard';

const COLORS = [
  'var(--o-chart-1, #556aff)',
  'var(--o-chart-2, #8c83f3)',
  'var(--o-chart-3, #6cbfc5)',
  'var(--o-chart-4, #52637a)',
];

/** «Продажи по категориям»: donut (Recharts) and legend from the store sales. */
export function CategoryPanel() {
  const { text, L, localeTag, locale } = useI18n();
  const { router } = useNavigation();
  const period = useUi((s) => s.period);
  const set = useUi((s) => s.set);
  const { data, previousData } = useQuery<SalesByCategoryData>(SALES_BY_CATEGORY_QUERY, {
    variables: { periodDays: PERIOD_DAYS[period] ?? 30 },
  });
  const breakdown = (data ?? previousData)?.salesByCategory;
  const total = breakdown?.totalUnits ?? 0;
  const rows = breakdown?.categories ?? [];
  // Top three categories + everything else as «Другое», like the original legend.
  const top = rows
    .filter((c) => c.key !== 'Other')
    .slice(0, 3)
    .map((c) => ({ name: c.key, units: c.units }));
  for (const key of ['T-shirts', 'Outerwear', 'Trousers', 'Shirts', 'Knitwear']) {
    if (top.length >= 3) break;
    if (!top.some((t) => t.name === key)) top.push({ name: key, units: 0 });
  }
  const restUnits = total - top.reduce((s, c) => s + c.units, 0);
  const legend = [...top, { name: 'Other', units: restUnits }];
  const segments = legend.map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] })).filter((c) => c.units > 0);
  const percentOf = (units: number) => (total ? Math.round((units / total) * 100) : 0) + '%';
  const categoriesCount = rows.filter((c) => c.units > 0).length;
  const openProducts = (category: string) => {
    set({ category, query: '', popover: '' });
    router.push('/products');
  };
  return (
    <article className="panel category-panel">
      <div className="panel-heading">
        <div>
          <h2>{text('Продажи по категориям', 'Toifalar bo‘yicha sotuvlar')}</h2>
          <p>{text('Что любят ваши покупатели', 'Mijozlaringiz nimani yoqtiradi')}</p>
        </div>
        <button
          className="icon-button"
          aria-label={text('Открыть аналитику по категориям', 'Toifalar tahlilini ochish')}
          onClick={() => openProducts('All categories')}
        >
          <Icon name="more" size={18} />
        </button>
      </div>
      <div className="donut-wrap">
        <div className="donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart accessibilityLayer={false} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={[{ value: 1 }]}
                dataKey="value"
                innerRadius="65.5%"
                outerRadius="86.5%"
                startAngle={90}
                endAngle={-270}
                stroke="none"
                fill="var(--o-202939, #202939)"
                isAnimationActive={false}
              />
              {segments.length > 0 && (
                <Pie
                  data={segments}
                  dataKey="units"
                  nameKey="name"
                  innerRadius="65.5%"
                  outerRadius="86.5%"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={segments.length > 1 ? 3.8 : 0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {segments.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="donut-label">
          <small>{text('Всего продаж', 'Jami sotuvlar')}</small>
          <strong>{total.toLocaleString(localeTag)}</strong>
          <span>
            {locale === 'ru'
              ? 'в ' + categoriesCount + ' ' + (categoriesCount % 10 === 1 && categoriesCount % 100 !== 11 ? 'категории' : 'категориях')
              : categoriesCount + ' ta toifada'}
          </span>
        </div>
      </div>
      <div className="category-legend">
        {legend.map((c, i) => (
          <button key={c.name} onClick={() => openProducts(c.name === 'Other' ? 'All categories' : c.name)}>
            <span>
              <i style={{ background: COLORS[i % COLORS.length] }} />
              {L(c.name)}
            </span>
            <strong>{percentOf(c.units)}</strong>
          </button>
        ))}
      </div>
    </article>
  );
}
