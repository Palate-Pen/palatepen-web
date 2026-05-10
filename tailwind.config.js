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
        slate: '#7A7A72',
        'mise-bg': '#141210',
        'mise-surface': '#1C1A17',
        'mise-surface2': '#242118',
        'mise-surface3': '#2C2920',
        'mise-border': '#35302A',
        'mise-border-light': '#403B34',
        'mise-text': '#F0E8DC',
        'mise-dim': '#C0B8AC',
        'mise-faint': '#7A7470',
        'mise-gold': '#C8960A',
        'mise-gold-light': '#E8AE20',
        'mise-gold-dim': 'rgba(200,150,10,0.15)',
        'mise-red': '#C84040',
        'mise-green': '#4A8A5A',
        'mise-green-light': '#5AAA6A',
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        epilogue: ['Epilogue', 'sans-serif'],
      },
    },
  },
  plugins: [],
};