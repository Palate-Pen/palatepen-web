'use client';

import { usePathname } from 'next/navigation';
import { SignOutButton } from './SignOutButton';

const BREADCRUMBS: Record<string, string> = {
  '/admin': 'Founder Admin · Home',
  '/admin/users': 'Founder Admin · Users & Kitchens',
  '/admin/business': 'Founder Admin · Business',
  '/admin/system': 'Founder Admin · System Health',
  '/admin/content': 'Founder Admin · Content & Comms',
  '/admin/ops': 'Founder Admin · Founder Ops',
};

export function AdminTopbar({ email }: { email: string }) {
  const pathname = usePathname();
  const breadcrumb = BREADCRUMBS[pathname] ?? 'Founder Admin';

  return (
    <header className="h-[76px] bg-paper border-b border-rule flex items-center justify-between px-14 sticky top-0 z-10 flex-shrink-0">
      <div className="font-serif text-lg font-medium tracking-[0.04em] text-ink">
        {breadcrumb}
      </div>
      <div className="flex items-center gap-6">
        <div className="font-sans text-sm text-muted">
          Signed in as{' '}
          <strong className="font-semibold text-ink">{email}</strong>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
