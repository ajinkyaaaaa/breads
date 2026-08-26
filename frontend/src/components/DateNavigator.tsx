import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatOrdinalDayMonth, formatWeekdayShort, todayIso } from '../lib/format';
import { Icon } from './Icon';

interface DateNavigatorProps {
  /** Every date the archive successfully fetched data for -- gets the green dot. */
  dates: string[];
  asOf: string | null;
  onAsOfChange: (date: string) => void;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface GridCell {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
}

function buildGrid(viewYear: number, viewMonth: number): GridCell[] {
  const firstOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const cells: GridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(Date.UTC(viewYear, viewMonth, 1 - startWeekday + i));
    const y = cellDate.getUTCFullYear();
    const m = cellDate.getUTCMonth();
    const d = cellDate.getUTCDate();
    cells.push({
      iso: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      day: d,
      inCurrentMonth: m === viewMonth,
    });
  }
  return cells;
}

function monthLabel(viewYear: number, viewMonth: number): string {
  return new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Replaces the old prev/next-day chevrons with a calendar-icon trigger that
 * opens a month grid -- lets the viewer jump straight to any day instead of
 * stepping through the archive chronologically. Days the pipeline actually
 * fetched (present in `dates`) get a small green dot; every other day (a
 * weekend the mandis were closed, a day the pipeline skipped, etc.) doesn't. */
export function DateNavigator({ dates, asOf, onAsOfChange }: DateNavigatorProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  const datesSet = new Set(dates);
  const today = todayIso();

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const anchor = asOf ?? today;
    const [y, m] = anchor.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    const rect = buttonRef.current.getBoundingClientRect();
    setPanelPos({ top: rect.bottom + 6, left: rect.left });
  }, [open, asOf, today]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(d.getUTCFullYear());
    setViewMonth(d.getUTCMonth());
  }

  function selectDay(iso: string) {
    if (iso > today) return;
    onAsOfChange(iso);
    setOpen(false);
  }

  const cells = viewYear ? buildGrid(viewYear, viewMonth) : [];

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose date"
        className="flex items-center gap-1.5 rounded-full bg-amber py-1 pl-2.5 pr-1.5 font-mono text-[13px] font-semibold tabular-nums text-ink shadow-[0_0_0_1px_rgba(232,163,61,0.3),0_2px_8px_rgba(232,163,61,0.35)] transition-opacity duration-150 hover:opacity-90"
      >
        <Icon name="calendar_today" size={13} className="text-ink/70" />
        <span>{asOf ? `${formatWeekdayShort(asOf)}, ${formatOrdinalDayMonth(asOf)}` : '—'}</span>
        <Icon name="expand_more" size={14} className={`text-ink/60 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: panelPos.top, left: panelPos.left }}
            className="fixed z-30 w-72 rounded-sm border border-wheat/15 bg-surface2 p-3 shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <button onClick={() => shiftMonth(-1)} className="flex h-6 w-6 items-center justify-center rounded-sm text-dim transition-colors duration-150 hover:bg-surface hover:text-wheat">
                <Icon name="chevron_left" size={15} />
              </button>
              <span className="text-[12px] font-semibold uppercase tracking-wide text-wheat">{viewYear ? monthLabel(viewYear, viewMonth) : ''}</span>
              <button onClick={() => shiftMonth(1)} className="flex h-6 w-6 items-center justify-center rounded-sm text-dim transition-colors duration-150 hover:bg-surface hover:text-wheat">
                <Icon name="chevron_right" size={15} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {WEEKDAY_LABELS.map((w, i) => (
                <div key={i} className="flex h-6 items-center justify-center text-[10px] font-semibold uppercase text-dim">
                  {w}
                </div>
              ))}
              {cells.map((cell) => {
                const disabled = cell.iso > today;
                const selected = cell.iso === asOf;
                const isToday = cell.iso === today;
                const fetched = datesSet.has(cell.iso);
                return (
                  <button
                    key={cell.iso}
                    onClick={() => selectDay(cell.iso)}
                    disabled={disabled}
                    className={`relative flex h-8 flex-col items-center justify-center rounded-sm text-[12px] transition-colors duration-150 ${
                      disabled
                        ? 'cursor-not-allowed text-dim/25'
                        : !cell.inCurrentMonth
                          ? 'text-dim/40 hover:bg-surface hover:text-wheat'
                          : 'text-wheat hover:bg-surface'
                    } ${selected ? 'bg-amber font-semibold text-ink hover:bg-amber' : ''} ${isToday && !selected ? 'ring-1 ring-inset ring-amber/40' : ''}`}
                  >
                    {cell.day}
                    {fetched && !selected && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-sage" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 flex items-center gap-1.5 border-t border-wheat/10 pt-2 text-[10px] text-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" />
              Data fetched
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
