import { useEffect, useState } from 'react';
import type { CommoditySpreadRow, SpreadPoint } from '../lib/analytics';
import { haversineKm } from '../lib/geo';
import { formatKm, formatPct, formatRate, formatRupees, unitSuffix } from '../lib/format';
import { useAnimatedNumber } from '../lib/useAnimatedNumber';
import { Icon } from './Icon';
import type { PriceUnit } from '../data/types';

interface RouteJourneyProps {
  row: CommoditySpreadRow;
  priceUnit: PriceUnit;
}

// ₹, mock per-quintal-per-km freight rate — so a bigger load genuinely costs more to
// haul, not just a flat per-trip fee independent of how much is being moved.
const TRANSPORT_RATE_PER_QTL_KM = 1.2;
const AVG_SPEED_KMPH = 35;
const MIN_QUINTALS = 1;
const MAX_QUINTALS = 500;
const QUINTAL_STEP = 5;

function clampQuintals(n: number): number {
  if (Number.isNaN(n)) return MIN_QUINTALS;
  return Math.min(MAX_QUINTALS, Math.max(MIN_QUINTALS, Math.round(n)));
}

function formatTravelTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function SummaryField({ label, value, valueClassName = 'text-wheat' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide text-dim">{label}</div>
      <div className={`font-mono text-[12px] tabular-nums ${valueClassName}`}>{value}</div>
    </div>
  );
}

function BillRow({
  description,
  sub,
  qty,
  rate,
  amount,
  amountClassName = 'text-wheat',
  bold = false,
}: {
  description: string;
  sub?: string;
  qty?: string;
  rate?: string;
  amount: string;
  amountClassName?: string;
  bold?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[1fr_54px_88px_88px] items-baseline gap-2 py-1.5 ${bold ? 'font-bold' : ''}`}>
      <div className="min-w-0">
        <div className={`truncate text-[11px] ${bold ? 'text-wheat' : 'text-wheat/90'}`}>{description}</div>
        {sub && <div className="truncate text-[9px] text-dim">{sub}</div>}
      </div>
      <div className="text-right font-mono text-[10px] tabular-nums text-dim">{qty}</div>
      <div className="text-right font-mono text-[10px] tabular-nums text-dim">{rate}</div>
      <div className={`text-right font-mono text-[12px] tabular-nums ${amountClassName}`}>{amount}</div>
    </div>
  );
}

function PointCard({
  label,
  point,
  commodityName,
  quantity,
  onQuantityChange,
  total,
  accent,
  priceUnit,
}: {
  label: string;
  point: SpreadPoint;
  commodityName: string;
  quantity: number;
  onQuantityChange?: (q: number) => void;
  total: number;
  accent: 'wheat' | 'sage';
  priceUnit: PriceUnit;
}) {
  const accentClass = accent === 'wheat' ? 'text-wheat' : 'text-sage';
  const editable = !!onQuantityChange;

  // Local text buffer separate from the committed numeric quantity, so backspacing to
  // clear the field doesn't instantly snap to the 1-quintal floor mid-edit — only a
  // fully-typed, valid number commits (live), and blur cleans up anything left invalid.
  const [rawQuantity, setRawQuantity] = useState(String(quantity));
  useEffect(() => {
    setRawQuantity(String(quantity));
  }, [quantity]);

  return (
    <div className="flex-1 rounded-sm border border-wheat/10 bg-surface px-4 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-dim">
        <Icon name="location_on" size={13} className={accentClass} />
        {label}
      </div>
      <div className={`font-display text-lg font-semibold leading-tight ${accentClass}`}>{point.mandi.name}</div>
      <div className="mt-0.5 truncate text-[10px] text-dim">
        {commodityName} · {point.mandi.taluka}
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-wheat/8 pt-2 text-[11px]">
        <span className="text-dim">₹{unitSuffix(priceUnit)}</span>
        <span className="font-mono text-[13px] font-semibold tabular-nums text-wheat">{formatRate(point.price, priceUnit)}</span>
      </div>
      {point.unit === 'kg' && point.rawPrice !== undefined && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-amber" title="Source reported this as ₹/kg, not ₹/quintal — auto-corrected ×100 for calculations">
          <Icon name="warning" size={11} />
          adj. from {formatRupees(point.rawPrice)}/kg
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 text-dim">
          <Icon name="local_shipping" size={12} />
          Qty
        </span>
        {editable ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onQuantityChange(clampQuintals(quantity - QUINTAL_STEP))}
              className="flex h-5 w-5 items-center justify-center rounded-sm border border-wheat/15 text-dim transition-colors duration-150 hover:border-wheat/30 hover:text-wheat"
              aria-label="Decrease quantity"
            >
              <Icon name="remove" size={11} />
            </button>
            <input
              type="number"
              value={rawQuantity}
              onChange={(e) => {
                const val = e.target.value;
                setRawQuantity(val);
                if (val.trim() === '') return; // let the field sit empty while the user is retyping
                const n = Number(val);
                if (!Number.isNaN(n)) onQuantityChange!(clampQuintals(n));
              }}
              onBlur={() => {
                const n = Number(rawQuantity);
                if (rawQuantity.trim() === '' || Number.isNaN(n)) {
                  setRawQuantity(String(quantity)); // nothing valid was typed — restore last committed value
                } else {
                  const clamped = clampQuintals(n);
                  setRawQuantity(String(clamped));
                  onQuantityChange!(clamped);
                }
              }}
              min={MIN_QUINTALS}
              max={MAX_QUINTALS}
              className="w-10 rounded-sm border border-wheat/10 bg-ink px-1 py-0.5 text-center font-mono text-[11px] tabular-nums text-wheat outline-none focus:border-amber"
            />
            <button
              onClick={() => onQuantityChange(clampQuintals(quantity + QUINTAL_STEP))}
              className="flex h-5 w-5 items-center justify-center rounded-sm border border-wheat/15 text-dim transition-colors duration-150 hover:border-wheat/30 hover:text-wheat"
              aria-label="Increase quantity"
            >
              <Icon name="add" size={11} />
            </button>
          </div>
        ) : (
          <span className="font-mono text-[11px] tabular-nums text-wheat">{quantity} qtl</span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-wheat/8 pt-2">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-dim">
          <Icon name="payments" size={12} />
          Total
        </span>
        <span className={`font-mono text-[17px] font-bold tabular-nums ${accentClass}`}>{formatRupees(total)}</span>
      </div>
    </div>
  );
}

export function RouteJourney({ row, priceUnit }: RouteJourneyProps) {
  const [quantity, setQuantity] = useState(row.lotQuantity);

  const buyPrice = row.min.price;
  const sellPrice = row.max.price;
  const totalAtA = buyPrice * quantity;
  const totalAtB = sellPrice * quantity;
  const deltaPerQtl = sellPrice - buyPrice;
  const deltaPct = buyPrice > 0 ? (deltaPerQtl / buyPrice) * 100 : 0;
  const isGain = deltaPerQtl >= 0;

  const distanceKm = haversineKm(row.min.mandi, row.max.mandi);
  const transportCost = quantity * distanceKm * TRANSPORT_RATE_PER_QTL_KM;
  const grossProfit = totalAtB - totalAtA;
  const netProfit = grossProfit - transportCost;
  const directCost = totalAtA + transportCost;
  const marginPct = totalAtA > 0 ? (netProfit / totalAtA) * 100 : 0;
  const travelTime = distanceKm / AVG_SPEED_KMPH;

  const animatedTotalA = useAnimatedNumber(totalAtA);
  const animatedTotalB = useAnimatedNumber(totalAtB);
  const animatedNet = useAnimatedNumber(netProfit);
  const animatedDirectCost = useAnimatedNumber(directCost);

  return (
    <div className="flex w-full flex-col px-6 py-4 lg:h-full lg:overflow-y-auto">
      <div className="mb-3 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">Trade Route Simulator</div>

      <div className="flex flex-col shrink-0 gap-3 lg:flex-row lg:items-stretch">
        <PointCard
          label="Point A · Base"
          point={row.min}
          commodityName={row.commodityName}
          quantity={quantity}
          onQuantityChange={setQuantity}
          total={animatedTotalA}
          accent="wheat"
          priceUnit={priceUnit}
        />

        <div className="flex w-full shrink-0 flex-col items-center justify-center gap-1 lg:w-20">
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums transition-colors duration-300 ${
              isGain ? 'bg-sage-dim text-sage' : 'bg-rust-dim text-rust'
            }`}
          >
            <Icon name={isGain ? 'trending_up' : 'trending_down'} size={13} />
            {formatPct(Math.abs(deltaPct), { sign: false })}
          </div>
          <div className="relative h-1 w-full rounded-full bg-gradient-to-r from-wheat via-amber to-sage">
            <Icon
              name="arrow_forward"
              size={18}
              className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 ${isGain ? 'text-sage' : 'text-dim'}`}
            />
          </div>
          <div className="mt-2 font-mono text-[11px] font-bold tabular-nums text-wheat">{formatKm(distanceKm)}</div>
        </div>

        <PointCard
          label="Point B · Selling"
          point={row.max}
          commodityName={row.commodityName}
          quantity={quantity}
          total={animatedTotalB}
          accent="sage"
          priceUnit={priceUnit}
        />
      </div>

      <div className="mt-3 shrink-0 rounded-sm border border-wheat/10 bg-surface px-4 py-3">
        <div className="flex items-center justify-between border-b border-dashed border-wheat/15 pb-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">
            <Icon name="receipt_long" size={13} className="text-dim" />
            Trade Bill
          </div>
          <SummaryField label="Distance" value={`${formatKm(distanceKm)} · ~${formatTravelTime(travelTime)}`} />
          <SummaryField label="Margin" value={formatPct(marginPct)} valueClassName={marginPct >= 0 ? 'text-sage' : 'text-rust'} />
        </div>

        <div className="grid grid-cols-[1fr_54px_88px_88px] gap-2 pt-2 text-[8px] font-semibold uppercase tracking-wide text-dim/70">
          <div>Description</div>
          <div className="text-right">Qty</div>
          <div className="text-right">Rate{unitSuffix(priceUnit)}</div>
          <div className="text-right">Amount</div>
        </div>

        <div className="divide-y divide-dashed divide-wheat/8">
          <BillRow
            description={`${row.commodityName} · bought`}
            sub={row.min.mandi.name}
            qty={`${quantity} qtl`}
            rate={formatRate(buyPrice, priceUnit)}
            amount={formatRupees(animatedTotalA)}
            amountClassName="text-wheat"
          />
          <BillRow
            description="Transport"
            sub={`${formatKm(distanceKm)} @ ₹${TRANSPORT_RATE_PER_QTL_KM}/qtl·km`}
            amount={`+${formatRupees(transportCost)}`}
            amountClassName="text-wheat"
          />
        </div>

        <div className="border-t border-wheat/15">
          <BillRow description="Total Cost" amount={formatRupees(animatedDirectCost)} amountClassName="text-wheat" bold />
        </div>

        <div className="divide-y divide-dashed divide-wheat/8 border-t border-dashed border-wheat/15">
          <BillRow
            description={`${row.commodityName} · sold`}
            sub={row.max.mandi.name}
            qty={`${quantity} qtl`}
            rate={formatRate(sellPrice, priceUnit)}
            amount={formatRupees(animatedTotalB)}
            amountClassName="text-sage"
          />
        </div>

        <div className="mt-1 flex items-center justify-between border-t border-wheat/15 pt-2.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-dim">
            Net Profit <span className="text-[10px] normal-case text-dim/70">({formatRupees(animatedTotalB)} − {formatRupees(animatedDirectCost)})</span>
          </span>
          <span className={`font-mono text-2xl font-bold tabular-nums ${netProfit >= 0 ? 'text-sage' : 'text-rust'}`}>{formatRupees(animatedNet)}</span>
        </div>
      </div>
    </div>
  );
}
