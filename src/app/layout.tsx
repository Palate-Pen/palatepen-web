import type { Metadata } from 'next';
import { Lora, Cinzel, Inter } from 'next/font/google';
import './globals.css';

// Serif — Lora replaces Cormorant Garamond. Cormorant is a high-contrast
// didone-style display face; its thin strokes go faint at body sizes. Lora
// is a humanist serif designed for screens — warmer, rounder, with proper
// italics so the gold-em chef's-notebook pattern still works.
const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

// Display — Cinzel kept for the small uppercase tracking-wide labels;
// that pattern works at 8-11px and the all-caps texture is the brand.
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

// Sans — Inter replaces Jost. Inter was designed for UI at small sizes
// and reads substantially better on the paper background.
const inter = Inter({
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
      className={`${lora.variable} ${cinzel.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
