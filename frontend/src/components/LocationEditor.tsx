import { useEffect, useState } from 'react';
import { fetchMarkets, updateMarketLocation, type ApiMarket } from '../lib/api';
import { toMandi } from '../lib/analytics';
import type { Mandi } from '../data/types';
import { Icon } from './Icon';

interface LocationEditorProps {
  open: boolean;
  onClose: () => void;
  onGeocoded: (mandi: Mandi) => void;
}

interface Draft {
  lat: string;
  lon: string;
  displayName: string;
}

function isValidLat(v: number): boolean {
  return Number.isFinite(v) && v >= -90 && v <= 90;
}

function isValidLon(v: number): boolean {
  return Number.isFinite(v) && v >= -180 && v <= 180;
}

export function LocationEditor({ open, onClose, onGeocoded }: LocationEditorProps) {
  const [pending, setPending] = useState<ApiMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetchMarkets(true)
      .then((markets) => {
        setPending(markets);
        setDrafts(Object.fromEntries(markets.map((m) => [m.id, { lat: '', lon: '', displayName: m.display_name ?? '' }])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load pending markets'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  function updateDraft(marketId: number, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [marketId]: { ...prev[marketId], ...patch } }));
  }

  async function handleSave(market: ApiMarket) {
    const draft = drafts[market.id];
    const lat = Number(draft.lat);
    const lon = Number(draft.lon);
    if (!isValidLat(lat) || !isValidLon(lon)) {
      setError(`${market.market_name}: enter a valid latitude (-90..90) and longitude (-180..180)`);
      return;
    }
    setError(null);
    setSavingId(market.id);
    try {
      const updated = await updateMarketLocation(market.id, { lat, lon, display_name: draft.displayName || undefined });
      setPending((prev) => prev.filter((m) => m.id !== market.id));
      onGeocoded(toMandi({ ...updated, lat: updated.lat!, lon: updated.lon! }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save location');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-sm border border-wheat/15 bg-surface2 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-wheat/10 px-5 py-3">
          <div>
            <div className="text-sm font-semibold text-wheat">Geocode Pending Markets</div>
            <div className="mt-0.5 text-[11px] text-dim">
              New markets discovered by ingest with no known location yet — excluded from the dashboard until geocoded.
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-dim transition-colors duration-150 hover:text-wheat" aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        {error && <div className="border-b border-rust/30 bg-rust-dim px-5 py-2 text-[11px] text-rust">{error}</div>}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-dim">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="py-8 text-center text-sm text-dim">Nothing pending — every known market has a location.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map((market) => {
                const draft = drafts[market.id] ?? { lat: '', lon: '', displayName: '' };
                const lat = Number(draft.lat);
                const lon = Number(draft.lon);
                const canSave = draft.lat.trim() !== '' && draft.lon.trim() !== '' && isValidLat(lat) && isValidLon(lon);

                return (
                  <div key={market.id} className="rounded-sm border border-wheat/10 bg-surface px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-wheat">{market.market_name}</div>
                        <div className="text-[10px] text-dim">
                          {market.district} · first seen {market.first_seen_date}
                        </div>
                      </div>
                      {canSave && (
                        <a
                          href={`https://www.google.com/maps?q=${lat},${lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-1 text-[10px] text-amber transition-colors duration-150 hover:text-wheat"
                        >
                          Verify on map
                          <Icon name="open_in_new" size={11} />
                        </a>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        placeholder="Latitude"
                        value={draft.lat}
                        onChange={(e) => updateDraft(market.id, { lat: e.target.value })}
                        className="w-28 rounded-sm border border-wheat/10 bg-ink px-2 py-1 font-mono text-[12px] text-wheat outline-none focus:border-amber"
                      />
                      <input
                        placeholder="Longitude"
                        value={draft.lon}
                        onChange={(e) => updateDraft(market.id, { lon: e.target.value })}
                        className="w-28 rounded-sm border border-wheat/10 bg-ink px-2 py-1 font-mono text-[12px] text-wheat outline-none focus:border-amber"
                      />
                      <input
                        placeholder="Display name (optional)"
                        value={draft.displayName}
                        onChange={(e) => updateDraft(market.id, { displayName: e.target.value })}
                        className="min-w-0 flex-1 rounded-sm border border-wheat/10 bg-ink px-2 py-1 text-[12px] text-wheat outline-none focus:border-amber"
                      />
                      <button
                        onClick={() => handleSave(market)}
                        disabled={!canSave || savingId === market.id}
                        className="shrink-0 rounded-sm bg-amber px-3 py-1 text-[11px] font-semibold text-ink transition-opacity duration-150 disabled:opacity-30"
                      >
                        {savingId === market.id ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
