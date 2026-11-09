'use client';

import { useMutation } from '@apollo/client/react';
import { useForm } from 'react-hook-form';
import { Icon } from '@/components/icons/Icon';
import { CREATE_BATCH } from '@/lib/graphql/mutations';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useUi } from '@/lib/store/ui-store';
import { errorMessage } from '@/lib/utils/errors';

interface BatchFormValues {
  name: string;
  stock: string;
  price: string;
}

/** «Новая партия»: the batch is created on the backend with its planned size and total price. */
export function BatchForm() {
  const { text } = useI18n();
  const ui = useUi();
  const [createBatch] = useMutation(CREATE_BATCH, { refetchQueries: 'active', awaitRefetchQueries: true });
  const { register, handleSubmit, formState, setError } = useForm<BatchFormValues>({ defaultValues: { name: '', stock: '', price: '' } });
  const onSubmit = handleSubmit(async (values) => {
    const name = values.name.trim();
    try {
      await createBatch({
        variables: {
          input: {
            name,
            status: 'PREPARING',
            plannedUnits: Number(values.stock),
            plannedCost: values.price.replace(',', '.'),
            plannedCurrency: 'USD',
          },
        },
      });
      ui.setModal(null);
      ui.setToast(
        text(
          'Партия «' + name + '» создана: ' + values.stock + ' шт.',
          '«' + name + '» partiyasi yaratildi: ' + values.stock + ' dona.',
        ),
      );
    } catch (error) {
      setError('root', { message: errorMessage(error, text) });
    }
  });
  return (
    <>
      <span className="modal-icon">
        <Icon name="box" size={25} />
      </span>
      <h2 id="modal-title">{text('Новая партия', 'Yangi partiya')}</h2>
      <p>{text('Подготовьте следующую поставку.', 'Keyingi yetkazib berishni tayyorlang.')}</p>
      <form onSubmit={onSubmit}>
        <label className="form-label">
          {text('Название партии', 'Partiya nomi')}
          <input
            placeholder={text('напр. Летняя база', 'masalan, Yozgi to‘plam')}
            required
            autoFocus
            maxLength={70}
            {...register('name', { required: true, validate: (v) => v.trim().length > 0 })}
          />
        </label>
        <div className="form-row">
          <label className="form-label">
            {text('Кол-во товаров', 'Mahsulotlar soni')}
            <input type="number" min="1" step="1" placeholder="100" required {...register('stock', { required: true })} />
          </label>
          <label className="form-label">
            {text('Общая цена (USD)', 'Umumiy narx (USD)')}
            <input type="number" min="1" step=".01" placeholder="1000" required {...register('price', { required: true })} />
          </label>
        </div>
        {formState.errors.root?.message && (
          <p className="form-error" role="alert">
            {formState.errors.root.message}
          </p>
        )}
        <button className="button primary full-width" type="submit" disabled={formState.isSubmitting}>
          <Icon name="plus" size={17} />
          {text('Создать партию', 'Partiya yaratish')}
        </button>
      </form>
    </>
  );
}
