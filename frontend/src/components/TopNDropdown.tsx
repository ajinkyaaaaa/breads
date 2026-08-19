import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

interface TopNDropdownProps {
  value: number;
  options: number[];
  onChange: (n: number) => void;
}

/** The inline "Top N" number in the section title -- a real floating menu
 * (trigger + panel), not a native <select>, styled to match the app rather
 * than the browser's OS-default dropdown chrome. */
export function TopNDropdown({ value, options, onChange }: TopNDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Number of opportunities to show"
        className="flex items-center gap-0.5 rounded-sm px-0.5 font-mono text-[12px] font-bold tracking-normal text-amber outline-none transition-colors duration-150 hover:text-wheat"
      >
        {value}
        <Icon name="expand_more" size={11} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-16 overflow-hidden rounded-lg border border-wheat/15 bg-surface2 py-1 shadow-lg">
          {options.map((n) => (
            <button
              key={n}
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left font-mono text-[12px] transition-colors duration-100 ${
                n === value ? 'bg-amber/10 font-bold text-amber' : 'text-wheat hover:bg-surface'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
