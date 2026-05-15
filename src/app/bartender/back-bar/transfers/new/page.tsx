import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { draftTransferAction } from '@/app/(shell)/stock-suppliers/transfers/actions';

export const metadata = { title: 'New Transfer — Back Bar — Palatable' };

export default async function BarNewTransferPage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (name)')
    .eq('user_id', ctx.userId);
  const sites = ((memberships ?? []) as unknown as Array<{
    site_id: string;
    sites: { name: string | null } | null;
  }>).map((m) => ({
    id: m.site_id,
    name: m.sites?.name ?? 'Site',
  }));
  sites.sort((a, b) => {
    if (a.id === ctx.siteId) return -1;
    if (b.id === ctx.siteId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[960px] mx-auto">
      <Link
        href="/bartender/back-bar/transfers"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
      >
        ← Transfers
      </Link>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3 mt-4">
        <em className="text-gold font-semibold not-italic">New</em> Transfer
      </h1>
      <p className="font-serif italic text-lg text-muted mb-10">
        Where is stock moving from, and where to. Add lines on the next screen.
      </p>

      <form action={draftTransferAction} className="bg-card border border-rule px-7 py-7">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted mb-2">
              Source
            </label>
            <div className="font-serif text-sm text-ink mb-2">{ctx.kitchenName}</div>
            <select
              name="source_pool"
              required
              defaultValue="bar"
              className="w-full font-serif text-base text-ink bg-paper border border-rule px-3 py-2.5"
            >
              <option value="bar">Bar</option>
              <option value="kitchen">Kitchen</option>
            </select>
            <p className="font-serif italic text-xs text-muted mt-1.5">
              The pool stock leaves from.
            </p>
          </div>

          <div>
            <label className="block font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted mb-2">
              Destination
            </label>
            <select
              name="dest_site_id"
              required
              defaultValue={ctx.siteId}
              className="w-full font-serif text-base text-ink bg-paper border border-rule px-3 py-2.5 mb-2"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.id === ctx.siteId ? ' · this site' : ''}
                </option>
              ))}
            </select>
            <select
              name="dest_pool"
              required
              defaultValue="kitchen"
              className="w-full font-serif text-base text-ink bg-paper border border-rule px-3 py-2.5"
            >
              <option value="kitchen">Kitchen</option>
              <option value="bar">Bar</option>
            </select>
            <p className="font-serif italic text-xs text-muted mt-1.5">
              The pool stock arrives in.
            </p>
          </div>
        </div>

        <label className="block font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted mb-2">
          Notes
        </label>
        <textarea
          name="notes"
          rows={3}
          placeholder="e.g. kitchen needs limes for tonight's service"
          className="w-full font-serif text-base text-ink bg-paper border border-rule px-3 py-2.5 mb-6"
        />

        <div className="flex items-center justify-between pt-4 border-t border-rule">
          <p className="font-serif italic text-sm text-muted">
            Same site? Bar ↔ kitchen within {ctx.kitchenName} is fine — inventory is shared so it's recorded but no stock figure changes.
          </p>
          <button
            type="submit"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-ink text-paper hover:bg-ink-soft transition-colors"
          >
            Create Draft →
          </button>
        </div>
      </form>
    </div>
  );
}
