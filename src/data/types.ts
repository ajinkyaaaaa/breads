export interface Mandi {
  code: string;
  name: string;
  /** Hindi/Devanagari rendering of the place name. */
  nameHi: string;
  taluka: string;
  lat: number;
  lon: number;
  enamDigital: boolean;
  /** Commodity this mandi is a known source specialty for (cheaper, higher arrivals). */
  specialtyCommodityId?: string;
  /** Smaller/less-digitized mandis get wider price noise and occasional missing days. */
  reportingTier: 'strong' | 'moderate' | 'weak';
}

export interface Commodity {
  id: string;
  name: string;
  /** Hindi rendering of the commodity name. */
  nameHi: string;
  unit: string;
  /** Illustrative ₹/quintal base range used to seed mock prices — not live data. */
  baseMin: number;
  baseMax: number;
  /** Illustrative typical single-trip trade lot size, in quintals — not sourced, just a reasonable default cargo quantity so KPIs can show a realistic total rather than a bare per-quintal rate. */
  defaultLotQuintals: number;
}

export interface DailyPrice {
  mandiCode: string;
  commodityId: string;
  /** ISO date, one of the 7 mock days. */
  date: string;
  min: number;
  max: number;
  modal: number;
  mean: number;
  median: number;
  arrivalQuintals: number;
}

export type Metric = 'modal' | 'mean' | 'median';
