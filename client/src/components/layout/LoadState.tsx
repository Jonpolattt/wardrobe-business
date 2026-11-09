'use client';

import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { errorMessage } from '@/lib/utils/errors';

/** Loading / error placeholder inside the page area (uses the original empty-state styles). */
export function LoadState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const { text } = useI18n();
  if (error) {
    return (
      <div className="empty-state page-state" role="alert">
        <TriangleAlert size={26} strokeWidth={1.8} aria-hidden="true" />
        <h3>{text('Не удалось загрузить данные', 'Ma’lumotlarni yuklab bo‘lmadi')}</h3>
        <p>{errorMessage(error, text)}</p>
        {onRetry && (
          <button className="text-button" onClick={onRetry}>
            {text('Повторить', 'Qayta urinish')}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="empty-state page-state" aria-busy="true">
      <LoaderCircle size={26} strokeWidth={2} className="page-spinner" aria-hidden="true" />
      <p>{text('Загрузка…', 'Yuklanmoqda…')}</p>
    </div>
  );
}
