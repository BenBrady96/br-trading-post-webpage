export const TIME_ZONE = 'Europe/London';

const money = new Map();

export function formatPrice(value, currency = 'GBP') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  const code = String(currency || 'GBP').toUpperCase();
  if (!money.has(code)) money.set(code, new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }));
  return money.get(code).format(amount);
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const LONG_DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE });
const DAY_PARTS = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TIME_ZONE });
const YMD = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE });

export const toDate = (value) => (value instanceof Date ? value : new Date(value));

export const longDate = (value) => LONG_DATE.format(toDate(value));

export const londonDay = (value) => YMD.format(toDate(value));

function parts(value) {
  const out = {};
  for (const { type, value: v } of DAY_PARTS.formatToParts(toDate(value))) out[type] = v;
  return out;
}

export function clockTime(value) {
  const { hour, minute } = parts(value);
  const h = Number(hour);
  const m = Number(minute);
  if (h === 0 && m === 0) return 'midnight';
  if (h === 12 && m === 0) return 'midday';
  const suffix = h < 12 ? 'am' : 'pm';
  const twelve = h % 12 || 12;
  return m === 0 ? `${twelve}${suffix}` : `${twelve}:${String(m).padStart(2, '0')}${suffix}`;
}

function whenText(label, value, now, relative) {
  const when = toDate(value);
  const at = `at ${clockTime(when)}`;
  if (relative) {
    const day = londonDay(when);
    if (day === londonDay(now)) return `${label} today ${at}`;
    if (day === londonDay(new Date(toDate(now).getTime() + 86400000))) return `${label} tomorrow ${at}`;
  }
  const { weekday, day: date, month } = parts(when);
  return `${label} ${weekday} ${Number(date)} ${month} ${at}`;
}

export const endsText = (value, now = new Date(), { relative = true } = {}) => whenText('Ends', value, now, relative);

export const startsText = (value, now = new Date(), { relative = true } = {}) => whenText('Starts', value, now, relative);

export function countdown(value, now = new Date()) {
  const ms = toDate(value).getTime() - toDate(now).getTime();
  if (!(ms > 0)) return { done: true, ms: 0, text: 'Ended' };
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  let text;
  if (days > 0) text = `${plural(days, 'day')} ${plural(hours, 'hour')}`;
  else if (hours > 0) text = `${plural(hours, 'hour')} ${plural(minutes, 'minute')}`;
  else if (minutes > 0) text = `${plural(minutes, 'minute')} ${plural(seconds, 'second')}`;
  else text = plural(seconds, 'second');
  return { done: false, ms, days, hours, minutes, seconds, text };
}

export const isLive = (promotion, now = new Date()) => {
  const t = toDate(now).getTime();
  const starts = promotion.startsAt ? toDate(promotion.startsAt).getTime() : -Infinity;
  const ends = toDate(promotion.endsAt).getTime();
  return Number.isFinite(ends) && starts <= t && t < ends;
};
