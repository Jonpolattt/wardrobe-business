'use client';

import type { RefObject } from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Icon } from '@/components/icons/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useNavigation } from '@/lib/hooks/use-navigation';
import { useTheme } from '@/lib/hooks/use-theme';
import { useAuthStore } from '@/lib/store/auth-store';
import { usePreferences } from '@/lib/store/preferences-store';
import { useUi } from '@/lib/store/ui-store';
import { moduleLabels, navGroups } from '@/lib/utils/labels';
import { userDisplay } from '@/lib/utils/user';

export function Sidebar({ collapsed, keyboardInput }: { collapsed: boolean; keyboardInput: RefObject<boolean> }) {
  const { locale, text } = useI18n();
  const theme = useTheme();
  const { page, changePage } = useNavigation();
  const sidebarHide = usePreferences((s) => s.sidebarHide);
  const autoHide = usePreferences((s) => s.autoHide);
  const user = useAuthStore((s) => s.user);
  const { fullName, initial, photo } = userDisplay(user);
  const set = useUi((s) => s.set);
  return (
    <aside
      className="sidebar"
      inert={sidebarHide === 'hidden' && collapsed && !autoHide ? true : undefined}
      aria-label={text('Боковая панель', 'Yon panel')}
      onMouseEnter={() => set({ sidebarHovered: true, hoverSuppressed: false })}
      onMouseLeave={() => set({ sidebarHovered: false })}
      onFocus={(event) => {
        if (keyboardInput.current) {
          set({ sidebarFocused: true });
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) set({ hoverSuppressed: false });
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) set({ sidebarFocused: false });
      }}
    >
      <div className="brand">
        <BrandLogo theme={theme} />
        <span className="brand-name sidebar-label" aria-hidden={collapsed}>Wardrobe</span>
      </div>
      <nav id="wardrobe-navigation" aria-label={text('Основная навигация', 'Asosiy navigatsiya')}>
        {navGroups.map((group) => (
          <div className="nav-group" key={group.label.ru}>
            <p className="nav-group-label sidebar-label" aria-hidden={collapsed}>{group.label[locale]}</p>
            {group.items.map((item) => (
              <button
                key={item.name}
                title={moduleLabels[locale][item.name]}
                aria-label={moduleLabels[locale][item.name]}
                aria-current={page === item.name ? 'page' : undefined}
                className={'nav-item' + (page === item.name ? ' active' : '')}
                onClick={() => changePage(item.name)}
              >
                <Icon name={item.icon} size={21} />
                <span className="sidebar-label" aria-hidden={collapsed}>{moduleLabels[locale][item.name]}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button
          className={'nav-item sidebar-settings' + (page === 'Settings' ? ' active' : '')}
          title={text('Настройки', 'Sozlamalar')}
          aria-label={text('Настройки', 'Sozlamalar')}
          aria-current={page === 'Settings' ? 'page' : undefined}
          onClick={() => changePage('Settings')}
        >
          <Icon name="settings" size={21} />
          <span className="sidebar-label" aria-hidden={collapsed}>{text('Настройки', 'Sozlamalar')}</span>
        </button>
        <button
          className={'sidebar-profile' + (page === 'Profile' ? ' active' : '')}
          title={fullName}
          aria-label={text('Профиль', 'Profil')}
          aria-current={page === 'Profile' ? 'page' : undefined}
          onClick={() => changePage('Profile')}
        >
          <Avatar photo={photo} initial={initial} />
          <span className="profile-name sidebar-label" aria-hidden={collapsed}>
            <strong>{user?.firstName || fullName}</strong>
          </span>
        </button>
      </div>
    </aside>
  );
}
