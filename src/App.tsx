import { useMemo, useState } from 'react';
import { MANDIS } from './data/mandis';
import { COMMODITIES } from './data/commodities';
import { TODAY } from './data/mockPrices';
import { getCommoditySpreadRows, getMarketStats, type CommoditySpreadRow } from './lib/analytics';
import { Masthead } from './components/Masthead';
import { StatStrip } from './components/StatStrip';
import { TopOpportunities } from './components/TopOpportunities';
import { PriceHistoryPanel } from './components/PriceHistoryPanel';
import { Toolbar } from './components/Toolbar';
import { RouteJourney } from './components/RouteJourney';
import type { Metric } from './data/types';

export default function App() {
  const [date, setDate] = useState(TODAY);
  const [metric, setMetric] = useState<Metric>('modal');
  const [visibleMandiCodes, setVisibleMandiCodes] = useState<Set<string>>(new Set(MANDIS.map((m) => m.code)));

  const rows = useMemo(() => getCommoditySpreadRows(date, metric, visibleMandiCodes), [date, metric, visibleMandiCodes]);
  const stats = useMemo(() => getMarketStats(date, metric, visibleMandiCodes), [date, metric, visibleMandiCodes]);

  const [selectedCommodityId, setSelectedCommodityId] = useState<string>(() => rows[0]?.commodityId ?? COMMODITIES[0].id);
  const [trendCommodityId, setTrendCommodityId] = useState<string>(() => rows[0]?.commodityId ?? COMMODITIES[0].id);

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
    setVisibleMandiCodes((prev) => (prev.size === MANDIS.length ? new Set() : new Set(MANDIS.map((m) => m.code))));
  }

  function handleSelect(row: CommoditySpreadRow) {
    setSelectedCommodityId(row.commodityId);
  }

  function handleSelectBest() {
    if (rows[0]) setSelectedCommodityId(rows[0].commodityId);
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink font-sans text-wheat">
      <Masthead date={date} onDateChange={setDate} />
      <StatStrip stats={stats} onSelectBest={handleSelectBest} isBestSelected={rows[0]?.commodityId === selectedCommodityId} />

      <div className="flex border-b border-wheat/10">
        <TopOpportunities rows={rows} selectedCommodityId={selectedCommodityId} onSelect={handleSelect} />
      </div>

      <Toolbar
        date={date}
        onDateChange={setDate}
        metric={metric}
        onMetricChange={setMetric}
        visibleMandiCodes={visibleMandiCodes}
        onToggleMandi={toggleMandi}
        onToggleAllMandis={toggleAllMandis}
      />

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className="min-h-0 border-r border-wheat/10">
          {activeRow ? (
            <RouteJourney key={activeRow.commodityId} row={activeRow} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-dim">No commodity has a two-mandi spread for this day.</div>
          )}
        </div>
        <div className="min-h-0">
          <PriceHistoryPanel commodityId={trendCommodityId} onCommodityChange={setTrendCommodityId} metric={metric} visibleMandiCodes={visibleMandiCodes} />
        </div>
      </div>
    </div>
  );
}
