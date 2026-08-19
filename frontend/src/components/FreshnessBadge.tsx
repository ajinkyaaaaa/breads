import type { Freshness } from '../data/types';

interface FreshnessBadgeProps {
  tier: Freshness;
  size?: number;
}

const LABEL: Record<Freshness, string> = {
  fresh: 'Reported today',
  recent: 'Synced from the day before',
  old: 'Synced more than 2 days ago',
};

const SAGE = '#7A9B76';
const WHITE = '#FFFFFF';

/** Small black square status badge with a white border: sage tick (today), white tilde (carried forward from yesterday), white burst (older than 2 days). */
export function FreshnessBadge({ tier, size = 17 }: FreshnessBadgeProps) {
  return (
    <span
      title={LABEL[tier]}
      className="inline-flex shrink-0 items-center justify-center rounded-sm border border-white bg-black"
      style={{ width: size, height: size }}
    >
      {tier === 'fresh' && (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke={SAGE} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {tier === 'recent' && <span className="text-[9px] font-bold leading-none text-white">~</span>}
      {tier === 'old' && (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1="12"
              y1="3"
              x2="12"
              y2="7.5"
              stroke={WHITE}
              strokeWidth="2.6"
              strokeLinecap="round"
              transform={`rotate(${(i * 360) / 8} 12 12)`}
            />
          ))}
        </svg>
      )}
    </span>
  );
}
