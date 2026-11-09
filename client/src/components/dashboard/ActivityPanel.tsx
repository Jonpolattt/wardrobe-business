'use client';

import { useQuery } from '@apollo/client/react';
import { Icon, type IconName } from '@/components/icons/Icon';
import { ACTIVITY_QUERY } from '@/lib/graphql/queries';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useNavigation } from '@/lib/hooks/use-navigation';
import { useUi } from '@/lib/store/ui-store';
import type { ActivityData } from '@/lib/types/api';

type Text = (ru: string, uz: string) => string;

function relativeTime(iso: string, localeTag: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(localeTag, { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(Math.round(seconds), 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 30 * 86_400) return rtf.format(Math.round(seconds / 86_400), 'day');
  return new Intl.DateTimeFormat(localeTag, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function describe(type: string, title: string, quantity: number | null, text: Text) {
  const q = quantity ?? 0;
  const map: Record<string, { icon: IconName; color: string; title: string; description: string; meta?: string; metaClass?: string }> = {
    PURCHASE_CREATED: {
      icon: 'box',
      color: 'blue',
      title: text('Новая закупка', 'Yangi xarid'),
      description: text('«' + title + '» добавлен в товары.', '«' + title + '» mahsulotlarga qo‘shildi.'),
      meta: quantity !== null ? text('+' + q + ' шт.', '+' + q + ' dona') : undefined,
    },
    PURCHASE_UPDATED: { icon: 'edit', color: 'purple', title: text('Товар изменён', 'Mahsulot o‘zgartirildi'), description: '«' + title + '»' },
    PURCHASE_DELETED: { icon: 'trash', color: 'amber', title: text('Товар удалён', 'Mahsulot o‘chirildi'), description: '«' + title + '»' },
    PURCHASE_ARCHIVED: {
      icon: 'trash',
      color: 'amber',
      title: text('Товар убран из списка', 'Mahsulot ro‘yxatdan olindi'),
      description: text('«' + title + '»: история продаж сохранена.', '«' + title + '»: sotuvlar tarixi saqlandi.'),
    },
    BATCH_CREATED: { icon: 'truck', color: 'blue', title: text('Новая партия', 'Yangi partiya'), description: text('Партия «' + title + '» создана.', '«' + title + '» partiyasi yaratildi.') },
    BATCH_UPDATED: { icon: 'truck', color: 'purple', title: text('Партия изменена', 'Partiya o‘zgartirildi'), description: '«' + title + '»' },
    BATCH_DELETED: { icon: 'trash', color: 'amber', title: text('Партия удалена', 'Partiya o‘chirildi'), description: '«' + title + '»' },
    BATCH_ARCHIVED: { icon: 'trash', color: 'amber', title: text('Партия удалена', 'Partiya o‘chirildi'), description: text('«' + title + '»: товары остались без партии.', '«' + title + '»: mahsulotlar partiyasiz qoldi.') },
    RATES_UPDATED: { icon: 'exchange', color: 'purple', title: text('Курсы обновлены', 'Kurslar yangilandi'), description: title },
    SYNC_COMPLETED: {
      icon: 'trend',
      color: 'green',
      title: text('Продажи синхронизированы', 'Sotuvlar sinxronlandi'),
      description: text('Новых продаж из магазина: ' + q + '.', 'Do‘kondan yangi sotuvlar: ' + q + '.'),
      meta: '+' + q,
      metaClass: 'green-text',
    },
    SYNC_FAILED: { icon: 'close', color: 'amber', title: text('Ошибка синхронизации', 'Sinxronlash xatosi'), description: title },
    EMAIL_CHANGED: { icon: 'user', color: 'purple', title: text('Email изменён', 'Email o‘zgartirildi'), description: title },
    PASSWORD_CHANGED: { icon: 'user', color: 'purple', title: text('Пароль изменён', 'Parol o‘zgartirildi'), description: title },
  };
  return map[type] ?? { icon: 'bell' as IconName, color: 'blue', title: type, description: title };
}

/** «Последние события» — the activity log of the backend. */
export function ActivityPanel() {
  const { text, localeTag } = useI18n();
  const { changePage } = useNavigation();
  const setToast = useUi((s) => s.setToast);
  const { data } = useQuery<ActivityData>(ACTIVITY_QUERY, { variables: { limit: 4 } });
  const items = data?.activity ?? [];
  return (
    <article className="panel activity-panel">
      <div className="panel-heading">
        <div>
          <h2>{text('Последние события', 'So‘nggi faollik')}</h2>
          <p>{text('Что нового в вашем пространстве', 'Ish maydoningizdagi yangiliklar')}</p>
        </div>
        <span className="live-dot" />
      </div>
      <div className="activity-list">
        {data && items.length === 0 && (
          <p className="activity-empty">{text('Событий пока нет — добавьте первую партию или товар.', 'Hozircha voqealar yo‘q — birinchi partiya yoki mahsulotni qo‘shing.')}</p>
        )}
        {items.map((event) => {
          const a = describe(event.type, event.title, event.quantity, text);
          return (
            <div className="activity-item" key={event.id}>
              <span className={`activity-icon ${a.color}`}>
                <Icon name={a.icon} size={17} />
              </span>
              <div>
                <div className="activity-title">
                  <strong>{a.title}</strong>
                  <span className={a.metaClass ?? ''}>{a.meta ?? ''}</span>
                </div>
                <p>{a.description}</p>
                <small>
                  {relativeTime(event.createdAt, localeTag)}
                  {event.actorName ? ' · ' + event.actorName : ''}
                </small>
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="activity-footer"
        onClick={() => {
          changePage('Batches');
          setToast(text('Показаны последние партии.', 'So‘nggi partiyalar ko‘rsatildi.'));
        }}
      >
        {text('Вся активность', 'Barcha faollik')} <Icon name="arrow" size={16} />
      </button>
    </article>
  );
}
