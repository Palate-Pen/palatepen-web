import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { SettingsProvider } from '@/context/SettingsContext';

export const metadata: Metadata = {
  title: 'Palatable — Back Office Work You Can Stomach',
  description: 'Back office work you can stomach. Recipes, costing, invoices and stock — all in one place.',
  icons: {
    icon: '/palatable-favicon.png',
    shortcut: '/palatable-favicon.png',
    apple: '/palatable-favicon.png',
  },
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