'use client';

import type { IconName } from '@/components/icons/Icon';
import type { FlagCode } from '@/components/ui/Flag';
import { useI18n } from '@/lib/hooks/use-i18n';
import { usePreferences, type ModePref, type Palette, type SidebarHide, type SidebarStyle } from '@/lib/store/preferences-store';
import { useUi } from '@/lib/store/ui-store';
import { currencyNames, type Currency, type Locale } from '@/lib/utils/labels';

export type SettingOption = { value: string; label: string; dot?: string; flag?: FlagCode; icon?: IconName };
export type SettingGroup = { id: string; label: string; value: string; onSelect: (v: string) => void; options: SettingOption[] };

/** Toggles auto-hide and resets the hover/focus state of the sidebar (as in the original). */
export function toggleAutoHide() {
  const prefs = usePreferences.getState();
  prefs.set({ autoHide: !prefs.autoHide });
  useUi.getState().set({ sidebarHovered: false, sidebarFocused: false, hoverSuppressed: false });
}

/** Interface settings: one description for the header popover and for the «Настройки» page. */
export function useSettingGroups() {
  const { text } = useI18n();
  const prefs = usePreferences();
  const resetInterface = () => {
    prefs.resetInterface();
    useUi.getState().set({ sidebarHovered: false, sidebarFocused: false, hoverSuppressed: false });
  };
  const settingGroups: SettingGroup[] = [
    {
      id: 'palette',
      label: text('Цветовая тема', 'Mavzu uslubi'),
      value: prefs.palette,
      onSelect: (v) => prefs.set({ palette: v as Palette }),
      options: [
        { value: 'ocean', label: 'Ocean', dot: '#465fff' },
        { value: 'default', label: 'Default', dot: '#a3a3a3' },
        { value: 'lime', label: 'Lime', dot: '#9be23a' },
      ],
    },
    {
      id: 'mode',
      label: text('Режим', 'Mavzu rejimi'),
      value: prefs.modePref,
      onSelect: (v) => prefs.set({ modePref: v as ModePref }),
      options: [
        { value: 'light', label: text('Светлый', 'Yorug‘'), icon: 'sun' },
        { value: 'dark', label: text('Тёмный', 'Qorong‘i'), icon: 'moon' },
        { value: 'system', label: text('Система', 'Tizim'), icon: 'monitor' },
      ],
    },
    {
      id: 'language',
      label: text('Язык', 'Til'),
      value: prefs.locale,
      onSelect: (v) => prefs.set({ locale: v as Locale }),
      options: [
        { value: 'ru', label: 'Русский', flag: 'ru' },
        { value: 'uz', label: 'O‘zbekcha', flag: 'uz' },
      ],
    },
    {
      id: 'currency',
      label: text('Валюта', 'Valyuta'),
      value: prefs.currency,
      onSelect: (v) => prefs.set({ currency: v as Currency }),
      options: (['UZS', 'USD', 'CNY'] as Currency[]).map((c) => ({ value: c, label: c, flag: currencyNames[c].flag })),
    },
    {
      id: 'sidebarStyle',
      label: text('Стиль боковой панели', 'Yon panel uslubi'),
      value: prefs.sidebarStyle,
      onSelect: (v) => prefs.set({ sidebarStyle: v as SidebarStyle }),
      options: [
        { value: 'floating', label: text('Плавающая', 'Suzuvchi') },
        { value: 'plain', label: text('Простая', 'Oddiy') },
      ],
    },
    {
      id: 'sidebarHide',
      label: text('Сворачивание панели', 'Yon panelni yig‘ish'),
      value: prefs.sidebarHide,
      onSelect: (v) => prefs.set({ sidebarHide: v as SidebarHide }),
      options: [
        { value: 'icons', label: text('Иконки', 'Belgilar') },
        { value: 'hidden', label: text('Полностью', 'Yashirish') },
      ],
    },
    {
      id: 'autoHide',
      label: text('Автоскрытие', 'Avto-yashirish'),
      value: prefs.autoHide ? 'on' : 'off',
      onSelect: (v) => {
        if ((v === 'on') !== prefs.autoHide) toggleAutoHide();
      },
      options: [
        { value: 'off', label: text('Выкл', 'O‘chiq') },
        { value: 'on', label: text('Вкл', 'Yoqiq') },
      ],
    },
  ];
  return { settingGroups, resetInterface };
}
