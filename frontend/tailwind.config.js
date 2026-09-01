/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#e8edf5',
          100: '#c5d0e6',
          200: '#9eb1d4',
          300: '#7791c2',
          400: '#5979b5',
          500: '#3c61a8',
          600: '#2e4f8e',
          700: '#233d6e',
          800: '#192c50',
          900: '#0f2a4a',
          950: '#081a30',
        },
        mustard: {
          50: '#fdf8e8',
          100: '#faeec5',
          200: '#f5dc8a',
          300: '#efca4f',
          400: '#e8b81f',
          500: '#d4a017',
          600: '#b88a13',
          700: '#916d10',
          800: '#6b510c',
          900: '#473608',
          950: '#2a2005',
        },
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        accent: {
          50: '#fdf8e8',
          500: '#d4a017',
          600: '#b88a13',
        },
      },
    },
  },
  plugins: [],
}
