import{AuthProvider}from'@/context/AuthContext';
import{AppProvider}from'@/context/AppContext';
import{SettingsProvider}from'@/context/SettingsContext';
export default function AppLayout({children}:{children:React.ReactNode}){
  return <AuthProvider><AppProvider><SettingsProvider>{children}</SettingsProvider></AppProvider></AuthProvider>;
}