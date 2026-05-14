import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A1612',
        'ink-soft': '#3D362C',
        paper: '#F8F4ED',
        'paper-warm': '#F2EDE0',
        card: '#FFFFFF',
        'card-warm': '#FDFAF2',
        muted: '#7A6F5E',
        'muted-soft': '#A99B85',
        gold: '#B8923C',
        'gold-light': '#C9A84C',
        'gold-dark': '#8B6914',
        'gold-bg': 'rgba(201,168,76,0.06)',
        urgent: '#A14424',
        attention: '#B86A2E',
        healthy: '#5D7F4F',
        rule: 'rgba(26,22,18,0.08)',
        'rule-soft': 'rgba(26,22,18,0.04)',
        'rule-gold': 'rgba(201,168,76,0.25)',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
