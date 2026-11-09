'use client';

import { useMutation } from '@apollo/client/react';
import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { LoadState } from '@/components/layout/LoadState';
import { Flag } from '@/components/ui/Flag';
import { RESET_EXCHANGE_RATES, UPDATE_EXCHANGE_RATES } from '@/lib/graphql/mutations';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useRates } from '@/lib/hooks/use-money';
import { useUi } from '@/lib/store/ui-store';
import { errorMessage } from '@/lib/utils/errors';
import { currencyNames, moduleLabels, type Currency } from '@/lib/utils/labels';

const convCodes: Currency[] = ['UZS', 'USD', 'CNY'];

/** «Конвертация»: converter and the shared exchange rates (stored on the backend, used everywhere). */
export function ConversionView() {
  const { text, locale, localeTag } = useI18n();
  const setToast = useUi((s) => s.setToast);
  const { rates, loading, error } = useRates();
  const [rateDraft, setRateDraft] = useState<Record<'UZS' | 'CNY', string | null>>({ UZS: null, CNY: null });
  const [convAmount, setConvAmount] = useState('100');
  const [convFrom, setConvFrom] = useState<Currency>('USD');
  const [convTo, setConvTo] = useState<Currency>('UZS');
  const [updateRates] = useMutation(UPDATE_EXCHANGE_RATES, { refetchQueries: 'active' });
  const [resetRatesMutation] = useMutation(RESET_EXCHANGE_RATES, { refetchQueries: 'active' });
  if (!rates) return <LoadState error={loading ? undefined : error} />;

  const parseNumber = (raw: string) => {
    const n = Number(raw.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const convValue = parseNumber(convAmount);
  const convert = (value: number, from: Currency, to: Currency) => (value / rates[from]) * rates[to];
  const fmtCur = (value: number, code: Currency) =>
    new Intl.NumberFormat(localeTag, {
      minimumFractionDigits: code === 'UZS' ? 0 : 2,
      maximumFractionDigits: code === 'UZS' ? 0 : 2,
    }).format(value);
  const fmtRate = (value: number) =>
    new Intl.NumberFormat(localeTag, { maximumFractionDigits: value < 0.01 ? 6 : value < 100 ? 4 : 2 }).format(value);
  const quickAmounts = convFrom === 'UZS' ? [100000, 500000, 1000000, 10000000] : [10, 100, 1000, 10000];
  const pickFrom = (c: Currency) => {
    if (c === convTo) setConvTo(convFrom);
    setConvFrom(c);
  };
  const pickTo = (c: Currency) => {
    if (c === convFrom) setConvFrom(convTo);
    setConvTo(c);
  };
  const swapConv = () => {
    setConvFrom(convTo);
    setConvTo(convFrom);
  };
  const commitRate = async (code: 'UZS' | 'CNY') => {
    const raw = rateDraft[code];
    if (raw === null) return;
    const value = parseNumber(raw);
    if (!(value > 0)) {
      setRateDraft((draft) => ({ ...draft, [code]: null }));
      setToast(text('Курс должен быть больше нуля.', 'Kurs noldan katta bo‘lishi kerak.'));
      return;
    }
    if (value === rates[code]) {
      setRateDraft((draft) => ({ ...draft, [code]: null }));
      return;
    }
    try {
      const normalized = raw.replace(/\s/g, '').replace(',', '.');
      await updateRates({ variables: { input: code === 'UZS' ? { usdToUzs: normalized } : { usdToCny: normalized } } });
      setToast(text('Курс сохранён: 1 USD = ', 'Kurs saqlandi: 1 USD = ') + fmtRate(value) + ' ' + code);
    } catch (e) {
      setToast(errorMessage(e, text));
    } finally {
      setRateDraft((draft) => ({ ...draft, [code]: null }));
    }
  };
  const resetRates = async () => {
    try {
      await resetRatesMutation();
      setRateDraft({ UZS: null, CNY: null });
      setToast(text('Курсы сброшены к стандартным.', 'Kurslar standart holatga qaytarildi.'));
    } catch (e) {
      setToast(errorMessage(e, text));
    }
  };

  return (
    <section className="converter-page" aria-labelledby="converter-title">
      <div className="converter-heading">
        <h1 id="converter-title">{moduleLabels[locale].Conversion}</h1>
        <p>{text('Быстрый пересчёт между сумом, долларом и юанем.', 'So‘m, dollar va yuan o‘rtasida tezkor hisob-kitob.')}</p>
      </div>
      <article className="panel cv-card">
        <div className="cv-side">
          <span className="cv-label" id="cv-from-label">
            {text('Отдаю', 'Beraman')}
          </span>
          <label className="cv-amount">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-labelledby="cv-from-label"
              placeholder="0"
              value={convAmount}
              onChange={(e) => setConvAmount(e.target.value.replace(/[^\d\s.,]/g, ''))}
            />
            <span className="cv-code">{convFrom}</span>
          </label>
          <div className="cv-chips" role="radiogroup" aria-labelledby="cv-from-label">
            {convCodes.map((c) => (
              <button type="button" key={c} role="radio" aria-checked={convFrom === c} className={convFrom === c ? 'active' : ''} onClick={() => pickFrom(c)}>
                <Flag code={currencyNames[c].flag} />
                {c}
              </button>
            ))}
          </div>
          <div className="cv-quick" aria-label={text('Быстрые суммы', 'Tezkor summalar')}>
            {quickAmounts.map((n) => (
              <button type="button" key={n} onClick={() => setConvAmount(String(n))}>
                {n.toLocaleString(localeTag)}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="cv-swap"
          onClick={swapConv}
          title={text('Поменять местами', 'Almashtirish')}
          aria-label={text('Поменять валюты местами', 'Valyutalarni almashtirish')}
        >
          <Icon name="exchange" size={20} />
        </button>
        <div className="cv-side cv-result">
          <span className="cv-label" id="cv-to-label">
            {text('Получаю', 'Olaman')}
          </span>
          <div className="cv-amount is-result">
            <output aria-live="polite" aria-labelledby="cv-to-label">
              {fmtCur(convert(convValue, convFrom, convTo), convTo)}
            </output>
            <span className="cv-code">{convTo}</span>
          </div>
          <div className="cv-chips" role="radiogroup" aria-labelledby="cv-to-label">
            {convCodes.map((c) => (
              <button type="button" key={c} role="radio" aria-checked={convTo === c} className={convTo === c ? 'active' : ''} onClick={() => pickTo(c)}>
                <Flag code={currencyNames[c].flag} />
                {c}
              </button>
            ))}
          </div>
          <p className="cv-rate">
            <span>
              1 {convFrom} = <strong>{fmtRate(convert(1, convFrom, convTo))}</strong> {convTo}
            </span>
            <span>
              1 {convTo} = <strong>{fmtRate(convert(1, convTo, convFrom))}</strong> {convFrom}
            </span>
          </p>
        </div>
      </article>
      <div className="cv-grid">
        <article className="panel cv-panel">
          <h2>{text('Во всех валютах', 'Barcha valyutalarda')}</h2>
          <p className="cv-sub">
            {text('Сумма', 'Summa')} {fmtCur(convValue, convFrom)} {convFrom}
          </p>
          <div className="cv-tiles">
            {convCodes.map((c) => (
              <div className={'cv-tile' + (c === convFrom ? ' is-source' : '')} key={c}>
                <Flag code={currencyNames[c].flag} />
                <span>
                  <strong>
                    {fmtCur(convert(convValue, convFrom, c), c)} {c}
                  </strong>
                  <small>{currencyNames[c][locale]}</small>
                </span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel cv-panel">
          <div className="cv-panel-head">
            <h2>{text('Курсы обмена', 'Ayirboshlash kurslari')}</h2>
            <button type="button" className="text-button" onClick={resetRates}>
              {text('Сбросить', 'Tiklash')}
            </button>
          </div>
          <p className="cv-sub">
            {text('Курсы используются во всём приложении для пересчёта сумм.', 'Kurslar butun ilovada summalarni qayta hisoblash uchun ishlatiladi.')}
          </p>
          {(['UZS', 'CNY'] as const).map((c) => (
            <label className="cv-rate-row" key={c}>
              <span className="cv-rate-base">
                <Flag code="us" />1 USD =
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-label={text('Курс доллара к ', 'Dollarning kursi: ') + c}
                value={rateDraft[c] ?? fmtRate(rates[c])}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d\s.,]/g, '');
                  setRateDraft((draft) => ({ ...draft, [c]: value }));
                }}
                onBlur={() => void commitRate(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
              />
              <span className="cv-rate-code">
                <Flag code={currencyNames[c].flag} />
                {c}
              </span>
            </label>
          ))}
          <div className="cv-cross">
            1 CNY = <strong>{fmtRate(rates.UZS / rates.CNY)}</strong> UZS
          </div>
        </article>
      </div>
    </section>
  );
}
