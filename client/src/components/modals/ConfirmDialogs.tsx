'use client';

import { useApolloClient, useMutation } from '@apollo/client/react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons/Icon';
import { DELETE_BATCH, DELETE_PURCHASE } from '@/lib/graphql/mutations';
import { signOut } from '@/lib/auth/session';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useInventory } from '@/lib/hooks/use-inventory';
import { useAuthStore } from '@/lib/store/auth-store';
import { useUi } from '@/lib/store/ui-store';
import { errorCode, errorMessage } from '@/lib/utils/errors';

export function LogoutConfirm() {
  const { text } = useI18n();
  const open = useUi((s) => s.confirmLogout);
  const set = useUi((s) => s.set);
  const client = useApolloClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const close = () => set({ confirmLogout: false });
  const logOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      set({ confirmLogout: false, popover: '', modal: null, viewedPurchaseId: null, pendingDelete: null, selectedProducts: [], selectedBatches: [] });
      await client.clearStore();
      setBusy(false);
      router.replace('/login');
    }
  };
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <section className="modal panel confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-desc">
        <button className="icon-button modal-close" aria-label={text('Закрыть', 'Yopish')} onClick={close}>
          <Icon name="close" />
        </button>
        <span className="modal-icon danger">
          <Icon name="logout" size={24} />
        </span>
        <h2 id="logout-title">{text('Выйти из аккаунта?', 'Hisobdan chiqasizmi?')}</h2>
        <p id="logout-desc">{text('Чтобы снова войти, понадобится пароль из профиля.', 'Qayta kirish uchun profildagi parol kerak bo‘ladi.')}</p>
        <div className="confirm-actions">
          <button type="button" className="button secondary" onClick={close}>
            {text('Отмена', 'Bekor qilish')}
          </button>
          <button type="button" className="button danger" autoFocus disabled={busy} onClick={logOut}>
            {text('Выйти', 'Chiqish')}
          </button>
        </div>
      </section>
    </div>
  );
}

/** Two-step deletion: confirmation, then the account password — verified by the backend. */
export function DeleteConfirm() {
  const { text } = useI18n();
  const pending = useUi((s) => s.pendingDelete);
  const ui = useUi();
  const router = useRouter();
  const pathname = usePathname();
  const { products } = useInventory();
  const userEmail = useAuthStore((s) => s.user?.email ?? '');
  const [step, setStep] = useState<'confirm' | 'password'>('confirm');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletePurchase] = useMutation<{ deletePurchase: { id: string; archived: boolean } }>(DELETE_PURCHASE);
  const [deleteBatch] = useMutation<{ deleteBatch: { id: string; archived: boolean } }>(DELETE_BATCH);
  if (!pending) return null;
  const close = () => {
    ui.setPendingDelete(null);
    setStep('confirm');
    setPassword('');
    setError('');
  };
  const hasSales = pending.kind === 'product' && (products.find((p) => p.id === pending.id)?.sold ?? 0) > 0;
  const confirmDelete = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { kind, id, name } = pending;
    setBusy(true);
    try {
      let archived: boolean;
      if (kind === 'batch') {
        archived = (await deleteBatch({ variables: { id, password }, refetchQueries: 'active', awaitRefetchQueries: true })).data!.deleteBatch.archived;
        if (pathname === '/batches/' + id) router.replace('/batches');
      } else {
        archived = (await deletePurchase({ variables: { id, password }, refetchQueries: 'active', awaitRefetchQueries: true })).data!.deletePurchase.archived;
        if (ui.viewedPurchaseId === id) ui.setViewedPurchase(null);
        if (pathname.startsWith('/products/' + id)) router.replace('/products');
        ui.setSelectedProducts((list) => list.filter((x) => x !== id));
      }
      if (kind === 'batch') ui.setSelectedBatches((list) => list.filter((x) => x !== id));
      close();
      ui.setToast(
        kind === 'batch'
          ? text('Партия «' + name + '» удалена.', '«' + name + '» partiyasi o‘chirildi.')
          : archived
            ? text('Товар «' + name + '» убран из списка, история продаж сохранена.', '«' + name + '» ro‘yxatdan olindi, sotuvlar tarixi saqlandi.')
            : text('Товар «' + name + '» удалён.', '«' + name + '» mahsuloti o‘chirildi.'),
      );
    } catch (err) {
      setError(errorCode(err) === 'PASSWORD_INCORRECT' ? text('Неверный пароль.', 'Parol noto‘g‘ri.') : errorMessage(err, text));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <section className="modal panel confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-desc">
        <button className="icon-button modal-close" aria-label={text('Закрыть', 'Yopish')} onClick={close}>
          <Icon name="close" />
        </button>
        <span className="modal-icon danger">
          <Icon name="trash" size={24} />
        </span>
        {step === 'confirm' ? (
          <>
            <h2 id="delete-title">
              {pending.kind === 'batch' ? text('Удалить партию?', 'Partiyani o‘chirasizmi?') : text('Удалить товар?', 'Mahsulotni o‘chirasizmi?')}
            </h2>
            <p id="delete-desc">
              {pending.kind === 'batch'
                ? text(
                    'Партия «' + pending.name + '» будет удалена. Её товары останутся в списке товаров, но без партии.',
                    '«' + pending.name + '» partiyasi o‘chiriladi. Uning mahsulotlari ro‘yxatda partiyasiz qoladi.',
                  )
                : hasSales
                  ? text(
                      'Товар «' + pending.name + '» будет убран из списка. По нему уже есть продажи, поэтому финансовая история сохранится.',
                      '«' + pending.name + '» ro‘yxatdan olinadi. Uning sotuvlari bor, shuning uchun moliyaviy tarix saqlanadi.',
                    )
                  : text(
                      'Товар «' + pending.name + '» будет удалён без возможности восстановления.',
                      '«' + pending.name + '» mahsuloti qayta tiklab bo‘lmaydigan tarzda o‘chiriladi.',
                    )}
            </p>
            <div className="confirm-actions">
              <button type="button" className="button secondary" onClick={close}>
                {text('Нет', 'Yo‘q')}
              </button>
              <button type="button" className="button danger" autoFocus onClick={() => setStep('password')}>
                {text('Да, удалить', 'Ha, o‘chirish')}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={confirmDelete}>
            <input type="email" name="username" autoComplete="username" value={userEmail} readOnly hidden />
            <h2 id="delete-title">{text('Подтвердите паролем', 'Parol bilan tasdiqlang')}</h2>
            <p id="delete-desc" className="confirm-text">
              {text(
                'Введите пароль от аккаунта, чтобы удалить «' + pending.name + '».',
                '«' + pending.name + '» ni o‘chirish uchun hisob parolini kiriting.',
              )}
            </p>
            <label className="form-label">
              {text('Пароль', 'Parol')}
              <input
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="confirm-actions">
              <button type="button" className="button secondary" onClick={close}>
                {text('Отмена', 'Bekor qilish')}
              </button>
              <button type="submit" className="button danger" disabled={busy}>
                {text('Удалить', 'O‘chirish')}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
