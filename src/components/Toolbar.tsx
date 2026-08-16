import { MANDIS } from '../data/mandis';
import { DATES } from '../data/mockPrices';
import { formatDate } from '../lib/format';
import { Icon } from './Icon';
import type { Metric } from '../data/types';

interface ToolbarProps {
  date: string;
  onDateChange: (date: string) => void;
  metric: Metric;
  onMetricChange: (metric: Metric) => void;
  visibleMandiCodes: Set<string>;
  onToggleMandi: (code: string) => void;
  onToggleAllMandis: () => void;
}

const METRICS: Metric[] = ['modal', 'mean', 'median'];

export function Toolbar({ date, onDateChange, metric, onMetricChange, visibleMandiCodes, onToggleMandi, onToggleAllMandis }: ToolbarProps) {
  const allVisible = visibleMandiCodes.size === MANDIS.length;

  return (
    <div className="flex items-center gap-6 overflow-x-auto border-y border-amber/25 bg-amber/[0.07] px-4 py-1">
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber">Week</span>
        <div className="flex gap-0.5">
          {DATES.map((d) => (
            <button
              key={d}
              onClick={() => onDateChange(d)}
              title={formatDate(d)}
              className={`rounded-sm px-2 py-1 font-mono text-[11px] transition-colors duration-150 ${
                d === date ? 'bg-amber text-ink' : 'text-dim hover:bg-surface2 hover:text-wheat'
              }`}
            >
              {formatDate(d).slice(0, 3)}
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
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber">Mandis</span>
        <div className="flex shrink-0 gap-1">
          {MANDIS.map((m) => {
            const active = visibleMandiCodes.has(m.code);
            return (
              <button
                key={m.code}
                onClick={() => onToggleMandi(m.code)}
                title={m.code}
                className={`flex shrink-0 items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] transition-colors duration-150 ${
                  active ? 'bg-sage-dim text-sage' : 'text-dim/60 hover:text-dim'
                }`}
              >
                {active && <Icon name="check" size={12} className="text-sage" />}
                {m.name}
              </button>
            );
          })}
        </div>
        <button onClick={onToggleAllMandis} className="ml-1 shrink-0 text-[10px] text-amber transition-colors duration-150 hover:text-wheat">
          {allVisible ? 'hide all' : 'show all'}
        </button>
      </div>
    </div>
  );
}
