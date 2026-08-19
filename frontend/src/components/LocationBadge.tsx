import { Icon } from './Icon';

interface LocationBadgeProps {
  hasLocation: boolean;
  size?: number;
}

/** Small black square badge with a white border, showing whether this mandi has a known lat/lon on file. */
export function LocationBadge({ hasLocation, size = 17 }: LocationBadgeProps) {
  return (
    <span
      title={hasLocation ? 'Location on file' : 'Not yet geocoded'}
      className="inline-flex shrink-0 items-center justify-center rounded-sm border border-white bg-black"
      style={{ width: size, height: size }}
    >
      <Icon name="pin_drop" size={size * 0.62} filled={hasLocation} className={hasLocation ? 'text-sage' : 'text-dim'} />
    </span>
  );
}
