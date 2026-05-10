/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF7F2',
        paper: '#F3EFE7',
        ink: '#1A1A18',
        'ink-soft': '#3D3D39',
        mustard: '#D4A017',
        'mustard-pale': '#F5E9C0',
        teal: '#2A7D6F',
        'teal-pale': '#C8E6E1',
        coral: '#E05C3A',
        slate: '#7A7A72',
        'mise-dark': '#0E0D0B',
        'mise-gold': '#C8960A',
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        epilogue: ['Epilogue', 'sans-serif'],
      },
    },
  },
  plugins: [],
};