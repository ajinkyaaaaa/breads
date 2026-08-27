import { useMemo } from 'react';
import { formatOrdinalDayMonth, formatSyncedAt } from '../lib/format';
import { Icon } from './Icon';
import { FilterDropdown } from './FilterDropdown';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { DateNavigator } from './DateNavigator';
import { ThemeToggle } from './ThemeToggle';
import aarhatLogo from '../assets/aarhat-logo.png';
import type { Mandi } from '../data/types';

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
  mandis: Mandi[];
  selectedDistricts: string[];
  onDistrictsChange: (districts: string[]) => void;
}

const STATE_OPTIONS = [{ value: 'Maharashtra', label: 'Maharashtra' }];

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
  mandis,
  selectedDistricts,
  onDistrictsChange,
}: MastheadProps) {
  const latestArchivedDate = dates[dates.length - 1] ?? null;

  const districtOptions = useMemo(
    () => Array.from(new Set(mandis.map((m) => m.taluka))).sort().map((d) => ({ value: d, label: d })),
    [mandis],
  );

  return (
    <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-wheat/10 bg-ink px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <img src={aarhatLogo} alt="Aarhat" className="h-9 w-auto shrink-0 lg:h-11" />
        <span className="font-display text-xl font-semibold text-amber">आढत</span>
        <div className="ml-2 h-6 w-px shrink-0 bg-wheat/15" />
        <span className="shrink-0 font-display text-lg font-bold uppercase tracking-tight text-wheat">Mandi</span>

        <FilterDropdown
          options={STATE_OPTIONS}
          value="Maharashtra"
          onChange={() => {}}
          searchPlaceholder="Search state…"
          buttonContent={<span className="font-display text-lg font-bold uppercase tracking-tight text-amber">// Maharashtra</span>}
          buttonClassName="flex items-center gap-1 transition-opacity duration-150 hover:opacity-80"
          panelWidthClassName="w-56"
        />

        <MultiSelectDropdown
          options={districtOptions}
          selected={selectedDistricts}
          onChange={onDistrictsChange}
          searchPlaceholder="Search district…"
          emptyLabel="All Districts"
          panelWidthClassName="w-72"
        />
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

        <DateNavigator dates={dates} asOf={asOf} onAsOfChange={onAsOfChange} />

        <ThemeToggle />

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
