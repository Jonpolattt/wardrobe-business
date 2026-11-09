'use client';

import { Icon, type IconName } from '@/components/icons/Icon';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useMoney } from '@/lib/hooks/use-money';
import { useDashboard } from './use-dashboard';

/** 10 cumulative values → points of the small sparkline (viewBox 0 0 94 44, like the original). */
function sparkPoints(values: number[]) {
  if (!values.length) return '0,39 90,39';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return values
    .map((v, i) => {
      const x = values.length > 1 ? (i * 90) / (values.length - 1) : 0;
      const y = span > 0 ? 39 - ((v - min) / span) * 39 : 39;
      return Math.round(x * 10) / 10 + ',' + Math.round(y * 10) / 10;
    })
    .join(' ');
}

export function MetricsGrid() {
  const { text, localeTag } = useI18n();
  const { amount } = useMoney();
  const { dashboard } = useDashboard();
  const selection = dashboard?.selection ?? false;
  const totals = dashboard?.current;
  const metrics: { label: string; value: string; icon: IconName; change: string | null; points: string }[] = [
    {
      label: text('Общая выручка', 'Umumiy tushum'),
      value: totals ? amount(Number(totals.revenue)) : '…',
      icon: 'wallet',
      change: dashboard?.revenueChangePercent ?? null,
      points: sparkPoints(dashboard?.revenueSpark ?? []),
    },
    {
      label: text('Всего продаж', 'Jami sotuvlar'),
      value: totals ? totals.salesCount.toLocaleString(localeTag) : '…',
      icon: 'trend',
      change: dashboard?.salesChangePercent ?? null,
      points: sparkPoints(dashboard?.salesSpark ?? []),
    },
    {
      label: text('Общие расходы', 'Umumiy xarajatlar'),
      value: totals ? amount(Number(totals.expenses)) : '…',
      icon: 'exchange',
      change: dashboard?.expensesChangePercent ?? null,
      points: sparkPoints(dashboard?.expensesSpark ?? []),
    },
    {
      label: text('Чистая прибыль', 'Sof foyda'),
      value: totals ? amount(Number(totals.profit)) : '…',
      icon: 'box',
      change: dashboard?.profitChangePercent ?? null,
      points: sparkPoints(dashboard?.profitSpark ?? []),
    },
  ];
  const formatChange = (change: string | null) => {
    if (change === null) return { arrow: '', value: '—' };
    const n = Number(change);
    return {
      arrow: n < 0 ? '↘' : '↗',
      value: Math.abs(n).toLocaleString(localeTag, { maximumFractionDigits: 1 }) + '%',
    };
  };
  return (
    <section className={'metrics-grid' + (selection ? ' is-selection' : '')}>
      {metrics.map((m) => {
        const change = formatChange(m.change);
        return (
          <article className="metric-card panel" key={m.label}>
            <div className="metric-top">
              <span>{m.label}</span>
              <Icon name={m.icon} size={18} />
            </div>
            <div className="metric-value">{m.value}</div>
            <div className="metric-bottom">
              {selection ? (
                <div>
                  <span className="versus">{text('по выбранным позициям', 'tanlangan pozitsiyalar bo‘yicha')}</span>
                </div>
              ) : (
                <div>
                  <span className="growth">
                    {change.arrow && <span>{change.arrow}</span>} {change.value}
                  </span>
                  <span className="versus">{text('к прошлому периоду', 'o‘tgan davrga nisbatan')}</span>
                </div>
              )}
              <svg className="sparkline" viewBox="0 0 94 44">
                <polyline points={m.points} fill="none" stroke="#40c79a" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </div>
          </article>
        );
      })}
    </section>
  );
}
