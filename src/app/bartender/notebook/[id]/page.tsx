import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getShellContext } from '@/lib/shell/context';
import {
  getNotebookEntry,
  getRecipeOptions,
  getMenuPlanOptions,
} from '@/lib/notebook-detail';
import { NoteDetailEditor } from '@/components/notebook/NoteDetailEditor';

export const metadata = { title: 'Note \u00b7 Bar Notebook \u00b7 Palatable' };

export default async function BarNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getShellContext();
  const entry = await getNotebookEntry(id, ctx.siteId);
  if (!entry) notFound();
  const [recipes, menuPlans] = await Promise.all([
    getRecipeOptions(ctx.siteId, 'bar'),
    getMenuPlanOptions(ctx.siteId),
  ]);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <Link
        href="/bartender/notebook"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
      >
        {String.fromCharCode(0x2190)} Bar Notebook
      </Link>

      <div className="mt-4 mb-8">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
          Bar Notebook \u00b7 Build / Note
        </div>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
          {entry.title || 'Untitled'}
        </h1>
      </div>

      <NoteDetailEditor
        entry={entry}
        recipes={recipes}
        menuPlans={menuPlans}
        shell="bar"
      />
    </div>
  );
}
