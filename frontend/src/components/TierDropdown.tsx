import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

const TIER_LETTERS = ['A', 'B', 'C'] as const;
const TIER_HINT = ['cheapest buy', '2nd cheapest buy', '3rd cheapest buy'] as const;

interface TierDropdownProps {
  /** How many tiers this commodity actually has (1-3) -- fewer than 3 markets reporting means fewer tiers. */
  tierCount: number;
  value: number;
  onChange: (index: number) => void;
}

/** Per-card tier picker (A/B/C) -- same floating-menu pattern as TopNDropdown.
 * Renders nothing when there's only one tier, since there'd be nothing to pick. */
export function TierDropdown({ tierCount, value, onChange }: TierDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (tierCount <= 1) return null;

  return (
    <div ref={ref} className="relative inline-flex shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={`Tier ${TIER_LETTERS[value]} · ${TIER_HINT[value]}`}
        className="flex items-center gap-0.5 rounded-sm border border-amber/25 bg-amber/[0.07] px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber outline-none transition-colors duration-150 hover:bg-amber/[0.14]"
      >
        {TIER_LETTERS[value]}
        <Icon name="expand_more" size={10} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-36 overflow-hidden rounded-lg border border-wheat/15 bg-surface2 py-1 shadow-lg">
          {Array.from({ length: tierCount }, (_, i) => (
            <button
              key={i}
              onClick={() => {
                onChange(i);
                setOpen(false);
              }}
              className={`flex w-full items-baseline gap-1.5 px-3 py-1.5 text-left transition-colors duration-100 ${
                i === value ? 'bg-amber/10' : 'hover:bg-surface'
              }`}
            >
              <span className={`font-mono text-[12px] font-bold ${i === value ? 'text-amber' : 'text-wheat'}`}>{TIER_LETTERS[i]}</span>
              <span className="text-[10px] text-dim">{TIER_HINT[i]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
