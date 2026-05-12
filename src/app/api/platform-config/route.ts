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
    }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
    });
  } catch {
    // Don't break the app on a settings fetch failure — return permissive defaults
    return NextResponse.json({
      featureFlags: {},
      announcement: { active: false },
    });
  }
}
