import { NextResponse } from 'next/server';
import { isAuthorized, svc } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Row counts for the admin System section. Counts the platform-level tables
// directly + summed counts for jsonb-array entities inside user_data (recipes,
// costings, etc.) since those don't live in dedicated tables.

async function countTable(supabase: any, table: string): Promise<number> {
  try {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count || 0;
  } catch { return 0; }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = svc();

  // Platform tables
  const userDataCount = await countTable(supabase, 'user_data');
  const accountsCount = await countTable(supabase, 'accounts');
  const accountMembersCount = await countTable(supabase, 'account_members');
  const accountInvitesCount = await countTable(supabase, 'account_invites');
  const auditCount = await countTable(supabase, 'admin_audit_log');
  const appSettingsCount = await countTable(supabase, 'app_settings');

  // Entity counts — sum across user_data.<field> arrays
  let recipes = 0, costings = 0, stockItems = 0, menus = 0, invoices = 0, notes = 0, waste = 0;
  try {
    const { data } = await supabase
      .from('user_data')
      .select('recipes, gp_history, stock_items, menus, invoices, notes, waste_log');
    for (const r of (data || []) as any[]) {
      recipes += (r.recipes || []).length;
      costings += (r.gp_history || []).length;
      stockItems += (r.stock_items || []).length;
      menus += (r.menus || []).length;
      invoices += (r.invoices || []).length;
      notes += (r.notes || []).length;
      waste += (r.waste_log || []).length;
    }
  } catch {}

  return NextResponse.json({
    platformTables: {
      user_data: userDataCount,
      accounts: accountsCount,
      account_members: accountMembersCount,
      account_invites: accountInvitesCount,
      admin_audit_log: auditCount,
      app_settings: appSettingsCount,
    },
    entities: {
      recipes,
      costings,
      stockItems,
      menus,
      invoices,
      notes,
      waste,
    },
  });
}
