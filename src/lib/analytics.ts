import { MANDIS } from '../data/mandis';
import { COMMODITIES } from '../data/commodities';
import { DATES, resolvePrice, resolvePricesForCommodity, weekSeries } from '../data/mockPrices';
import { haversineKm } from './geo';
import type { Mandi, Metric } from '../data/types';

export interface SpreadPoint {
  mandi: Mandi;
  price: number;
  isFallback: boolean;
}

export interface CommoditySpreadRow {
  commodityId: string;
  commodityName: string;
  unit: string;
  /** Every reporting, currently-visible mandi's price, ascending. */
  points: SpreadPoint[];
  min: SpreadPoint;
  max: SpreadPoint;
  spread: number;
  spreadPct: number;
  distanceKm: number;
  profitabilityScore: number;
  /** Illustrative default trade-lot size for this commodity, in quintals. */
  lotQuantity: number;
  /** Gross profit (before transport) for moving one default lot from the low mandi to the high mandi. */
  lotProfit: number;
}

/** One row per commodity: the full price spread across every visible, reporting mandi. */
export function getCommoditySpreadRows(date: string, metric: Metric, visibleMandiCodes: Set<string>): CommoditySpreadRow[] {
  const rows: CommoditySpreadRow[] = [];

  for (const commodity of COMMODITIES) {
    const points: SpreadPoint[] = resolvePricesForCommodity(commodity.id, date)
      .filter((r) => r.resolved && visibleMandiCodes.has(r.mandi.code))
      .map((r) => ({ mandi: r.mandi, price: r.resolved!.record[metric], isFallback: r.resolved!.isFallback }))
      .sort((a, b) => a.price - b.price);

    if (points.length < 2) continue;

    const min = points[0];
    const max = points[points.length - 1];
    if (max.price <= min.price) continue;

    const spread = max.price - min.price;
    const spreadPct = (spread / min.price) * 100;
    const distanceKm = haversineKm(min.mandi, max.mandi);
    const profitabilityScore = spreadPct / (1 + distanceKm / 50);

    rows.push({
      commodityId: commodity.id,
      commodityName: commodity.name,
      unit: commodity.unit,
      points,
      min,
      max,
      spread,
      spreadPct,
      distanceKm,
      profitabilityScore,
      lotQuantity: commodity.defaultLotQuintals,
      lotProfit: spread * commodity.defaultLotQuintals,
    });
  }

  return rows.sort((a, b) => b.profitabilityScore - a.profitabilityScore);
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

/** Market-wide stats for the top strip — deliberately commodity-agnostic since the table shows every commodity at once. */
export function getMarketStats(date: string, metric: Metric, visibleMandiCodes: Set<string>): MarketStats {
  const rows = getCommoditySpreadRows(date, metric, visibleMandiCodes);
  const [bestRow] = rows;
  const avgSpreadPct = rows.length ? rows.reduce((sum, r) => sum + r.spreadPct, 0) / rows.length : undefined;

  const dateIdx = DATES.indexOf(date);
  let avgSpreadPctChangeVsPrevDay: number | undefined;
  if (dateIdx > 0 && avgSpreadPct !== undefined) {
    const prevRows = getCommoditySpreadRows(DATES[dateIdx - 1], metric, visibleMandiCodes);
    if (prevRows.length) {
      const prevAvg = prevRows.reduce((sum, r) => sum + r.spreadPct, 0) / prevRows.length;
      avgSpreadPctChangeVsPrevDay = avgSpreadPct - prevAvg;
    }
  }

  let mandisReporting = 0;
  for (const mandi of MANDIS) {
    if (!visibleMandiCodes.has(mandi.code)) continue;
    const reportedToday = COMMODITIES.some((c) => {
      const r = resolvePrice(mandi.code, c.id, date);
      return r && !r.isFallback;
    });
    if (reportedToday) mandisReporting++;
  }

  return {
    bestRow,
    avgSpreadPct,
    avgSpreadPctChangeVsPrevDay,
    commoditiesTracked: rows.length,
    totalCommodities: COMMODITIES.length,
    mandisReporting,
    totalMandis: visibleMandiCodes.size,
  };
}

/** Day-by-day average price across the mock week, for the standalone Price Trends panel. */
export function getCommodityAvgPriceTrend(commodityId: string, metric: Metric, visibleMandiCodes: Set<string>): (number | null)[] {
  return DATES.map((date) => {
    const prices = resolvePricesForCommodity(commodityId, date)
      .filter((r) => r.resolved && visibleMandiCodes.has(r.mandi.code))
      .map((r) => r.resolved!.record[metric]);
    if (!prices.length) return null;
    return prices.reduce((sum, p) => sum + p, 0) / prices.length;
  });
}

export interface DailyBreakdownRow {
  date: string;
  avgModal: number | null;
  avgMean: number | null;
  avgMedian: number | null;
  low: number | null;
  high: number | null;
  mandisReporting: number;
}

/** Full day-by-day price history for a commodity — modal/mean/median averages, the low-high range across visible mandis, and how many actually reported that day. Feeds the Price History panel's table. */
export function getCommodityDailyBreakdown(commodityId: string, visibleMandiCodes: Set<string>): DailyBreakdownRow[] {
  return DATES.map((date) => {
    const rows = resolvePricesForCommodity(commodityId, date).filter((r) => r.resolved && visibleMandiCodes.has(r.mandi.code));
    if (!rows.length) {
      return { date, avgModal: null, avgMean: null, avgMedian: null, low: null, high: null, mandisReporting: 0 };
    }
    const avg = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
    const modals = rows.map((r) => r.resolved!.record.modal);
    const means = rows.map((r) => r.resolved!.record.mean);
    const medians = rows.map((r) => r.resolved!.record.median);
    return {
      date,
      avgModal: avg(modals),
      avgMean: avg(means),
      avgMedian: avg(medians),
      low: Math.min(...modals),
      high: Math.max(...modals),
      mandisReporting: rows.filter((r) => !r.resolved!.isFallback).length,
    };
  });
}

export type ReliabilityTier = 'Reliable' | 'Moderate' | 'Volatile';

/** Combines a mandi's reporting consistency with its price volatility for a commodity into one trust signal. */
export function getReliability(mandiCode: string, commodityId: string): { tier: ReliabilityTier; coefficientOfVariation: number | undefined } {
  const mandi = MANDIS.find((m) => m.code === mandiCode)!;
  const series = weekSeries(mandiCode, commodityId)
    .filter((r): r is NonNullable<typeof r> => !!r && !r.isFallback)
    .map((r) => r.record.modal);

  let cov: number | undefined;
  if (series.length >= 2) {
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const variance = series.reduce((a, b) => a + (b - mean) ** 2, 0) / series.length;
    cov = Math.sqrt(variance) / mean;
  }

  let tier: ReliabilityTier;
  if (mandi.reportingTier === 'weak' || (cov !== undefined && cov > 0.12)) tier = 'Volatile';
  else if (mandi.reportingTier === 'moderate' || (cov !== undefined && cov > 0.06)) tier = 'Moderate';
  else tier = 'Reliable';

  return { tier, coefficientOfVariation: cov };
}

export function resolveOne(mandiCode: string, commodityId: string, date: string) {
  return resolvePrice(mandiCode, commodityId, date);
}
