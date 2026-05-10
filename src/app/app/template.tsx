'use client';
import { useEffect } from 'react';

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Override favicon for Mise app
    const existing = document.querySelectorAll("link[rel*='icon']");
    existing.forEach(el => el.remove());
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = '/mise-favicon.png';
    document.head.appendChild(link);
    const shortcut = document.createElement('link');
    shortcut.rel = 'shortcut icon';
    shortcut.href = '/mise-favicon.png';
    document.head.appendChild(shortcut);
  }, []);
  return <>{children}</>;
}