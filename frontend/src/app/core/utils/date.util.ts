import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { DayKey, DayOfWeek } from '../types/api.types';

const TZ = 'Europe/Madrid';
const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS_SHORT: Record<DayKey, string> = {
  mon: 'L', tue: 'M', wed: 'X', thu: 'J', fri: 'V', sat: 'S', sun: 'D'
};
const DAY_LABELS_LONG: Record<DayKey, string> = {
  mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo'
};

export function isoWeekStart(d: Date | string): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

export function addWeeks(weekStart: string, weeks: number): string {
  return format(addDays(parseISO(weekStart), weeks * 7), 'yyyy-MM-dd');
}

export function dayKeyFromDow(dow: DayOfWeek): DayKey {
  return DAY_KEYS[dow - 1];
}
export function dowFromDayKey(key: DayKey): DayOfWeek {
  return (DAY_KEYS.indexOf(key) + 1) as DayOfWeek;
}
export function dayKeys(): DayKey[] { return [...DAY_KEYS]; }
export function dayKeysWeekdays(): DayKey[] { return DAY_KEYS.slice(0, 5); }
export function dayShort(key: DayKey): string { return DAY_LABELS_SHORT[key]; }
export function dayLong(key: DayKey): string { return DAY_LABELS_LONG[key]; }

export function formatDateLong(date: string): string {
  return format(parseISO(date), "EEEE d 'de' MMMM", { locale: es });
}

export function formatDateShort(date: string): string {
  return format(parseISO(date), "d MMM", { locale: es });
}

export function formatRange(weekStart: string): string {
  const start = parseISO(weekStart);
  const end = addDays(start, 6);
  const sameMonth = format(start, 'M') === format(end, 'M');
  if (sameMonth) {
    return `${format(start, 'd', { locale: es })} – ${format(end, "d 'de' MMMM", { locale: es })}`;
  }
  return `${format(start, "d 'de' MMM", { locale: es })} – ${format(end, "d 'de' MMM", { locale: es })}`;
}

export function relativeFromNow(iso: string): string {
  const date = parseISO(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return format(date, "d 'de' MMM", { locale: es });
}

export function timeZone(): string { return TZ; }
