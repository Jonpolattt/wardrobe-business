'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Icon } from '@/components/icons/Icon';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useUi } from '@/lib/store/ui-store';

/** Notification of the original interface; the CSS keeps its entry animation, Framer Motion adds a soft exit. */
export function Toast() {
  const { text } = useI18n();
  const toast = useUi((s) => s.toast);
  const setToast = useUi((s) => s.setToast);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timeout);
  }, [toast, setToast]);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast}
          className="toast"
          role="status"
          initial={false}
          exit={{ opacity: 0, marginBottom: -8, transition: { duration: 0.16, ease: 'easeIn' } }}
        >
          <span>
            <Icon name="check" size={17} />
          </span>
          {toast}
          <button className="icon-button" aria-label={text('Закрыть уведомление', 'Bildirishnomani yopish')} onClick={() => setToast('')}>
            <Icon name="close" size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
