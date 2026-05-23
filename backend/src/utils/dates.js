/**
 * Helpers de fecha. La app trabaja en UTC en BD y convierte a Europe/Madrid
 * solo en presentación / cron / cálculo de "lunes de la semana".
 */

const DAY_TOKENS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** day_of_week 1..7 → 'mon'..'sun' (lunes = 1) */
export function dowToToken(dow) {
  if (dow < 1 || dow > 7) throw new Error(`day_of_week fuera de rango: ${dow}`);
  return DAY_TOKENS[dow - 1];
}

/** 'mon'..'sun' → 1..7 */
export function tokenToDow(token) {
  const i = DAY_TOKENS.indexOf(token);
  if (i === -1) throw new Error(`token inválido: ${token}`);
  return i + 1;
}

/** Valida formato YYYY-MM-DD y que es lunes */
export function parseWeekStart(input) {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new Error('week_start debe ser YYYY-MM-DD');
  }
  const d = new Date(`${input}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error('week_start no es una fecha válida');
  if (d.getUTCDay() !== 1) throw new Error('week_start debe caer en lunes (UTC)');
  return input;
}

/** Suma N días a una fecha YYYY-MM-DD y devuelve YYYY-MM-DD */
export function addDays(weekStart, days) {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Devuelve el lunes (en UTC) de la semana actual en formato YYYY-MM-DD */
export function currentWeekStart(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay() || 7; // domingo=0 → 7
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}

/** Resta N semanas (en lunes) */
export function subtractWeeks(weekStart, n) {
  return addDays(weekStart, -7 * n);
}

export const DAY_TOKENS_LIST = DAY_TOKENS;
