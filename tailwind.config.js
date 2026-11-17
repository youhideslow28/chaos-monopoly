/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#090d16',
          panel: '#111827',
          surface: '#1e293b',
          border: '#334155',
          cyan: '#06b6d4',
          neon: '#00f2fe',
          amber: '#f59e0b',
          emerald: '#10b981',
          crimson: '#f43f5e',
          purple: '#8b5cf6',
        }
      },
      fontFamily: {
        game: ['Outfit', 'Segoe UI', 'Roboto', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Outfit', 'Segoe UI', 'Roboto', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(6, 182, 212, 0.4)',
        'neon-emerald': '0 0 15px rgba(16, 185, 129, 0.4)',
        'neon-amber': '0 0 15px rgba(245, 158, 11, 0.4)',
        'neon-crimson': '0 0 15px rgba(244, 63, 94, 0.4)',
        'isometric': '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
      },
      animation: {
        'dice-shake': 'shake 0.4s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '25%': { transform: 'rotate(-10deg) scale(1.05)' },
          '75%': { transform: 'rotate(10deg) scale(0.95)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.82' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
