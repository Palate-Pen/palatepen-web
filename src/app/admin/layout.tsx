import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { SidebarStateProvider } from '@/components/shell/SidebarState';
import { ADMIN_EMAIL } from '@/lib/admin';

/**
 * Founder admin layout — auth gate + shell chrome.
 *
 * Auth contract:
 *   - No session                              → redirect to /signin
 *   - Session but email != ADMIN_EMAIL         → render Forbidden in-place
 *   - Session and email == ADMIN_EMAIL         → render the admin
 *
 * The route is locked to a single email by design ("master control of
 * the admin page and only i can log into until i manually add someone").
 * Adding more admins later means appending to an allow-list here.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin?next=/admin');
  }

  if ((user.email ?? '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return <Forbidden email={user.email ?? '—'} />;
  }

  return (
    <SidebarStateProvider>
      <div className="min-h-screen flex bg-paper">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopbar email={user.email ?? ''} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarStateProvider>
  );
}

function Forbidden({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-8">
      <div className="max-w-[520px] text-center">
        <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-urgent mb-4">
          403 · Forbidden
        </div>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-4">
          Not your room.
        </h1>
        <p className="font-serif italic text-lg text-muted mb-6">
          Founder admin is locked to a single account. You're signed in as{' '}
          <strong className="not-italic font-semibold text-ink">{email}</strong>
          {' '}— that's not the one.
        </p>
        <p className="font-serif italic text-sm text-muted-soft">
          If this should be you, contact Jack to be added.
        </p>
      </div>
    </div>
  );
}
