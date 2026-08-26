import { useEffect, useMemo, useState } from 'react';
import { fetchAllPrices, fetchCommodities, fetchMarkets, type ApiPriceRow } from './lib/api';
import {
  getReturnLegCandidates,
  toCommodity,
  toMandi,
  type CommoditySpreadRow,
  type ReturnLegCandidate,
  type SpreadPoint,
  type TierPair,
} from './lib/analytics';
import { formatOrdinalDayMonth, formatRupees, formatWeekdayShort } from './lib/format';
import { haversineKm } from './lib/geo';
import { getToken } from './lib/auth';
import { Icon } from './components/Icon';
import { MandiInfoPanel } from './components/MandiInfoPanel';
import { RouteJourney } from './components/RouteJourney';
import { FilterDropdown } from './components/FilterDropdown';
import type { Mandi, PriceUnit } from './data/types';
import aarhatLogo from './assets/aarhat-logo.png';

interface TripParams {
  commodityId: string;
  commodityName: string;
  commodityNameHi?: string;
  unit: string;
  pointACode: string;
  pointBCode: string;
  buyPrice: number;
  sellPrice: number;
  qty: number;
  asOf: string;
  windowDays: number;
  metric: 'modal' | 'min' | 'max';
  priceUnit: PriceUnit;
  transportRate: number;
}

function parseParams(): TripParams | null {
  const p = new URLSearchParams(window.location.search);
  const commodityId = p.get('commodityId');
  const commodityName = p.get('commodityName');
  const pointACode = p.get('pointA');
  const pointBCode = p.get('pointB');
  const buyPrice = Number(p.get('buyPrice'));
  const sellPrice = Number(p.get('sellPrice'));
  const qty = Number(p.get('qty'));
  const asOf = p.get('asOf');
  const windowDays = Number(p.get('windowDays'));
  const transportRate = Number(p.get('transportRate'));
  const metric = p.get('metric');
  const priceUnit = p.get('priceUnit');

  if (
    !commodityId ||
    !commodityName ||
    !pointACode ||
    !pointBCode ||
    !asOf ||
    Number.isNaN(buyPrice) ||
    Number.isNaN(sellPrice) ||
    Number.isNaN(qty) ||
    Number.isNaN(windowDays) ||
    Number.isNaN(transportRate) ||
    (metric !== 'modal' && metric !== 'min' && metric !== 'max') ||
    (priceUnit !== 'quintal' && priceUnit !== 'kg')
  ) {
    return null;
  }

  return {
    commodityId,
    commodityName,
    commodityNameHi: p.get('commodityNameHi') ?? undefined,
    unit: p.get('unit') ?? 'Quintal',
    pointACode,
    pointBCode,
    buyPrice,
    sellPrice,
    qty,
    asOf,
    windowDays,
    metric,
    priceUnit,
    transportRate,
  };
}

function buildRow(opts: {
  commodityId: string;
  commodityName: string;
  commodityNameHi?: string;
  unit: string;
  buyMandi: Mandi;
  sellMandi: Mandi;
  buyPrice: number;
  sellPrice: number;
  qty: number;
}): CommoditySpreadRow {
  const spread = opts.sellPrice - opts.buyPrice;
  const spreadPct = opts.buyPrice > 0 ? (spread / opts.buyPrice) * 100 : 0;
  const lotProfit = spread * opts.qty;
  const buy: SpreadPoint = { mandi: opts.buyMandi, price: opts.buyPrice, isFallback: false, unit: 'quintal', freshness: 'fresh' };
  const sell: SpreadPoint = { mandi: opts.sellMandi, price: opts.sellPrice, isFallback: false, unit: 'quintal', freshness: 'fresh' };
  const tier: TierPair = { buy, sell, spread, spreadPct, lotProfit };
  return {
    commodityId: opts.commodityId,
    commodityName: opts.commodityName,
    commodityNameHi: opts.commodityNameHi,
    unit: opts.unit,
    tiers: [tier],
    profitabilityScore: spreadPct,
    lotQuantity: opts.qty,
    lotProfit,
  };
}

function distanceKm(a: Mandi, b: Mandi): number | null {
  if (a.lat === null || a.lon === null || b.lat === null || b.lon === null) return null;
  return haversineKm({ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon });
}

export function TripExplorer() {
  const params = useMemo(parseParams, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [pricesByCommodity, setPricesByCommodity] = useState<Record<string, ApiPriceRow[]>>({});
  const [commodities, setCommodities] = useState<ReturnType<typeof toCommodity>[]>([]);

  const [qty, setQty] = useState(params?.qty ?? 0);
  const [outboundRate, setOutboundRate] = useState(params?.transportRate ?? 0.5);
  const [returnRate, setReturnRate] = useState(params?.transportRate ?? 0.5);
  const [selectedReturnCommodityId, setSelectedReturnCommodityId] = useState<string | null>(null);

  useEffect(() => {
    if (!params) {
      setLoading(false);
      return;
    }
    if (!getToken()) {
      setError('You need to be logged in. Log in on the main dashboard tab, then reopen Explore.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [marketRows, commodityRows, priceRes] = await Promise.all([
          fetchMarkets(),
          fetchCommodities(),
          fetchAllPrices(params.windowDays, params.asOf),
        ]);
        setMandis(marketRows.map(toMandi));
        setCommodities(commodityRows.map(toCommodity));
        setPricesByCommodity(priceRes.prices_by_commodity);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load trip data');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pointA = mandis.find((m) => m.code === params?.pointACode) ?? null;
  const pointB = mandis.find((m) => m.code === params?.pointBCode) ?? null;

  const outboundRow = useMemo(() => {
    if (!params || !pointA || !pointB) return null;
    return buildRow({
      commodityId: params.commodityId,
      commodityName: params.commodityName,
      commodityNameHi: params.commodityNameHi,
      unit: params.unit,
      buyMandi: pointA,
      sellMandi: pointB,
      buyPrice: params.buyPrice,
      sellPrice: params.sellPrice,
      qty,
    });
  }, [params, pointA, pointB, qty]);

  // Return leg: buy at the outbound trip's Point B, sell at Point A -- every
  // commodity both markets reported a price for that day, ranked by profit
  // (negative spreads included, so the closest-to-breakeven option always
  // surfaces even when nothing is actually profitable that direction).
  const returnCandidates: ReturnLegCandidate[] = useMemo(() => {
    if (!params || !pointA || !pointB || commodities.length === 0) return [];
    return getReturnLegCandidates(
      commodities,
      pricesByCommodity,
      params.metric,
      params.asOf,
      Number(pointB.code),
      Number(pointA.code),
      qty,
    );
  }, [params, pointA, pointB, commodities, pricesByCommodity, qty]);

  useEffect(() => {
    if (returnCandidates.length > 0 && selectedReturnCommodityId === null) {
      setSelectedReturnCommodityId(returnCandidates[0].commodityId);
    }
  }, [returnCandidates, selectedReturnCommodityId]);

  const selectedCandidate =
    returnCandidates.find((c) => c.commodityId === selectedReturnCommodityId) ?? returnCandidates[0] ?? null;

  const returnRow = useMemo(() => {
    if (!selectedCandidate || !pointA || !pointB) return null;
    return buildRow({
      commodityId: selectedCandidate.commodityId,
      commodityName: selectedCandidate.commodityName,
      commodityNameHi: selectedCandidate.commodityNameHi,
      unit: 'Quintal',
      buyMandi: pointB,
      sellMandi: pointA,
      buyPrice: selectedCandidate.buyPrice,
      sellPrice: selectedCandidate.sellPrice,
      qty,
    });
  }, [selectedCandidate, pointA, pointB, qty]);

  const dist = pointA && pointB ? distanceKm(pointA, pointB) : null;

  const outBuyTotal = outboundRow ? outboundRow.tiers[0].buy.price * qty : 0;
  const outSellTotal = outboundRow ? outboundRow.tiers[0].sell.price * qty : 0;
  const outTransport = dist !== null ? dist * qty * outboundRate : 0;
  const outNet = outSellTotal - outBuyTotal - outTransport;

  const retBuyTotal = returnRow ? returnRow.tiers[0].buy.price * qty : 0;
  const retSellTotal = returnRow ? returnRow.tiers[0].sell.price * qty : 0;
  const retTransport = returnRow && dist !== null ? dist * qty * returnRate : 0;
  const retNet = returnRow ? retSellTotal - retBuyTotal - retTransport : 0;

  const totalRevenue = outSellTotal + retSellTotal;
  const totalCost = outBuyTotal + outTransport + retBuyTotal + retTransport;
  const netRoundTrip = totalRevenue - totalCost;

  const candidateOptions = returnCandidates.map((c) => ({
    value: c.commodityId,
    label: `${c.commodityName} · ${c.lotProfit >= 0 ? '+' : '−'}${formatRupees(Math.abs(c.lotProfit))}`,
  }));

  if (!params) {
    return (
      <PageMessage title="Trip data missing" body="This page needs to be opened via the Explore button on the dashboard." />
    );
  }

  if (loading) {
    return <PageMessage title="Loading trip plan…" body="Fetching prices, markets, and contacts." />;
  }

  if (error) {
    return <PageMessage title="Couldn't load this trip" body={error} />;
  }

  if (!outboundRow || !pointA || !pointB) {
    return (
      <PageMessage
        title="Couldn't find one of these markets"
        body="Point A or Point B no longer exists in the market list. Reopen Explore from the dashboard."
      />
    );
  }

  return (
    <div className="min-h-screen bg-ink font-sans text-wheat">
      <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-wheat/10 bg-ink px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={aarhatLogo} alt="Aarhat" className="h-8 w-auto" />
          <span className="font-display text-lg font-semibold text-amber">आढत</span>
          <div className="h-6 w-px bg-wheat/15" />
          <div>
            <div className="font-display text-base font-bold text-wheat">Trip Plan · {outboundRow.commodityName}</div>
            <div className="text-[11px] text-dim">
              {formatWeekdayShort(params.asOf)}, {formatOrdinalDayMonth(params.asOf)} · {pointA.name} → {pointB.name} → {pointA.name}
            </div>
          </div>
        </div>
        <button
          onClick={() => window.close()}
          className="flex items-center gap-1.5 rounded-sm border border-wheat/15 bg-surface px-2.5 py-1 text-[12px] font-medium uppercase tracking-wide text-wheat transition-colors duration-150 hover:border-rust/40 hover:text-rust"
        >
          <Icon name="close" size={14} />
          Close
        </button>
      </header>

      <div className="h-[440px] border-b border-wheat/10">
        <MandiInfoPanel row={outboundRow} tierIndex={0} />
      </div>

      <div className="grid grid-cols-1 divide-wheat/10 lg:grid-cols-2 lg:divide-x">
        <div className="border-b border-wheat/10 lg:border-b-0">
          <div className="px-6 pt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">
            Outbound Leg · {pointA.name} → {pointB.name}
          </div>
          <RouteJourney
            row={outboundRow}
            tierIndex={0}
            priceUnit={params.priceUnit}
            transportRate={outboundRate}
            onTransportRateChange={setOutboundRate}
            quantity={qty}
            onQuantityChange={setQty}
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">
              Return Leg · {pointB.name} → {pointA.name}
            </span>
            {candidateOptions.length > 0 && selectedCandidate && (
              <FilterDropdown
                options={candidateOptions}
                value={selectedCandidate.commodityId}
                onChange={setSelectedReturnCommodityId}
                searchPlaceholder="Search commodity…"
                buttonContent={<span className="max-w-[220px] truncate">{selectedCandidate.commodityName}</span>}
                buttonClassName="flex items-center gap-1 rounded-sm border border-wheat/15 bg-surface px-2.5 py-1 text-[11px] font-semibold text-wheat transition-colors duration-150 hover:border-wheat/30 hover:bg-surface2"
                panelWidthClassName="w-80"
              />
            )}
          </div>

          {returnRow && selectedCandidate ? (
            <>
              {selectedCandidate.lotProfit < 0 && (
                <div className="mx-6 mt-3 flex items-center gap-1.5 rounded-sm border border-rust/30 bg-rust-dim px-2.5 py-1.5 text-[11px] text-rust">
                  <Icon name="warning" size={13} />
                  {returnCandidates[0]?.lotProfit < 0
                    ? `Best available option is still a loss on this leg — no commodity is currently profitable from ${pointB.name} back to ${pointA.name}.`
                    : `This is a loss-making pick — ${returnCandidates[0].commodityName} would be profitable instead on this leg.`}
                </div>
              )}
              <RouteJourney
                row={returnRow}
                tierIndex={0}
                priceUnit={params.priceUnit}
                transportRate={returnRate}
                onTransportRateChange={setReturnRate}
                quantity={qty}
                onQuantityChange={setQty}
              />
            </>
          ) : (
            <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-dim">
              No commodity data available for a return trip on this day.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-wheat/10 px-6 py-5">
        <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">
          <Icon name="receipt_long" size={13} />
          Round Trip P&amp;L
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-sm border border-wheat/10 bg-surface px-4 py-3 text-[12px] sm:grid-cols-4">
          <PnlField label="Outbound Net" value={outNet} />
          <PnlField label="Return Net" value={retNet} />
          <PnlField label="Total Revenue" value={totalRevenue} plain />
          <PnlField label="Total Cost" value={totalCost} plain />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-sm border border-wheat/10 bg-surface px-4 py-3">
          <span className="text-[12px] font-medium uppercase tracking-wide text-dim">Net Round-Trip Profit</span>
          <span className={`font-mono text-2xl font-bold tabular-nums ${netRoundTrip >= 0 ? 'text-sage' : 'text-rust'}`}>
            {formatRupees(netRoundTrip)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PnlField({ label, value, plain = false }: { label: string; value: number; plain?: boolean }) {
  const colorClass = plain ? 'text-wheat' : value >= 0 ? 'text-sage' : 'text-rust';
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide text-dim">{label}</div>
      <div className={`font-mono text-[14px] font-semibold tabular-nums ${colorClass}`}>{formatRupees(value)}</div>
    </div>
  );
}

function PageMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-ink px-6 font-sans text-wheat">
      <div className="max-w-sm text-center">
        <div className="font-display text-lg font-semibold text-amber">{title}</div>
        <div className="mt-2 text-sm text-dim">{body}</div>
      </div>
    </div>
  );
}
