/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#ca0019',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
          DEFAULT: '#ca0019',
          crimson: '#ca0019',
          bright: '#ef4444',
          vivid: '#e03232',
        },
        surface: {
          darker: '#09090b',
          dark: '#0c0c0e',
          card: '#121215',
          cardAlt: '#18181b',
          hover: '#27272a',
          elevated: '#1a1a20',
          border: 'rgba(255, 255, 255, 0.08)',
          borderSubtle: '#1f1f23',
          borderBright: '#3f3f46',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Cinzel', 'Georgia', 'serif'],
        script: ['Great Vibes', 'cursive'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'glow-crimson': '0 0 25px -4px rgba(202, 0, 25, 0.45)',
        'glow-crimson-lg': '0 0 35px -2px rgba(202, 0, 25, 0.6)',
        'glow-card': '0 12px 40px -10px rgba(0, 0, 0, 0.65)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
        fadeIn: 'fadeIn 0.25s ease-out forwards',
        slideUp: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideDown: 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        scaleIn: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }
    },
  },
  plugins: [],
}
