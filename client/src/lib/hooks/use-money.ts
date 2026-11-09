'use client';

import { useQuery } from '@apollo/client/react';
import { useCallback, useMemo } from 'react';
import { EXCHANGE_RATES_QUERY } from '../graphql/queries';
import { usePreferences } from '../store/preferences-store';
import type { ExchangeRatesData } from '../types/api';
import type { Currency } from '../utils/labels';
import { useI18n } from './use-i18n';

export type Rates = Record<Currency, number>;

/** Shared exchange rates (1 USD = …) stored on the backend. */
export function useRates() {
  const { data, loading, error } = useQuery<ExchangeRatesData>(EXCHANGE_RATES_QUERY);
  const rates = useMemo<Rates | null>(
    () =>
      data
        ? { USD: 1, UZS: Number(data.exchangeRates.usdToUzs), CNY: Number(data.exchangeRates.usdToCny) }
        : null,
    [data],
  );
  return { rates, raw: data?.exchangeRates ?? null, loading: loading && !data, error };
}

/**
 * Formats backend amounts (UZS) in the currency chosen in the settings,
 * exactly like the original interface did (no fractional digits).
 */
export function useMoney() {
  const currency = usePreferences((s) => s.currency);
  const { localeTag } = useI18n();
  const { rates } = useRates();
  const fromUzs = useCallback(
    (uzs: number) => (rates ? (uzs / rates.UZS) * rates[currency] : currency === 'UZS' ? uzs : 0),
    [rates, currency],
  );
  const amount = useCallback(
    (uzs: number) =>
      new Intl.NumberFormat(localeTag, { style: 'currency', currency, maximumFractionDigits: 0 }).format(fromUzs(uzs)),
    [localeTag, currency, fromUzs],
  );
  const compactAmount = useCallback(
    (uzs: number) =>
      new Intl.NumberFormat(localeTag, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(fromUzs(uzs)),
    [localeTag, currency, fromUzs],
  );
  return { currency, rates, amount, compactAmount, fromUzs };
}
