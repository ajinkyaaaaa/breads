/** Full-screen blocking overlay shown while a manual resync is in flight --
 * kept up for a minimum duration by the caller so it doesn't just flash. */
export function SyncOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-ink/97 backdrop-blur-sm">
      <span className="h-2.5 w-2.5 animate-orb-breathe rounded-full bg-amber shadow-[0_0_18px_4px_rgba(232,163,61,0.5)]" />
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-wheat">Syncing latest prices</span>
        <span className="text-[11px] text-dim">Fetching today's mandi prices across Maharashtra…</span>
      </div>
      <div className="h-[3px] w-48 overflow-hidden rounded-full bg-surface2">
        <div className="h-full w-1/3 animate-bar-sweep rounded-full bg-gradient-to-r from-transparent via-amber to-transparent" />
      </div>
    </div>
  );
}
