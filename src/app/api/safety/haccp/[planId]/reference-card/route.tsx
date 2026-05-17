import { NextResponse, type NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { HaccpReferenceCardDoc } from '@/lib/safety/pdf/HaccpReferenceCardDoc';
import type { HaccpPlan } from '@/lib/safety/haccp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ planId: string }> },
) {
  const { planId } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: planRow } = await supabase
    .from('safety_haccp_plans')
    .select('id, site_id, status, body, current_step, signed_off_at, signed_off_by, created_at, updated_at')
    .eq('id', planId)
    .maybeSingle();
  if (!planRow) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('site_id', planRow.site_id as string)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: site } = await supabase
    .from('sites')
    .select('name')
    .eq('id', planRow.site_id as string)
    .maybeSingle();
  const siteName = (site?.name as string | null) ?? 'Palatable kitchen';

  const plan: HaccpPlan = {
    id: planRow.id as string,
    site_id: planRow.site_id as string,
    status: planRow.status as HaccpPlan['status'],
    body: (planRow.body as HaccpPlan['body']) ?? {},
    current_step: (planRow.current_step as number) ?? 1,
    signed_off_at: (planRow.signed_off_at as string | null) ?? null,
    signed_off_by: (planRow.signed_off_by as string | null) ?? null,
    created_at: planRow.created_at as string,
    updated_at: planRow.updated_at as string,
  };

  const buffer = await renderToBuffer(
    <HaccpReferenceCardDoc plan={plan} siteName={siteName} />,
  );

  const slug = siteName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `${slug || 'palatable'}-haccp-reference-card.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
