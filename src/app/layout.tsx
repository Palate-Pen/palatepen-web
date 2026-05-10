import type { Metadata } from 'next';
import { Fraunces, Epilogue } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({ subsets:['latin'], weight:['300','600'], style:['normal','italic'], variable:'--font-fraunces' });
const epilogue = Epilogue({ subsets:['latin'], weight:['300','400','500','700'], variable:'--font-epilogue' });

export const metadata: Metadata = {
  title: 'Palate & Pen — Coming Soon',
  description: 'Menu design and food consultancy — by people who have actually worked the pass. Something is coming.',
  openGraph: {
    title: 'Palate & Pen — Coming Soon',
    description: 'We make your menu as good as your food.',
    url: 'https://www.palateandpen.co.uk',
    siteName: 'Palate & Pen',
    locale: 'en_GB',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${epilogue.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}