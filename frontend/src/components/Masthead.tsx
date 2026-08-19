import { useEffect, useRef, useState } from 'react';
import { formatOrdinalDayMonth, formatSyncedAt, formatWeekdayShort } from '../lib/format';
import { Icon } from './Icon';
import aarhatLogo from '../assets/aarhat-logo.png';

interface MastheadProps {
  /** Every date the archive has data for, ascending. Grows by one each day the ingest pipeline runs. */
  dates: string[];
  asOf: string | null;
  onAsOfChange: (date: string) => void;
  pendingGeocodeCount: number;
  onOpenLocationEditor: () => void;
  /** ISO timestamp of the last successful ingest write, or null before the first sync-status fetch resolves. */
  lastSyncedAt: string | null;
  /** True when the newest archived day is older than the viewer's real "today" -- highlights the resync button. */
  isStale: boolean;
  syncing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

const DAY_PRICES_URL = 'https://agmarknet.gov.in/home';
const INTRADAY_SOURCE = 'eNAM app/website scraping';

export function Masthead({
  dates,
  asOf,
  onAsOfChange,
  pendingGeocodeCount,
  onOpenLocationEditor,
  lastSyncedAt,
  isStale,
  syncing,
  onRefresh,
  onLogout,
}: MastheadProps) {
  const index = asOf ? dates.indexOf(asOf) : -1;
  const atEarliest = index <= 0;
  const atLatest = index === -1 || index >= dates.length - 1;

  function step(delta: number) {
    const next = dates[index + delta];
    if (next) onAsOfChange(next);
  }

  const [openMenu, setOpenMenu] = useState<'day' | 'intraday' | null>(null);
  const sourceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-wheat/10 bg-ink px-4 py-2">
      <div className="flex items-center gap-3">
        <img src={aarhatLogo} alt="Aarhat" className="h-9 w-auto lg:h-11" />
        <span className="font-display text-base font-semibold text-amber">आढत</span>
        <div className="h-6 w-px bg-wheat/15" />
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-bold uppercase tracking-tight text-wheat">Mandi</span>
          <span className="font-display text-lg font-bold uppercase tracking-tight text-amber">// Maharashtra</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 gap-y-2">
        <div ref={sourceMenuRef} className="flex items-center gap-1.5">
          <div className="relative">
            <button
              onClick={() => setOpenMenu((m) => (m === 'day' ? null : 'day'))}
              className={`flex items-center gap-1 rounded-sm border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors duration-150 ${
                openMenu === 'day' ? 'border-amber/40 bg-surface2 text-wheat' : 'border-wheat/15 bg-surface text-dim hover:border-amber/30 hover:text-wheat'
              }`}
            >
              Day Prices
              <Icon name="expand_more" size={12} className={`transition-transform duration-150 ${openMenu === 'day' ? 'rotate-180' : ''}`} />
            </button>
            {openMenu === 'day' && (
              <div className="absolute left-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-sm border border-wheat/15 bg-surface2 shadow-lg">
                <a
                  href={DAY_PRICES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-wheat transition-colors duration-150 hover:bg-surface"
                >
                  data.gov.in
                  <Icon name="open_in_new" size={13} className="shrink-0 text-amber" />
                </a>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenMenu((m) => (m === 'intraday' ? null : 'intraday'))}
              title={INTRADAY_SOURCE}
              className={`flex items-center gap-1 rounded-sm border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors duration-150 ${
                openMenu === 'intraday' ? 'border-amber/40 bg-surface2 text-wheat' : 'border-wheat/15 bg-surface text-dim hover:border-amber/30 hover:text-wheat'
              }`}
            >
              Intra Day Prices
              <Icon name="expand_more" size={12} className={`transition-transform duration-150 ${openMenu === 'intraday' ? 'rotate-180' : ''}`} />
            </button>
            {openMenu === 'intraday' && (
              <div className="absolute left-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-sm border border-wheat/15 bg-surface2 shadow-lg">
                <div className="px-3 py-2 text-[11px] text-dim" title={INTRADAY_SOURCE}>
                  {INTRADAY_SOURCE}
                </div>
              </div>
            )}
          </div>
        </div>

        {pendingGeocodeCount > 0 && (
          <button
            onClick={onOpenLocationEditor}
            className="flex items-center gap-1.5 rounded-sm border border-amber/40 bg-amber/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-amber transition-colors duration-150 hover:bg-amber/20"
          >
            <Icon name="pin_drop" size={13} />
            {pendingGeocodeCount} need{pendingGeocodeCount === 1 ? 's' : ''} location
          </button>
        )}
        <span className="rounded-sm bg-sage-dim px-2 py-1 text-[10px] uppercase tracking-wide text-sage">Live</span>

        {lastSyncedAt && (
          <span className="hidden text-[10px] text-dim sm:inline" title={new Date(lastSyncedAt).toString()}>
            Synced {formatSyncedAt(lastSyncedAt)}
          </span>
        )}

        <button
          onClick={onRefresh}
          disabled={syncing}
          title={
            isStale
              ? 'Dashboard is showing an older day than today — resync for the latest prices'
              : 'Resync with the live source'
          }
          className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
            isStale
              ? 'animate-pulse border-rust/50 bg-rust/10 text-rust hover:bg-rust/20'
              : 'border-wheat/15 bg-surface text-dim hover:border-amber/30 hover:text-wheat'
          }`}
        >
          <Icon name="refresh" size={13} className={syncing ? 'animate-spin' : ''} />
          {isStale ? 'Resync' : 'Refresh'}
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
          <div className="flex items-center gap-1.5 px-0.5 font-mono text-[12px] font-semibold tabular-nums text-ink">
            <Icon name="calendar_today" size={12} className="text-ink/70" />
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
          className="flex items-center gap-1.5 rounded-sm border border-wheat/15 bg-surface px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-dim transition-colors duration-150 hover:border-rust/40 hover:text-rust"
        >
          <Icon name="logout" size={13} />
          Log Out
        </button>
      </div>
    </header>
  );
}
