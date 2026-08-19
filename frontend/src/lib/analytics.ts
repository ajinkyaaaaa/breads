import type { ApiCommodity, ApiHistoryRow, ApiPriceRow } from './api';
import type { Freshness, Mandi, Metric } from '../data/types';

/** Curated per-commodity lot size isn't sourced from the API (no arrival-quantity field exists) -- used until a commodity gets a curated default_lot_quintals value. */
const DEFAULT_LOT_QUINTALS = 25;

export function toMandi(market: {
  id: number;
  district: string;
  market_name: string;
  display_name: string | null;
  lat: number | null;
  lon: number | null;
}): Mandi {
  return {
    code: String(market.id),
    name: market.display_name ?? market.market_name,
    taluka: market.district,
    lat: market.lat,
    lon: market.lon,
  };
}

export function toCommodity(c: ApiCommodity) {
  return {
    id: String(c.id),
    name: c.name,
    nameHi: c.name_hi ?? undefined,
    unit: 'Quintal',
    defaultLotQuintals: c.default_lot_quintals ?? DEFAULT_LOT_QUINTALS,
  };
}

/** Normalized (Rs/quintal-corrected) field -- always what calculations should use. */
function priceField(row: ApiPriceRow, metric: Metric): number | null {
  if (metric === 'min') return row.min_price_normalized;
  if (metric === 'max') return row.max_price_normalized;
  return row.modal_price_normalized;
}

/** Raw as-reported field, for the "adjusted from ₹X/kg" UI note. */
function rawPriceField(row: ApiPriceRow, metric: Metric): number | null {
  if (metric === 'min') return row.min_price;
  if (metric === 'max') return row.max_price;
  return row.modal_price;
}

/** A market can report multiple variety/grade combinations for the same
 * commodity on the same day (e.g. Tur FAQ and Tur Non-FAQ) -- the archive
 * keeps those as separate rows, but the current UI has no per-variety
 * dimension, so they're blended into one price per market via averaging.
 */
/** How many calendar days separate the archive date a price was actually
 * reported on and the day currently selected in the UI -- drives the
 * fresh (today) / recent (yesterday) / old (2+ days back) status dot. */
function freshnessFromDate(asOfDate: string | null, requestedAsOf: string): Freshness {
  if (!asOfDate) return 'old';
  const diffDays = Math.round((Date.parse(requestedAsOf) - Date.parse(asOfDate)) / 86_400_000);
  if (diffDays <= 0) return 'fresh';
  if (diffDays === 1) return 'recent';
  return 'old';
}

function collapseMarketPrices(
  rows: ApiPriceRow[],
  metric: Metric,
  requestedAsOf: string,
): Map<number, { price: number; isFallback: boolean; unit: 'quintal' | 'kg'; rawPrice?: number; freshness: Freshness }> {
  const byMarket = new Map<number, ApiPriceRow[]>();
  for (const row of rows) {
    if (row.status === 'missing') continue;
    const value = priceField(row, metric);
    if (value === null) continue;
    const list = byMarket.get(row.market_id) ?? [];
    list.push(row);
    byMarket.set(row.market_id, list);
  }

  const result = new Map<
    number,
    { price: number; isFallback: boolean; unit: 'quintal' | 'kg'; rawPrice?: number; freshness: Freshness }
  >();
  for (const [marketId, marketRows] of byMarket) {
    const values = marketRows.map((r) => priceField(r, metric)!);
    const avgPrice = values.reduce((sum, v) => sum + v, 0) / values.length;
    const isFallback = marketRows.every((r) => r.status !== 'fresh');

    const anyKg = marketRows.some((r) => r.unit === 'kg');
    let rawPrice: number | undefined;
    if (anyKg) {
      const rawValues = marketRows.map((r) => rawPriceField(r, metric)!);
      rawPrice = rawValues.reduce((sum, v) => sum + v, 0) / rawValues.length;
    }

    // A market can report some varieties today and others on an older date --
    // take the freshest date any of its variety rows carries.
    const latestDate = marketRows.reduce<string | null>((latest, r) => {
      if (!r.as_of_date) return latest;
      return !latest || r.as_of_date > latest ? r.as_of_date : latest;
    }, null);

    result.set(marketId, {
      price: avgPrice,
      isFallback,
      unit: anyKg ? 'kg' : 'quintal',
      rawPrice,
      freshness: freshnessFromDate(latestDate, requestedAsOf),
    });
  }
  return result;
}

export interface SpreadPoint {
  mandi: Mandi;
  price: number;
  isFallback: boolean;
  /** 'kg' when the source's raw entry looked like Rs/kg mistaken for Rs/quintal -- `price` is already corrected, `rawPrice` is what was actually reported. */
  unit: 'quintal' | 'kg';
  rawPrice?: number;
  /** fresh = reported on the selected day, recent = carried forward from the day before, old = older than that. */
  freshness: Freshness;
}

/** A buy/sell pairing for one commodity: sell is always the single highest
 * reported price across every candidate market, and it's shared by every
 * tier -- only the buy side changes. Tier A's buy is the cheapest market,
 * Tier B the 2nd cheapest, Tier C the 3rd, so spread strictly decreases
 * A > B > C. Distance between the two plays no part in this -- transport
 * isn't a constraint, so any market anywhere in the state is a fair pair. */
export interface TierPair {
  buy: SpreadPoint;
  sell: SpreadPoint;
  spread: number;
  spreadPct: number;
  /** Absolute ₹ profit for a full lot (spread × lotQuantity) -- what ranking and the card headline are driven by, not spreadPct. */
  lotProfit: number;
}

export interface CommoditySpreadRow {
  commodityId: string;
  commodityName: string;
  commodityNameHi?: string;
  unit: string;
  /** 1-3 entries, ordered Tier A/B/C -- fewer than 3 when the commodity doesn't have that many distinct reporting markets. */
  tiers: TierPair[];
  /** Tier A's spreadPct -- kept as secondary context (shown as a small % badge), not the ranking driver. */
  profitabilityScore: number;
  lotQuantity: number;
  /** Always tiers[0].lotProfit -- what commodities are ranked by. */
  lotProfit: number;
}

/** One row per commodity: up to 3 buy-side tiers against a single fixed
 * sell-side market (the commodity's overall highest reported price).
 * `requireGeocoded` is the opt-in "Location" filter -- off by default, since
 * a market missing lat/lon is otherwise just as eligible as any other. */
export function getCommoditySpreadRows(
  commodities: ReturnType<typeof toCommodity>[],
  mandiByMarketId: Map<string, Mandi>,
  pricesByCommodity: Record<string, ApiPriceRow[]>,
  metric: Metric,
  visibleMandiCodes: Set<string>,
  asOf: string,
  requireGeocoded: boolean,
): CommoditySpreadRow[] {
  const rows: CommoditySpreadRow[] = [];

  for (const commodity of commodities) {
    const priceRows = pricesByCommodity[commodity.id] ?? [];
    const collapsed = collapseMarketPrices(priceRows, metric, asOf);

    const points: SpreadPoint[] = [];
    for (const [marketId, { price, isFallback, unit, rawPrice, freshness }] of collapsed) {
      const mandi = mandiByMarketId.get(String(marketId));
      if (!mandi || !visibleMandiCodes.has(mandi.code)) continue;
      if (requireGeocoded && (mandi.lat === null || mandi.lon === null)) continue;
      points.push({ mandi, price, isFallback, unit, rawPrice, freshness });
    }
    points.sort((a, b) => a.price - b.price);

    if (points.length < 2) continue;

    const sell = points[points.length - 1];
    const buyCandidates = points.slice(0, Math.min(3, points.length - 1));

    const tiers: TierPair[] = buyCandidates
      .map((buy) => {
        const spread = sell.price - buy.price;
        return {
          buy,
          sell,
          spread,
          spreadPct: (spread / buy.price) * 100,
          lotProfit: spread * commodity.defaultLotQuintals,
        };
      })
      .filter((t) => t.spread > 0);

    if (tiers.length === 0) continue;

    rows.push({
      commodityId: commodity.id,
      commodityName: commodity.name,
      commodityNameHi: commodity.nameHi,
      unit: commodity.unit,
      tiers,
      profitabilityScore: tiers[0].spreadPct,
      lotQuantity: commodity.defaultLotQuintals,
      lotProfit: tiers[0].lotProfit,
    });
  }

  // Ranked by absolute ₹ profit for a standard lot, not percentage spread --
  // a commodity with a small % swing on a high-value base can still beat a
  // huge % swing on a cheap one if it puts more real rupees in your pocket.
  return rows.sort((a, b) => b.lotProfit - a.lotProfit);
}

export interface MarketStats {
  bestRow: CommoditySpreadRow | undefined;
  avgSpreadPct: number | undefined;
  avgSpreadPctChangeVsPrevDay: number | undefined;
  commoditiesTracked: number;
  totalCommodities: number;
  mandisReporting: number;
  totalMandis: number;
}

/** Market-wide stats for the top strip. `prevDayRows` is optional -- pass
 * undefined when there isn't enough archive history yet for a comparison. */
export function getMarketStats(
  rows: CommoditySpreadRow[],
  prevDayRows: CommoditySpreadRow[] | undefined,
  freshMarketIds: Set<string>,
  visibleMandiCodes: Set<string>,
  totalCommodities: number,
): MarketStats {
  const [bestRow] = rows;
  const avgSpreadPct = rows.length ? rows.reduce((sum, r) => sum + r.tiers[0].spreadPct, 0) / rows.length : undefined;

  let avgSpreadPctChangeVsPrevDay: number | undefined;
  if (prevDayRows?.length && avgSpreadPct !== undefined) {
    const prevAvg = prevDayRows.reduce((sum, r) => sum + r.tiers[0].spreadPct, 0) / prevDayRows.length;
    avgSpreadPctChangeVsPrevDay = avgSpreadPct - prevAvg;
  }

  let mandisReporting = 0;
  for (const code of visibleMandiCodes) {
    if (freshMarketIds.has(code)) mandisReporting++;
  }

  return {
    bestRow,
    avgSpreadPct,
    avgSpreadPctChangeVsPrevDay,
    commoditiesTracked: rows.length,
    totalCommodities,
    mandisReporting,
    totalMandis: visibleMandiCodes.size,
  };
}

/** market_ids with at least one 'fresh' (reported today) price row, across every commodity. */
export function getFreshMarketIds(pricesByCommodity: Record<string, ApiPriceRow[]>): Set<string> {
  const ids = new Set<string>();
  for (const rows of Object.values(pricesByCommodity)) {
    for (const row of rows) {
      if (row.status === 'fresh') ids.add(String(row.market_id));
    }
  }
  return ids;
}

export interface DailyBreakdownRow {
  date: string;
  avgPrice: number | null;
  low: number | null;
  high: number | null;
  mandisReporting: number;
}

/** Day-by-day breakdown for a commodity from its raw archive history -- as
 * many days as the archive actually has (grows over time; there's no way to
 * backfill from the live API). */
export function getCommodityDailyBreakdown(
  history: ApiHistoryRow[],
  mandiByMarketId: Map<string, Mandi>,
  visibleMandiCodes: Set<string>,
  dates: string[],
  metric: Metric,
): DailyBreakdownRow[] {
  const field = metric === 'min' ? 'min_price_normalized' : metric === 'max' ? 'max_price_normalized' : 'modal_price_normalized';

  const byDate = new Map<string, ApiHistoryRow[]>();
  for (const row of history) {
    const mandi = mandiByMarketId.get(String(row.market_id));
    if (!mandi || !visibleMandiCodes.has(mandi.code)) continue;
    const list = byDate.get(row.arrival_date) ?? [];
    list.push(row);
    byDate.set(row.arrival_date, list);
  }

  return dates.map((date) => {
    const rows = byDate.get(date) ?? [];
    if (!rows.length) return { date, avgPrice: null, low: null, high: null, mandisReporting: 0 };

    const byMarket = new Map<number, number[]>();
    for (const row of rows) {
      const list = byMarket.get(row.market_id) ?? [];
      list.push(row[field]);
      byMarket.set(row.market_id, list);
    }
    const marketPrices = Array.from(byMarket.values()).map((values) => values.reduce((a, b) => a + b, 0) / values.length);
    const avgPrice = marketPrices.reduce((a, b) => a + b, 0) / marketPrices.length;

    return {
      date,
      avgPrice,
      low: Math.min(...marketPrices),
      high: Math.max(...marketPrices),
      mandisReporting: byMarket.size,
    };
  });
}

export function getCommodityAvgPriceTrend(breakdown: DailyBreakdownRow[]): (number | null)[] {
  return breakdown.map((r) => r.avgPrice);
}
