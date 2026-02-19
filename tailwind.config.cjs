/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E879A0',   // soft pink
        secondary: '#A78BFA', // lavender
        accent: '#C4B5FD',    // light lavender
        cream: '#FFF8F0',     // warm cream background
        blush: '#FFF0F5',     // blush white for hover
        rose: {
          50: '#FFF1F2',
          100: '#FFE4E9',
          200: '#FECDD3',
          400: '#FB7185',
          500: '#F43F5E',
        },
        lavender: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"DM Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(232, 121, 160, 0.08), 0 1px 3px rgba(167, 139, 250, 0.06)',
        'glass-lg': '0 8px 40px rgba(232, 121, 160, 0.12), 0 2px 8px rgba(167, 139, 250, 0.08)',
      },
    },
  },
  plugins: [],
};
