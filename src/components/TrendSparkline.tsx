interface TrendSparklineProps {
  values: (number | null)[];
  width?: number;
  height?: number;
}

/** A single glowing trend line with a soft area-fill — used for the week's spread-% trend inside an expanded row. */
export function TrendSparkline({ values, width = 168, height = 36 }: TrendSparklineProps) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return <div className="text-[11px] text-dim">Not enough data for a trend.</div>;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => ({
    x: i * step,
    y: v === null ? null : height - ((v - min) / range) * (height - 8) - 4,
  }));
  const known = points.filter((p): p is { x: number; y: number } => p.y !== null);
  const linePath = known.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${known[known.length - 1].x.toFixed(1)},${height} L${known[0].x.toFixed(1)},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8A33D" stopOpacity={0.32} />
          <stop offset="100%" stopColor="#E8A33D" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trend-fill)" stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke="#E8A33D"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 3px rgba(232,163,61,0.55))' }}
      />
      {known.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2} fill="#D9CFB8" />
      ))}
    </svg>
  );
}
