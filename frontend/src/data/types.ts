export interface Mandi {
  code: string;
  name: string;
  /** Hindi/Devanagari rendering of the place name, when curated. */
  nameHi?: string;
  taluka: string;
  /** Null until geocoded via the Location Editor -- location is optional context, not a requirement for a market to appear in recommendations. */
  lat: number | null;
  lon: number | null;
}

export interface Commodity {
  id: string;
  name: string;
  /** Hindi rendering of the commodity name, when curated. */
  nameHi?: string;
  unit: string;
  /** Curated typical single-trip trade lot size, in quintals. Falls back to DEFAULT_LOT_QUINTALS when not yet curated for this commodity. */
  defaultLotQuintals: number;
}

export type Metric = 'modal' | 'min' | 'max';

export type PriceStatus = 'fresh' | 'stale' | 'missing';

/** How old a resolved price point is relative to the selected day: reported
 * today, carried forward from the day before, or older than that. */
export type Freshness = 'fresh' | 'recent' | 'old';

/** Global display unit for per-unit price rates. Every price is stored and
 * ranked internally as Rs/quintal (see analytics.ts); this only controls how
 * rates are presented -- it never touches ranking or totals math. */
export type PriceUnit = 'quintal' | 'kg';
