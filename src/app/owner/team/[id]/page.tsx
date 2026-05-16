import { notFound, redirect } from 'next/navigation';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Legacy per-membership detail URL. The owner team detail is now
 * grouped per *user* (one page even when a person belongs to multiple
 * sites). Resolve the membership_id → user_id and forward.
 */
export default async function OwnerMembershipRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const svc = createSupabaseServiceClient();
  const { data } = await svc
    .from('memberships')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  if (!data?.user_id) notFound();
  redirect('/owner/team/u/' + data.user_id);
}
