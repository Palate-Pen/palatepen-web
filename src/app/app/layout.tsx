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
            <link rel="icon" type="image/png" href="/mise-favicon.png" sizes="64x64" />
            <link rel="shortcut icon" href="/mise-favicon.png" />
          </head>
          {children}
        </SettingsProvider>
      </AppProvider>
    </AuthProvider>
  );
}