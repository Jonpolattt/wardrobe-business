'use client';

import { useQuery } from '@apollo/client/react';
import { useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { REVENUE_SERIES_QUERY } from '@/lib/graphql/queries';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useMoney } from '@/lib/hooks/use-money';
import { useUi } from '@/lib/store/ui-store';
import type { RevenueSeriesData } from '@/lib/types/api';

const RANGE: Record<string, 'WEEK' | 'MONTH' | 'YEAR'> = { Weekly: 'WEEK', Monthly: 'MONTH', Yearly: 'YEAR' };
const WEEKDAYS = { ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], uz: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'] };
const MONTHS = {
  ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
};
const MONTHS_DAY = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'],
};

/** 1, 2, 2.5, 5 × 10ⁿ step so that the axis labels are round numbers in the chosen currency. */
function niceStep(raw: number) {
  if (!(raw > 0)) return 0;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / power;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return nice * power;
}

/** «Обзор выручки / расходов»: revenue area and dashed expenses line (Recharts) in the original frame. */
export function RevenueChart({ expensesMode }: { expensesMode: boolean }) {
  const { text, L, locale, localeTag } = useI18n();
  const { amount, compactAmount, rates, currency } = useMoney();
  const chartPeriod = useUi((s) => s.chartPeriod);
  const set = useUi((s) => s.set);
  const [hover, setHover] = useState<number | null>(null);
  const range = RANGE[chartPeriod] ?? 'MONTH';
  const { data, previousData } = useQuery<RevenueSeriesData>(REVENUE_SERIES_QUERY, { variables: { range } });
  const series = (data ?? previousData)?.revenueSeries;

  const points = useMemo(
    () => (series?.points ?? []).map((p, i) => ({ key: i, date: p.date, revenue: Number(p.revenue), expenses: Number(p.expenses) })),
    [series],
  );

  // Y scale: five equal steps with round labels in the display currency.
  const uzsPerUnit = rates ? rates.UZS / rates[currency] : 1;
  const maxUzs = Math.max(0, ...points.map((p) => Math.max(p.revenue, p.expenses)));
  const step = niceStep(maxUzs / uzsPerUnit / 5) || 10000;
  const yMax = step * 5 * uzsPerUnit;
  const yTicks = [0, 1, 2, 3, 4, 5].map((k) => (yMax * k) / 5);

  const labelOf = (iso: string) => {
    const d = new Date(iso + 'T00:00:00Z');
    if (range === 'WEEK') return WEEKDAYS[locale][d.getUTCDay()];
    if (range === 'YEAR') return MONTHS[locale][d.getUTCMonth()];
    const day = d.getUTCDate();
    return locale === 'ru' ? day + ' ' + MONTHS_DAY.ru[d.getUTCMonth()] : day + '-' + MONTHS_DAY.uz[d.getUTCMonth()];
  };
  const labelIndexes =
    points.length <= 7 ? points.map((_, i) => i) : Array.from({ length: 7 }, (_, k) => Math.round((k * (points.length - 1)) / 6));
  const xLabels = labelIndexes.map((i) => (points[i] ? labelOf(points[i].date) : ''));

  const total = series ? Number(expensesMode ? series.totalExpenses : series.totalRevenue) : 0;
  const changeRaw = series ? (expensesMode ? series.expensesChangePercent : series.revenueChangePercent) : null;
  const change = changeRaw === null ? null : Number(changeRaw);
  const active = hover !== null ? points[hover] : null;

  return (
    <article className="panel revenue-panel">
      <div className="panel-heading">
        <div>
          <h2>{expensesMode ? text('Обзор расходов', 'Xarajatlar sharhi') : text('Обзор выручки', 'Tushum sharhi')}</h2>
          <p>{text('Динамика вашего бизнеса во времени', 'Biznesingiz vaqt bo‘yicha dinamikasi')}</p>
        </div>
        <div className="segmented-control">
          {['Weekly', 'Monthly', 'Yearly'].map((p) => (
            <button className={chartPeriod === p ? 'active' : ''} onClick={() => set({ chartPeriod: p })} key={p}>
              {L(p)}
            </button>
          ))}
        </div>
      </div>
      <div className="revenue-summary">
        <strong>{amount(total)}</strong>
        <span className="growth">
          {change === null ? '—' : (change < 0 ? '↘ ' : '↗ ') + Math.abs(change).toLocaleString(localeTag, { maximumFractionDigits: 1 }) + '%'}
        </span>
        <div className="chart-legend">
          <span>
            <i className="legend-dot blue" />
            {text('Выручка', 'Tushum')}
          </span>
          <span>
            <i className="legend-dot muted" />
            {text('Расходы', 'Xarajatlar')}
          </span>
        </div>
      </div>
      <div className="line-chart" onMouseLeave={() => setHover(null)}>
        <div className="y-axis">
          {[...yTicks].reverse().map((n) => (
            <span key={n}>{compactAmount(n)}</span>
          ))}
        </div>
        <div className="plot">
          <div className="plot-canvas" role="img" aria-label={text('График выручки', 'Tushum grafigi')}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 5, right: 0, bottom: 5, left: 0 }} accessibilityLayer={false}>
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" style={{ stopColor: 'var(--o-465fff, #465fff)' }} stopOpacity=".24" />
                    <stop offset="100%" style={{ stopColor: 'var(--o-465fff, #465fff)' }} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--o-242d3d, #242d3d)" strokeWidth={0.7} strokeDasharray="3 4" />
                <XAxis dataKey="key" hide />
                <YAxis hide domain={[0, yMax]} ticks={yTicks} allowDataOverflow />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--o-6076ff, #6076ff)"
                  strokeWidth={2.5}
                  fill="url(#chartFill)"
                  isAnimationActive={false}
                  activeDot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="var(--o-667185, #667185)"
                  strokeWidth={1.7}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                {active && <ReferenceLine x={active.key} stroke="var(--o-8995b3, #8995b3)" strokeDasharray="3 3" ifOverflow="extendDomain" />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div
            className="chart-hover-area"
            onMouseMove={(e) => {
              if (points.length === 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
              setHover(Math.round(ratio * (points.length - 1)));
            }}
          />
          {active && hover !== null && (
            <div className="chart-tooltip" style={{ left: `${Math.min(80, points.length > 1 ? (hover / (points.length - 1)) * 100 : 0)}%` }}>
              {labelOf(active.date)} · {expensesMode ? text('Расходы', 'Xarajatlar') : text('Выручка', 'Tushum')}{' '}
              <strong>{amount(expensesMode ? active.expenses : active.revenue)}</strong>
            </div>
          )}
          <div className="x-axis">
            {xLabels.map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
