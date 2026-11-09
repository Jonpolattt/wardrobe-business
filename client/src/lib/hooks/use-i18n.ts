'use client';

import { useCallback, useMemo } from 'react';
import { usePreferences } from '../store/preferences-store';
import { labels, type LocalText } from '../utils/labels';

/** The same helpers the original interface used: text(ru, uz), tr(), L(), dates and pluralisation. */
export function useI18n() {
  const locale = usePreferences((s) => s.locale);
  const text = useCallback((ru: string, uz: string) => (locale === 'ru' ? ru : uz), [locale]);
  return useMemo(() => {
    const localeTag = locale === 'ru' ? 'ru-RU' : 'uz-Latn-UZ';
    const tr = (value: LocalText) => (typeof value === 'string' ? value : value[locale]);
    const L = (key: string) => labels[key]?.[locale] ?? key;
    const formatDateNumeric = (iso: string) =>
      new Intl.DateTimeFormat(localeTag, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso.slice(0, 10) + 'T00:00:00Z'));
    const formatDate = (iso: string) =>
      new Intl.DateTimeFormat(localeTag, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso.slice(0, 10) + 'T00:00:00Z'));
    const itemsLabel = (n: number) => {
      if (locale === 'uz') return n + ' ta mahsulot';
      const mod10 = n % 10;
      const mod100 = n % 100;
      const word = mod10 === 1 && mod100 !== 11 ? 'товар' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'товара' : 'товаров';
      return n + ' ' + word;
    };
    return { locale, localeTag, text, tr, L, formatDate, formatDateNumeric, itemsLabel };
  }, [locale, text]);
}
