import type { MarketStats } from '../lib/analytics';
import { formatPct, formatRupees } from '../lib/format';
import { Icon } from './Icon';

interface StatStripProps {
  stats: MarketStats;
  onSelectBest: () => void;
  isBestSelected: boolean;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="w-44 shrink-0 border-l border-wheat/10 px-5 py-2 first:border-l-0 sm:w-auto sm:flex-1">
      <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-dim">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function StatStrip({ stats, onSelectBest, isBestSelected }: StatStripProps) {
  const { bestRow, avgSpreadPct, avgSpreadPctChangeVsPrevDay, commoditiesTracked, totalCommodities, mandisReporting, totalMandis } = stats;

  return (
    <div className="flex w-full overflow-x-auto border-b border-wheat/10 bg-ink">
      <button
        key={`best-${isBestSelected}`}
        onClick={onSelectBest}
        disabled={!bestRow}
        className={`w-52 shrink-0 border-l border-wheat/10 px-5 py-2 text-left transition-[background-color,transform] duration-100 ease-out first:border-l-0 hover:bg-surface/60 active:scale-[0.97] active:duration-75 disabled:cursor-default disabled:hover:bg-transparent disabled:active:scale-100 sm:w-auto sm:flex-1 ${
          isBestSelected ? 'animate-kpi-select bg-surface/60' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-dim">Best Opportunity</div>
          {isBestSelected && <span className="text-[9px] font-semibold uppercase tracking-wide text-amber">Viewing</span>}
        </div>
        {bestRow ? (
          <>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="font-mono text-xl font-semibold leading-none tabular-nums text-sage">{formatRupees(bestRow.lotProfit)}</div>
              <span className="rounded-full bg-sage-dim px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sage">
                {formatPct(bestRow.profitabilityScore)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px]">
              <span className="text-dim">
                {bestRow.commodityName} · {bestRow.lotQuantity} qtl ·
              </span>
              <span className="truncate text-wheat">{bestRow.tiers[0].buy.mandi.name}</span>
              <Icon name="arrow_forward" size={11} className="shrink-0 text-dim" />
              <span className="truncate text-sage">{bestRow.tiers[0].sell.mandi.name}</span>
            </div>
          </>
        ) : (
          <div className="mt-1 font-mono text-xl text-dim">—</div>
        )}
      </button>

      <Stat label="Avg Spread (Market)">
        <div className="font-mono text-xl font-semibold leading-none tabular-nums text-wheat">
          {avgSpreadPct !== undefined ? formatPct(avgSpreadPct) : '—'}
        </div>
        {avgSpreadPctChangeVsPrevDay !== undefined && (
          <div className={`mt-1 text-[11px] font-medium tabular-nums ${avgSpreadPctChangeVsPrevDay >= 0 ? 'text-sage' : 'text-rust'}`}>
            {avgSpreadPctChangeVsPrevDay >= 0 ? '▲' : '▼'} {formatPct(Math.abs(avgSpreadPctChangeVsPrevDay))} pts vs prev day
          </div>
        )}
      </Stat>

      <Stat label="Commodities Tracked">
        <div className="font-mono text-xl font-semibold leading-none tabular-nums text-wheat">
          {commoditiesTracked}
          <span className="text-dim">/{totalCommodities}</span>
        </div>
        <div className="mt-1 text-[11px] text-dim">with a live spread today</div>
      </Stat>

      <Stat label="Mandis Reporting">
        <div className="font-mono text-xl font-semibold leading-none tabular-nums text-wheat">
          {mandisReporting}
          <span className="text-dim">/{totalMandis}</span>
        </div>
        <div className="mt-1 flex gap-1">
          {Array.from({ length: totalMandis }, (_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i < mandisReporting ? 'bg-sage' : 'bg-wheat/10'}`} />
          ))}
        </div>
      </Stat>
    </div>
  );
}
