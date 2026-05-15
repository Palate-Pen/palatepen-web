import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { PlannerView } from '@/components/menu-planner/PlannerView';
import MenuBuilderClient from './MenuBuilderClient';

export const metadata = { title: 'Menu Builder — Manager — Palatable' };

/**
 * Manager Menu Builder hosts two modes:
 *   - ?mode=build (default): the v2 mockup-fidelity drag/drop builder
 *     for laying out the live menu document.
 *   - ?mode=planning: the forward menu planner — engineering matrix +
 *     action list (keep/add/remove/revise) for the next menu version.
 *
 * The Planning mode covers both kitchen and bar surfaces — manager
 * picks which slice via the surface toggle.
 */
export default async function MenuBuilderPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string; surface?: string }>;
}) {
  const ctx = await getShellContext();
  const sp = searchParams ? await searchParams : {};
  const mode = sp?.mode === 'planning' ? 'planning' : 'build';
  const surface = sp?.surface === 'bar' ? 'bar' : 'kitchen';

  if (mode === 'planning') {
    return (
      <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
        <ManagerModeTabs current="planning" />
        <div className="flex gap-1 mb-6">
          <Link
            href="/manager/menu-builder?mode=planning&surface=kitchen"
            className={surfaceChipClass(surface === 'kitchen')}
          >
            Kitchen
          </Link>
          <Link
            href="/manager/menu-builder?mode=planning&surface=bar"
            className={surfaceChipClass(surface === 'bar')}
          >
            Bar
          </Link>
        </div>
        <PlannerView
          siteId={ctx.siteId}
          surface={surface}
          revalidatePathname={`/manager/menu-builder?mode=planning&surface=${surface}`}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 max-w-[1680px] mx-auto">
        <ManagerModeTabs current="build" />
      </div>
      <MenuBuilderClient />
    </div>
  );
}

function ManagerModeTabs({ current }: { current: 'build' | 'planning' }) {
  const tabClass = (active: boolean) =>
    'font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 border-b-2 transition-colors ' +
    (active
      ? 'border-gold text-ink'
      : 'border-transparent text-muted hover:text-ink hover:border-rule');
  return (
    <div className="flex gap-1 border-b border-rule mb-6">
      <Link href="/manager/menu-builder" className={tabClass(current === 'build')}>
        Build
      </Link>
      <Link
        href="/manager/menu-builder?mode=planning"
        className={tabClass(current === 'planning')}
      >
        Planning next
      </Link>
    </div>
  );
}

function surfaceChipClass(active: boolean): string {
  return (
    'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-4 py-2 border transition-colors ' +
    (active
      ? 'bg-ink text-paper border-ink'
      : 'bg-transparent text-muted border-rule hover:border-gold')
  );
}
