import { notFound } from 'next/navigation';
import { svc } from '@/lib/admin';
import { MenuBackgroundLayer, menuFontFor, type MenuBackground, type MenuFontFamily, type MenuDishStyle } from '@/lib/menuBackgrounds';
import { getGlobalFeatureFlags, isFeatureEnabled } from '@/lib/featureFlags';
import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public read of a menu by its slug. Bypasses RLS via the service-role
// supabase client, and explicitly tier-gates: only menus belonging to an
// account on the `kitchen` or `group` tier are surfaced. If the owner
// downgrades, their published menus go dark — same behaviour as if they had
// unpublished manually.
async function loadMenu(slug: string) {
  // Platform-wide feature flag: when publicMenus is off, every existing
  // public URL goes dark (loadMenu returns null → caller calls notFound()).
  const flags = await getGlobalFeatureFlags();
  if (!isFeatureEnabled('publicMenus', flags)) return null;

  const supabase = svc();
  const { data: rows } = await supabase
    .from('user_data')
    .select('account_id, menus, recipes, gp_history, profile')
    .contains('menus', [{ publicSlug: slug, published: true }])
    .limit(1);
  if (!rows || rows.length === 0) return null;
  const row = rows[0] as any;

  const { data: account } = await supabase
    .from('accounts')
    .select('tier')
    .eq('id', row.account_id)
    .single();
  if (!account || !['kitchen', 'group'].includes(account.tier)) return null;

  const menu = (row.menus || []).find((m: any) => m.publicSlug === slug && m.published);
  if (!menu) return null;

  const recipes: any[] = row.recipes || [];
  const gp: any[] = row.gp_history || [];
  const dishes = (menu.recipeIds || []).map((id: string) => {
    const r = recipes.find((x: any) => x.id === id);
    if (!r) return null;
    let c: any = null;
    if (r.linkedCostingId) c = gp.find((h: any) => h.id === r.linkedCostingId);
    if (!c) c = gp.find((h: any) => (h.name || '').toLowerCase().trim() === (r.title || '').toLowerCase().trim());
    return {
      id,
      title: r.title,
      category: r.category || 'Other',
      description: r.imported?.description || '',
      sell: c?.sell ?? null,
    };
  }).filter(Boolean) as any[];

  return {
    menu: {
      name: menu.name as string,
      description: (menu.description as string) || '',
      design: menu.design || {},
    },
    dishes,
    business: {
      name: (row.profile?.businessName || '').trim(),
      logoUrl: row.profile?.logoUrl as string | undefined,
      location: (row.profile?.location || '').trim(),
      currency: row.profile?.currencySymbol || '£',
    },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadMenu(slug);
  if (!data) return { title: 'Menu not found' };
  const biz = data.business.name;
  const subtitle = data.menu.design?.subtitleText || data.menu.name;
  return {
    title: biz ? `${subtitle} · ${biz}` : subtitle,
    description: data.menu.description || `Menu from ${biz}`,
    openGraph: {
      title: biz ? `${subtitle} · ${biz}` : subtitle,
      description: data.menu.description || undefined,
      images: data.business.logoUrl ? [data.business.logoUrl] : undefined,
    },
  };
}

const CATEGORY_ORDER = ['Starter', 'Main', 'Sauce', 'Bread', 'Pastry', 'Dessert', 'Stock', 'Snack', 'Other'];

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadMenu(slug);
  if (!data) notFound();

  const { menu, dishes, business } = data;
  const design = menu.design as {
    accentColor?: string;
    headerText?: string;
    subtitleText?: string;
    footerText?: string;
    showPrices?: boolean;
    showDescriptions?: boolean;
    sectionStyle?: 'category' | 'flat';
    background?: MenuBackground;
    columns?: 1 | 2;
    fontFamily?: MenuFontFamily;
    dishStyle?: MenuDishStyle;
    logo?: { url: string };
    customBackground?: { url: string };
  };

  const accent = design.accentColor || '#C8960A';
  const showPrices = design.showPrices !== false;
  const showDesc = design.showDescriptions !== false;
  const cols = design.columns || 1;
  const dishStyle: MenuDishStyle = design.dishStyle || 'standard';
  const sym = business.currency;
  const headerText = design.headerText || business.name || 'Menu';
  const headerLogo = design.logo?.url || business.logoUrl;

  // Group dishes for the body — mirror the in-app designer's category/flat
  type Section = { name: string; dishes: any[] };
  let sections: Section[];
  if (design.sectionStyle === 'flat') {
    sections = [{ name: '', dishes }];
  } else {
    const byCat: Record<string, any[]> = {};
    for (const d of dishes) {
      const cat = d.category || 'Other';
      (byCat[cat] = byCat[cat] || []).push(d);
    }
    sections = CATEGORY_ORDER.filter(c => byCat[c]).map(c => ({ name: c, dishes: byCat[c] }))
      .concat(Object.keys(byCat).filter(c => !CATEGORY_ORDER.includes(c)).map(c => ({ name: c, dishes: byCat[c] })));
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#5A5552',
      padding: '24px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{
        background: '#FFFFFF', color: '#1A1A18',
        width: '100%', maxWidth: '780px',
        padding: '36px 32px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        position: 'relative', overflow: 'hidden',
        fontFamily: menuFontFor(design.fontFamily),
        borderRadius: '3px',
      }}>
        <MenuBackgroundLayer
          bg={design.background || 'plain'}
          accent={accent}
          customUrl={design.customBackground?.url}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid ' + accent, paddingBottom: '20px', marginBottom: '20px', textAlign: 'center' }}>
            {headerLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={headerLogo} alt="" style={{ maxHeight: '90px', objectFit: 'contain', marginBottom: '14px' }} />
            )}
            <h1 style={{ fontWeight: 300, fontSize: '36px', color: '#111', marginBottom: '6px', lineHeight: 1.1, letterSpacing: '0.5px' }}>
              {headerText}
            </h1>
            {design.subtitleText && (
              <p style={{ fontSize: '16px', color: accent, fontStyle: 'italic', letterSpacing: '0.05em' }}>
                {design.subtitleText}
              </p>
            )}
          </div>

          {/* Body */}
          {sections.length === 0 || sections.every(s => s.dishes.length === 0) ? (
            <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '40px 0' }}>This menu is empty.</p>
          ) : (
            <div style={{ columnCount: cols, columnGap: '28px' }}>
              {sections.map((section, si) => (
                <section key={si} style={{ marginBottom: '22px', breakInside: 'avoid' }}>
                  {section.name && (
                    <h2 style={{
                      fontWeight: 400, fontSize: '15px', textTransform: 'uppercase',
                      letterSpacing: '0.22em', color: accent,
                      borderBottom: '0.5px solid #DDD', paddingBottom: '6px', marginBottom: '14px',
                      textAlign: 'center',
                    }}>
                      {section.name}{section.dishes.length > 1 ? 's' : ''}
                    </h2>
                  )}
                  {section.dishes.map(d => (
                    <DishRow key={d.id} d={d} accent={accent} sym={sym} showPrices={showPrices} showDesc={showDesc} dishStyle={dishStyle} />
                  ))}
                </section>
              ))}
            </div>
          )}

          {/* Footer */}
          {design.footerText && (
            <div style={{ marginTop: '24px', paddingTop: '14px', borderTop: '0.5px solid #DDD', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>{design.footerText}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tiny platform credit at the bottom — not part of the printed sheet */}
      <p style={{ marginTop: '18px', fontSize: '11px', color: '#bbb', letterSpacing: '0.5px', fontFamily: 'system-ui, sans-serif' }}>
        Powered by <a href="https://palateandpen.co.uk" style={{ color: '#C8960A', textDecoration: 'none' }}>Palatable</a>
      </p>
    </div>
  );
}

function DishRow({ d, accent, sym, showPrices, showDesc, dishStyle }: { d: any; accent: string; sym: string; showPrices: boolean; showDesc: boolean; dishStyle: MenuDishStyle }) {
  const price = showPrices && d.sell != null ? `${sym}${(d.sell || 0).toFixed(2)}` : null;
  const titleEl = <span style={{ fontWeight: 600, fontSize: '15px', color: '#111' }}>{d.title}</span>;
  const priceEl = price ? <span style={{ fontSize: '15px', fontWeight: 600, color: accent, whiteSpace: 'nowrap' }}>{price}</span> : null;
  return (
    <div style={{ marginBottom: '14px', breakInside: 'avoid' }}>
      {dishStyle === 'stacked' ? (
        <div>{titleEl}{priceEl && <div style={{ marginTop: '2px' }}>{priceEl}</div>}</div>
      ) : dishStyle === 'leaders' && priceEl ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          {titleEl}
          <span style={{ flex: 1, borderBottom: '0.5px dotted #999', alignSelf: 'flex-end', marginBottom: '3px' }} />
          {priceEl}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
          {titleEl}
          {priceEl}
        </div>
      )}
      {showDesc && d.description && (
        <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.55, marginTop: '3px', fontStyle: 'italic' }}>
          {d.description}
        </p>
      )}
    </div>
  );
}
