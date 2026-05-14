import Link from 'next/link';
import { saveKitchenName } from '@/lib/actions/onboarding';

export const metadata = { title: 'Welcome — Palatable' };

const PROGRESS_PCT = 20;

type SearchParams = { error?: string; detail?: string };

const ERROR_MESSAGES: Record<string, string> = {
  name_required: 'Your kitchen needs a name to continue.',
  no_owner_membership:
    "We couldn't find your kitchen. Try signing out and back in.",
  query_failed:
    'The membership lookup failed. Usually this means the v2 schema is not exposed in Supabase Settings → API → Exposed schemas.',
  site_lookup_failed: "We couldn't load your kitchen — check the detail below.",
  site_update_failed:
    "We couldn't rename your kitchen — check the detail below.",
  account_update_failed:
    "We couldn't rename your account — check the detail below.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const errorMessage = params.error
    ? ERROR_MESSAGES[params.error] ?? params.error
    : null;

  return (
    <div className="pt-6">
      <div className="h-1 bg-rule mb-10 overflow-hidden">
        <div
          className="h-full bg-gold transition-[width]"
          style={{ width: `${PROGRESS_PCT}%` }}
        />
      </div>

      <h1 className="font-serif text-4xl mb-3">Kitchen Name</h1>
      <p className="font-serif italic text-sm text-muted mb-8">
        Step 1 of 5 · what&apos;s your kitchen called?
      </p>

      {errorMessage && (
        <div className="border-l-[3px] border-l-urgent text-urgent bg-urgent/5 px-4 py-3 mb-2 font-serif italic text-sm">
          {errorMessage}
        </div>
      )}
      {params.detail && (
        <div className="border-l-[3px] border-l-urgent/40 text-muted bg-urgent/5 px-4 py-2 mb-6 font-mono text-xs">
          {params.detail}
        </div>
      )}

      <form action={saveKitchenName} className="space-y-5">
        <div>
          <label
            htmlFor="kitchen_name"
            className="block font-display text-[9px] tracking-[0.3em] uppercase mb-2 text-ink"
          >
            Kitchen Name
          </label>
          <input
            id="kitchen_name"
            name="kitchen_name"
            type="text"
            required
            placeholder="e.g. Berber & Q"
            className="w-full bg-card border border-rule px-3 py-3 text-sm focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Link
            href="/"
            className="border border-rule text-muted font-display text-[8px] tracking-[0.3em] uppercase py-3 px-6 hover:bg-card hover:text-ink transition-colors"
          >
            Skip
          </Link>
          <button
            type="submit"
            className="flex-1 bg-gold text-card font-display text-[8px] tracking-[0.3em] uppercase py-3 px-6 hover:opacity-90 transition-opacity"
          >
            Next →
          </button>
        </div>
      </form>

      <Link
        href="/"
        className="block mt-6 text-center font-serif italic text-sm text-gold hover:text-gold/80 transition-colors"
      >
        Skip to Home
      </Link>
    </div>
  );
}
