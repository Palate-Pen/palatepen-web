import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { SettingsProvider } from '@/context/SettingsContext';

export const metadata: Metadata = {
  title: 'Palatable — Back Office Work You Can Stomach',
  description: 'Back office work you can stomach. Recipes, costing, invoices and stock — all in one place.',
  // Favicon inherits from the root layout, which uses the App Router auto
  // convention at src/app/icon.svg. Don't override here or it'll point at
  // the stale palatable-favicon.png.
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </AppProvider>
    </AuthProvider>
  );
}