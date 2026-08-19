import { useEffect, useMemo, useState } from 'react';
import {
  fetchAllPrices,
  fetchArchiveDates,
  fetchCommodities,
  fetchMarkets,
  fetchPriceHistory,
  fetchSyncStatus,
  triggerIngest,
  type ApiPriceRow,
} from './lib/api';
import {
  getCommodityAvgPriceTrend,
  getCommodityDailyBreakdown,
  getCommoditySpreadRows,
  getFreshMarketIds,
  getMarketStats,
  toCommodity,
  toMandi,
  type CommoditySpreadRow,
} from './lib/analytics';
import { todayIso } from './lib/format';
import { Masthead } from './components/Masthead';
import { StatStrip } from './components/StatStrip';
import { TopOpportunities } from './components/TopOpportunities';
import { PriceHistoryPanel } from './components/PriceHistoryPanel';
import { Toolbar } from './components/Toolbar';
import { RouteJourney } from './components/RouteJourney';
import { LocationEditor } from './components/LocationEditor';
import { SyncOverlay } from './components/SyncOverlay';
import type { Mandi, Metric, PriceUnit } from './data/types';

/** The resync overlay must stay up at least this long, even if the ingest
 * itself resolves faster, so it reads as a real action rather than a flash. */
const MIN_SYNC_OVERLAY_MS = 5000;

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [commodities, setCommodities] = useState<ReturnType<typeof toCommodity>[]>([]);
  const [dates, setDates] = useState<string[]>([]);

  const [asOf, setAsOf] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState(1);
  const [metric, setMetric] = useState<Metric>('modal');
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('quintal');
  const [topN, setTopN] = useState(5);
  const [visibleMandiCodes, setVisibleMandiCodes] = useState<Set<string>>(new Set());

  const [pricesByCommodity, setPricesByCommodity] = useState<Record<string, ApiPriceRow[]>>({});

  const [selectedCommodityId, setSelectedCommodityId] = useState<string | null>(null);
  const [trendCommodityId, setTrendCommodityId] = useState<string | null>(null);
  const [trendHistory, setTrendHistory] = useState<Awaited<ReturnType<typeof fetchPriceHistory>>>([]);

  const [pendingGeocodeCount, setPendingGeocodeCount] = useState(0);
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Initial load: markets, commodities, the list of dates the archive actually has, and last-sync status.
  useEffect(() => {
    (async () => {
      try {
        const [marketRows, pendingRows, commodityRows, dateRows, syncStatus] = await Promise.all([
          fetchMarkets(false), // only markets with a known lat/lon can drive distance-based features
          fetchMarkets(true), // newly-discovered markets still needing a location
          fetchCommodities(),
          fetchArchiveDates(),
          fetchSyncStatus(),
        ]);
        const mandiList = marketRows.map((m) => toMandi({ ...m, lat: m.lat!, lon: m.lon! }));
        setMandis(mandiList);
        setVisibleMandiCodes(new Set(mandiList.map((m) => m.code)));
        setPendingGeocodeCount(pendingRows.length);
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
  }, []);

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

      const [marketRows, pendingRows, commodityRows, dateRows, syncStatus] = await Promise.all([
        fetchMarkets(false),
        fetchMarkets(true),
        fetchCommodities(),
        fetchArchiveDates(),
        fetchSyncStatus(),
      ]);

      const mandiList = marketRows.map((m) => toMandi({ ...m, lat: m.lat!, lon: m.lon! }));
      setMandis(mandiList);
      // Preserve the viewer's existing mandi selection; newly-appeared markets default to visible.
      setVisibleMandiCodes((prev) => {
        const next = new Set(prev);
        for (const m of mandiList) next.add(m.code);
        return next;
      });
      setPendingGeocodeCount(pendingRows.length);
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

  const rows = useMemo(
    () => getCommoditySpreadRows(commodities, mandiByMarketId, pricesByCommodity, metric, visibleMandiCodes, asOf ?? ''),
    [commodities, mandiByMarketId, pricesByCommodity, metric, visibleMandiCodes, asOf],
  );

  const freshMarketIds = useMemo(() => getFreshMarketIds(pricesByCommodity), [pricesByCommodity]);

  const stats = useMemo(
    () => getMarketStats(rows, undefined, freshMarketIds, visibleMandiCodes, commodities.length),
    [rows, freshMarketIds, visibleMandiCodes, commodities.length],
  );

  useEffect(() => {
    if (!selectedCommodityId && rows[0]) setSelectedCommodityId(rows[0].commodityId);
    if (!trendCommodityId && rows[0]) setTrendCommodityId(rows[0].commodityId);
  }, [rows, selectedCommodityId, trendCommodityId]);

  useEffect(() => {
    if (!trendCommodityId) return;
    fetchPriceHistory(trendCommodityId, 30)
      .then(setTrendHistory)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load history'));
  }, [trendCommodityId]);

  const breakdown = useMemo(
    () => getCommodityDailyBreakdown(trendHistory, mandiByMarketId, visibleMandiCodes, dates, metric),
    [trendHistory, mandiByMarketId, visibleMandiCodes, dates, metric],
  );
  const trend = useMemo(() => getCommodityAvgPriceTrend(breakdown), [breakdown]);

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
    setMandis((prev) => [...prev, mandi]);
    setVisibleMandiCodes((prev) => new Set(prev).add(mandi.code));
    setPendingGeocodeCount((prev) => Math.max(0, prev - 1));
  }

  function handleSelect(row: CommoditySpreadRow) {
    setSelectedCommodityId(row.commodityId);
  }

  function handleSelectBest() {
    if (rows[0]) setSelectedCommodityId(rows[0].commodityId);
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
        pendingGeocodeCount={pendingGeocodeCount}
        onOpenLocationEditor={() => setLocationEditorOpen(true)}
        lastSyncedAt={lastSyncedAt}
        isStale={isStale}
        syncing={syncing}
        onRefresh={handleRefresh}
      />
      <Toolbar
        mandis={mandis}
        metric={metric}
        onMetricChange={setMetric}
        windowDays={windowDays}
        onWindowDaysChange={setWindowDays}
        priceUnit={priceUnit}
        onPriceUnitChange={setPriceUnit}
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
        />
      </div>

      <div className="flex flex-col lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        <div className="lg:min-h-0 lg:border-r lg:border-wheat/10">
          {activeRow ? (
            <RouteJourney key={activeRow.commodityId} row={activeRow} priceUnit={priceUnit} />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-dim lg:h-full">No commodity has a two-mandi spread right now.</div>
          )}
        </div>
        <div className="border-t border-wheat/10 lg:min-h-0 lg:border-t-0">
          <PriceHistoryPanel
            commodities={commodities}
            commodityId={trendCommodityId}
            onCommodityChange={setTrendCommodityId}
            metric={metric}
            dates={dates}
            trend={trend}
            breakdown={breakdown}
            priceUnit={priceUnit}
          />
        </div>
      </div>

      <LocationEditor open={locationEditorOpen} onClose={() => setLocationEditorOpen(false)} onGeocoded={handleGeocoded} />
      {syncing && <SyncOverlay />}
    </div>
  );
}
