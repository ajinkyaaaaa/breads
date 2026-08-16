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
      },
      animation: {
        'kpi-select': 'kpi-select 160ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
