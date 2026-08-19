import { SearchingOrb } from './SearchingOrb';

/** Full-screen blocking overlay shown while a manual resync is in flight --
 * kept up for a minimum duration by the caller so it doesn't just flash. */
export function SyncOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink/97 backdrop-blur-sm">
      <SearchingOrb size={132} />
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-wheat">Syncing live prices</span>
        <span className="text-[11px] text-dim">Pulling the latest Agmarknet snapshot for Maharashtra…</span>
      </div>
    </div>
  );
}
