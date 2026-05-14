import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A1612',
        paper: '#F8F4ED',
        card: '#FFFFFF',
        muted: '#7A6F5E',
        'muted-soft': '#A99B85',
        gold: '#B8923C',
        'gold-bg': 'rgba(201,168,76,0.06)',
        urgent: '#A14424',
        attention: '#B86A2E',
        healthy: '#5D7F4F',
        rule: 'rgba(26,22,18,0.08)',
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
