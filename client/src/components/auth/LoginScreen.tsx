'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Icon } from '@/components/icons/Icon';
import { refreshAccessToken, signIn } from '@/lib/auth/session';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useTheme } from '@/lib/hooks/use-theme';
import { useAuthStore } from '@/lib/store/auth-store';
import { usePreferences } from '@/lib/store/preferences-store';
import { useUi } from '@/lib/store/ui-store';
import { errorMessage } from '@/lib/utils/errors';
import { languageOptions } from '@/lib/utils/labels';

interface LoginValues {
  email: string;
  password: string;
}

const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/overview');

/** Liquid-glass sign-in screen of the original design. Accounts exist only on the backend (no registration). */
export function LoginScreen() {
  const { text, locale } = useI18n();
  const theme = useTheme();
  const setPrefs = usePreferences((s) => s.set);
  const router = useRouter();
  const params = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const [loginError, setLoginError] = useState('');
  const { register, handleSubmit, formState } = useForm<LoginValues>({ defaultValues: { email: '', password: '' } });
  const next = safeNext(params.get('next'));

  // A valid refresh cookie means the user is still signed in.
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(next);
      return;
    }
    if (status === 'unknown') void refreshAccessToken();
  }, [status, router, next]);

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setLoginError('');
    try {
      const user = await signIn(email.trim(), password);
      useUi.getState().setToast(text('С возвращением, ' + (user.firstName || user.email) + '!', 'Xush kelibsiz, ' + (user.firstName || user.email) + '!'));
      router.replace(next);
    } catch (error) {
      setLoginError(errorMessage(error, text));
    }
  });

  return (
    <div className="auth-screen lg">
      <div className="lg-top">
        <button
          type="button"
          className="lg-pill lg-icon"
          aria-label={theme === 'dark' ? text('Включить светлую тему', 'Yorug‘ mavzuni yoqish') : text('Включить тёмную тему', 'Qorong‘i mavzuni yoqish')}
          onClick={() => setPrefs({ modePref: theme === 'dark' ? 'light' : 'dark' })}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
        </button>
        <div className="lg-pill lg-locale" role="group" aria-label={text('Язык', 'Til')}>
          {languageOptions.map((o) => (
            <button
              type="button"
              key={o.value}
              className={locale === o.value ? 'active' : ''}
              aria-pressed={locale === o.value}
              onClick={() => setPrefs({ locale: o.value })}
            >
              {o.value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <main className="lg-center">
        <h1 className="lg-title">{text('Вход', 'Kirish')}</h1>
        <div className="lg-card-wrap">
          <form className="lg-card" onSubmit={onSubmit} noValidate>
            <span className="lg-card-sheen" aria-hidden="true" />
            <div className="lg-body">
              <label className="lg-field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="name@example.com"
                  required
                  {...register('email', { required: true, onChange: () => setLoginError('') })}
                />
              </label>
              <label className="lg-field">
                <span>{text('Пароль', 'Parol')}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  {...register('password', { required: true, onChange: () => setLoginError('') })}
                />
              </label>
              {(loginError || formState.errors.email || formState.errors.password) && (
                <p className="lg-error" role="alert">
                  {loginError || text('Введите email и пароль.', 'Email va parolni kiriting.')}
                </p>
              )}
              <div className="lg-btn-wrap">
                <button type="submit" className="lg-submit" disabled={formState.isSubmitting}>
                  <span>{text('Вход', 'Kirish')}</span>
                </button>
                <div className="lg-btn-shadow" aria-hidden="true" />
              </div>
              <p className="lg-foot">
                <span>{text('Нет аккаунта', 'Hisobingiz yo‘qmi')}</span>
                <button
                  type="button"
                  className="lg-link"
                  onClick={() =>
                    setLoginError(
                      text(
                        'Регистрация недоступна: вход только для владельцев двух существующих аккаунтов.',
                        'Ro‘yxatdan o‘tish mavjud emas: kirish faqat mavjud ikki hisob egalari uchun.',
                      ),
                    )
                  }
                >
                  {text('Регистрация', 'Ro‘yxatdan o‘tish')} <span aria-hidden="true">→</span>
                </button>
              </p>
            </div>
          </form>
          <div className="lg-card-shadow" aria-hidden="true" />
        </div>
      </main>
    </div>
  );
}
