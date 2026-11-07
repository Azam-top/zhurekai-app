const pad = (n: number) => String(n).padStart(2, '0');

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parses YYYY-MM-DD as local midnight (new Date(string) would use UTC). */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / 86_400_000);
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return dateKey(parseKey(key)) === key;
}

export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/** Accepts user input such as "9:00" and returns "09:00", or null if invalid. */
export function normalizeTime(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const t = `${m[1].padStart(2, '0')}:${m[2]}`;
  return isValidTime(t) ? t : null;
}

// Written out because JS runtimes don't all ship Kazakh locale data.
const MONTHS = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  kk: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
};
const WEEKDAYS = {
  ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  kk: ['жс', 'дс', 'сс', 'ср', 'бс', 'жм', 'сб'],
};
type DateLang = keyof typeof MONTHS;

export function formatDate(key: string, lang: DateLang): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
}

export const weekdayShort = (key: string, lang: DateLang) => WEEKDAYS[lang][parseKey(key).getDay()];

export function formatDateTime(ms: number, lang: DateLang): string {
  const d = new Date(ms);
  return `${formatDate(dateKey(d), lang)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
