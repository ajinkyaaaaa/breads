const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function formatRupees(value: number): string {
  return `₹${inr.format(Math.round(value))}`;
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

function ordinalSuffix(n: number): string {
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
