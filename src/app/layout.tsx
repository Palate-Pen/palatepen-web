import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
