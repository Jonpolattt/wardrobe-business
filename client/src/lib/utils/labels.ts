import type { IconName } from '@/components/icons/Icon';
import type { FlagCode } from '@/components/ui/Flag';

export type Locale = 'ru' | 'uz';
export type Currency = 'UZS' | 'USD' | 'CNY';
export type LocalText = string | { ru: string; uz: string };

/* Переводы для значений из данных (категории, статусы, периоды) */
export const labels: Record<string, { ru: string; uz: string }> = {
  "All categories": { ru: "Все категории", uz: "Barcha toifalar" },
  "T-shirts": { ru: "Футболки", uz: "Futbolkalar" },
  Shirts: { ru: "Рубашки", uz: "Ko‘ylaklar" },
  Trousers: { ru: "Брюки", uz: "Shimlar" },
  Outerwear: { ru: "Верхняя одежда", uz: "Ustki kiyim" },
  Knitwear: { ru: "Трикотаж", uz: "Trikotaj" },
  Other: { ru: "Другое", uz: "Boshqa" },
  Inventory: { ru: "Закупка товара", uz: "Tovar xaridi" },
  Logistics: { ru: "Логистика", uz: "Logistika" },
  Operations: { ru: "Операционные", uz: "Operatsion" },
  Marketing: { ru: "Маркетинг", uz: "Marketing" },
  Delivered: { ru: "Доставлено", uz: "Yetkazildi" },
  "In transit": { ru: "В пути", uz: "Yo‘lda" },
  Preparing: { ru: "Готовится", uz: "Tayyorlanmoqda" },
  Weekly: { ru: "Неделя", uz: "Hafta" },
  Monthly: { ru: "Месяц", uz: "Oy" },
  Yearly: { ru: "Год", uz: "Yil" },
};

export const languageOptions: { value: Locale; flag: FlagCode; label: string }[] = [
  { value: 'uz', flag: 'uz', label: 'O‘zbekcha' },
  { value: 'ru', flag: 'ru', label: 'Русский' },
];

export const currencyNames: Record<Currency, { flag: FlagCode; ru: string; uz: string }> = {
  UZS: { flag: 'uz', ru: 'Узбекский сум', uz: 'O‘zbek so‘mi' },
  USD: { flag: 'us', ru: 'Доллар США', uz: 'AQSH dollari' },
  CNY: { flag: 'cn', ru: 'Китайский юань', uz: 'Xitoy yuani' },
};

export const moduleLabels: Record<Locale, Record<string, string>> = {
  ru: {
    Overview: "Обзор",
    Batches: "Партии",
    Products: "Товары",
    Sales: "Продажи",
    Expenses: "Расходы",
    Cargo: "Карго",
    Conversion: "Конвертация",
    Settings: "Настройки",
    Profile: "Профиль",
  },
  uz: {
    Overview: "Umumiy ko‘rinish",
    Batches: "Partiyalar",
    Products: "Mahsulotlar",
    Sales: "Sotuvlar",
    Expenses: "Xarajatlar",
    Cargo: "Kargo",
    Conversion: "Konvertatsiya",
    Settings: "Sozlamalar",
    Profile: "Profil",
  },
};

export const navGroups: { label: Record<Locale, string>; items: { name: string; icon: IconName }[] }[] = [
  {
    label: { ru: "Товары и Поставки", uz: "Mahsulotlar va yetkazib berish" },
    items: [
      { name: "Overview", icon: "grid" },
      { name: "Batches", icon: "box" },
      { name: "Products", icon: "shirt" },
    ],
  },
  {
    label: { ru: "Финансы", uz: "Moliya" },
    items: [
      { name: "Sales", icon: "trend" },
      { name: "Expenses", icon: "wallet" },
      { name: "Cargo", icon: "truck" },
      { name: "Conversion", icon: "exchange" },
    ],
  },
];

/** Page names of the original interface ↔ routes of the Next.js app. */
export const PAGE_ROUTES: Record<string, string> = {
  Overview: '/overview',
  Batches: '/batches',
  Products: '/products',
  Sales: '/analytics',
  Expenses: '/expenses',
  Cargo: '/cargo',
  Conversion: '/conversion',
  Settings: '/settings',
  Profile: '/profile',
};

export function pageFromPath(pathname: string): string {
  const entry = Object.entries(PAGE_ROUTES).find(([, route]) => pathname === route || pathname.startsWith(route + '/'));
  return entry ? entry[0] : 'Overview';
}
