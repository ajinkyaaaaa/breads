import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Mandi } from '../data/types';
import { Icon } from './Icon';

interface MandiPickerProps {
  mandis: Mandi[];
  visibleMandiCodes: Set<string>;
  onToggleMandi: (code: string) => void;
  onSetMandiVisibility: (codes: string[], visible: boolean) => void;
  onToggleAllMandis: () => void;
}

export function MandiPicker({ mandis, visibleMandiCodes, onToggleMandi, onSetMandiVisibility, onToggleAllMandis }: MandiPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  // The panel is portaled to <body> -- the toolbar it lives in has overflow-x-auto,
  // which per the CSS spec forces overflow-y to clip too, so an absolutely
  // positioned dropdown inside it gets cut off instead of floating above the page.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPanelPos({ top: rect.bottom + 6, left: rect.left });
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const byDistrict = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? mandis.filter((m) => m.name.toLowerCase().includes(q) || m.taluka.toLowerCase().includes(q)) : mandis;

    const groups = new Map<string, Mandi[]>();
    for (const m of filtered) {
      const list = groups.get(m.taluka) ?? [];
      list.push(m);
      groups.set(m.taluka, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [mandis, query]);

  const allVisible = mandis.length > 0 && visibleMandiCodes.size === mandis.length;

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 ${
          open ? 'border-amber/40 bg-surface2 text-wheat' : 'border-wheat/15 bg-ink text-dim hover:border-amber/30 hover:text-wheat'
        }`}
      >
        <span className="font-bold uppercase tracking-wide text-amber">Mandis</span>
        {visibleMandiCodes.size}/{mandis.length}
        <Icon name="expand_more" size={13} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: panelPos.top, left: panelPos.left }}
            className="fixed z-30 flex max-h-96 w-80 flex-col overflow-hidden rounded-sm border border-wheat/15 bg-surface2 shadow-lg"
          >
            <div className="flex items-center gap-2 border-b border-wheat/10 px-2.5 py-2">
              <Icon name="search" size={14} className="shrink-0 text-dim" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search district or mandi…"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-wheat outline-none placeholder:text-dim"
              />
              <button onClick={onToggleAllMandis} className="shrink-0 text-[10px] text-amber transition-colors duration-150 hover:text-wheat">
                {allVisible ? 'hide all' : 'show all'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {byDistrict.length === 0 ? (
                <div className="px-3 py-4 text-center text-[12px] text-dim">No mandis match "{query}"</div>
              ) : (
                byDistrict.map(([district, list]) => {
                  const districtCodes = list.map((m) => m.code);
                  const allInDistrictVisible = districtCodes.every((c) => visibleMandiCodes.has(c));
                  return (
                    <div key={district} className="border-b border-wheat/5 px-2.5 py-1.5">
                      <div className="flex items-center justify-between py-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-dim">{district}</span>
                        <button
                          onClick={() => onSetMandiVisibility(districtCodes, !allInDistrictVisible)}
                          className="text-[9px] text-amber/80 transition-colors duration-150 hover:text-amber"
                        >
                          {allInDistrictVisible ? 'clear' : 'all'}
                        </button>
                      </div>
                      <div className="flex flex-col">
                        {list.map((m) => {
                          const active = visibleMandiCodes.has(m.code);
                          return (
                            <label
                              key={m.code}
                              className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-[12px] transition-colors duration-150 hover:bg-surface"
                            >
                              <input type="checkbox" checked={active} onChange={() => onToggleMandi(m.code)} className="accent-amber" />
                              <span className={active ? 'text-wheat' : 'text-dim/70'}>{m.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
