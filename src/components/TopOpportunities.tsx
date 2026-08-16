import { COMMODITIES } from '../data/commodities';
import type { CommoditySpreadRow } from '../lib/analytics';
import { formatKm, formatPct, formatRupees } from '../lib/format';
import { Icon } from './Icon';

interface TopOpportunitiesProps {
  rows: CommoditySpreadRow[];
  selectedCommodityId: string | null;
  onSelect: (row: CommoditySpreadRow) => void;
}

export function TopOpportunities({ rows, selectedCommodityId, onSelect }: TopOpportunitiesProps) {
  const top5 = rows.slice(0, 5);

  return (
    <div className="flex flex-1 flex-col border-r border-wheat/10 px-4 py-2">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">Top 5 Opportunities</div>
      {top5.length === 0 ? (
        <div className="flex flex-1 items-center text-sm text-dim">No spreads to rank for this day.</div>
      ) : (
        <div className="grid flex-1 grid-cols-5 gap-2">
          {top5.map((row, i) => {
            const active = row.commodityId === selectedCommodityId;
            const commodityHi = COMMODITIES.find((c) => c.id === row.commodityId)?.nameHi;
            return (
              <button
                key={`${row.commodityId}-${active}`}
                onClick={() => onSelect(row)}
                className={`flex min-w-0 flex-col items-start rounded-sm border px-3 py-2 text-left transition-[background-color,border-color,transform] duration-100 ease-out active:scale-[0.97] active:duration-75 ${
                  active ? 'animate-kpi-select border-wheat/25 bg-surface2' : 'border-wheat/8 bg-surface hover:border-amber/30 hover:bg-surface2'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-mono text-[10px] text-dim">#{i + 1}</span>
                  <span className="rounded-full bg-sage-dim px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sage">
                    {formatPct(row.profitabilityScore)}
                  </span>
                </div>
                <div className="mt-0.5 flex w-full items-baseline gap-1.5">
                  <span className="truncate font-display text-[14px] font-semibold text-wheat">{row.commodityName}</span>
                  {commodityHi && <span className="shrink-0 text-[13px] text-dim">{commodityHi}</span>}
                </div>
                <div className="mt-1 flex w-full items-center gap-1 text-[11px]">
                  <span className="min-w-0 flex-1 truncate text-wheat">{row.min.mandi.name}</span>
                  <Icon name="arrow_forward" size={12} className="shrink-0 text-dim" />
                  <span className="min-w-0 flex-1 truncate text-right text-sage">{row.max.mandi.name}</span>
                </div>
                <div className="flex w-full items-center gap-1 text-[12px] text-dim">
                  <span className="min-w-0 flex-1 truncate">{row.min.mandi.nameHi}</span>
                  <Icon name="arrow_forward" size={12} className="shrink-0 opacity-0" />
                  <span className="min-w-0 flex-1 truncate text-right">{row.max.mandi.nameHi}</span>
                </div>
                <div className="mt-1 flex w-full items-center justify-between font-mono text-[11px] tabular-nums">
                  <span className="font-semibold text-sage">+{formatRupees(row.lotProfit)}</span>
                  <span className="font-bold text-dim">
                    {row.lotQuantity}qtl · {formatKm(row.distanceKm)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
