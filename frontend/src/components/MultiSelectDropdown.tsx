import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export interface FilterOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder: string;
  /** Shown on the closed trigger button when nothing is selected (i.e. no filter applied). */
  emptyLabel: string;
  panelWidthClassName?: string;
}

/** Multi-select dropdown: selected values show as removable tags at the top
 * of the panel, with a search + checkbox list below to add more -- same
 * portaled-panel plumbing as FilterDropdown/MandiPicker, generalized for
 * "pick any number of districts" instead of a single choice. */
export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  searchPlaceholder,
  emptyLabel,
  panelWidthClassName = 'w-72',
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPanelPos({ top: rect.bottom + 6, left: rect.left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const labelByValue = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function remove(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  const buttonLabel =
    selected.length === 0
      ? emptyLabel
      : selected.length === 1
        ? (labelByValue.get(selected[0]) ?? selected[0])
        : `${labelByValue.get(selected[0]) ?? selected[0]} +${selected.length - 1}`;

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-sm border border-wheat/15 bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-wheat transition-colors duration-150 hover:border-wheat/30 hover:bg-surface2"
      >
        <span className="max-w-[130px] truncate normal-case">{buttonLabel}</span>
        <Icon name="expand_more" size={13} className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: panelPos.top, left: panelPos.left }}
            className={`fixed z-30 flex max-h-96 ${panelWidthClassName} flex-col overflow-hidden rounded-sm border border-wheat/15 bg-surface2 shadow-lg`}
          >
            {selected.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-wheat/10 px-2.5 py-2">
                {selected.map((v) => (
                  <span
                    key={v}
                    className="flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-[11px] text-wheat"
                  >
                    {labelByValue.get(v) ?? v}
                    <button
                      onClick={() => remove(v)}
                      className="flex items-center justify-center text-dim transition-colors duration-150 hover:text-rust"
                    >
                      <Icon name="close" size={11} />
                    </button>
                  </span>
                ))}
                <button onClick={() => onChange([])} className="ml-auto shrink-0 text-[10px] text-amber transition-colors duration-150 hover:text-wheat">
                  Clear
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 border-b border-wheat/10 px-2.5 py-2">
              <Icon name="search" size={14} className="shrink-0 text-dim" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-wheat outline-none placeholder:text-dim"
              />
            </div>

            <div className="flex-1 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-[12px] text-dim">No matches</div>
              ) : (
                filtered.map((o) => {
                  const active = selected.includes(o.value);
                  return (
                    <label
                      key={o.value}
                      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] text-wheat transition-colors duration-150 hover:bg-surface"
                    >
                      <input type="checkbox" checked={active} onChange={() => toggle(o.value)} className="h-3.5 w-3.5 accent-amber" />
                      <span className={`truncate ${active ? 'font-semibold' : ''}`}>{o.label}</span>
                    </label>
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
