/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          500: '#4361ee',
          600: '#3451d1',
          700: '#2541b2',
        },
      },
    },
  },
  plugins: [],
};
