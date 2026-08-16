interface IconProps {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
}

/** Material Symbols glyph — the actual Material Design icon set (subsetted via Google Fonts, no @mui/icons-material weight). */
export function Icon({ name, className = '', size = 20, filled = false }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined select-none leading-none ${className}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 500, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  );
}
