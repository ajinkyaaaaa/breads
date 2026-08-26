import type { CommoditySpreadRow, SpreadPoint } from '../lib/analytics';
import { getCommodityCategory } from '../lib/categories';
import { formatPct, formatRate, formatRupees, unitSuffix } from '../lib/format';
import type { PriceUnit } from '../data/types';
import { FreshnessBadge } from './FreshnessBadge';
import { Icon } from './Icon';
import { LocationBadge } from './LocationBadge';
import { TierDropdown } from './TierDropdown';
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
  tierByCommodity: Record<string, number>;
  onTierChange: (commodityId: string, tierIndex: number) => void;
  /** Opens the full trip plan (with a suggested return leg) in a new browser tab. */
  onExplore: (row: CommoditySpreadRow, tierIndex: number) => void;
}

function MandiLine({ point, priceUnit }: { point: SpreadPoint; priceUnit: PriceUnit }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[12px] font-medium text-amber">
        <FreshnessBadge tier={point.freshness} size={19} />
        <LocationBadge hasLocation={typeof point.mandi.lat === 'number' && typeof point.mandi.lon === 'number'} size={19} />
        <span>{point.mandi.name}</span>
      </span>
      <span className="pl-[46px] font-mono text-[10px] text-wheat">
        {point.mandi.taluka} · {formatRate(point.price, priceUnit)}
        {unitSuffix(priceUnit)}
      </span>
    </div>
  );
}

export function TopOpportunities({
  rows,
  selectedCommodityId,
  onSelect,
  priceUnit,
  topN,
  onTopNChange,
  tierByCommodity,
  onTierChange,
  onExplore,
}: TopOpportunitiesProps) {
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
        <div className="flex flex-1 items-center text-sm text-dim">No data for this day yet.</div>
      ) : (
        <div
          className={`flex flex-1 items-stretch gap-2 overflow-x-auto scroll-smooth ${canFillRow ? 'lg:grid lg:grid-cols-5' : ''}`}
        >
          {topRows.map((row, i) => {
            const active = row.commodityId === selectedCommodityId;
            const category = getCommodityCategory(row.commodityName);
            const rank = RANK_STYLE[i] ?? RANK_STYLE[RANK_STYLE.length - 1];
            const tierIndex = Math.min(tierByCommodity[row.commodityId] ?? 0, row.tiers.length - 1);
            const tier = row.tiers[tierIndex];

            return (
              <div
                key={`${row.commodityId}-${active}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(row)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelect(row);
                }}
                className={`relative flex w-[290px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-sm border pl-4 pr-3 py-3 text-left outline-none transition-[background-color,border-color,transform] duration-100 ease-out active:scale-[0.97] active:duration-75 ${
                  canFillRow ? 'lg:w-auto lg:min-w-0 lg:shrink' : ''
                } ${active ? 'animate-kpi-select border-amber/55 bg-surface2' : 'border-amber/15 bg-surface hover:border-amber/40 hover:bg-surface2'}`}
              >
                <span
                  className={`absolute inset-y-0 left-0 w-[3px] ${active ? 'bg-amber' : 'bg-dim'}`}
                  style={{ opacity: active ? rank.opacity : rank.opacity * 0.7 }}
                />

                <div className="flex w-full items-start justify-between gap-1.5">
                  <div className="flex min-w-0 items-baseline gap-1.5">
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
                  <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <TierDropdown
                      tierCount={row.tiers.length}
                      value={tierIndex}
                      onChange={(idx) => onTierChange(row.commodityId, idx)}
                    />
                    <button
                      onClick={() => onExplore(row, tierIndex)}
                      title="Open a full trip plan, with a suggested return leg, in a new tab"
                      className="flex items-center gap-1 rounded-sm border border-wheat/15 bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-wheat transition-colors duration-150 hover:border-amber/40 hover:text-amber"
                    >
                      Explore
                      <Icon name="open_in_new" size={11} />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 border-t border-dashed border-wheat/15" />

                <div className="relative isolate mt-2.5 flex flex-col gap-1.5">
                  {/* Runs the full height behind both rows -- badges are opaque
                      so the line simply disappears under them, reading as a
                      single connection from the buy tick down to the sell tick. */}
                  <span
                    className="absolute left-[9px] top-0 -z-10 w-px bg-gradient-to-b from-amber to-sage"
                    style={{ bottom: 22 }}
                  />
                  <MandiLine point={tier.buy} priceUnit={priceUnit} />

                  <div className="flex items-center gap-1.5 pl-[26px]">
                    <Icon name="arrow_forward" size={14} className="-mt-3.5 rotate-90 text-wheat" />
                  </div>

                  <MandiLine point={tier.sell} priceUnit={priceUnit} />
                </div>

                <div className="mt-2.5 flex items-baseline justify-between border-t border-dashed border-wheat/15 pt-2">
                  <span className="flex items-baseline gap-1">
                    <span className="font-mono text-lg font-bold leading-none tabular-nums text-sage">
                      +{formatRupees(tier.lotProfit)}
                    </span>
                    <span className="font-mono text-[10px] text-dim">/{row.lotQuantity}qtl</span>
                  </span>
                  <span className="rounded-full bg-sage-dim px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sage">
                    {formatPct(tier.spreadPct, { sign: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
