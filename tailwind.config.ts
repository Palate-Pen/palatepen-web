import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--ink-soft) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        'paper-warm': 'rgb(var(--paper-warm) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        'card-warm': 'rgb(var(--card-warm) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-soft': 'rgb(var(--muted-soft) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
        'gold-light': 'rgb(var(--gold-light) / <alpha-value>)',
        'gold-dark': 'rgb(var(--gold-dark) / <alpha-value>)',
        'gold-bg': 'rgb(var(--gold-bg) / var(--gold-bg-alpha))',
        urgent: 'rgb(var(--urgent) / <alpha-value>)',
        attention: 'rgb(var(--attention) / <alpha-value>)',
        healthy: 'rgb(var(--healthy) / <alpha-value>)',
        rule: 'rgb(var(--rule) / var(--rule-alpha))',
        'rule-soft': 'rgb(var(--rule) / var(--rule-soft-alpha))',
        'rule-gold': 'rgb(var(--rule-gold) / var(--rule-gold-alpha))',
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
