'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { DeleteConfirm, LogoutConfirm } from '@/components/modals/ConfirmDialogs';
import { ModalHost } from '@/components/modals/ModalHost';
import { toggleAutoHide } from '@/components/settings/use-setting-groups';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useNavigation } from '@/lib/hooks/use-navigation';
import { useTheme } from '@/lib/hooks/use-theme';
import { usePreferences } from '@/lib/store/preferences-store';
import { useUi } from '@/lib/store/ui-store';
import { moduleLabels } from '@/lib/utils/labels';
import { Sidebar } from './Sidebar';
import { Toast } from './Toast';
import { GLOBAL_SEARCH_ID, Topbar } from './Topbar';

/** Layout of the original interface: sidebar, header, breadcrumb, page, footer, dialogs. */
export function AppShell({ children }: { children: ReactNode }) {
  const { locale, text } = useI18n();
  const theme = useTheme();
  const { page } = useNavigation();
  const palette = usePreferences((s) => s.palette);
  const autoHide = usePreferences((s) => s.autoHide);
  const sidebarStyle = usePreferences((s) => s.sidebarStyle);
  const sidebarHide = usePreferences((s) => s.sidebarHide);
  const manualCollapsed = usePreferences((s) => s.manualCollapsed);
  const setPrefs = usePreferences((s) => s.set);
  const sidebarHovered = useUi((s) => s.sidebarHovered);
  const sidebarFocused = useUi((s) => s.sidebarFocused);
  const hoverSuppressed = useUi((s) => s.hoverSuppressed);
  const setUi = useUi((s) => s.set);
  const keyboardInput = useRef(true);
  const collapsed = autoHide ? hoverSuppressed || (!sidebarHovered && !sidebarFocused) : manualCollapsed;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') keyboardInput.current = true;
      // Ctrl + Shift + Backquote: включить / выключить Auto-hide
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.code === 'Backquote' || ['~', 'Ё', 'ё', '§', '±'].includes(e.key) || e.key === String.fromCharCode(96))
      ) {
        e.preventDefault();
        toggleAutoHide();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById(GLOBAL_SEARCH_ID)?.focus();
      }
      if (e.key === 'Escape') {
        useUi.getState().set({ modal: null, pendingDelete: null, confirmLogout: false, viewedPurchaseId: null, popover: '' });
      }
    };
    const pointerHandler = (e: PointerEvent) => {
      keyboardInput.current = false;
      const target = e.target as Element | null;
      const patch: { sidebarFocused: boolean; popover?: string } = { sidebarFocused: false };
      // Закрываем открытые меню при клике вне их
      if (!target?.closest?.('[data-popover-root]')) patch.popover = '';
      useUi.getState().set(patch);
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('pointerdown', pointerHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('pointerdown', pointerHandler);
    };
  }, []);

  const toggleSidebar = () => {
    if (autoHide) {
      if (collapsed) setUi({ hoverSuppressed: false, sidebarFocused: keyboardInput.current, sidebarHovered: !keyboardInput.current });
      else setUi({ hoverSuppressed: true, sidebarFocused: false });
    } else {
      setPrefs({ manualCollapsed: !manualCollapsed });
    }
  };

  return (
    <div
      className={[
        'app',
        autoHide ? 'is-auto-hide' : '',
        collapsed ? 'is-collapsed' : '',
        sidebarStyle === 'plain' ? 'sb-plain' : '',
        sidebarHide === 'hidden' ? 'sb-hide' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-theme={theme}
      data-palette={palette}
    >
      <Sidebar collapsed={collapsed} keyboardInput={keyboardInput} />
      {!collapsed && !autoHide && <div className="sidebar-backdrop" aria-hidden="true" onClick={toggleSidebar} />}
      <div className="main-shell">
        <Topbar collapsed={collapsed} onToggleSidebar={toggleSidebar} />
        <main>
          <div className="breadcrumb">
            Wardrobe <span>/</span> <span>{moduleLabels[locale][page] ?? page}</span>
          </div>
          {children}
          <footer className="page-footer">
            <span>{text('Продуманно организовано. Легко управлять.', 'Puxta tashkil etilgan. Oson boshqariladi.')}</span>
            <span>
              <i /> {text('Все системы работают', 'Barcha tizimlar ishlamoqda')} <span className="footer-separator">·</span> © {new Date().getFullYear()} Wardrobe
            </span>
          </footer>
        </main>
      </div>
      <ModalHost />
      <LogoutConfirm />
      <DeleteConfirm />
      <Toast />
    </div>
  );
}
