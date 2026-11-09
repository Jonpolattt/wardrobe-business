'use client';

import { useMutation } from '@apollo/client/react';
import { useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Icon } from '@/components/icons/Icon';
import { CREATE_PURCHASE, UPDATE_PURCHASE } from '@/lib/graphql/mutations';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useNavigation } from '@/lib/hooks/use-navigation';
import { useUi } from '@/lib/store/ui-store';
import type { GarmentKind } from '@/lib/types/api';
import type { UiBatch, UiProduct } from '@/lib/types/inventory';
import { errorCode, errorMessage } from '@/lib/utils/errors';
import { downscaleImage, uploadImage } from '@/lib/utils/images';
import type { Currency } from '@/lib/utils/labels';
import { markupSumOf, previewPurchase } from '@/lib/utils/pricing';

export type ProductFormValues = {
  name: string;
  category: string;
  batchId: string;
  qty: string;
  unitCost: string;
  cargo: string;
  orderDate: string;
  arrivalDate: string;
  sku: string;
  markupPct: string;
  markupSum: string;
  markupSource: 'pct' | 'sum';
  photos: string[];
};

const CATEGORIES = ['T-shirts', 'Shirts', 'Trousers', 'Outerwear', 'Knitwear'];
export const todayIso = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const kindOf = (category: string): GarmentKind =>
  category === 'Trousers' ? 'pants' : category === 'Outerwear' ? 'coat' : category === 'Knitwear' ? 'knit' : 'shirt';

export interface ProductFormProps {
  mode: 'add' | 'edit';
  currency: Currency;
  initial: ProductFormValues;
  /** product being edited, or the product that is purchased again («Пополнить») */
  product?: UiProduct;
  editing?: UiProduct;
  products: UiProduct[];
  batches: UiBatch[];
  backHref: string;
}

/** Initial values of the form for an existing lot (edit) or for a repeat purchase of it. */
export function valuesFromLot(p: UiProduct, repeat: boolean): ProductFormValues {
  const raw = p.raw;
  const byPrice = raw.pricingMode === 'PRICE' && !repeat;
  return {
    name: raw.product.nameRu,
    category: raw.product.category.key,
    batchId: repeat ? '' : p.batchId ?? '',
    qty: repeat ? '50' : String(raw.quantity),
    unitCost: raw.unitCost,
    cargo: repeat ? '' : raw.cargoTotal === '0' ? '' : raw.cargoTotal,
    orderDate: repeat ? todayIso() : raw.orderDate ?? raw.createdAt.slice(0, 10),
    arrivalDate: repeat ? '' : raw.arrivalDate ?? '',
    sku: raw.product.sku ?? '',
    markupPct: byPrice ? '' : raw.markupPercent,
    markupSum: byPrice ? markupSumOf(raw.salePrice, raw.unitCost, raw.cargoTotal, raw.quantity) : '',
    markupSource: byPrice ? 'sum' : 'pct',
    photos: raw.product.photos,
  };
}

export const emptyValues = (batchId = ''): ProductFormValues => ({
  name: '',
  category: 'T-shirts',
  batchId,
  qty: '',
  unitCost: '',
  cargo: '',
  orderDate: todayIso(),
  arrivalDate: '',
  sku: '',
  markupPct: '25',
  markupSum: '',
  markupSource: 'pct',
  photos: [],
});

/** «Добавление / изменение товара»: the backend recalculates and stores every figure; the summary is a live preview. */
export function ProductForm({ mode, currency: cur, initial, product, editing, products, batches, backHref }: ProductFormProps) {
  const { text, tr, L, localeTag } = useI18n();
  const { router } = useNavigation();
  const setToast = useUi((s) => s.setToast);
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState('');
  const [uploading, setUploading] = useState(0);
  const [createPurchase] = useMutation(CREATE_PURCHASE, { refetchQueries: 'active', awaitRefetchQueries: true });
  const [updatePurchase] = useMutation(UPDATE_PURCHASE, { refetchQueries: 'active', awaitRefetchQueries: true });
  const { register, watch, setValue, handleSubmit, formState } = useForm<ProductFormValues>({ defaultValues: initial });
  const pf = watch();
  const isEdit = mode === 'edit';

  const c = useMemo(
    () =>
      previewPurchase({
        quantity: pf.qty,
        unitCost: pf.unitCost,
        cargo: pf.cargo,
        markupSource: pf.markupSource,
        markupPct: pf.markupPct,
        markupSum: pf.markupSum,
      }),
    [pf.qty, pf.unitCost, pf.cargo, pf.markupSource, pf.markupPct, pf.markupSum],
  );

  const errors: Record<string, string> = {};
  if (!pf.name.trim()) errors.name = text('Введите название товара.', 'Mahsulot nomini kiriting.');
  if (!c.qtyOk) errors.qty = text('Целое число больше 0.', '0 dan katta butun son.');
  else if (editing && c.qty < editing.sold) errors.qty = text('Не меньше уже проданного: ', 'Sotilgandan kam bo‘lmasin: ') + editing.sold;
  if (!c.unitOk) errors.unitCost = text('Цена должна быть больше 0.', 'Narx 0 dan katta bo‘lishi kerak.');
  if (!c.cargoOk) errors.cargo = text('Не может быть отрицательным.', 'Manfiy bo‘lishi mumkin emas.');
  if (!pf.orderDate) errors.orderDate = text('Укажите дату заказа.', 'Buyurtma sanasini kiriting.');
  if (pf.arrivalDate && pf.orderDate && pf.arrivalDate < pf.orderDate)
    errors.arrivalDate = text('Не раньше даты заказа.', 'Buyurtma sanasidan oldin bo‘lmasin.');
  if (!c.markupOk) errors.markup = text('Наценка — число не меньше 0.', 'Ustama 0 dan kichik bo‘lmasin.');
  const sku = pf.sku.trim();
  if (sku && products.some((p) => p.sku === sku && p.productId !== product?.productId))
    errors.sku = text('Товар с таким ID/SKU уже есть.', 'Bunday ID/SKU li mahsulot bor.');

  const err = (key: string) => (showErrors ? errors[key] : undefined);
  const round2 = (x: number) => Math.round(x * 100) / 100;
  const pfMoney = (value: number) =>
    new Intl.NumberFormat(localeTag, { style: 'currency', currency: cur, maximumFractionDigits: cur === 'UZS' ? 0 : 2 }).format(
      Number.isFinite(value) ? value : 0,
    );
  const field = (key: string, label: string, input: ReactNode, opts?: { full?: boolean; hint?: string }) => (
    <label className={'pf-field' + (opts?.full ? ' full' : '') + (err(key) ? ' has-error' : '')}>
      <span className="pf-label">{label}</span>
      {input}
      {opts?.hint && !err(key) && <small className="pf-hint">{opts.hint}</small>}
      {err(key) && <small className="pf-error">{err(key)}</small>}
    </label>
  );
  const suffix = (node: ReactNode, unit: string) => (
    <span className="pf-input-suffix">
      {node}
      <span>{unit}</span>
    </span>
  );
  const goBack = () => router.push(backHref);

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 6 - pf.photos.length);
    for (const file of list) {
      setUploading((n) => n + 1);
      try {
        const url = await uploadImage(await downscaleImage(file, 480));
        const current = watch('photos');
        if (current.length < 6) setValue('photos', [...current, url]);
      } catch (error) {
        setToast(errorMessage(error, text));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setShowErrors(true);
    setServerError('');
    if (Object.keys(errors).length || !c.request) return;
    const name = values.name.trim();
    const input = {
      product: {
        ...(product ? { productId: product.productId } : {}),
        name,
        categoryKey: values.category,
        sku: sku || null,
        kind: kindOf(values.category),
        ...(product ? {} : { color: '#a8a698' }),
        photos: values.photos,
      },
      batchId: values.batchId || null,
      currency: cur,
      unitCost: values.unitCost.replace(',', '.').replace(/\s/g, ''),
      quantity: c.qty,
      cargoTotal: values.cargo.trim() ? values.cargo.replace(',', '.').replace(/\s/g, '') : '0',
      pricingMode: c.request.pricingMode,
      markupPercent: c.request.markupPercent,
      salePrice: c.request.salePrice,
      orderDate: values.orderDate || null,
      arrivalDate: values.arrivalDate || null,
    };
    try {
      if (isEdit && editing) {
        await updatePurchase({ variables: { id: editing.id, input } });
        setToast(text('Изменения товара «' + name + '» сохранены.', '«' + name + '» mahsuloti saqlandi.'));
      } else {
        await createPurchase({ variables: { input } });
        setToast(text('Товар «' + name + '» добавлен.', '«' + name + '» mahsuloti qo‘shildi.'));
      }
      goBack();
    } catch (error) {
      setServerError(errorCode(error) === 'UNIQUE_CONSTRAINT' ? text('Товар с таким ID/SKU уже есть.', 'Bunday ID/SKU li mahsulot bor.') : errorMessage(error, text));
    }
  });

  const profitNegative = c.unitProfit < 0;
  return (
    <section className="pf-page" aria-labelledby="pf-title">
      <button type="button" className="text-button batch-back" onClick={goBack}>
        <Icon name="arrow" size={15} className="icon-flip" /> {text('Назад', 'Orqaga')}
      </button>
      <h1 id="pf-title">
        {isEdit ? text('Изменение товара', 'Mahsulotni tahrirlash') : text('Добавление товара', 'Mahsulot qo‘shish')}
        {isEdit && editing && <span className="batch-code"> ({editing.code})</span>}
      </h1>
      <div className="pf-layout">
        <form className="panel pf-card" onSubmit={onSubmit} noValidate>
          <div className="pf-section">
            <h2>{text('Товар', 'Mahsulot')}</h2>
            <p className="pf-section-note">{text('Поля, которые заполняете вы.', 'Siz to‘ldiradigan maydonlar.')}</p>
            <div className="pf-grid">
              {field('name', text('Название', 'Nomi'), <input maxLength={70} placeholder={text('напр. Рубашка Polo', 'masalan, Polo ko‘ylak')} {...register('name')} />)}
              {field(
                'qty',
                text('Количество, шт.', 'Miqdor, dona'),
                <input type="number" inputMode="numeric" min="1" step="1" placeholder="10" {...register('qty')} />,
                { hint: editing ? text('Продано: ', 'Sotilgan: ') + editing.sold : undefined },
              )}
              {field(
                'category',
                text('Категория', 'Toifa'),
                <select {...register('category')}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {L(cat)}
                    </option>
                  ))}
                </select>,
              )}
              {field(
                'batchId',
                text('Партия', 'Partiya'),
                <select {...register('batchId')}>
                  <option value="">{text('Нет партии', 'Partiyasiz')}</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {tr(b.name) + ' · ' + b.code}
                    </option>
                  ))}
                </select>,
              )}
            </div>
          </div>
          <div className="pf-section">
            <h2>{text('Закупка', 'Xarid')}</h2>
            <div className="pf-grid">
              {field(
                'unitCost',
                text('Цена закупки за 1 шт.', '1 dona xarid narxi'),
                suffix(<input type="number" inputMode="decimal" min="0" step="any" placeholder={cur === 'UZS' ? '100000' : '10'} {...register('unitCost')} />, cur),
              )}
              {field(
                'cargo',
                text('Общая стоимость карго', 'Umumiy kargo narxi'),
                suffix(<input type="number" inputMode="decimal" min="0" step="any" placeholder="0" {...register('cargo')} />, cur),
                { hint: text('Доставка всей партии этого товара.', 'Shu mahsulot partiyasining yetkazib berilishi.') },
              )}
              {field('orderDate', text('Дата заказа', 'Buyurtma sanasi'), <input type="date" {...register('orderDate')} />)}
              {field(
                'arrivalDate',
                text('Дата прибытия', 'Kelish sanasi'),
                <input type="date" min={pf.orderDate || undefined} {...register('arrivalDate')} />,
                { hint: text('Фактическая или ожидаемая.', 'Haqiqiy yoki kutilayotgan.') },
              )}
            </div>
          </div>
          <div className="pf-section">
            <h2>{text('Фото товара', 'Mahsulot rasmi')}</h2>
            <p className="pf-section-note">
              {text('До 6 фото. Первое будет обложкой товара в таблицах.', '6 tagacha rasm. Birinchisi jadvallarda muqova bo‘ladi.')}
            </p>
            <div className="pf-photos">
              {pf.photos.map((src, i) => (
                <div className="pf-photo" key={src + i}>
                  <img src={src} alt={text('Фото ', 'Rasm ') + (i + 1)} />
                  {i === 0 && <span className="pf-photo-badge">{text('Обложка', 'Muqova')}</span>}
                  <button
                    type="button"
                    className="pf-photo-remove"
                    aria-label={text('Удалить фото ', 'Rasmni o‘chirish ') + (i + 1)}
                    onClick={() => setValue('photos', pf.photos.filter((_, j) => j !== i))}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
              {pf.photos.length + uploading < 6 && (
                <label className="pf-photo-add">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    aria-label={text('Загрузить фото товара', 'Mahsulot rasmini yuklash')}
                    onChange={(e) => {
                      void addPhotos(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <Icon name="plus" size={22} />
                  <span>{uploading ? text('Загрузка…', 'Yuklanmoqda…') : text('Загрузить фото', 'Rasm yuklash')}</span>
                </label>
              )}
            </div>
          </div>
          <div className="pf-section">
            <h2>{text('Наценка', 'Ustama')}</h2>
            <p className="pf-section-note">
              {text('Заполните любое из двух полей — второе и цена продажи посчитаются сами.', 'Ikkalasidan birini to‘ldiring — ikkinchisi va sotish narxi o‘zi hisoblanadi.')}
            </p>
            <div className="pf-grid">
              {field(
                'markup',
                text('Наценка, %', 'Ustama, %'),
                suffix(
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={pf.markupSource === 'pct' ? pf.markupPct : String(round2(c.pct))}
                    onChange={(e) => {
                      setValue('markupPct', e.target.value);
                      setValue('markupSource', 'pct');
                    }}
                  />,
                  '%',
                ),
              )}
              {field(
                'markupSum',
                text('Наценка в сумме', 'Ustama summada'),
                suffix(
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={pf.markupSource === 'sum' ? pf.markupSum : String(cur === 'UZS' ? Math.round(c.sum) : round2(c.sum))}
                    onChange={(e) => {
                      setValue('markupSum', e.target.value);
                      setValue('markupSource', 'sum');
                    }}
                  />,
                  cur,
                ),
              )}
            </div>
          </div>
          <div className="pf-section">
            <h2>{text('Интернет-магазин', 'Internet-do‘kon')}</h2>
            <div className="pf-grid">
              {field(
                'sku',
                text('ID / SKU товара на wardrobestore.uz', 'wardrobestore.uz dagi mahsulot ID / SKU'),
                <input maxLength={80} placeholder={text('напр. krosovka-mthwpfx0', 'masalan, krosovka-mthwpfx0')} {...register('sku')} />,
                { full: true, hint: text('По нему продажи и остатки будут сопоставляться с магазином.', 'U orqali sotuvlar va qoldiqlar do‘kon bilan solishtiriladi.') },
              )}
            </div>
          </div>
          <div className="pf-actions">
            <button type="button" className="button secondary" onClick={goBack}>
              {text('Отмена', 'Bekor qilish')}
            </button>
            <button type="submit" className="button primary" disabled={formState.isSubmitting || uploading > 0}>
              <Icon name={isEdit ? 'check' : 'plus'} size={17} />
              {isEdit ? text('Сохранить изменения', 'O‘zgarishlarni saqlash') : text('Добавить товар', 'Mahsulot qo‘shish')}
            </button>
          </div>
          {showErrors && Object.keys(errors).length > 0 && (
            <p className="form-error" role="alert">
              {text('Проверьте поля, отмеченные красным.', 'Qizil bilan belgilangan maydonlarni tekshiring.')}
            </p>
          )}
          {serverError && (
            <p className="form-error" role="alert">
              {serverError}
            </p>
          )}
        </form>
        <aside className="panel pf-summary" aria-live="polite">
          <h2>
            {text('Расчёт', 'Hisob')} <span className="pf-auto-badge">{text('автоматически', 'avtomatik')}</span>
          </h2>
          <p className="pf-section-note">{text('Вводить не нужно — обновляется при каждом изменении.', 'Kiritish shart emas — har o‘zgarishda yangilanadi.')}</p>
          <dl>
            <div className="pf-row"><dt>{text('Общая стоимость закупки', 'Umumiy xarid narxi')}</dt><dd>{pfMoney(c.totalPurchase)}</dd></div>
            <div className="pf-row"><dt>{text('Карго на 1 шт.', '1 donaga kargo')}</dt><dd>{pfMoney(c.cargoPerUnit)}</dd></div>
            <div className="pf-row strong"><dt>{text('Полная себестоимость 1 шт.', '1 dona to‘liq tannarxi')}</dt><dd>{pfMoney(c.fullUnit)}</dd></div>
            <div className="pf-row"><dt>{text('Общие затраты на партию', 'Partiyaga umumiy xarajat')}</dt><dd>{pfMoney(c.totalCost)}</dd></div>
            <div className="pf-row"><dt>{text('Наценка', 'Ustama')}</dt><dd>{round2(c.pct) + '% · ' + pfMoney(c.sum)}</dd></div>
            <div className="pf-row accent"><dt>{text('Цена продажи 1 шт.', '1 dona sotish narxi')}</dt><dd>{pfMoney(c.price)}</dd></div>
            <div className={'pf-row profit' + (profitNegative ? ' negative' : '')}><dt>{text('Прибыль с 1 шт.', '1 donadan foyda')}</dt><dd>{pfMoney(c.unitProfit)}</dd></div>
            <div className={'pf-row profit total' + (profitNegative ? ' negative' : '')}><dt>{text('Общая ожидаемая прибыль', 'Umumiy kutilayotgan foyda')}</dt><dd>{pfMoney(c.totalProfit)}</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
