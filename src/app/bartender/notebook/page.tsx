import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Notebook — Bar — Palatable' };

export default function BarNotebookPage() {
  return (
    <BarComingSoon
      eyebrow="The Bar Journal"
      title=""
      italic="Notebook"
      subtitle="Spec ideas. Customer feedback. Supplier notes. Cocktail experiments."
      body="The bar's notebook is the same surface as the chef's, just with bar-flavoured prompts. Voice / photo / sketch captures come in pt 2 (Supabase Storage). Cross-shell linking: when a notebook entry tags an ingredient that overlaps with kitchen use, the chef sees it too."
      reads={[
        'v2.notebook_entries (shared with chef, filtered by author or tag)',
      ]}
    />
  );
}
