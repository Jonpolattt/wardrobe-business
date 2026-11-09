import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Currency, Locale } from '../utils/labels';
import { PREFERENCES_KEY } from './keys';

export type Theme = 'dark' | 'light';
export type Palette = 'ocean' | 'default' | 'lime';
export type ModePref = Theme | 'system';
export type SidebarStyle = 'floating' | 'plain';
export type SidebarHide = 'icons' | 'hidden';

export { PREFERENCES_KEY };

export interface Preferences {
  modePref: ModePref;
  palette: Palette;
  locale: Locale;
  currency: Currency;
  sidebarStyle: SidebarStyle;
  sidebarHide: SidebarHide;
  autoHide: boolean;
  manualCollapsed: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  modePref: 'system',
  palette: 'ocean',
  locale: 'ru',
  currency: 'USD',
  sidebarStyle: 'floating',
  sidebarHide: 'icons',
  autoHide: false,
  manualCollapsed: true,
};

interface PreferencesState extends Preferences {
  set: (patch: Partial<Preferences>) => void;
  resetInterface: () => void;
}

/** Interface preferences of this browser (Zustand, persisted in localStorage). */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      set: (patch) => set(patch),
      resetInterface: () =>
        set({
          modePref: DEFAULT_PREFERENCES.modePref,
          palette: DEFAULT_PREFERENCES.palette,
          sidebarStyle: DEFAULT_PREFERENCES.sidebarStyle,
          sidebarHide: DEFAULT_PREFERENCES.sidebarHide,
          autoHide: DEFAULT_PREFERENCES.autoHide,
        }),
    }),
    { name: PREFERENCES_KEY, storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
