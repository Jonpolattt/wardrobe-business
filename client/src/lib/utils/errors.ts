import { CombinedGraphQLErrors } from '@apollo/client';

type Text = (ru: string, uz: string) => string;

/** Error code sent by the backend (the GraphQL error message is the code). */
export function errorCode(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
    if (!first) return 'UNKNOWN';
    if (first.extensions?.code === 'UNAUTHENTICATED') return 'UNAUTHENTICATED';
    return first.message;
  }
  if (error instanceof Error) return error.message;
  return 'UNKNOWN';
}

/** Human-readable message for an error returned by the backend. */
export function errorMessage(error: unknown, text: Text): string {
  const code = errorCode(error);
  const messages: Record<string, [string, string]> = {
    INVALID_CREDENTIALS: ['Неверный email или пароль.', 'Email yoki parol noto‘g‘ri.'],
    PASSWORD_INCORRECT: ['Неверный пароль.', 'Parol noto‘g‘ri.'],
    PASSWORD_TOO_SHORT: ['Пароль должен быть не короче 8 символов.', 'Parol kamida 8 belgidan iborat bo‘lsin.'],
    PASSWORD_SAME_AS_OLD: ['Новый пароль совпадает с текущим.', 'Yangi parol joriy parol bilan bir xil.'],
    NAME_REQUIRED: ['Введите название.', 'Nomini kiriting.'],
    PLANNED_COST_INVALID: ['Некорректная общая цена.', 'Umumiy narx noto‘g‘ri.'],
    EMAIL_TAKEN: ['Этот email уже занят другим аккаунтом.', 'Bu email boshqa hisobga tegishli.'],
    EMAIL_INVALID: ['Некорректный email.', 'Email noto‘g‘ri.'],
    UNAUTHENTICATED: ['Сеанс истёк — войдите снова.', 'Seans tugadi — qaytadan kiring.'],
    QUANTITY_INVALID: ['Количество — целое число больше 0.', 'Miqdor 0 dan katta butun son bo‘lsin.'],
    QUANTITY_BELOW_SOLD: ['Количество не может быть меньше уже проданного.', 'Miqdor sotilgandan kam bo‘lishi mumkin emas.'],
    UNIT_COST_INVALID: ['Цена закупки должна быть больше 0.', 'Xarid narxi 0 dan katta bo‘lishi kerak.'],
    CARGO_INVALID: ['Карго не может быть отрицательным.', 'Kargo manfiy bo‘lishi mumkin emas.'],
    MARKUP_INVALID: ['Некорректная наценка.', 'Ustama noto‘g‘ri.'],
    SALE_PRICE_INVALID: ['Некорректная цена продажи.', 'Sotish narxi noto‘g‘ri.'],
    ARRIVAL_BEFORE_ORDER: ['Дата прибытия раньше даты заказа.', 'Kelish sanasi buyurtma sanasidan oldin.'],
    DATE_INVALID: ['Некорректная дата.', 'Sana noto‘g‘ri.'],
    UNIQUE_CONSTRAINT: ['Товар с таким ID/SKU уже есть.', 'Bunday ID/SKU li mahsulot bor.'],
    BATCH_NOT_FOUND: ['Партия не найдена.', 'Partiya topilmadi.'],
    PURCHASE_NOT_FOUND: ['Товар не найден.', 'Mahsulot topilmadi.'],
    PRODUCT_NOT_FOUND: ['Товар не найден.', 'Mahsulot topilmadi.'],
    CATEGORY_NOT_FOUND: ['Категория не найдена.', 'Toifa topilmadi.'],
    RATE_INVALID: ['Курс должен быть больше нуля.', 'Kurs noldan katta bo‘lishi kerak.'],
    FILE_TYPE_NOT_ALLOWED: ['Можно загрузить только изображение (JPEG, PNG, WebP, GIF, AVIF).', 'Faqat rasm yuklash mumkin (JPEG, PNG, WebP, GIF, AVIF).'],
    'File too large': ['Файл слишком большой.', 'Fayl juda katta.'],
    STORE_NOT_CONFIGURED: ['Синхронизация с магазином не настроена на сервере.', 'Do‘kon bilan sinxronlash serverda sozlanmagan.'],
    SYNC_ALREADY_RUNNING: ['Синхронизация уже выполняется.', 'Sinxronlash allaqachon bajarilmoqda.'],
  };
  const known = messages[code];
  if (known) return text(known[0], known[1]);
  if (code.includes('Too Many Requests') || code.includes('ThrottlerException'))
    return text('Слишком много попыток. Подождите минуту.', 'Juda ko‘p urinish. Bir daqiqa kuting.');
  if (code.startsWith('STORE_SYNC_FAILED')) return text('Не удалось получить данные магазина.', 'Do‘kon ma’lumotlarini olib bo‘lmadi.');
  if (code === 'Failed to fetch' || code.includes('NetworkError')) return text('Сервер недоступен. Проверьте подключение.', 'Server mavjud emas. Ulanishni tekshiring.');
  return text('Не удалось выполнить действие. Попробуйте ещё раз.', 'Amalni bajarib bo‘lmadi. Qayta urinib ko‘ring.');
}
