import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  searchPlaceholder: string;
  /** Rendered inside the trigger button, before the chevron -- lets each filter keep its own text treatment (e.g. the amber "// Maharashtra" styling). */
  buttonContent: ReactNode;
  buttonClassName: string;
  panelWidthClassName?: string;
}

/** Small searchable single-select dropdown, portaled to <body> so it floats
 * above the header instead of being clipped -- same pattern as MandiPicker's
 * panel, generalized for the masthead's State/District/Market filters. */
export function FilterDropdown({
  options,
  value,
  onChange,
  searchPlaceholder,
  buttonContent,
  buttonClassName,
  panelWidthClassName = 'w-64',
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    // Widest panel any caller passes -- anchoring to the button's left edge
    // would run this off the right edge of the viewport near there, so flip
    // to right-anchored instead of overflowing.
    const estimatedWidth = 320;
    if (rect.left + estimatedWidth > window.innerWidth - 8) {
      setPanelPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    } else {
      setPanelPos({ top: rect.bottom + 6, left: rect.left });
    }
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

  function handleSelect(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className="relative shrink-0">
      <button ref={buttonRef} onClick={() => setOpen((o) => !o)} className={buttonClassName}>
        {buttonContent}
        <Icon name="expand_more" size={13} className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: panelPos.top, left: panelPos.left, right: panelPos.right }}
            className={`fixed z-30 flex max-h-80 ${panelWidthClassName} flex-col overflow-hidden rounded-sm border border-wheat/15 bg-surface2 shadow-lg`}
          >
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
                  const active = o.value === value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => handleSelect(o.value)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[12px] text-wheat transition-colors duration-150 hover:bg-surface ${
                        active ? 'font-semibold' : ''
                      }`}
                    >
                      <span className="truncate">{o.label}</span>
                      {active && <Icon name="check" size={13} className="shrink-0 text-amber" />}
                    </button>
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
