'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Icon } from '@/components/icons/Icon';
import { LoadState } from '@/components/layout/LoadState';
import { applySession } from '@/lib/auth/session';
import { CHANGE_EMAIL, CHANGE_PASSWORD, REVOKE_SESSION, UPDATE_PROFILE } from '@/lib/graphql/mutations';
import { ME_QUERY } from '@/lib/graphql/queries';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useAuthStore, type SessionUser } from '@/lib/store/auth-store';
import { useUi } from '@/lib/store/ui-store';
import type { MeData, SessionData } from '@/lib/types/api';
import { errorCode, errorMessage } from '@/lib/utils/errors';
import { downscaleImage, uploadImage } from '@/lib/utils/images';
import { userDisplay } from '@/lib/utils/user';

/** "Chrome · Windows" from a User-Agent string. */
function deviceName(ua: string | null) {
  if (!ua) return '—';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /YaBrowser/.test(ua)
        ? 'Яндекс Браузер'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Chrome\//.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : /Telegram/i.test(ua)
                ? 'Telegram'
                : ua.split(/[\s/]/)[0];
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'macOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : '';
  return os ? os + ' (' + browser + ')' : browser;
}

interface InfoValues {
  firstName: string;
  lastName: string;
  email: string;
}
interface EmailValues {
  currentPassword: string;
}
interface PasswordValues {
  current: string;
  next: string;
  repeat: string;
}

export function ProfileView() {
  const { text, localeTag } = useI18n();
  const setToast = useUi((s) => s.setToast);
  const set = useUi((s) => s.set);
  const setUser = useAuthStore((s) => s.setUser);
  const { data, loading, error, refetch } = useQuery<MeData>(ME_QUERY, { fetchPolicy: 'cache-and-network' });
  const [updateProfile] = useMutation<{ updateProfile: SessionUser }>(UPDATE_PROFILE);
  const [changeEmail] = useMutation<{ changeEmail: SessionUser }>(CHANGE_EMAIL);
  const [changePassword] = useMutation<{ changePassword: { accessToken: string; expiresIn: number; user: SessionUser } }>(CHANGE_PASSWORD);
  const [revokeSession] = useMutation(REVOKE_SESSION, { refetchQueries: [{ query: ME_QUERY }] });
  const [photoBusy, setPhotoBusy] = useState(false);

  const me = data?.me;
  const infoValues = useMemo(
    () => (me ? { firstName: me.firstName, lastName: me.lastName, email: me.email } : undefined),
    [me],
  );
  const info = useForm<InfoValues>({ values: infoValues, resetOptions: { keepDirtyValues: true } });
  const emailForm = useForm<EmailValues>({ defaultValues: { currentPassword: '' } });
  const passwordForm = useForm<PasswordValues>({ defaultValues: { current: '', next: '', repeat: '' } });
  const emailDraft = info.watch('email') ?? '';
  const emailChanged = !!me && emailDraft.trim().toLowerCase() !== me.email.toLowerCase();
  useEffect(() => {
    if (!emailChanged) emailForm.reset();
  }, [emailChanged, emailForm]);

  if (!me) return <LoadState error={loading ? undefined : error} onRetry={() => void refetch()} />;
  const { fullName, initial, photo } = userDisplay(me);

  const saveName = async () => {
    const values = info.getValues();
    const firstName = values.firstName.trim();
    const lastName = values.lastName.trim();
    if (!firstName || (firstName === me.firstName && lastName === me.lastName)) {
      if (!firstName) info.setValue('firstName', me.firstName);
      return;
    }
    try {
      const res = await updateProfile({ variables: { input: { firstName, lastName, photoUrl: me.photoUrl } } });
      setUser(res.data!.updateProfile);
      setToast(text('Профиль сохранён.', 'Profil saqlandi.'));
    } catch (e) {
      setToast(errorMessage(e, text));
    }
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPhotoBusy(true);
    try {
      const url = await uploadImage(await downscaleImage(file, 256, true));
      const res = await updateProfile({ variables: { input: { firstName: me.firstName, lastName: me.lastName, photoUrl: url } } });
      setUser(res.data!.updateProfile);
      setToast(text('Фото профиля обновлено.', 'Profil rasmi yangilandi.'));
    } catch (e) {
      setToast(errorMessage(e, text));
    } finally {
      setPhotoBusy(false);
    }
  };

  const submitEmail = emailForm.handleSubmit(async ({ currentPassword }) => {
    try {
      const res = await changeEmail({ variables: { input: { newEmail: emailDraft.trim(), currentPassword } } });
      setUser(res.data!.changeEmail);
      emailForm.reset();
      await refetch();
      setToast(text('Email изменён.', 'Email o‘zgartirildi.'));
    } catch (e) {
      emailForm.setError('root', {
        message: errorCode(e) === 'PASSWORD_INCORRECT' ? text('Текущий пароль неверный.', 'Joriy parol noto‘g‘ri.') : errorMessage(e, text),
      });
    }
  });

  const submitPassword = passwordForm.handleSubmit(async ({ current, next, repeat }) => {
    if (next !== repeat) {
      passwordForm.setError('root', { message: text('Пароли не совпадают.', 'Parollar mos emas.') });
      return;
    }
    try {
      const res = await changePassword({ variables: { input: { currentPassword: current, newPassword: next } } });
      // All other sessions are revoked by the server; this browser receives a new session.
      applySession(res.data!.changePassword);
      passwordForm.reset();
      await refetch();
      setToast(text('Пароль сохранён. Остальные сеансы завершены.', 'Parol saqlandi. Boshqa seanslar yakunlandi.'));
    } catch (e) {
      passwordForm.setError('root', {
        message: errorCode(e) === 'PASSWORD_INCORRECT' ? text('Текущий пароль неверный.', 'Joriy parol noto‘g‘ri.') : errorMessage(e, text),
      });
    }
  });

  const formatSessionDate = (iso: string) => {
    const d = new Date(iso);
    return {
      date: new Intl.DateTimeFormat(localeTag, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d),
      time: new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(d),
    };
  };
  const sessions: SessionData[] = data.mySessions;

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <div className="profile-header">
        <label className="profile-photo" title={text('Изменить фото', 'Rasmni o‘zgartirish')} aria-busy={photoBusy}>
          {photo ? <img src={photo} alt="" /> : <span>{initial}</span>}
          <span className="profile-photo-overlay">{photoBusy ? '…' : text('Изменить', 'O‘zgartirish')}</span>
          <input
            type="file"
            accept="image/*"
            aria-label={text('Загрузить фото профиля', 'Profil rasmini yuklash')}
            disabled={photoBusy}
            onChange={(e) => {
              void handlePhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <h1 id="profile-title">{fullName}</h1>
      </div>
      <h2 className="profile-section-title">{text('Информация', 'Ma’lumotlar')}</h2>
      <div className="profile-form">
        <label className="form-label">
          {text('Имя', 'Ism')}
          <input autoComplete="given-name" maxLength={60} {...info.register('firstName', { onBlur: () => void saveName() })} />
        </label>
        <label className="form-label">
          {text('Фамилия', 'Familiya')}
          <input autoComplete="family-name" maxLength={60} {...info.register('lastName', { onBlur: () => void saveName() })} />
        </label>
        <label className="form-label">
          {text('Эл. почта', 'Elektron pochta')}
          <input type="email" autoComplete="email" maxLength={160} {...info.register('email')} />
        </label>
      </div>
      {emailChanged && (
        <p className="profile-hint">
          {text('Чтобы сменить email, подтвердите его текущим паролем.', 'Emailni o‘zgartirish uchun joriy parol bilan tasdiqlang.')}
        </p>
      )}
      {emailChanged && (
        <form className="profile-form password-form" onSubmit={submitEmail}>
          <input type="email" name="username" autoComplete="username" value={emailDraft} readOnly hidden />
          <label className="form-label">
            {text('Текущий пароль', 'Joriy parol')}
            <input type="password" autoComplete="current-password" required {...emailForm.register('currentPassword', { required: true })} />
          </label>
          <div className="password-actions">
            {emailForm.formState.errors.root?.message && (
              <p className="form-error" role="alert">
                {emailForm.formState.errors.root.message}
              </p>
            )}
            <button type="button" className="button secondary" onClick={() => info.setValue('email', me.email)}>
              {text('Отмена', 'Bekor qilish')}
            </button>
            <button type="submit" className="button primary" disabled={emailForm.formState.isSubmitting}>
              {text('Сменить email', 'Emailni o‘zgartirish')}
            </button>
          </div>
        </form>
      )}
      <h2 className="profile-section-title">{text('Безопасность', 'Xavfsizlik')}</h2>
      <p className="profile-hint">
        {text('Этот пароль запрашивается при удалении партий и товаров.', 'Bu parol partiya va mahsulotlarni o‘chirishda so‘raladi.')}
      </p>
      <form className="profile-form password-form" onSubmit={submitPassword}>
        <input type="email" name="username" autoComplete="username" value={me.email} readOnly hidden />
        <label className="form-label">
          {text('Текущий пароль', 'Joriy parol')}
          <input type="password" autoComplete="current-password" required {...passwordForm.register('current', { required: true })} />
        </label>
        <label className="form-label">
          {text('Новый пароль', 'Yangi parol')}
          <input type="password" autoComplete="new-password" minLength={8} required {...passwordForm.register('next', { required: true, minLength: 8 })} />
        </label>
        <label className="form-label">
          {text('Повторите пароль', 'Parolni takrorlang')}
          <input type="password" autoComplete="new-password" minLength={8} required {...passwordForm.register('repeat', { required: true })} />
        </label>
        <div className="password-actions">
          {(passwordForm.formState.errors.root?.message || passwordForm.formState.errors.next) && (
            <p className="form-error" role="alert">
              {passwordForm.formState.errors.root?.message ??
                text('Пароль должен быть не короче 8 символов.', 'Parol kamida 8 belgidan iborat bo‘lsin.')}
            </p>
          )}
          <button type="submit" className="button primary" disabled={passwordForm.formState.isSubmitting}>
            {text('Сменить пароль', 'Parolni o‘zgartirish')}
          </button>
        </div>
      </form>
      <h2 className="profile-section-title">{text('Активные сеансы', 'Faol seanslar')}</h2>
      <div className="panel sessions-panel">
        <table>
          <thead>
            <tr>
              <th>{text('Устройство', 'Qurilma')}</th>
              <th>{text('Дата', 'Sana')}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const when = formatSessionDate(s.lastUsedAt);
              return (
                <tr key={s.id}>
                  <td>
                    <strong>{deviceName(s.userAgent)}</strong>
                    {s.current && <span className="session-time">{text('этот браузер', 'shu brauzer')}</span>}
                  </td>
                  <td>
                    {when.date}
                    <span className="session-time">{when.time}</span>
                    {!s.current && (
                      <button
                        type="button"
                        className="text-button session-revoke"
                        onClick={async () => {
                          try {
                            await revokeSession({ variables: { id: s.id } });
                            setToast(text('Сеанс завершён.', 'Seans yakunlandi.'));
                          } catch (e) {
                            setToast(errorMessage(e, text));
                          }
                        }}
                      >
                        {text('Завершить', 'Yakunlash')}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="profile-logout">
        <button type="button" className="button danger" onClick={() => set({ confirmLogout: true })}>
          <Icon name="logout" size={17} />
          {text('Выйти из аккаунта', 'Hisobdan chiqish')}
        </button>
      </div>
    </section>
  );
}
