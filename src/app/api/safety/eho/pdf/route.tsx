import { NextResponse, type NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSafetyEhoRollup } from '@/lib/safety/home';
import {
  getRecentOpeningChecks,
  getRecentProbeReadings,
  getRecentIncidents,
  getCleaningSchedule,
  getTrainingRecords,
} from '@/lib/safety/lib';
import {
  EhoBundleDoc,
  type EhoBundleData,
} from '@/lib/safety/pdf/EhoBundleDoc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export async function GET(_req: NextRequest) {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const sinceTs = new Date(since + 'T00:00:00').toISOString();

  const [
    rollup,
    openingChecks,
    probes,
    incidents,
    cleaning,
    training,
    deliveriesRes,
    wasteRes,
    accountRes,
    siteRes,
  ] = await Promise.all([
    getSafetyEhoRollup(ctx.siteId, 90),
    getRecentOpeningChecks(ctx.siteId, 90),
    getRecentProbeReadings(ctx.siteId, 500),
    getRecentIncidents(ctx.siteId, { limit: 50 }),
    getCleaningSchedule(ctx.siteId),
    getTrainingRecords(ctx.siteId),
    supabase
      .from('deliveries')
      .select('id, arrived_at, status')
      .eq('site_id', ctx.siteId)
      .gte('expected_at', since),
    supabase
      .from('waste_entries')
      .select('id')
      .eq('site_id', ctx.siteId)
      .is('archived_at', null)
      .gte('logged_at', sinceTs),
    supabase.from('accounts').select('name').eq('id', ctx.accountId).maybeSingle(),
    supabase.from('sites').select('name').eq('id', ctx.siteId).maybeSingle(),
  ]);

  const probesIn90 = probes.filter((p) => p.logged_at >= sinceTs);
  const probesFailing = probesIn90.filter((p) => !p.passed).length;

  const deliveries = (deliveriesRes.data ?? []) as Array<{
    id: string;
    arrived_at: string | null;
    status: string;
  }>;
  const deliveriesArrived = deliveries.filter((d) => d.arrived_at).length;
  const wasteCount = (wasteRes.data ?? []).length;

  const today = new Date().toISOString().slice(0, 10);
  const cleaningDoneToday = cleaning.filter(
    (c) => c.last_completed_at?.slice(0, 10) === today,
  ).length;

  const data: EhoBundleData = {
    siteName: (siteRes.data?.name as string | null) ?? 'Palatable kitchen',
    accountName: (accountRes.data?.name as string | null) ?? '',
    windowStart: dateFmt.format(new Date(since)),
    windowEnd: dateFmt.format(new Date()),
    rollup: {
      days_logged: rollup.days_logged,
      days_partial: rollup.days_partial,
    },
    openingChecks,
    probes,
    probesIn90,
    probesFailing,
    incidents,
    cleaning,
    cleaningDoneToday,
    training,
    deliveriesArrived,
    wasteCount,
  };

  const buffer = await renderToBuffer(<EhoBundleDoc data={data} />);

  const slug = data.siteName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${slug || 'palatable'}-eho-bundle-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
