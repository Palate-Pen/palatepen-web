import type { Recipe } from '@/lib/recipes';
import {
  dietaryTagFull,
  dietaryTagsFor,
  shouldRenderDietary,
} from '@/lib/dietary';

/**
 * Single-page print of a live menu. Sections in canonical order, each
 * holding dish name + description + price + dietary chips. Shared by
 * the chef Menus surface (food menus) and the bar Menus surface
 * (drinks list) — caller passes the pre-grouped sections.
 *
 * Hidden on screen via `.printable-book` in globals.css.
 */

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export type MenuPrintSection = {
  name: string;
  label: string;
  dishes: Recipe[];
};

export function MenuPrint({
  sections,
  kitchenName,
  menuTitle,
}: {
  sections: MenuPrintSection[];
  kitchenName: string;
  /** "Today's menu", "Tonight's drinks list", etc. */
  menuTitle: string;
}) {
  const today = dateFmt.format(new Date());
  const totalDishes = sections.reduce((s, sec) => s + sec.dishes.length, 0);

  if (totalDishes === 0) {
    return null;
  }

  return (
    <div className="printable-book">
      {/* The whole menu fits on one card. Single page output for the
       *  service-time huddle — no page-break-after inside. */}
      <div
        className="recipe-card"
        style={{ pageBreakAfter: 'auto', breakAfter: 'auto' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20pt' }}>
          <h1 style={{ fontSize: '26pt', marginBottom: '6pt' }}>
            {kitchenName}
          </h1>
          <p
            style={{
              fontStyle: 'italic',
              fontSize: '11pt',
              color: '#444',
              marginBottom: '2pt',
            }}
          >
            {menuTitle}
          </p>
          <p style={{ fontSize: '9pt', color: '#666' }}>{today}</p>
        </div>

        {sections.map((section) => (
          <section key={section.name} style={{ marginBottom: '14pt' }}>
            <h2 style={{ marginTop: '0' }}>{section.label}</h2>
            {section.dishes.map((dish, i) => (
              <DishLine
                key={dish.id}
                dish={dish}
                last={i === section.dishes.length - 1}
              />
            ))}
          </section>
        ))}

        <p
          style={{
            fontSize: '8.5pt',
            color: '#666',
            fontStyle: 'italic',
            marginTop: '16pt',
            textAlign: 'center',
            borderTop: '0.5pt solid #ccc',
            paddingTop: '6pt',
          }}
        >
          Dietary chips: V vegetarian · VG vegan · GF gluten-free · DF dairy-free · NF nut-free. Allergen detail on request.
        </p>
      </div>
    </div>
  );
}

function DishLine({ dish, last }: { dish: Recipe; last: boolean }) {
  const tags = shouldRenderDietary(dish.allergens)
    ? dietaryTagsFor(dish.allergens)
    : [];
  return (
    <div
      style={{
        padding: '5pt 0',
        borderBottom: last ? 'none' : '0.5pt solid #ddd',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '12pt',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '11pt' }}>
          {dish.name}
          {tags.length > 0 && (
            <span
              style={{
                marginLeft: '8pt',
                fontFamily: 'sans-serif',
                fontSize: '8pt',
                letterSpacing: '0.18em',
                color: '#666',
              }}
              title={tags.map((t) => dietaryTagFull(t)).join(' · ')}
            >
              {tags.join(' · ')}
            </span>
          )}
        </span>
        {dish.sell_price != null && (
          <span style={{ fontWeight: 600, fontSize: '11pt', whiteSpace: 'nowrap' }}>
            {gbp.format(dish.sell_price)}
          </span>
        )}
      </div>
      {dish.notes && (
        <p
          style={{
            fontSize: '9.5pt',
            fontStyle: 'italic',
            color: '#444',
            margin: '1pt 0 0 0',
          }}
        >
          {dish.notes}
        </p>
      )}
    </div>
  );
}
