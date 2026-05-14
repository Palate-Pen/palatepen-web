import Link from 'next/link';

export const metadata = { title: 'Manager · Palatable' };

const TABS: Array<{
  name: string;
  href: string | null;
  status: 'live' | 'soon';
  description: string;
}> = [
  {
    name: 'Home',
    href: null,
    status: 'soon',
    description: 'Site rollup — what needs your eye today',
  },
  {
    name: 'Menu Builder',
    href: '/manager/menu-builder',
    status: 'live',
    description: 'Design the menu · costing baked in',
  },
  { name: 'Team', href: null, status: 'soon', description: 'Brigade, rotas, permissions' },
  { name: 'P&L', href: null, status: 'soon', description: 'GP, food cost, labour, waste' },
  { name: 'Deliveries', href: null, status: 'soon', description: 'Site-level intake oversight' },
  { name: 'Suppliers', href: null, status: 'soon', description: 'Reliability, terms, contracts' },
  { name: 'Service Notes', href: null, status: 'soon', description: 'What went well, what didn’t' },
  { name: 'Compliance', href: null, status: 'soon', description: 'HACCP, allergens, sign-offs' },
  { name: 'Reports', href: null, status: 'soon', description: 'Period reports, year-on-year' },
  { name: 'Settings', href: null, status: 'soon', description: 'Site preferences' },
];

export default function ManagerHomePage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1200px]">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Manager Surface
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        <em className="text-gold font-semibold not-italic">Site</em> command
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-12 max-w-2xl">
        The manager surface is where the site operates from. Manager Home is still in design — the Menu Builder is the first locked tab live below. The remaining tabs follow as their mockups land.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule">
        {TABS.map((tab) => (
          <TabCard key={tab.name} tab={tab} />
        ))}
      </div>
    </div>
  );
}

function TabCard({
  tab,
}: {
  tab: { name: string; href: string | null; status: 'live' | 'soon'; description: string };
}) {
  const inner = (
    <div className={`bg-card px-7 py-7 h-full flex flex-col ${tab.status === 'soon' ? 'opacity-60' : ''}`}>
      <div
        className={
          'font-display font-semibold text-[10px] tracking-[0.4em] uppercase mb-3 ' +
          (tab.status === 'live' ? 'text-gold' : 'text-muted')
        }
      >
        {tab.status === 'live' ? 'Locked · Live' : 'Mockup pending'}
      </div>
      <div className="font-serif font-semibold text-xl text-ink mb-2">{tab.name}</div>
      <p className="font-serif italic text-sm text-muted flex-1">{tab.description}</p>
      {tab.status === 'live' && (
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold mt-4">
          Open →
        </div>
      )}
    </div>
  );
  if (tab.href && tab.status === 'live') {
    return (
      <Link href={tab.href} className="contents">
        <div className="cursor-pointer hover:bg-paper-warm transition-colors">{inner}</div>
      </Link>
    );
  }
  return <div>{inner}</div>;
}
