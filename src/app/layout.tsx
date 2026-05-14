import type { Metadata } from 'next';
import { Cormorant_Garamond, Cinzel, Jost } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-display',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Palatable',
  description: 'Back office work you can stomach.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${cinzel.variable} ${jost.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
