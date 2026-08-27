import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchAllPrices, fetchCommodities, fetchContacts, fetchMarkets, type ApiPriceRow } from './lib/api';
import {
  getReturnLegCandidates,
  toCommodity,
  toMandi,
  type CommoditySpreadRow,
  type ReturnLegCandidate,
  type SpreadPoint,
  type TierPair,
} from './lib/analytics';
import { formatKm, formatOrdinalDayMonth, formatRupees, formatWeekdayShort } from './lib/format';
import { haversineKm } from './lib/geo';
import { getToken } from './lib/auth';
import { Icon } from './components/Icon';
import { MandiInfoPanel } from './components/MandiInfoPanel';
import { RouteJourney } from './components/RouteJourney';
import { FilterDropdown } from './components/FilterDropdown';
import { ThemeToggle } from './components/ThemeToggle';
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
  rank: number | null;
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
  const rankRaw = p.get('rank');

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
    rank: rankRaw && !Number.isNaN(Number(rankRaw)) ? Number(rankRaw) : null,
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

type LegView = 'billing' | 'route';

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

  const [outboundView, setOutboundView] = useState<LegView>('billing');
  const [returnView, setReturnView] = useState<LegView>('billing');
  // Session-only -- not persisted anywhere, resets if this tab is closed and Explore reopened.
  const [outboundContactId, setOutboundContactId] = useState<string | null>(null);
  const [returnContactId, setReturnContactId] = useState<string | null>(null);

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

  const routeView = <MandiInfoPanel row={outboundRow} tierIndex={0} />;

  return (
    <div className="min-h-screen bg-ink font-sans text-wheat">
      <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-wheat/10 bg-ink px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={aarhatLogo} alt="Aarhat" className="h-8 w-auto" />
          <span className="font-display text-lg font-semibold text-amber">आढत</span>
          <div className="h-6 w-px bg-wheat/15" />
          {params.rank !== null && (
            <span className="rounded-sm border border-amber/30 bg-amber/[0.08] px-2 py-1 font-mono text-[11px] font-bold text-amber">
              #{String(params.rank).padStart(2, '0')} OPPORTUNITY
            </span>
          )}
          <div>
            <div className="font-display text-base font-bold text-wheat">Trip Plan · {outboundRow.commodityName}</div>
            <div className="text-[11px] text-dim">
              {formatWeekdayShort(params.asOf)}, {formatOrdinalDayMonth(params.asOf)} · {pointA.name} → {pointB.name} → {pointA.name}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => window.close()}
            className="flex items-center gap-1.5 rounded-sm border border-wheat/15 bg-surface px-2.5 py-1 text-[12px] font-medium uppercase tracking-wide text-wheat transition-colors duration-150 hover:border-rust/40 hover:text-rust"
          >
            <Icon name="close" size={14} />
            Close
          </button>
        </div>
      </header>

      <div className="flex w-full items-stretch overflow-x-auto border-b border-wheat/10 bg-ink">
        <div className="flex shrink-0 items-center border-r border-wheat/10 px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">P&amp;L
            <br />
            Overview
          </span>
        </div>
        <OverviewKpi label="Outbound Net" value={formatRupees(outNet)} tone={outNet >= 0 ? 'sage' : 'rust'} />
        <OverviewKpi label="Return Net" value={formatRupees(retNet)} tone={retNet >= 0 ? 'sage' : 'rust'} />
        <OverviewKpi label="Round Trip Distance" value={dist !== null ? formatKm(dist * 2) : 'Unmapped'} tone="wheat" />
        <OverviewKpi label="Net Round-Trip Profit" value={formatRupees(netRoundTrip)} tone={netRoundTrip >= 0 ? 'sage' : 'rust'} big />
      </div>

      <div className="grid grid-cols-1 divide-wheat/10 lg:grid-cols-2 lg:divide-x">
        <LegPanel
          title={`Trip ${pointA.name} → ${pointB.name}`}
          view={outboundView}
          onViewChange={setOutboundView}
          route={routeView}
        >
          <AssignedContactField
            pointA={pointA}
            pointB={pointB}
            value={outboundContactId}
            onChange={setOutboundContactId}
          />
          <RouteJourney
            row={outboundRow}
            tierIndex={0}
            priceUnit={params.priceUnit}
            transportRate={outboundRate}
            onTransportRateChange={setOutboundRate}
            quantity={qty}
            onQuantityChange={setQty}
          />
        </LegPanel>

        <LegPanel
          title={`Trip ${pointB.name} → ${pointA.name}`}
          view={returnView}
          onViewChange={setReturnView}
          route={routeView}
          headerExtra={
            candidateOptions.length > 0 &&
            selectedCandidate && (
              <FilterDropdown
                options={candidateOptions}
                value={selectedCandidate.commodityId}
                onChange={setSelectedReturnCommodityId}
                searchPlaceholder="Search commodity…"
                buttonContent={<span className="max-w-[180px] truncate">{selectedCandidate.commodityName}</span>}
                buttonClassName="flex items-center gap-1 rounded-sm border border-wheat/15 bg-surface px-2.5 py-1 text-[11px] font-semibold text-wheat transition-colors duration-150 hover:border-wheat/30 hover:bg-surface2"
                panelWidthClassName="w-80"
              />
            )
          }
        >
          {returnRow && selectedCandidate ? (
            <>
              {selectedCandidate.lotProfit < 0 && (
                <div className="mb-3 flex items-center gap-1.5 rounded-sm border border-rust/30 bg-rust-dim px-2.5 py-1.5 text-[11px] text-rust">
                  <Icon name="warning" size={13} />
                  {returnCandidates[0]?.lotProfit < 0
                    ? `Best available option is still a loss on this leg — no commodity is currently profitable from ${pointB.name} back to ${pointA.name}.`
                    : `This is a loss-making pick — ${returnCandidates[0].commodityName} would be profitable instead on this leg.`}
                </div>
              )}
              <AssignedContactField
                pointA={pointA}
                pointB={pointB}
                value={returnContactId}
                onChange={setReturnContactId}
              />
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
            <div className="flex h-40 items-center justify-center text-center text-sm text-dim">
              No commodity data available for a return trip on this day.
            </div>
          )}
        </LegPanel>
      </div>

      <div className="border-t border-wheat/10 px-6 py-5">
        <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">
          <Icon name="receipt_long" size={13} />
          Complete Net Bill
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

const KPI_GLOW: Record<'sage' | 'rust', string> = {
  sage: 'drop-shadow(0 0 6px rgba(122,155,118,0.65))',
  rust: 'drop-shadow(0 0 6px rgba(193,80,46,0.65))',
};

function OverviewKpi({
  label,
  value,
  tone,
  big = false,
}: {
  label: string;
  value: string;
  tone: 'sage' | 'rust' | 'wheat';
  big?: boolean;
}) {
  const colorClass = tone === 'sage' ? 'text-sage' : tone === 'rust' ? 'text-rust' : 'text-wheat';
  return (
    <div className="shrink-0 border-r border-wheat/10 px-4 py-2 last:border-r-0">
      <div className="text-[9px] font-medium uppercase tracking-[0.1em] text-dim">{label}</div>
      <div
        style={tone !== 'wheat' ? { filter: KPI_GLOW[tone] } : undefined}
        className={`mt-0.5 font-mono font-bold tabular-nums ${big ? 'text-xl' : 'text-lg'} ${colorClass}`}
      >
        {value}
      </div>
    </div>
  );
}

const LEG_VIEW_OPTIONS: { key: LegView; label: string; icon: 'receipt_long' | 'map' }[] = [
  { key: 'billing', label: 'Billing', icon: 'receipt_long' },
  { key: 'route', label: 'Route', icon: 'map' },
];

interface LegPanelProps {
  title: string;
  view: LegView;
  onViewChange: (v: LegView) => void;
  route: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
}

/** Each leg of the round trip is fully self-contained: its own header, its own
 * Billing/Route toggle, and either the trade bill or the shared map+contacts
 * view underneath -- so a viewer can read one leg top to bottom without
 * needing to cross-reference a shared panel elsewhere on the page. */
function LegPanel({ title, view, onViewChange, route, headerExtra, children }: LegPanelProps) {
  return (
    <div className="border-b border-wheat/10 py-4 lg:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">{title}</span>
        <div className="flex items-center gap-2">
          {headerExtra}
          <div className="flex gap-0.5 rounded-sm bg-ink p-0.5">
            {LEG_VIEW_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => onViewChange(o.key)}
                title={o.key === 'billing' ? 'Billing option' : 'Route details'}
                className={`flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] font-medium transition-colors duration-150 ${
                  o.key === view ? 'bg-surface2 text-wheat' : 'text-dim hover:text-wheat'
                }`}
              >
                <Icon name={o.icon} size={12} />
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'billing' ? <div className="px-6 pt-3">{children}</div> : <div className="mt-3 h-[440px]">{route}</div>}
    </div>
  );
}

interface AssignedContactFieldProps {
  pointA: Mandi;
  pointB: Mandi;
  value: string | null;
  onChange: (v: string | null) => void;
}

/** Who's handling this leg's transport, picked from either endpoint's saved
 * contacts. Session-only -- not persisted, refetched each time this field
 * mounts (i.e. each time the Billing view is switched back to), so a contact
 * added via the Route view a moment ago shows up here without a page reload. */
function AssignedContactField({ pointA, pointB, value, onChange }: AssignedContactFieldProps) {
  const [options, setOptions] = useState<{ value: string; label: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchContacts(Number(pointA.code)), fetchContacts(Number(pointB.code))])
      .then(([a, b]) => {
        if (cancelled) return;
        const combined = [
          ...a.map((c) => ({ value: String(c.id), label: `${c.name}${c.role ? ` · ${c.role}` : ''} — ${pointA.name}` })),
          ...b.map((c) => ({ value: String(c.id), label: `${c.name}${c.role ? ` · ${c.role}` : ''} — ${pointB.name}` })),
        ];
        setOptions(combined);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pointA.code, pointB.code]);

  const allOptions = [{ value: '', label: 'No one assigned' }, ...(options ?? [])];
  const selectedLabel = allOptions.find((o) => o.value === (value ?? ''))?.label ?? 'No one assigned';

  return (
    <div className="mb-3 flex items-center justify-between gap-2 rounded-sm border border-wheat/10 bg-surface px-3 py-2">
      <span className="flex items-center gap-1.5 text-[11px] text-dim">
        <Icon name="person" size={13} />
        Assigned to (transport)
      </span>
      <FilterDropdown
        options={allOptions}
        value={value ?? ''}
        onChange={(v) => onChange(v || null)}
        searchPlaceholder="Search contacts…"
        buttonContent={<span className="max-w-[180px] truncate">{options === null ? 'Loading…' : selectedLabel}</span>}
        buttonClassName="flex items-center gap-1 rounded-sm border border-wheat/15 bg-ink px-2 py-1 text-[11px] font-medium text-wheat transition-colors duration-150 hover:border-wheat/30 hover:bg-surface2"
        panelWidthClassName="w-72"
      />
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
