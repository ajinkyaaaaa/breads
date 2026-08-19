import type { Mandi, Metric, PriceUnit } from '../data/types';
import { unitConversionTooltip, unitLabel } from '../lib/format';
import { MandiPicker } from './MandiPicker';

interface ToolbarProps {
  mandis: Mandi[];
  metric: Metric;
  onMetricChange: (metric: Metric) => void;
  windowDays: number;
  onWindowDaysChange: (days: number) => void;
  priceUnit: PriceUnit;
  onPriceUnitChange: (unit: PriceUnit) => void;
  visibleMandiCodes: Set<string>;
  onToggleMandi: (code: string) => void;
  onSetMandiVisibility: (codes: string[], visible: boolean) => void;
  onToggleAllMandis: () => void;
}

const METRICS: Metric[] = ['modal', 'min', 'max'];
const WINDOW_OPTIONS = [1, 2, 3, 4, 5];
const PRICE_UNITS: PriceUnit[] = ['quintal', 'kg'];

export function Toolbar({
  mandis,
  metric,
  onMetricChange,
  windowDays,
  onWindowDaysChange,
  priceUnit,
  onPriceUnitChange,
  visibleMandiCodes,
  onToggleMandi,
  onSetMandiVisibility,
  onToggleAllMandis,
}: ToolbarProps) {
  return (
    <div className="mb-1.5 flex items-center gap-6 overflow-x-auto border-y border-amber/25 bg-amber/[0.07] px-4 py-1">
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber" title="How many days back to carry forward a mandi's last reported price if it hasn't reported today">
          Window
        </span>
        <div className="flex gap-0.5 rounded-sm bg-ink p-0.5">
          {WINDOW_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => onWindowDaysChange(n)}
              className={`rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 ${
                n === windowDays ? 'bg-surface2 text-wheat' : 'text-dim hover:text-wheat'
              }`}
            >
              {n}d
            </button>
          ))}
        </div>
      </div>

      <div className="h-4 w-px shrink-0 bg-wheat/10" />

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber">Metric</span>
        <div className="flex gap-0.5 rounded-sm bg-ink p-0.5">
          {METRICS.map((m) => (
            <button
              key={m}
              onClick={() => onMetricChange(m)}
              className={`rounded-sm px-2.5 py-1 text-[11px] font-medium capitalize transition-colors duration-150 ${
                m === metric ? 'bg-surface2 text-wheat' : 'text-dim hover:text-wheat'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="h-4 w-px shrink-0 bg-wheat/10" />

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber">Unit</span>
        <div className="flex gap-0.5 rounded-sm bg-ink p-0.5">
          {PRICE_UNITS.map((u) => (
            <button
              key={u}
              onClick={() => onPriceUnitChange(u)}
              title={unitConversionTooltip(u)}
              className={`rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 ${
                u === priceUnit ? 'bg-surface2 text-wheat' : 'text-dim hover:text-wheat'
              }`}
            >
              {unitLabel(u)}
            </button>
          ))}
        </div>
      </div>

      <div className="h-4 w-px shrink-0 bg-wheat/10" />

      <MandiPicker
        mandis={mandis}
        visibleMandiCodes={visibleMandiCodes}
        onToggleMandi={onToggleMandi}
        onSetMandiVisibility={onSetMandiVisibility}
        onToggleAllMandis={onToggleAllMandis}
      />
    </div>
  );
}
