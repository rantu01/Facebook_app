/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { brand: { 500: '#4f46e5', 600: '#4338ca' } },
    },
  },
  plugins: [],
};
