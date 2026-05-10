import type { Metadata } from 'next';
import { Fraunces, Epilogue } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({ subsets:['latin'], weight:['300','600'], style:['normal','italic'], variable:'--font-fraunces' });
const epilogue = Epilogue({ subsets:['latin'], weight:['300','400','500','700'], variable:'--font-epilogue' });

export const metadata: Metadata = {
  title: 'Palate & Pen — Menu Design & Food Consultancy',
  description: 'We make your menu as good as your food.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/pp-favicon.png" sizes="64x64" />
        <link rel="shortcut icon" href="/pp-favicon.png" />
      </head>
      <body className={`${fraunces.variable} ${epilogue.variable} bg-cream text-ink antialiased font-epilogue`}>
        {children}
      </body>
    </html>
  );
}