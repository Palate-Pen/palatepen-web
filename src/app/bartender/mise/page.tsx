import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Mise — Bar — Palatable' };

export default function BarMisePage() {
  return (
    <BarComingSoon
      eyebrow="Bar Prep"
      title=""
      italic="Mise"
      subtitle="Citrus peels, syrups, batched cocktails, garnishes, service set-up — day-anchored, station-grouped."
      body="Mise mirrors the chef Prep board but uses bar stations (Cocktail / Wine / Beer / Service Well). Items inherit from the chef prep_items table with a bar discriminator. Day-anchored: today's mise, tomorrow's mise, week-ahead view. Status cycle: not-started / in-progress / done / short / over-prepped."
      reads={[
        'v2.prep_items (filtered to bar stations once the station discriminator lands)',
        'v2.recipes filtered to dish_type in (cocktail/wine/beer) for batch derivation',
        'v2.forward_signals target_surface=mise for service-readiness alerts',
      ]}
    />
  );
}
