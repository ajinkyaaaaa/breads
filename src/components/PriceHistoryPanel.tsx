import { useId } from 'react';
import { COMMODITIES } from '../data/commodities';
import { DATES } from '../data/mockPrices';
import { getCommodityAvgPriceTrend, getCommodityDailyBreakdown } from '../lib/analytics';
import { formatDate, formatRupees } from '../lib/format';
import { Icon } from './Icon';
import type { Metric } from '../data/types';

interface PriceHistoryPanelProps {
  commodityId: string;
  onCommodityChange: (id: string) => void;
  metric: Metric;
  visibleMandiCodes: Set<string>;
}

const CHART_W = 520;
const CHART_H = 130;
const PAD_TOP = 22;
const PAD_BOTTOM = 20;
const PAD_X = 10;

export function PriceHistoryPanel({ commodityId, onCommodityChange, metric, visibleMandiCodes }: PriceHistoryPanelProps) {
  const gradientId = useId();
  const trend = getCommodityAvgPriceTrend(commodityId, metric, visibleMandiCodes);
  const breakdown = getCommodityDailyBreakdown(commodityId, visibleMandiCodes);

  const nums = trend.filter((v): v is number => v !== null);
  const hasTrend = nums.length >= 2;
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 0;
  const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

  const plotW = CHART_W - PAD_X * 2;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const range = max - min || 1;
  const step = plotW / (trend.length - 1);

  const points = trend.map((v, i) => ({
    x: PAD_X + i * step,
    y: v === null ? null : PAD_TOP + plotH - ((v - min) / range) * plotH,
    v,
  }));
  const known = points.filter((p): p is { x: number; y: number; v: number } => p.y !== null);
  const linePath = known.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = known.length
    ? `${linePath} L${known[known.length - 1].x.toFixed(1)},${PAD_TOP + plotH} L${known[0].x.toFixed(1)},${PAD_TOP + plotH} Z`
    : '';

  return (
    <div className="flex w-full flex-col px-6 py-4 lg:h-full lg:overflow-y-auto">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">Price History &amp; Trend</div>
        <div className="relative">
          <select
            value={commodityId}
            onChange={(e) => onCommodityChange(e.target.value)}
            className="appearance-none rounded-sm border border-wheat/10 bg-surface py-1.5 pl-3 pr-7 text-[12px] text-wheat outline-none transition-colors duration-150 focus:border-amber"
          >
            {COMMODITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Icon name="expand_more" size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-dim" />
        </div>
      </div>

      {!hasTrend ? (
        <div className="flex flex-1 items-center justify-center text-sm text-dim">Not enough data for a trend.</div>
      ) : (
        <>
          <div className="mb-1 flex shrink-0 items-center gap-5 text-[11px]">
            <span className="text-dim">
              Low <span className="font-mono font-semibold text-wheat">{formatRupees(min)}</span>
            </span>
            <span className="text-dim">
              Avg <span className="font-mono font-semibold text-wheat">{formatRupees(avg)}</span>
            </span>
            <span className="text-dim">
              High <span className="font-mono font-semibold text-wheat">{formatRupees(max)}</span>
            </span>
            <span className="text-dim">
              · avg {metric} price across visible mandis
            </span>
          </div>

          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full shrink-0" style={{ height: CHART_H }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8A33D" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#E8A33D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
            <path
              d={linePath}
              fill="none"
              stroke="#E8A33D"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 4px rgba(232,163,61,0.5))' }}
            />
            {known.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={2.8} fill="#D9CFB8" />
                <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#D9CFB8" fontFamily="'IBM Plex Mono', monospace">
                  {Math.round(p.v).toLocaleString('en-IN')}
                </text>
              </g>
            ))}
            {DATES.map((d, i) => (
              <text
                key={d}
                x={PAD_X + i * step}
                y={CHART_H - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#6E6E72"
                fontFamily="'IBM Plex Mono', monospace"
              >
                {formatDate(d).slice(0, 3)}
              </text>
            ))}
          </svg>

          <div className="mt-3 flex-1 overflow-y-auto">
            <div className="grid grid-cols-[1fr_74px_74px_74px_60px] gap-2 border-b border-wheat/10 pb-1.5 text-[9px] font-semibold uppercase tracking-wide text-dim">
              <div>Date</div>
              <div className="text-right">Modal</div>
              <div className="text-right">Mean</div>
              <div className="text-right">Median</div>
              <div className="text-right">Mandis</div>
            </div>
            {breakdown.map((row) => (
              <div
                key={row.date}
                className="grid grid-cols-[1fr_74px_74px_74px_60px] gap-2 border-b border-wheat/5 py-1.5 font-mono text-[12px] tabular-nums"
              >
                <div className="text-wheat">{formatDate(row.date)}</div>
                <div className="text-right text-wheat">{row.avgModal !== null ? formatRupees(row.avgModal) : '—'}</div>
                <div className="text-right text-dim">{row.avgMean !== null ? formatRupees(row.avgMean) : '—'}</div>
                <div className="text-right text-dim">{row.avgMedian !== null ? formatRupees(row.avgMedian) : '—'}</div>
                <div className="text-right text-dim">{row.mandisReporting}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
