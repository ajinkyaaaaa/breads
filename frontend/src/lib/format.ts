import type { PriceUnit } from '../data/types';

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inrDecimal = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatRupees(value: number): string {
  return `₹${inr.format(Math.round(value))}`;
}

/** Every price is stored/ranked internally as Rs/quintal (see analytics.ts) --
 * this is purely a display-layer conversion for the global unit toggle, never
 * used in ranking or totals math. */
export function toDisplayPrice(pricePerQuintal: number, unit: PriceUnit): number {
  return unit === 'kg' ? pricePerQuintal / 100 : pricePerQuintal;
}

/** A quintal-scale rupee value reads fine rounded to whole rupees, but the
 * same value divided by 100 for kg needs a couple decimal places or it just
 * looks like it lost precision -- so kg gets its own formatting. Use this for
 * a value that's already in display units; use `formatRate` when starting
 * from the raw Rs/quintal figure. */
export function formatDisplayRupees(value: number, unit: PriceUnit): string {
  return unit === 'kg' ? `₹${inrDecimal.format(value)}` : formatRupees(value);
}

export function formatRate(pricePerQuintal: number, unit: PriceUnit): string {
  return formatDisplayRupees(toDisplayPrice(pricePerQuintal, unit), unit);
}

export function unitSuffix(unit: PriceUnit): string {
  return unit === 'kg' ? '/kg' : '/Qtl';
}

export function unitLabel(unit: PriceUnit): string {
  return unit === 'kg' ? 'Kg' : 'Qtl';
}

export function unitConversionTooltip(unit: PriceUnit): string {
  return unit === 'kg' ? '1 kg = 0.01 Qtl  (1 Qtl = 100 kg)' : '1 Qtl = 100 kg';
}

export function formatPct(value: number, opts: { sign?: boolean } = {}): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = opts.sign && rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });
}

export function ordinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

/** e.g. "15th Aug" — for the masthead's compact date navigator. */
export function formatOrdinalDayMonth(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  const month = d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
  return `${day}${ordinalSuffix(day)} ${month}`;
}

/** e.g. "Thu" */
export function formatWeekdayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
}

export function formatKm(value: number): string {
  return `${Math.round(value)} km`;
}

/** Today's calendar date in the viewer's local timezone, as YYYY-MM-DD -- for
 * comparing against archive dates (plain calendar days, no timezone) to tell
 * whether the dashboard is showing an older day than "today" right now. */
export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** e.g. "2:45 PM, 19th Aug" -- for the masthead's last-synced label. */
export function formatSyncedAt(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-IN', { month: 'short' });
  return `${time}, ${day}${ordinalSuffix(day)} ${month}`;
}
