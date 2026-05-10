import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { SettingsProvider } from '@/context/SettingsContext';

export const metadata: Metadata = {
  title: 'Mise — Professional Chef Toolkit',
  description: 'Recipe library, costing calculator, invoice scanning and stock management for working chefs.',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>
        <SettingsProvider>
          <head>
            <link rel="icon" type="image/svg+xml" href="/mise-favicon.svg" />
            <link rel="shortcut icon" href="/mise-favicon.svg" />
          </head>
          {children}
        </SettingsProvider>
      </AppProvider>
    </AuthProvider>
  );
}