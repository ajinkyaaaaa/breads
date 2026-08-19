/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12140F',
        surface: '#1B1D16',
        surface2: '#242619',
        wheat: '#D9CFB8',
        dim: '#8C8570',
        amber: {
          DEFAULT: '#E8A33D',
          dim: 'rgba(232,163,61,0.14)',
        },
        rust: {
          DEFAULT: '#C1502E',
          dim: 'rgba(193,80,46,0.16)',
        },
        sage: {
          DEFAULT: '#7A9B76',
          dim: 'rgba(122,155,118,0.16)',
        },
      },
      fontFamily: {
        display: ['"IBM Plex Sans Condensed"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'kpi-select': {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(217,207,184,0.35)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 4px rgba(217,207,184,0)' },
        },
        'orb-breathe': {
          '0%, 100%': { transform: 'scale(0.94)', opacity: '0.85' },
          '50%': { transform: 'scale(1.07)', opacity: '1' },
        },
        'orb-shimmer': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'bar-sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        // Irregular, unevenly-spaced stops (short blips mixed with long steady
        // stretches) so it reads as an aging neon tube, not a clean pulse.
        'neon-flicker': {
          '0%, 100%': { opacity: '1' },
          '3%': { opacity: '0.4' },
          '6%': { opacity: '1' },
          '7%': { opacity: '0.3' },
          '8%': { opacity: '1' },
          '20%': { opacity: '1' },
          '21%': { opacity: '0.5' },
          '23%': { opacity: '1' },
          '45%': { opacity: '1' },
          '46%': { opacity: '0.15' },
          '48%': { opacity: '1' },
          '70%': { opacity: '1' },
          '71%': { opacity: '0.6' },
          '72%': { opacity: '1' },
          '73%': { opacity: '0.3' },
          '74%': { opacity: '1' },
          '85%': { opacity: '1' },
          '86%': { opacity: '0.4' },
          '87%': { opacity: '1' },
        },
      },
      animation: {
        'kpi-select': 'kpi-select 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        'orb-breathe': 'orb-breathe 2.4s ease-in-out infinite',
        'orb-shimmer': 'orb-shimmer 5s linear infinite',
        'bar-sweep': 'bar-sweep 1.3s ease-in-out infinite',
        'neon-flicker': 'neon-flicker 5s linear infinite',
      },
    },
  },
  plugins: [],
};
