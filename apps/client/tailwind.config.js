// v 2.0 - Theme-aware colors using CSS variables

// Colours live in CSS variables (index.css) so the theme can switch at runtime.
// Tailwind can't derive an alpha from an opaque var(), so a plain string value
// silently drops every opacity modifier (bg-accent-red/10 generated nothing).
// A function value lets us pass the variable straight through for plain
// utilities and use CSS relative colour syntax to tint it for modifiers.
const token = (variable) => ({ opacityValue }) =>
  opacityValue === undefined || String(opacityValue).startsWith('var(')
    ? `var(${variable})`
    : `rgb(from var(${variable}) r g b / ${opacityValue})`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // The app toggles theme via data-theme on <html>; without this, `dark:` variants
  // would follow the OS preference instead and disagree with the in-app toggle.
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: token('--background'),
          secondary: token('--background-secondary'),
          tertiary: token('--background-tertiary'),
          hover: token('--background-hover'),
        },
        border: {
          DEFAULT: token('--border'),
          hover: token('--border-hover'),
        },
        foreground: {
          DEFAULT: token('--foreground'),
          secondary: token('--foreground-secondary'),
          muted: token('--foreground-muted'),
        },
        accent: {
          pink: token('--accent-pink'),
          purple: token('--accent-purple'),
          green: token('--accent-green'),
          blue: token('--accent-blue'),
          yellow: token('--accent-yellow'),
          red: token('--accent-red'),
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease',
        'slide-up': 'slideUp 200ms ease',
        'slide-in': 'slideIn 200ms ease',
        'slide-up-fade': 'slideUpFade 300ms ease',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideUpFade: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
