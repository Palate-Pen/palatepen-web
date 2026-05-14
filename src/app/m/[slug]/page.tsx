import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * Public menu reader. URL pattern: /m/{slug}. Guest-facing — no
 * Palatable shell, no chef chrome, just the menu as the kitchen wants
 * it seen. Server-rendered for SEO + OG meta on share.
 *
 * v1 of this surface is a stub — v2.menus schema doesn't exist yet
 * (locked Manager Menu Builder mockup persists menu state client-only
 * pending the menus schema). The chef-published demo at /m/berber-and-q
 * renders a representative menu so the surface is wireable end-to-end
 * (Manager Menu Builder "Web menu · palatable.menu/berber-and-q" link
 * lands somewhere live).
 *
 * When v2.menus lands, this page reads a menu row by slug, validates
 * it's published, and renders the dishes from the linked recipes —
 * with live cost flowing in the background even though the public
 * page only shows sell prices.
 */

type DemoMenu = {
  slug: string;
  brand: string;
  eyebrow: string;
  name: string;
  italic: string;
  blurb: string;
  sections: Array<{
    title: string;
    dishes: Array<{
      name: string;
      desc: string;
      price: string;
      featured?: boolean;
      v?: boolean;
      gf?: boolean;
    }>;
  }>;
};

const DEMO_MENUS: Record<string, DemoMenu> = {
  'berber-and-q': {
    slug: 'berber-and-q',
    brand: 'Berber & Q · Shoreditch',
    eyebrow: 'Dinner menu',
    name: 'Dinner',
    italic: 'menu',
    blurb: 'A celebration of the Levant · charcoal, smoke, and spice',
    sections: [
      {
        title: 'To Begin',
        dishes: [
          {
            name: 'Hummus',
            desc: 'Tahini, lemon, garlic, warm flatbread',
            price: '£8',
            featured: true,
            v: true,
          },
          {
            name: 'Baba Ghanoush',
            desc: 'Smoked aubergine, tahini, pomegranate, mint',
            price: '£9',
            v: true,
          },
          {
            name: 'Şakşuka',
            desc: 'Stewed aubergine and peppers, labneh, herbs',
            price: '£9',
            v: true,
          },
        ],
      },
      {
        title: 'From the Grill',
        dishes: [
          {
            name: 'Lamb Shawarma',
            desc: 'Slow-roasted lamb shoulder, pickles, garlic sauce',
            price: '£18',
            featured: true,
          },
          {
            name: 'Beef Short Rib Braise',
            desc: 'Red wine braise, root vegetables, gremolata',
            price: '£26',
            gf: true,
          },
          {
            name: 'Chicken Thigh Skewers',
            desc: 'Berbere spice, charred lemon, tahini yoghurt',
            price: '£16',
            gf: true,
          },
        ],
      },
      {
        title: 'To Finish',
        dishes: [
          {
            name: 'Knafeh',
            desc: 'Kataifi, mozzarella, honey, crushed pistachios',
            price: '£9',
          },
          {
            name: 'Lemon Posset',
            desc: 'Cream, lemon, shortbread, candied peel',
            price: '£7',
            gf: true,
          },
        ],
      },
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const menu = DEMO_MENUS[slug];
  if (!menu) {
    return { title: 'Menu — Palatable' };
  }
  return {
    title: `${menu.eyebrow} — ${menu.brand}`,
    description: menu.blurb,
    openGraph: {
      title: `${menu.eyebrow} — ${menu.brand}`,
      description: menu.blurb,
      siteName: menu.brand,
      type: 'website',
    },
  };
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const menu = DEMO_MENUS[slug];
  if (!menu) notFound();

  return (
    <div className="min-h-screen bg-paper py-16 px-6 md:px-12">
      <div className="max-w-[760px] mx-auto bg-paper">
        <header className="text-center mb-12 pb-10 border-b border-rule">
          <div className="font-display font-semibold text-[11px] tracking-[0.5em] uppercase text-gold mb-4">
            {menu.brand}
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] text-ink mb-3">
            {menu.name}{' '}
            <em className="text-gold italic font-medium">{menu.italic}</em>
          </h1>
          <p className="font-serif italic text-base text-muted">{menu.blurb}</p>
        </header>

        {menu.sections.map((section) => (
          <section key={section.title} className="mb-12 last:mb-0">
            <div className="font-display font-semibold text-sm tracking-[0.4em] uppercase text-gold text-center mb-7 pb-3 border-b border-rule">
              {section.title}
            </div>
            <div className="flex flex-col">
              {section.dishes.map((dish) => (
                <div
                  key={dish.name}
                  className={
                    'grid grid-cols-[1fr_auto] gap-6 py-4 items-baseline ' +
                    (dish.featured ? 'pl-3 border-l-2 border-gold' : '')
                  }
                >
                  <div>
                    <div className="font-serif font-semibold text-lg text-ink mb-1 flex items-center gap-2 flex-wrap">
                      {dish.name}
                      {dish.v && (
                        <span className="font-display font-semibold text-[9px] tracking-[0.18em] uppercase text-healthy bg-healthy/10 border border-healthy/30 px-1.5 py-0.5">
                          V
                        </span>
                      )}
                      {dish.gf && (
                        <span className="font-display font-semibold text-[9px] tracking-[0.18em] uppercase text-gold bg-gold-bg border border-gold/40 px-1.5 py-0.5">
                          GF
                        </span>
                      )}
                    </div>
                    <div className="font-serif italic text-sm text-ink-soft leading-relaxed">
                      {dish.desc}
                    </div>
                  </div>
                  <div className="font-serif font-semibold text-lg text-ink whitespace-nowrap">
                    {dish.price}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <footer className="mt-16 pt-6 border-t border-rule text-center">
          <p className="font-serif italic text-xs text-muted-soft">
            Allergens available on request · prices include VAT · please let your server know of any dietary requirements
          </p>
          <div className="font-display font-semibold text-[9px] tracking-[0.4em] uppercase text-muted-soft mt-3">
            Menu by Palatable
          </div>
        </footer>
      </div>
    </div>
  );
}
