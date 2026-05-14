import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    // Lock the type scale (overrides Tailwind defaults). Every text- class
    // resolves to a rem value so the user's --font-scale multiplier on
    // <html> (Settings → Text Size: sm/md/lg) scales every text in the
    // app, not just the few that happened to use named tokens before.
    fontSize: {
      xs:   ['0.75rem',   { lineHeight: '1.4' }],   // 12px — micro labels, sub-meta
      sm:   ['0.875rem',  { lineHeight: '1.45' }],  // 14px — body small, table cells
      base: ['1rem',      { lineHeight: '1.55' }],  // 16px — default body
      lg:   ['1.125rem',  { lineHeight: '1.45' }],  // 18px — card titles, page sub
      xl:   ['1.375rem',  { lineHeight: '1.35' }],  // 22px — section heads, ahead-card headlines
      '2xl':['1.75rem',   { lineHeight: '1.2' }],   // 28px — small KPI numbers
      '3xl':['2.25rem',   { lineHeight: '1.1' }],   // 36px — hero KPI numbers (Home only)
      '4xl':['2.75rem',   { lineHeight: '1.05' }],  // 44px — page titles
      '5xl':['3.5rem',    { lineHeight: '1' }],     // 56px — hero only (reserved)
    },
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
