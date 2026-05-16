import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getShellContext } from '@/lib/shell/context';
import {
  getNotebookEntry,
  getRecipeOptions,
  getMenuPlanOptions,
} from '@/lib/notebook-detail';
import { NoteDetailEditor } from '@/components/notebook/NoteDetailEditor';

export const metadata = { title: 'Note \u00b7 Notebook \u00b7 Palatable' };

export default async function ChefNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getShellContext();
  const entry = await getNotebookEntry(id, ctx.siteId);
  if (!entry) notFound();
  const [recipes, menuPlans] = await Promise.all([
    getRecipeOptions(ctx.siteId, 'food'),
    getMenuPlanOptions(ctx.siteId),
  ]);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <Link
        href="/notebook"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
      >
        {String.fromCharCode(0x2190)} Notebook
      </Link>

      <div className="mt-4 mb-8">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
          Notebook \u00b7 Note
        </div>
        <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
          {entry.title || 'Untitled'}
        </h1>
      </div>

      <NoteDetailEditor
        entry={entry}
        recipes={recipes}
        menuPlans={menuPlans}
        shell="chef"
      />
    </div>
  );
}
