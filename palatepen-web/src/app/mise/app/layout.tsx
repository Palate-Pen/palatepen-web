import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';

export default function MiseAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>
        {children}
      </AppProvider>
    </AuthProvider>
  );
}