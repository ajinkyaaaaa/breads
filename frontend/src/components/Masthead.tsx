import { formatOrdinalDayMonth, formatSyncedAt, formatWeekdayShort, todayIso } from '../lib/format';
import { Icon } from './Icon';
import aarhatLogo from '../assets/aarhat-logo.png';

interface MastheadProps {
  /** Every date the archive has data for, ascending. Grows by one each day the ingest pipeline runs. */
  dates: string[];
  asOf: string | null;
  onAsOfChange: (date: string) => void;
  onOpenLocationEditor: () => void;
  /** ISO timestamp of the last successful ingest write, or null before the first sync-status fetch resolves. */
  lastSyncedAt: string | null;
  /** True when the newest archived day is older than the viewer's real "today" -- highlights the resync button. */
  isStale: boolean;
  syncing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export function Masthead({
  dates,
  asOf,
  onAsOfChange,
  onOpenLocationEditor,
  lastSyncedAt,
  isStale,
  syncing,
  onRefresh,
  onLogout,
}: MastheadProps) {
  const latestArchivedDate = dates[dates.length - 1] ?? null;

  // The date navigator can always reach today, even before the pipeline has
  // ingested anything for it yet -- landing there shows the dashboard's
  // regular empty state rather than being unreachable.
  const today = todayIso();
  const navigableDates = dates.includes(today) ? dates : [...dates, today];

  const index = asOf ? navigableDates.indexOf(asOf) : -1;
  const atEarliest = index <= 0;
  const atLatest = index === -1 || index >= navigableDates.length - 1;

  function step(delta: number) {
    const next = navigableDates[index + delta];
    if (next) onAsOfChange(next);
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-wheat/10 bg-ink px-4 py-2">
      <div className="flex items-center gap-3">
        <img src={aarhatLogo} alt="Aarhat" className="h-9 w-auto lg:h-11" />
        <span className="font-display text-xl font-semibold text-amber">आढत</span>
        <div className="ml-2 h-6 w-px bg-wheat/15" />
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-bold uppercase tracking-tight text-wheat">Mandi</span>
          <span className="font-display text-lg font-bold uppercase tracking-tight text-amber">// Maharashtra</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 gap-y-2">
        <button
          onClick={onOpenLocationEditor}
          className="flex items-center gap-1.5 rounded-sm border border-wheat/15 bg-surface px-2.5 py-1 text-[12px] font-medium uppercase tracking-wide text-wheat transition-colors duration-150 hover:border-wheat/30 hover:bg-surface2"
        >
          <Icon name="pin_drop" size={14} className="text-[#39FF14] drop-shadow-[0_0_2px_#39FF14]" />
          Locations
          <Icon name="arrow_forward" size={13} className="text-dim" />
        </button>
        {/* One status pill instead of three separate signals: an icon and a
            sentence both driven by the same fact (does the archive have
            today's date yet), plus the sync timestamp as secondary detail.
            Neutral chrome (not amber/sage-filled) so it reads as its own
            control, not a sibling of the amber "need location" button or
            the amber date pill -- only the small status icon carries color. */}
        <button
          onClick={onRefresh}
          disabled={syncing}
          title={
            isStale
              ? "You're caught up to the source, but it hasn't published today's prices yet. Click to check again."
              : 'You have the most current data available from the source. Click to check again.'
          }
          className="flex items-center gap-2 rounded-sm border border-wheat/15 bg-surface px-2.5 py-1 text-[12px] font-medium text-wheat transition-colors duration-150 hover:border-wheat/30 hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name={isStale ? 'schedule' : 'check'} size={14} className={isStale ? 'text-amber' : 'text-sage'} />
          <span className="hidden normal-case tracking-normal sm:inline">
            {syncing
              ? 'Checking for new data…'
              : latestArchivedDate
                ? `Showing ${formatOrdinalDayMonth(latestArchivedDate)}${lastSyncedAt ? ` · checked ${formatSyncedAt(lastSyncedAt)}` : ''}`
                : 'No data yet'}
          </span>
          <Icon
            name="refresh"
            size={13}
            className={`text-[#39FF14] drop-shadow-[0_0_3px_#39FF14] ${syncing ? 'animate-spin' : ''}`}
          />
        </button>

        <div className="flex items-center gap-0.5 rounded-full bg-amber py-1 pl-1.5 pr-1 shadow-[0_0_0_1px_rgba(232,163,61,0.3),0_2px_8px_rgba(232,163,61,0.35)]">
          <button
            onClick={() => step(-1)}
            disabled={atEarliest}
            className="flex h-5 w-5 items-center justify-center rounded-full text-ink/60 transition-colors duration-150 hover:text-ink disabled:opacity-30 disabled:hover:text-ink/60"
            aria-label="Previous day"
          >
            <Icon name="chevron_left" size={15} />
          </button>
          <div className="flex items-center gap-1.5 px-0.5 font-mono text-[13px] font-semibold tabular-nums text-ink">
            <Icon name="calendar_today" size={13} className="text-ink/70" />
            <span>{asOf ? `${formatWeekdayShort(asOf)}, ${formatOrdinalDayMonth(asOf)}` : '—'}</span>
          </div>
          <button
            onClick={() => step(1)}
            disabled={atLatest}
            className="flex h-5 w-5 items-center justify-center rounded-full text-ink/60 transition-colors duration-150 hover:text-ink disabled:opacity-30 disabled:hover:text-ink/60"
            aria-label="Next day"
          >
            <Icon name="chevron_right" size={15} />
          </button>
        </div>

        <button
          onClick={onLogout}
          title="Log out"
          className="flex items-center gap-1.5 rounded-sm border border-wheat/15 bg-surface px-2.5 py-1 text-[12px] font-medium uppercase tracking-wide text-wheat transition-colors duration-150 hover:border-rust/40 hover:text-rust"
        >
          <Icon name="logout" size={14} className="text-rust" />
          Log Out
        </button>
      </div>
    </header>
  );
}
