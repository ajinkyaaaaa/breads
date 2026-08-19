interface SatelliteConfig {
  radius: number;
  duration: number;
  dotSize: number;
  reverse: boolean;
  color: string;
}

const SATELLITES: SatelliteConfig[] = [
  { radius: 0.62, duration: 3.2, dotSize: 5, reverse: false, color: '#E8A33D' },
  { radius: 0.5, duration: 4.4, dotSize: 4, reverse: true, color: '#7A9B76' },
  { radius: 0.74, duration: 5.6, dotSize: 3, reverse: false, color: '#D9CFB8' },
];

/** A soft glowing "thinking/searching" orb -- breathing amber-rust core, a
 * slow rotating specular sheen, and three satellites orbiting at different
 * radii/speeds. Self-contained (no external assets) so it works offline. */
export function SearchingOrb({ size = 128 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 animate-orb-breathe rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 30%, rgba(232,163,61,0.9), rgba(193,80,46,0.55) 45%, rgba(193,80,46,0) 72%)',
          filter: 'blur(6px)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: '18%',
          background: 'radial-gradient(circle at 38% 32%, #F4D9A0, #E8A33D 42%, #C1502E 80%)',
          boxShadow: '0 0 40px 6px rgba(232,163,61,0.45)',
        }}
      />
      <div
        className="absolute animate-orb-shimmer rounded-full opacity-60 mix-blend-screen"
        style={{
          inset: '18%',
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.55) 40deg, transparent 95deg, transparent 360deg)',
        }}
      />
      {SATELLITES.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 animate-spin"
          style={{
            animationDuration: `${s.duration}s`,
            animationDirection: s.reverse ? 'reverse' : 'normal',
            animationTimingFunction: 'linear',
          }}
        >
          <span
            className="absolute rounded-full"
            style={{
              width: s.dotSize,
              height: s.dotSize,
              top: '50%',
              left: '50%',
              marginTop: -s.dotSize / 2,
              marginLeft: -s.dotSize / 2,
              transform: `translateX(${size * s.radius}px)`,
              background: s.color,
              boxShadow: `0 0 6px ${s.color}`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
