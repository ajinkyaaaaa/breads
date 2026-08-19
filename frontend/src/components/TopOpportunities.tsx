import type { CommoditySpreadRow, SpreadPoint } from '../lib/analytics';
import { getCommodityCategory } from '../lib/categories';
import { formatPct, formatRate, unitSuffix } from '../lib/format';
import type { PriceUnit } from '../data/types';
import { FreshnessBadge } from './FreshnessBadge';
import { Icon } from './Icon';
import { LocationBadge } from './LocationBadge';
import { TopNDropdown } from './TopNDropdown';

const CATEGORY_ICON = { fruit: 'nutrition', vegetable: 'eco' } as const;

const TOP_N_OPTIONS = [5, 6, 7, 8, 9, 10];

/** Rank 1 reads as the boldest, most saturated entry; rank N recedes -- so the
 * "top N" ordering is legible at a glance, not just from the numeral text. */
const RANK_STYLE = [
  { size: 24, opacity: 1 },
  { size: 22, opacity: 0.89 },
  { size: 21, opacity: 0.8 },
  { size: 20, opacity: 0.72 },
  { size: 19, opacity: 0.65 },
  { size: 19, opacity: 0.58 },
  { size: 18, opacity: 0.52 },
  { size: 18, opacity: 0.46 },
  { size: 17, opacity: 0.4 },
  { size: 17, opacity: 0.35 },
];

interface TopOpportunitiesProps {
  rows: CommoditySpreadRow[];
  selectedCommodityId: string | null;
  onSelect: (row: CommoditySpreadRow) => void;
  priceUnit: PriceUnit;
  topN: number;
  onTopNChange: (n: number) => void;
}

function MandiLine({ point, priceUnit }: { point: SpreadPoint; priceUnit: PriceUnit }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[12px] font-medium text-amber">
        <FreshnessBadge tier={point.freshness} size={15} />
        <LocationBadge hasLocation={typeof point.mandi.lat === 'number' && typeof point.mandi.lon === 'number'} size={15} />
        <span>{point.mandi.name}</span>
      </span>
      <span className="pl-[38px] font-mono text-[10px] text-dim">
        {point.mandi.taluka} · {formatRate(point.price, priceUnit)}
        {unitSuffix(priceUnit)}
      </span>
    </div>
  );
}

export function TopOpportunities({ rows, selectedCommodityId, onSelect, priceUnit, topN, onTopNChange }: TopOpportunitiesProps) {
  const topRows = rows.slice(0, topN);
  // At the default of 5, cards stretch to divide the row evenly (matches the
  // original layout) since 5 fixed-width cards leave the row visibly short of
  // full. Past 5 there's no width left to divide up without squeezing every
  // card, so it switches to a fixed card width that scrolls instead.
  const canFillRow = topN === 5;

  return (
    <div className="flex min-w-0 flex-1 flex-col border-r border-wheat/10 px-4 py-2">
      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">
        <span>Top</span>
        <TopNDropdown value={topN} options={TOP_N_OPTIONS} onChange={onTopNChange} />
        <span>Opportunities</span>
      </div>
      {topRows.length === 0 ? (
        <div className="flex flex-1 items-center text-sm text-dim">No spreads to rank for this day.</div>
      ) : (
        <div
          className={`flex flex-1 items-stretch gap-2 overflow-x-auto scroll-smooth ${canFillRow ? 'lg:grid lg:grid-cols-5' : ''}`}
        >
          {topRows.map((row, i) => {
            const active = row.commodityId === selectedCommodityId;
            const category = getCommodityCategory(row.commodityName);
            const rank = RANK_STYLE[i] ?? RANK_STYLE[RANK_STYLE.length - 1];

            return (
              <button
                key={`${row.commodityId}-${active}`}
                onClick={() => onSelect(row)}
                className={`relative flex w-[290px] shrink-0 flex-col overflow-hidden rounded-sm border pl-4 pr-3 py-3 text-left transition-[background-color,border-color,transform] duration-100 ease-out active:scale-[0.97] active:duration-75 ${
                  canFillRow ? 'lg:w-auto lg:min-w-0 lg:shrink' : ''
                } ${active ? 'animate-kpi-select border-amber/55 bg-surface2' : 'border-amber/15 bg-surface hover:border-amber/40 hover:bg-surface2'}`}
              >
                <span className="absolute inset-y-0 left-0 w-[3px] bg-amber" style={{ opacity: rank.opacity }} />

                <div className="flex w-full items-baseline gap-1.5">
                  <span
                    className="font-mono font-bold leading-none tabular-nums text-amber"
                    style={{ fontSize: rank.size, opacity: rank.opacity }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {category && (
                    <span className="shrink-0" title={category}>
                      <Icon name={CATEGORY_ICON[category]} size={14} filled className="text-white" />
                    </span>
                  )}
                  <span className="truncate font-display text-[15px] font-semibold text-wheat">{row.commodityName}</span>
                </div>

                <div className="mt-2.5 border-t border-dashed border-wheat/15" />

                <div className="mt-2.5 flex flex-col gap-1.5">
                  <MandiLine point={row.min} priceUnit={priceUnit} />

                  <div className="flex items-center gap-1.5 pl-[3px]">
                    <span className="h-3 w-px bg-gradient-to-b from-amber to-sage" />
                    <Icon name="arrow_forward" size={10} className="rotate-90 text-dim" />
                  </div>

                  <MandiLine point={row.max} priceUnit={priceUnit} />
                </div>

                <div className="mt-2.5 flex items-baseline justify-between border-t border-dashed border-wheat/15 pt-2">
                  <span className="font-mono text-lg font-bold leading-none tabular-nums text-sage">
                    +{formatRate(row.spread, priceUnit)}
                    <span className="text-[11px] font-semibold">{unitSuffix(priceUnit)}</span>
                  </span>
                  <span className="rounded-full bg-sage-dim px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sage">
                    {formatPct(row.spreadPct, { sign: true })}
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
