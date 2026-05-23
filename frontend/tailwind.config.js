/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A6FA5',
          50: '#EEF2F8',
          100: '#D9E2F0',
          200: '#B3C4E1',
          300: '#8DA6D2',
          400: '#6788C3',
          500: '#4A6FA5',
          600: '#3B5984',
          700: '#2C4363',
          800: '#1E2D42',
          900: '#0F1721'
        },
        cat: {
          home: '#378ADD',
          care: '#1D9E75',
          dog: '#BA7517'
        },
        warn: '#F59E0B',
        danger: '#DC2626',
        success: '#16A34A'
      },
      fontFamily: {
        system: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          'system-ui',
          'sans-serif'
        ]
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        sheet: '0 -8px 24px rgba(0,0,0,0.12)'
      },
      borderRadius: {
        '2xl': '1rem'
      },
      animation: {
        'slide-up': 'slideUp 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fadeIn 180ms ease-out'
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    }
  },
  plugins: []
};
