import { NextResponse } from 'next/server';
import { svc } from '@/lib/admin';

export const runtime = 'nodejs';
// Cache for 60s — config doesn't change often, and we don't want every page
// load hammering the DB. Vercel CDN will serve repeat requests for that minute.
export const revalidate = 60;

// Public read of platform-wide config — feature flags + active announcement.
// No auth: the client fetches this at app load to gate features and render the
// banner. Service-role on the server-side is fine because RLS allows public
// SELECT on app_settings.
export async function GET() {
  try {
    const supabase = svc();
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'global')
      .single();
    const value = data?.value || {};
    return NextResponse.json({
      featureFlags: value.featureFlags || {},
      announcement: value.announcement || { active: false },
      maintenance: value.maintenance || { active: false },
    }, {
      // Short cache for maintenance — chefs hitting refresh should see the
      // gate within a few seconds of activation. 15s s-maxage feels right:
      // not so fast every page load hammers the DB, not so slow that flipping
      // the switch takes a minute to land.
      headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=60' },
    });
  } catch {
    // Don't break the app on a settings fetch failure — return permissive defaults
    // (and crucially `maintenance.active: false`, so a config blip never locks
    // every user out)
    return NextResponse.json({
      featureFlags: {},
      announcement: { active: false },
      maintenance: { active: false },
    });
  }
}
