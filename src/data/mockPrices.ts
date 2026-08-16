import { MANDIS } from './mandis';
import { COMMODITIES } from './commodities';
import type { DailyPrice, Mandi, Commodity } from './types';

/** Deterministic 32-bit hash -> used to seed per-entity PRNGs so the demo is stable across reloads. */
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 seeded PRNG. */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rand(seed: string): number {
  return mulberry32(hashString(seed))();
}

function randRange(seed: string, min: number, max: number): number {
  return min + rand(seed) * (max - min);
}

/** The 7 mock days, oldest first, ending "today". */
export const DATES: string[] = (() => {
  const today = new Date('2026-08-15T00:00:00Z');
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
})();

export const TODAY = DATES[DATES.length - 1];

const NOISE_BY_TIER: Record<Mandi['reportingTier'], number> = {
  strong: 0.03,
  moderate: 0.06,
  weak: 0.1,
};

const SPREAD_BY_TIER: Record<Mandi['reportingTier'], number> = {
  strong: 0.05,
  moderate: 0.09,
  weak: 0.14,
};

/** Which mandis (if any) act as a "cheap source" mandi for each commodity. */
const specialtySourceByCommodity = new Map<string, string>();
for (const m of MANDIS) {
  if (m.specialtyCommodityId) specialtySourceByCommodity.set(m.specialtyCommodityId, m.code);
}

/** For weak-tier mandis, one deterministically-chosen date per mandi has no reported data at all. */
const missingDateByMandi = new Map<string, string>();
for (const m of MANDIS) {
  if (m.reportingTier === 'weak') {
    const idx = hashString(m.code + '-gap') % DATES.length;
    missingDateByMandi.set(m.code, DATES[idx]);
  }
}

function regionalBase(commodity: Commodity, date: string): number {
  const mid = (commodity.baseMin + commodity.baseMax) / 2;
  const span = commodity.baseMax - commodity.baseMin;
  // Small day-to-day drift around the midpoint, deterministic per commodity+date.
  const drift = randRange(`${commodity.id}-drift-${date}`, -0.12, 0.12);
  return mid + drift * span;
}

function buildRecord(mandi: Mandi, commodity: Commodity, date: string): DailyPrice {
  const seedBase = `${mandi.code}-${commodity.id}-${date}`;
  const base = regionalBase(commodity, date);

  const noise = NOISE_BY_TIER[mandi.reportingTier];
  let multiplier = 1 + randRange(`${seedBase}-mult`, -noise, noise);

  if (mandi.specialtyCommodityId === commodity.id) {
    // Source mandi for this crop: notably cheaper, higher arrivals.
    multiplier *= randRange(`${seedBase}-source`, 0.7, 0.8);
  } else {
    const sourceMandi = specialtySourceByCommodity.get(commodity.id);
    if (sourceMandi) {
      // "Importing" mandi for a crop that has a known cheap source elsewhere: modest markup.
      multiplier *= 1 + randRange(`${seedBase}-import`, 0.05, 0.16);
    }
  }

  const modal = Math.round(base * multiplier);

  const spread = SPREAD_BY_TIER[mandi.reportingTier];
  const min = Math.round(modal * (1 - spread * randRange(`${seedBase}-minf`, 0.5, 1)));
  const max = Math.round(modal * (1 + spread * randRange(`${seedBase}-maxf`, 0.5, 1)));

  // Ag prices are typically right-skewed: mean sits slightly above modal, median in between.
  const skew = randRange(`${seedBase}-skew`, -0.015, 0.05);
  const mean = Math.round(modal * (1 + skew));
  const median = Math.round(modal + (mean - modal) * 0.4);

  const arrivalBase = mandi.specialtyCommodityId === commodity.id ? 400 : 120;
  const arrivalQuintals = Math.round(randRange(`${seedBase}-arr`, arrivalBase * 0.6, arrivalBase * 1.6));

  return { mandiCode: mandi.code, commodityId: commodity.id, date, min, max, modal, mean, median, arrivalQuintals };
}

/** mandiCode -> commodityId -> date -> DailyPrice (absent = not reported that day). */
const store = new Map<string, Map<string, Map<string, DailyPrice>>>();

for (const mandi of MANDIS) {
  const byCommodity = new Map<string, Map<string, DailyPrice>>();
  const gapDate = missingDateByMandi.get(mandi.code);
  for (const commodity of COMMODITIES) {
    const byDate = new Map<string, DailyPrice>();
    for (const date of DATES) {
      if (date === gapDate) continue; // simulate a non-reporting day for this mandi
      byDate.set(date, buildRecord(mandi, commodity, date));
    }
    byCommodity.set(commodity.id, byDate);
  }
  store.set(mandi.code, byCommodity);
}

export interface ResolvedPrice {
  record: DailyPrice;
  /** true if `date` had no report and we fell back to the most recent prior available date. */
  isFallback: boolean;
  /** The date actually used (may differ from the requested date when isFallback is true). */
  resolvedDate: string;
}

/** Looks up a mandi/commodity/date, falling back to the most recent prior available date if missing. */
export function resolvePrice(mandiCode: string, commodityId: string, date: string): ResolvedPrice | undefined {
  const byDate = store.get(mandiCode)?.get(commodityId);
  if (!byDate) return undefined;

  const direct = byDate.get(date);
  if (direct) return { record: direct, isFallback: false, resolvedDate: date };

  const idx = DATES.indexOf(date);
  for (let i = idx - 1; i >= 0; i--) {
    const prior = byDate.get(DATES[i]);
    if (prior) return { record: prior, isFallback: true, resolvedDate: DATES[i] };
  }
  return undefined;
}

/** Resolved price for every mandi, for a given commodity/date. */
export function resolvePricesForCommodity(commodityId: string, date: string): Array<{ mandi: Mandi; resolved: ResolvedPrice | undefined }> {
  return MANDIS.map((mandi) => ({ mandi, resolved: resolvePrice(mandi.code, commodityId, date) }));
}

/** 7-day series (with fallback-filled gaps) for a mandi/commodity, oldest first. */
export function weekSeries(mandiCode: string, commodityId: string): Array<ResolvedPrice | undefined> {
  return DATES.map((date) => resolvePrice(mandiCode, commodityId, date));
}
