import { SignOutForm } from './SignOutForm';

export function Topbar({ userEmail }: { userEmail: string }) {
  return (
    <header className="h-[76px] border-b border-rule bg-paper flex items-center justify-end px-8 gap-6 flex-shrink-0">
      <span className="font-serif italic text-sm text-muted hidden md:inline">
        {userEmail}
      </span>
      <SignOutForm />
    </header>
  );
}
