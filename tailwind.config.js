/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Layering, darkest → lightest: shell (header, gaps) → panel (sidebar) → base (content)
        shell: '#0f0e14',
        panel: '#17161e',
        base: '#1c1b24',
        // Raised elements on top of panels: menus, drawers, inputs, cards
        surface: {
          DEFAULT: '#23222c',
          card: '#23222c',
          hover: '#2b2a35',
          border: '#34323f',
        },
        // Brand lavender — used sparingly for indicators, focus and selection
        accent: {
          DEFAULT: '#a99cf6',
          dim: '#7c6ee6',
          glow: '#d4cdfb',
        },
        // Small contrast colors
        live: '#5eead4',
        muted: '#8b889c',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      boxShadow: {
        'accent': '0 0 30px rgba(169, 156, 246, 0.2)',
        'accent-lg': '0 0 50px rgba(169, 156, 246, 0.3)',
        'pink': '0 0 20px rgba(244, 114, 182, 0.3)',
        'float': '0 12px 40px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
};
