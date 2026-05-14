import type { Metadata } from 'next';
import { Cormorant_Garamond, Cinzel, Jost } from 'next/font/google';
import './globals.css';

// Serif — Cormorant Garamond. v8 design-system canon. Weights extended
// to 400/500/600/700 (vs original 400+600) so body weight 500 default
// and font-bold render as real weights, not browser-synthesised.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

// Display — Cinzel for small uppercase tracking-wide labels, plus the
// sidebar nav and page-title headings.
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

// Sans — Jost. Weights extended to 400/500/600/700 to back up the body
// weight 500 default.
const jost = Jost({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Palatable',
  description: 'Back office work you can stomach.',
};

// Inline script — runs before React hydrates so there's no flash of
// light mode when the user has dark mode set. Reads localStorage and
// applies the saved theme + font scale directly to <html>.
const themeBootScript = `
try {
  var t = localStorage.getItem('palatable_theme') || 'light';
  var f = localStorage.getItem('palatable_font_size') || 'md';
  var resolved = t === 'system'
    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t;
  if (resolved === 'dark') document.documentElement.classList.add('dark');
  var scale = f === 'sm' ? '0.94' : f === 'lg' ? '1.12' : '1';
  document.documentElement.style.setProperty('--font-scale', scale);
} catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${cinzel.variable} ${jost.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
