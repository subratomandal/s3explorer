// v 1.0
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'hsl(250, 24%, 9%)',
          secondary: 'hsl(250, 21%, 11%)',
          tertiary: 'hsl(250, 18%, 14%)',
          hover: 'hsl(250, 18%, 16%)',
        },
        border: {
          DEFAULT: 'hsl(250, 15%, 20%)',
          hover: 'hsl(250, 15%, 28%)',
        },
        foreground: {
          DEFAULT: 'hsl(0, 0%, 100%)',
          secondary: 'hsl(250, 10%, 70%)',
          muted: 'hsl(250, 10%, 50%)',
        },
        accent: {
          pink: '#C049FF',
          purple: '#9333EA',
          green: '#4ADE80',
          blue: '#3B82F6',
          yellow: '#FACC15',
          red: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease',
        'slide-up': 'slideUp 200ms ease',
        'slide-in': 'slideIn 200ms ease',
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
      },
    },
  },
  plugins: [],
};
