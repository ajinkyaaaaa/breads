import { useEffect, useMemo, useState } from 'react';
import {
  fetchAllPrices,
  fetchArchiveDates,
  fetchCommodities,
  fetchMarkets,
  fetchSyncStatus,
  triggerIngest,
  type ApiPriceRow,
} from './lib/api';
import {
  getCommoditySpreadRows,
  getFreshMarketIds,
  getMarketStats,
  toCommodity,
  toMandi,
  type CommoditySpreadRow,
} from './lib/analytics';
import { todayIso } from './lib/format';
import { clearToken, getToken, setOnSessionExpired } from './lib/auth';
import { LoginScreen } from './components/LoginScreen';
import { Masthead } from './components/Masthead';
import { StatStrip } from './components/StatStrip';
import { TopOpportunities } from './components/TopOpportunities';
import { MandiInfoPanel } from './components/MandiInfoPanel';
import { Toolbar } from './components/Toolbar';
import { RouteJourney } from './components/RouteJourney';
import { LocationEditor } from './components/LocationEditor';
import { SyncOverlay } from './components/SyncOverlay';
import type { Mandi, Metric, PriceUnit } from './data/types';

/** The resync overlay must stay up at least this long, even if the ingest
 * itself resolves faster, so it reads as a real action rather than a flash. */
const MIN_SYNC_OVERLAY_MS = 5000;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => getToken() !== null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Any API call that comes back 401 (missing/invalid/expired token) drops
  // straight back to the login screen, from anywhere in the app.
  useEffect(() => {
    setOnSessionExpired(() => setIsAuthenticated(false));
  }, []);

  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [commodities, setCommodities] = useState<ReturnType<typeof toCommodity>[]>([]);
  const [dates, setDates] = useState<string[]>([]);

  const [asOf, setAsOf] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState(1);
  const [metric, setMetric] = useState<Metric>('modal');
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('quintal');
  const [topN, setTopN] = useState(5);
  // ₹/qtl·km default, grounded in real India road-freight data: ~₹3.6/tonne-km
  // (~₹0.36/qtl-km) per industry data, escalated for current fuel/toll costs.
  const [transportRate, setTransportRate] = useState(0.5);
  const [requireGeocoded, setRequireGeocoded] = useState(false);
  const [tierByCommodity, setTierByCommodity] = useState<Record<string, number>>({});
  const [visibleMandiCodes, setVisibleMandiCodes] = useState<Set<string>>(new Set());
  // Region filter (masthead): narrow the whole dashboard down to one or more
  // districts, on top of the Toolbar's per-mandi visibility toggles. Empty = no filter.
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);

  const [pricesByCommodity, setPricesByCommodity] = useState<Record<string, ApiPriceRow[]>>({});

  const [selectedCommodityId, setSelectedCommodityId] = useState<string | null>(null);

  const [locationEditorOpen, setLocationEditorOpen] = useState(false);

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Initial load: every discovered market (geocoded or not -- location is optional
  // context now, not a requirement to appear), commodities, the list of dates the
  // archive actually has, and last-sync status.
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const [marketRows, commodityRows, dateRows, syncStatus] = await Promise.all([
          fetchMarkets(),
          fetchCommodities(),
          fetchArchiveDates(),
          fetchSyncStatus(),
        ]);
        const mandiList = marketRows.map(toMandi);
        setMandis(mandiList);
        setVisibleMandiCodes(new Set(mandiList.map((m) => m.code)));
        setCommodities(commodityRows.map(toCommodity));
        setDates(dateRows);
        setAsOf(dateRows[dateRows.length - 1] ?? null);
        setLastSyncedAt(syncStatus.last_synced_at);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load market data');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  // True once the newest archived day falls behind the viewer's real calendar day.
  const isStale = useMemo(() => {
    const latest = dates[dates.length - 1];
    return !!latest && latest < todayIso();
  }, [dates]);

  // Manual resync: pull a fresh snapshot from the live API into the archive, then
  // reload everything downstream of it. Always jumps to the newest day afterwards,
  // regardless of whether the viewer was already there.
  async function handleRefresh() {
    if (syncing) return;
    setSyncing(true);
    try {
      // The downstream reads must not start until the ingest write has actually
      // committed -- otherwise they can race ahead and return pre-sync data. The
      // minimum-display timer runs alongside the ingest itself, not after it, so
      // a fast ingest still doesn't shortchange the >=5s overlay requirement.
      await Promise.all([triggerIngest(), new Promise((resolve) => setTimeout(resolve, MIN_SYNC_OVERLAY_MS))]);

      const [marketRows, commodityRows, dateRows, syncStatus] = await Promise.all([
        fetchMarkets(),
        fetchCommodities(),
        fetchArchiveDates(),
        fetchSyncStatus(),
      ]);

      const mandiList = marketRows.map(toMandi);
      setMandis(mandiList);
      // Preserve the viewer's existing mandi selection; newly-appeared markets default to visible.
      setVisibleMandiCodes((prev) => {
        const next = new Set(prev);
        for (const m of mandiList) next.add(m.code);
        return next;
      });
      setCommodities(commodityRows.map(toCommodity));
      setDates(dateRows);
      setLastSyncedAt(syncStatus.last_synced_at);

      const latest = dateRows[dateRows.length - 1] ?? null;
      setAsOf(latest);
      if (latest) {
        const priceRes = await fetchAllPrices(windowDays, latest);
        setPricesByCommodity(priceRes.prices_by_commodity);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resync');
    } finally {
      setSyncing(false);
    }
  }

  // Re-fetch the statewide spread whenever the anchor date or carry-forward window changes.
  useEffect(() => {
    if (!asOf) return;
    fetchAllPrices(windowDays, asOf)
      .then((res) => setPricesByCommodity(res.prices_by_commodity))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load prices'));
  }, [asOf, windowDays]);

  const mandiByMarketId = useMemo(() => new Map(mandis.map((m) => [m.code, m])), [mandis]);

  // No districts picked applies no extra narrowing beyond the Toolbar's own
  // visibility toggles; one or more picked narrows to every mandi across them.
  const regionMandiCodes = useMemo(() => {
    if (selectedDistricts.length === 0) return null;
    return new Set(mandis.filter((m) => selectedDistricts.includes(m.taluka)).map((m) => m.code));
  }, [mandis, selectedDistricts]);

  const effectiveVisibleMandiCodes = useMemo(() => {
    if (!regionMandiCodes) return visibleMandiCodes;
    const next = new Set<string>();
    for (const code of visibleMandiCodes) if (regionMandiCodes.has(code)) next.add(code);
    return next;
  }, [visibleMandiCodes, regionMandiCodes]);

  const rows = useMemo(
    () =>
      getCommoditySpreadRows(
        commodities,
        mandiByMarketId,
        pricesByCommodity,
        metric,
        effectiveVisibleMandiCodes,
        asOf ?? '',
        requireGeocoded,
      ),
    [commodities, mandiByMarketId, pricesByCommodity, metric, effectiveVisibleMandiCodes, asOf, requireGeocoded],
  );

  const freshMarketIds = useMemo(() => getFreshMarketIds(pricesByCommodity), [pricesByCommodity]);

  const stats = useMemo(
    () => getMarketStats(rows, undefined, freshMarketIds, effectiveVisibleMandiCodes, commodities.length),
    [rows, freshMarketIds, effectiveVisibleMandiCodes, commodities.length],
  );

  useEffect(() => {
    if (!selectedCommodityId && rows[0]) setSelectedCommodityId(rows[0].commodityId);
  }, [rows, selectedCommodityId]);

  const activeRow = rows.find((r) => r.commodityId === selectedCommodityId) ?? rows[0];

  function toggleMandi(code: string) {
    setVisibleMandiCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAllMandis() {
    setVisibleMandiCodes((prev) => (prev.size === mandis.length ? new Set() : new Set(mandis.map((m) => m.code))));
  }

  function setMandiVisibility(codes: string[], visible: boolean) {
    setVisibleMandiCodes((prev) => {
      const next = new Set(prev);
      for (const code of codes) {
        if (visible) next.add(code);
        else next.delete(code);
      }
      return next;
    });
  }

  function handleGeocoded(mandi: Mandi) {
    // The market already exists in `mandis` (ungeocoded markets are included by
    // default now) -- update it in place rather than appending a duplicate.
    setMandis((prev) => prev.map((m) => (m.code === mandi.code ? mandi : m)));
    setVisibleMandiCodes((prev) => new Set(prev).add(mandi.code));
  }

  function handleTierChange(commodityId: string, tierIndex: number) {
    setTierByCommodity((prev) => ({ ...prev, [commodityId]: tierIndex }));
  }

  function handleLogout() {
    clearToken();
    setIsAuthenticated(false);
  }

  function handleSelect(row: CommoditySpreadRow) {
    setSelectedCommodityId(row.commodityId);
  }

  function handleSelectBest() {
    if (rows[0]) setSelectedCommodityId(rows[0].commodityId);
  }

  // Opens the standalone trip-explorer page in a new tab, carrying over
  // exactly what's on screen (the resolved buy/sell pair, not a commodity id
  // to re-rank) so the new tab shows precisely the trip the card displayed,
  // regardless of region filters or mandi visibility toggles in this tab.
  function handleExplore(row: CommoditySpreadRow, tierIndex: number, rank: number) {
    const tier = row.tiers[Math.min(tierIndex, row.tiers.length - 1)];
    const params = new URLSearchParams({
      commodityId: row.commodityId,
      commodityName: row.commodityName,
      unit: row.unit,
      pointA: tier.buy.mandi.code,
      pointB: tier.sell.mandi.code,
      buyPrice: String(tier.buy.price),
      sellPrice: String(tier.sell.price),
      qty: String(row.lotQuantity),
      asOf: asOf ?? '',
      windowDays: String(windowDays),
      metric,
      priceUnit,
      transportRate: String(transportRate),
      rank: String(rank),
    });
    if (row.commodityNameHi) params.set('commodityNameHi', row.commodityNameHi);
    window.open(`/explore?${params.toString()}`, '_blank');
  }

  if (!isAuthenticated) {
    return <LoginScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-ink font-sans text-dim">Loading live mandi data…</div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-ink font-sans text-rust">
        Failed to load: {error}. Is the backend running on {import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8010'}?
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-ink font-sans text-wheat lg:h-screen lg:w-screen lg:overflow-hidden">
      <Masthead
        dates={dates}
        asOf={asOf}
        onAsOfChange={setAsOf}
        onOpenLocationEditor={() => setLocationEditorOpen(true)}
        lastSyncedAt={lastSyncedAt}
        isStale={isStale}
        syncing={syncing}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
        mandis={mandis}
        selectedDistricts={selectedDistricts}
        onDistrictsChange={setSelectedDistricts}
      />
      <Toolbar
        mandis={mandis}
        metric={metric}
        onMetricChange={setMetric}
        windowDays={windowDays}
        onWindowDaysChange={setWindowDays}
        priceUnit={priceUnit}
        onPriceUnitChange={setPriceUnit}
        requireGeocoded={requireGeocoded}
        onRequireGeocodedChange={setRequireGeocoded}
        visibleMandiCodes={visibleMandiCodes}
        onToggleMandi={toggleMandi}
        onSetMandiVisibility={setMandiVisibility}
        onToggleAllMandis={toggleAllMandis}
      />

      <StatStrip stats={stats} onSelectBest={handleSelectBest} isBestSelected={rows[0]?.commodityId === selectedCommodityId} />

      <div className="flex border-b border-wheat/10">
        <TopOpportunities
          rows={rows}
          selectedCommodityId={selectedCommodityId}
          onSelect={handleSelect}
          priceUnit={priceUnit}
          topN={topN}
          onTopNChange={setTopN}
          tierByCommodity={tierByCommodity}
          onTierChange={handleTierChange}
          onExplore={handleExplore}
        />
      </div>

      <div className="flex flex-col lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        <div className="lg:min-h-0 lg:border-r lg:border-wheat/10">
          {activeRow ? (
            <RouteJourney
              key={activeRow.commodityId}
              row={activeRow}
              tierIndex={tierByCommodity[activeRow.commodityId] ?? 0}
              priceUnit={priceUnit}
              transportRate={transportRate}
              onTransportRateChange={setTransportRate}
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-dim lg:h-full">No data for this day yet.</div>
          )}
        </div>
        <div className="border-t border-wheat/10 lg:min-h-0 lg:border-t-0">
          {activeRow ? (
            <MandiInfoPanel row={activeRow} tierIndex={tierByCommodity[activeRow.commodityId] ?? 0} />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-dim lg:h-full">No data for this day yet.</div>
          )}
        </div>
      </div>

      <LocationEditor open={locationEditorOpen} onClose={() => setLocationEditorOpen(false)} onGeocoded={handleGeocoded} />
      {syncing && <SyncOverlay />}
    </div>
  );
}
