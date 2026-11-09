/** Date-only values ("YYYY-MM-DD") are exchanged as strings to avoid time-zone shifts. */
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const toDateOnly = (value: Date | null | undefined): string | null => (value ? value.toISOString().slice(0, 10) : null);

export const fromDateOnly = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  if (!DATE_ONLY.test(value)) throw new Error('Invalid date');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toDateOnly(date) !== value) throw new Error('Invalid date');
  return date;
};

export const startOfUtcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
