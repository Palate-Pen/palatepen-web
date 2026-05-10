import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { SettingsProvider } from '@/context/SettingsContext';

export const metadata: Metadata = {
  title: 'Mise — Professional Chef Toolkit',
  description: 'Recipe library, costing calculator, invoice scanning and stock management for working chefs.',
  icons: {
    icon: [
      { url: '/mise-favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/mise-favicon.svg',
    apple: '/mise-favicon.svg',
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