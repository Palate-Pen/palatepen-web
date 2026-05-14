export const metadata = { title: 'Menus — Palatable' };

type Dish = { name: string; cost: string; portion: string };
type MenuSection = { title: string; dishes: Dish[] };

const sections: MenuSection[] = [
  {
    title: 'Starters',
    dishes: [
      { name: 'Hummus', cost: '£1.24', portion: '4 per cover' },
      { name: 'Baba Ghanoush', cost: '£1.68', portion: '3 per cover' },
      { name: 'Şakşuka', cost: '£1.04', portion: '3 per cover' },
    ],
  },
  {
    title: 'Mains',
    dishes: [
      { name: 'Lamb Shawarma', cost: '£4.92', portion: '2 per cover' },
      { name: 'Beef Short Rib Braise', cost: '£6.84', portion: '1.2 per cover' },
      { name: 'Chicken Thigh Skewers', cost: '£3.60', portion: '2.4 per cover' },
    ],
  },
  {
    title: 'Desserts',
    dishes: [
      { name: 'Knafeh', cost: '£2.18', portion: '1 per cover' },
      { name: 'Lemon Posset', cost: '£0.84', portion: '1 per cover' },
    ],
  },
];

const info = [
  { label: "Total menu cost per cover", value: '£22.34', tone: 'ink' as const },
  { label: "Total menu cost tonight (142 covers)", value: '£3,171.88', tone: 'ink' as const },
  { label: 'Margin on menu', value: '68% (healthy)', tone: 'healthy' as const },
  { label: 'Last updated', value: 'Today 09:14 by Jack', tone: 'ink' as const },
];

export default function MenusPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1000px]">
      <div className="flex justify-between items-start mb-8">
        <div className="flex-1">
          <h1 className="font-serif text-5xl text-ink mb-2">Today's Menu</h1>
          <p className="font-serif italic text-base text-muted">
            Thursday 14 May · 142 covers forecast
          </p>
        </div>
        <div className="flex gap-3">
          <ActionButton>Edit Menu</ActionButton>
          <ActionButton primary>Print</ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {sections.map((s) => (
          <MenuSectionCard key={s.title} section={s} />
        ))}
      </div>

      <div className="bg-card border border-rule px-8 py-7">
        {info.map((row, i) => (
          <div
            key={row.label}
            className={
              'flex justify-between py-2.5' +
              (i < info.length - 1 ? ' border-b border-rule' : '')
            }
          >
            <div className="font-display font-semibold text-[8px] tracking-[0.3em] uppercase text-muted self-center">
              {row.label}
            </div>
            <div
              className={
                'font-serif text-sm ' +
                (row.tone === 'healthy' ? 'text-healthy' : 'text-ink')
              }
            >
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  primary,
}: {
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      className={
        'font-display font-semibold text-[8px] tracking-[0.3em] uppercase px-5 py-2.5 border border-gold transition-colors ' +
        (primary
          ? 'bg-gold text-paper hover:bg-gold-dark'
          : 'bg-transparent text-gold hover:bg-gold hover:text-paper')
      }
    >
      {children}
    </button>
  );
}

function MenuSectionCard({ section }: { section: MenuSection }) {
  return (
    <div className="bg-card border border-rule flex flex-col">
      <div className="px-6 py-5 border-b border-rule">
        <div className="font-display font-semibold text-[10px] tracking-[0.4em] uppercase text-gold">
          {section.title}
        </div>
        <div className="text-[10px] text-muted mt-1">
          {section.dishes.length} dishes
        </div>
      </div>
      <div className="px-6 py-4 flex-1">
        {section.dishes.map((d, i) => (
          <div
            key={d.name}
            className={
              'py-3 cursor-pointer transition-colors hover:text-gold' +
              (i < section.dishes.length - 1 ? ' border-b border-rule' : '')
            }
          >
            <div className="font-serif font-medium text-sm text-ink">
              {d.name}
            </div>
            <div className="text-[10px] text-muted mt-0.5">
              {d.cost} cost · {d.portion}
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-3 border-t border-rule bg-card-warm">
        <button className="w-full py-2 font-display font-semibold text-[8px] tracking-[0.3em] uppercase bg-transparent border border-dashed border-gold text-gold">
          + Add Dish
        </button>
      </div>
    </div>
  );
}
