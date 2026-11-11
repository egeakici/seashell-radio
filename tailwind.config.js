/** @type {import('tailwindcss').Config} */
// Palette derived from the logo: deep navy, white, and the lavender-grays of the shell.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Layering, darkest → lightest: shell (header, gaps) → panel (sidebar) → canvas (content).
        // Note: don't name a color "base" — Tailwind's text-base (font size) would also pick it up as a color.
        shell: '#05061e', // the logo's navy — the header matches the logo background exactly
        panel: '#0b0c28',
        canvas: '#10112f',
        // Raised elements on top of panels: menus, drawers, inputs, cards
        surface: {
          DEFAULT: '#181a3a',
          card: '#181a3a',
          hover: '#20224a',
          border: '#2a2c55',
        },
        // Lavender-gray of the logo's shell — used sparingly for indicators, focus and selection
        accent: {
          DEFAULT: '#bbb4db',
          dim: '#7774a7',
          glow: '#ede5f7',
        },
        // "Live" / now-playing highlights: the shell's near-white
        live: '#ede5f7',
        muted: '#8b8aab',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      boxShadow: {
        'accent': '0 0 30px rgba(187, 180, 219, 0.18)',
        'accent-lg': '0 0 50px rgba(187, 180, 219, 0.28)',
        'float': '0 12px 40px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
};
