'use client';

import { Icon } from '@/components/icons/Icon';
import { PanelLeftIcon } from '@/components/icons/PanelLeftIcon';
import { useSettingGroups } from '@/components/settings/use-setting-groups';
import { Avatar } from '@/components/ui/Avatar';
import { Flag } from '@/components/ui/Flag';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useNavigation } from '@/lib/hooks/use-navigation';
import { useTheme } from '@/lib/hooks/use-theme';
import { useAuthStore } from '@/lib/store/auth-store';
import { usePreferences } from '@/lib/store/preferences-store';
import { useUi } from '@/lib/store/ui-store';
import { PAGE_ROUTES } from '@/lib/utils/labels';
import { userDisplay } from '@/lib/utils/user';

export const GLOBAL_SEARCH_ID = 'wardrobe-global-search';

export function Topbar({ collapsed, onToggleSidebar }: { collapsed: boolean; onToggleSidebar: () => void }) {
  const { text } = useI18n();
  const theme = useTheme();
  const setPrefs = usePreferences((s) => s.set);
  const { page, router, changePage } = useNavigation();
  const popover = useUi((s) => s.popover);
  const query = useUi((s) => s.query);
  const ui = useUi();
  const user = useAuthStore((s) => s.user);
  const { fullName, initial, photo } = userDisplay(user);
  const { settingGroups, resetInterface } = useSettingGroups();
  const toggleTheme = () => setPrefs({ modePref: theme === 'dark' ? 'light' : 'dark' });
  return (
    <header className="topbar">
      <div className="topbar-lead">
        <button
          className="icon-button collapse-button menu-toggle"
          title={collapsed ? text('Развернуть панель', 'Panelni ochish') : text('Свернуть панель', 'Panelni yopish')}
          aria-label={collapsed ? text('Развернуть панель', 'Panelni ochish') : text('Свернуть панель', 'Panelni yopish')}
          aria-expanded={!collapsed}
          aria-controls="wardrobe-navigation"
          onClick={onToggleSidebar}
        >
          <PanelLeftIcon />
        </button>
        <div className="global-search">
          <Icon name="search" size={20} />
          <input
            id={GLOBAL_SEARCH_ID}
            placeholder={text('Поиск Товаров', 'Mahsulotlarni qidirish')}
            aria-label={text('Поиск товаров', 'Mahsulotlarni qidirish')}
            value={query}
            onChange={(event) => {
              ui.set({ query: event.target.value });
              if (page !== 'Overview' && page !== 'Products') router.push(PAGE_ROUTES.Products);
            }}
          />
        </div>
      </div>
      <div className="topbar-actions">
        <button
          className="icon-button theme-button"
          title={theme === 'dark' ? text('Светлая тема', 'Yorug‘ mavzu') : text('Тёмная тема', 'Qorong‘i mavzu')}
          aria-label={theme === 'dark' ? text('Включить светлую тему', 'Yorug‘ mavzuni yoqish') : text('Включить тёмную тему', 'Qorong‘i mavzuni yoqish')}
          onClick={toggleTheme}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={21} />
        </button>
        <button
          className={'icon-button settings-button' + (popover === 'settings' ? ' active' : '')}
          data-popover-root
          title={text('Настройки интерфейса', 'Interfeys sozlamalari')}
          aria-label={text('Настройки интерфейса', 'Interfeys sozlamalari')}
          aria-expanded={popover === 'settings'}
          onClick={() => ui.togglePopover('settings')}
        >
          <Icon name="settings" size={20} />
        </button>
        <button
          className="top-profile"
          data-popover-root
          title={fullName}
          aria-label={text('Меню профиля', 'Profil menyusi')}
          aria-expanded={popover === 'account'}
          onClick={() => ui.togglePopover('account')}
        >
          <Avatar photo={photo} initial={initial} size="small" />
        </button>
      </div>
      {popover === 'settings' && (
        <div
          className="header-popover floating settings-popover"
          data-popover-root
          role="dialog"
          aria-label={text('Настройки интерфейса', 'Interfeys sozlamalari')}
        >
          <div className="sp-head">
            <strong>{text('Настройки интерфейса', 'Interfeys sozlamalari')}</strong>
            <p>{text('Настройте вид панели под себя.', 'Boshqaruv paneli ko‘rinishini o‘zingizga moslang.')}</p>
          </div>
          {settingGroups.map((group) => (
            <div className="sp-group" key={group.id}>
              <span className="sp-label">{group.label}</span>
              <div
                className="sp-seg"
                role="radiogroup"
                aria-label={group.label}
                style={{ gridTemplateColumns: 'repeat(' + group.options.length + ', minmax(0, 1fr))' }}
              >
                {group.options.map((o) => (
                  <button
                    type="button"
                    key={o.value}
                    role="radio"
                    aria-checked={group.value === o.value}
                    className={group.value === o.value ? 'active' : ''}
                    onClick={() => group.onSelect(o.value)}
                  >
                    {o.dot && <i className="sp-dot" style={{ background: o.dot }} />}
                    {o.flag && <Flag code={o.flag} />}
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" className="sp-reset" onClick={resetInterface}>
            {text('Сбросить к стандартным', 'Standart holatga qaytarish')}
          </button>
        </div>
      )}
      {popover === 'account' && (
        <div className="header-popover floating" data-popover-root>
          <div className="account-info">
            <Avatar photo={photo} initial={initial} />
            <span>
              <strong>{fullName}</strong>
              <p>{user?.email}</p>
            </span>
          </div>
          <button className="menu-option" onClick={() => changePage('Profile')}>
            <Icon name="user" size={16} /> {text('Профиль', 'Profil')}
          </button>
          <button className="menu-option" onClick={() => changePage('Settings')}>
            <Icon name="settings" size={16} /> {text('Настройки', 'Sozlamalar')}
          </button>
          <div className="menu-divider" role="separator" />
          <button
            className="menu-option danger"
            onClick={() => {
              ui.set({ popover: '', confirmLogout: true });
            }}
          >
            <Icon name="logout" size={16} /> {text('Выйти из аккаунта', 'Hisobdan chiqish')}
          </button>
        </div>
      )}
    </header>
  );
}
