export const metadata = { title: 'Recipes — Palatable' };

type Ingredient = { name: string; qty: string; cost: string };
type Recipe = {
  name: string;
  serves: string;
  portions: string;
  costPerCover: string;
  totalCost: string;
  ingredients: Ingredient[];
};

const recipes: Recipe[] = [
  {
    name: 'Hummus',
    serves: 'Serves 8',
    portions: '4 portions per cover',
    costPerCover: '£1.24',
    totalCost: 'total dish £9.92',
    ingredients: [
      { name: 'Chickpea, tinned', qty: '1.2 kg', cost: '£2.16' },
      { name: 'Tahini', qty: '240 ml', cost: '£2.88' },
      { name: 'Lemon, juice', qty: '120 ml', cost: '£1.20' },
      { name: 'Garlic', qty: '20 g', cost: '£0.40' },
      { name: 'Olive oil, extra virgin', qty: '60 ml', cost: '£1.80' },
      { name: 'Salt', qty: '8 g', cost: '£0.48' },
    ],
  },
  {
    name: 'Baba Ghanoush',
    serves: 'Serves 6',
    portions: '3 portions per cover',
    costPerCover: '£1.68',
    totalCost: 'total dish £10.08',
    ingredients: [
      { name: 'Aubergine', qty: '800 g', cost: '£2.40' },
      { name: 'Tahini', qty: '180 ml', cost: '£2.16' },
      { name: 'Lemon, juice', qty: '90 ml', cost: '£0.90' },
      { name: 'Garlic', qty: '15 g', cost: '£0.30' },
      { name: 'Olive oil', qty: '45 ml', cost: '£1.35' },
    ],
  },
  {
    name: 'Lamb Shawarma',
    serves: 'Serves 12',
    portions: '2 portions per cover',
    costPerCover: '£4.92',
    totalCost: 'total dish £29.52',
    ingredients: [
      { name: 'Lamb shoulder, diced', qty: '1.6 kg', cost: '£19.20' },
      { name: 'Shawarma spice blend', qty: '40 g', cost: '£2.40' },
      { name: 'Yogurt, plain', qty: '400 ml', cost: '£2.00' },
      { name: 'Lemon', qty: '2', cost: '£0.80' },
      { name: 'Garlic', qty: '30 g', cost: '£0.60' },
      { name: 'Olive oil', qty: '80 ml', cost: '£2.40' },
    ],
  },
  {
    name: 'Şakşuka',
    serves: 'Serves 8',
    portions: '3 portions per cover',
    costPerCover: '£1.04',
    totalCost: 'total dish £8.32',
    ingredients: [
      { name: 'Aubergine', qty: '600 g', cost: '£1.80' },
      { name: 'Tomato, fresh', qty: '500 g', cost: '£1.50' },
      { name: 'Onion', qty: '400 g', cost: '£0.80' },
      { name: 'Peppers, mixed', qty: '400 g', cost: '£1.60' },
      { name: 'Olive oil', qty: '60 ml', cost: '£1.80' },
      { name: 'Tomato paste', qty: '60 g', cost: '£0.90' },
    ],
  },
  {
    name: 'Beef Short Rib Braise',
    serves: 'Serves 10',
    portions: '1.2 portions per cover',
    costPerCover: '£6.84',
    totalCost: 'total dish £68.40',
    ingredients: [
      { name: 'Beef short rib', qty: '2.4 kg', cost: '£48.00' },
      { name: 'Red wine', qty: '500 ml', cost: '£6.00' },
      { name: 'Stock, beef', qty: '1 L', cost: '£2.00' },
      { name: 'Carrot', qty: '400 g', cost: '£0.80' },
      { name: 'Celery', qty: '300 g', cost: '£0.60' },
      { name: 'Onion', qty: '400 g', cost: '£0.80' },
    ],
  },
  {
    name: 'Knafeh',
    serves: 'Serves 10',
    portions: '1 portion per cover',
    costPerCover: '£2.18',
    totalCost: 'total dish £21.80',
    ingredients: [
      { name: 'Kataifi dough', qty: '500 g', cost: '£4.50' },
      { name: 'Mozzarella, fresh', qty: '400 g', cost: '£4.80' },
      { name: 'Honey', qty: '200 ml', cost: '£3.00' },
      { name: 'Pistachios, crushed', qty: '100 g', cost: '£3.00' },
      { name: 'Butter', qty: '200 g', cost: '£2.40' },
    ],
  },
];

export default function RecipesPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px]">
      <h1 className="font-serif text-4xl text-ink mb-3">Recipes</h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        Seventeen dishes. Costing pulled live from The Bank. Edit · scale · print.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((r) => (
          <RecipeCard key={r.name} recipe={r} />
        ))}
      </div>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <div className="bg-card border border-rule cursor-pointer transition-all hover:border-gold hover:shadow-[0_4px_16px_rgba(26,22,18,0.08)] flex flex-col">
      <div className="px-6 py-6 border-b border-rule">
        <div className="font-serif font-semibold text-2xl text-ink leading-tight">
          {recipe.name}
        </div>
        <div className="text-xs text-muted mt-2 tracking-[0.02em]">
          {recipe.serves} · {recipe.portions}
        </div>
      </div>

      <div className="px-6 py-4 border-b border-rule flex justify-between items-center bg-gradient-to-r from-[rgba(93,127,79,0.06)] to-transparent">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
          Cost per cover
        </div>
        <div className="text-right">
          <div className="font-serif font-semibold text-xl text-healthy">
            {recipe.costPerCover}
          </div>
          <div className="text-xs text-muted mt-0.5">{recipe.totalCost}</div>
        </div>
      </div>

      <div className="px-6 py-5 flex-1">
        {recipe.ingredients.map((ing, i) => (
          <div
            key={ing.name}
            className={
              'flex justify-between items-baseline gap-3 py-2.5' +
              (i < recipe.ingredients.length - 1 ? ' border-b border-rule' : '')
            }
          >
            <div className="font-serif text-sm text-ink flex-1">{ing.name}</div>
            <div className="text-xs text-muted w-20 text-right">{ing.qty}</div>
            <div className="font-serif text-xs text-ink-soft w-16 text-right">
              {ing.cost}
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 border-t border-rule bg-paper flex gap-2">
        <RecipeButton>Edit</RecipeButton>
        <RecipeButton>Scale</RecipeButton>
        <RecipeButton>Print</RecipeButton>
      </div>
    </div>
  );
}

function RecipeButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex-1 py-2 font-sans font-semibold text-xs tracking-[0.08em] uppercase bg-transparent border border-rule text-muted transition-colors hover:border-gold hover:text-gold">
      {children}
    </button>
  );
}
