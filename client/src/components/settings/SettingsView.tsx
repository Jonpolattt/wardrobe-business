'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { Icon } from '@/components/icons/Icon';
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown';
import { Flag } from '@/components/ui/Flag';
import { SYNC_STORE } from '@/lib/graphql/mutations';
import { STORE_SYNC_STATUS_QUERY } from '@/lib/graphql/queries';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useTheme } from '@/lib/hooks/use-theme';
import { usePreferences, type Palette } from '@/lib/store/preferences-store';
import { useUi } from '@/lib/store/ui-store';
import type { StoreSyncStatusData } from '@/lib/types/api';
import { errorMessage } from '@/lib/utils/errors';
import { currencyNames, languageOptions, type Currency } from '@/lib/utils/labels';
import { toggleAutoHide, useSettingGroups } from './use-setting-groups';

/** «Настройки»: the same settings as the header popover, plus the online store synchronisation. */
export function SettingsView() {
  const { text, locale, formatDateNumeric } = useI18n();
  const theme = useTheme();
  const prefs = usePreferences();
  const popover = useUi((s) => s.popover);
  const togglePopover = useUi((s) => s.togglePopover);
  const setPopover = useUi((s) => s.setPopover);
  const setToast = useUi((s) => s.setToast);
  const { settingGroups, resetInterface } = useSettingGroups();
  const { data: sync, refetch: refetchSync } = useQuery<StoreSyncStatusData>(STORE_SYNC_STATUS_QUERY);
  const [syncStore, { loading: syncing }] = useMutation<{ syncStore: { status: string; salesCreated: number; salesUpdated: number } }>(SYNC_STORE, {
    refetchQueries: 'active',
  });
  const currencyOptions: DropdownOption<Currency>[] = (['UZS', 'USD', 'CNY'] as Currency[]).map((code) => ({
    value: code,
    flag: currencyNames[code].flag,
    label: code,
    hint: currencyNames[code][locale],
  }));
  const renderSettingSwitch = (id: string, labelledBy: string) => {
    const group = settingGroups.find((g) => g.id === id);
    if (!group) return null;
    return (
      <div className="mode-switch" role="radiogroup" aria-labelledby={labelledBy}>
        {group.options.map((o) => (
          <button
            type="button"
            key={o.value}
            role="radio"
            aria-checked={group.value === o.value}
            className={group.value === o.value ? 'active' : ''}
            onClick={() => group.onSelect(o.value)}
          >
            {o.icon && <Icon name={o.icon} size={16} />}
            {o.flag && <Flag code={o.flag} />}
            {o.label}
          </button>
        ))}
      </div>
    );
  };
  const status = sync?.storeSyncStatus;
  const lastRun = status?.lastRun;
  const runSync = async () => {
    try {
      const res = await syncStore();
      const r = res.data!.syncStore;
      setToast(text('Синхронизация завершена: новых продаж — ' + r.salesCreated + '.', 'Sinxronlash tugadi: yangi sotuvlar — ' + r.salesCreated + '.'));
    } catch (e) {
      setToast(errorMessage(e, text));
    } finally {
      void refetchSync();
    }
  };
  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <h1 id="settings-title">{text('Настройки', 'Sozlamalar')}</h1>
      <div className="settings-list">
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong>{text('Валюта', 'Valyuta')}</strong>
          </div>
          <Dropdown
            value={prefs.currency}
            options={currencyOptions}
            open={popover === 'settings-currency'}
            onToggle={() => togglePopover('settings-currency')}
            onSelect={(value) => {
              prefs.set({ currency: value });
              setPopover('');
            }}
            ariaLabel={text('Валюта', 'Valyuta')}
            triggerText="value"
          />
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong>{text('Язык', 'Til')}</strong>
          </div>
          <Dropdown
            value={prefs.locale}
            options={languageOptions}
            open={popover === 'settings-language'}
            onToggle={() => togglePopover('settings-language')}
            onSelect={(value) => {
              prefs.set({ locale: value });
              setPopover('');
            }}
            ariaLabel={text('Язык', 'Til')}
          />
        </div>
        <div className="settings-row settings-row-stack">
          <div className="settings-row-copy">
            <strong id="palette-label">{text('Цветовая тема', 'Rang mavzusi')}</strong>
            <p>{text('Оформление всего сайта. Режим выбирается отдельно.', 'Butun sayt ko‘rinishi. Rejim alohida tanlanadi.')}</p>
          </div>
          <div className="palette-options" role="radiogroup" aria-labelledby="palette-label">
            {(
              [
                { value: 'ocean', name: 'Ocean', hint: text('Синие акценты', 'Ko‘k urg‘ular') },
                { value: 'default', name: 'Default', hint: text('Чёрно-белая', 'Oq-qora') },
                { value: 'lime', name: 'Lime', hint: text('Лаймовые акценты', 'Laym urg‘ular') },
              ] as { value: Palette; name: string; hint: string }[]
            ).map((option) => (
              <button
                type="button"
                key={option.value}
                role="radio"
                aria-checked={prefs.palette === option.value}
                className={'palette-option' + (prefs.palette === option.value ? ' active' : '')}
                onClick={() => prefs.set({ palette: option.value })}
              >
                <span className={'palette-preview is-' + option.value + ' is-' + theme} aria-hidden="true">
                  <i className="pp-side" />
                  <i className="pp-main">
                    <i className="pp-bar" />
                    <i className="pp-cards">
                      <i />
                      <i />
                    </i>
                    <i className="pp-button" />
                  </i>
                </span>
                <span className="palette-option-copy">
                  <strong>{option.name}</strong>
                  <small>{option.hint}</small>
                </span>
                <span className="palette-check" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong id="mode-label">{text('Режим отображения', 'Ko‘rinish rejimi')}</strong>
            <p>{text('Светлый, тёмный или как в системе.', 'Yorug‘, qorong‘i yoki tizimdagidek.')}</p>
          </div>
          {renderSettingSwitch('mode', 'mode-label')}
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong id="sidebar-style-label">{text('Стиль боковой панели', 'Yon panel uslubi')}</strong>
            <p>
              {text(
                'Плавающая — с отступами и скруглением, простая — прижата к краю экрана.',
                'Suzuvchi — chekinish va yumaloq burchaklar bilan, oddiy — ekran chetiga yopishgan.',
              )}
            </p>
          </div>
          {renderSettingSwitch('sidebarStyle', 'sidebar-style-label')}
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong id="sidebar-hide-label">{text('Сворачивание панели', 'Yon panelni yig‘ish')}</strong>
            <p>
              {text(
                'Иконки — остаётся узкая полоса с иконками, полностью — панель скрывается целиком.',
                'Belgilar — ingichka belgilar paneli qoladi, yashirish — panel butunlay yashiriladi.',
              )}
            </p>
          </div>
          {renderSettingSwitch('sidebarHide', 'sidebar-hide-label')}
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong id="auto-hide-label">{text('Автоскрытие', 'Avto-yashirish')}</strong>
            <p id="auto-hide-description">
              {text(
                'Панель раскрывается при наведении и скрывается, когда вы убираете курсор.',
                'Kursor yon panel ustiga kelganda ochiladi, undan chiqqanda yashiriladi.',
              )}
            </p>
            <span className="shortcut-hint">
              <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>{String.fromCharCode(96)}</kbd>
            </span>
          </div>
          <button
            type="button"
            className="switch-button"
            role="switch"
            aria-checked={prefs.autoHide}
            aria-labelledby="auto-hide-label"
            aria-describedby="auto-hide-description"
            onClick={toggleAutoHide}
          >
            <span className="switch-thumb" />
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong>{text('Интернет-магазин', 'Internet-do‘kon')}</strong>
            <p>
              {!status
                ? '…'
                : !status.configured
                  ? text(
                      'Синхронизация с wardrobestore.uz не настроена: задайте STORE_GRAPHQL_URL, STORE_LOGIN и STORE_PASSWORD на сервере.',
                      'wardrobestore.uz bilan sinxronlash sozlanmagan: serverda STORE_GRAPHQL_URL, STORE_LOGIN va STORE_PASSWORD ni kiriting.',
                    )
                  : !lastRun
                    ? text('Продажи и остатки ещё не загружались.', 'Sotuvlar va qoldiqlar hali yuklanmagan.')
                    : lastRun.status === 'FAILED'
                      ? text('Последняя синхронизация не удалась: ', 'Oxirgi sinxronlash muvaffaqiyatsiz: ') + (lastRun.error ?? '')
                      : text('Последняя синхронизация: ', 'Oxirgi sinxronlash: ') +
                        formatDateNumeric(lastRun.startedAt.slice(0, 10)) +
                        ' · ' +
                        text('заказов: ', 'buyurtmalar: ') +
                        lastRun.ordersSeen}
            </p>
          </div>
          <button type="button" className="button secondary" disabled={!status?.configured || syncing} onClick={runSync}>
            {syncing ? text('Синхронизация…', 'Sinxronlanmoqda…') : text('Синхронизировать', 'Sinxronlash')}
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong>{text('Стандартные настройки', 'Standart sozlamalar')}</strong>
            <p>
              {text(
                'Вернуть тему, режим, вид панели и автоскрытие к значениям по умолчанию.',
                'Mavzu, rejim, panel ko‘rinishi va avto-yashirishni standart holatga qaytarish.',
              )}
            </p>
          </div>
          <button type="button" className="button secondary" onClick={resetInterface}>
            {text('Сбросить', 'Tiklash')}
          </button>
        </div>
      </div>
    </section>
  );
}
