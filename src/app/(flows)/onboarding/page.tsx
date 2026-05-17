import Link from 'next/link';
import {
  completeOnboarding,
  saveKitchenName,
  saveKitchenProfile,
} from '@/lib/actions/onboarding';

export const metadata = { title: 'Welcome — Palatable' };

type SearchParams = { step?: string; error?: string; detail?: string };

const ERROR_MESSAGES: Record<string, string> = {
  name_required: 'Please fill in the required fields.',
  no_owner_membership:
    "We couldn't find your kitchen. Try signing out and back in.",
  query_failed:
    'The membership lookup failed. Usually this means the v2 schema is not exposed in Supabase Settings → API → Exposed schemas.',
  site_lookup_failed: "We couldn't load your kitchen — check the detail below.",
  site_update_failed:
    "We couldn't rename your kitchen — check the detail below.",
  account_update_failed:
    "We couldn't update your account — check the detail below.",
};

const STEP_COUNT = 3;

const KITCHEN_TYPES: Array<{ value: string; name: string; desc: string }> = [
  { value: 'restaurant', name: 'Restaurant', desc: 'Table service, fixed menu' },
  { value: 'gastropub', name: 'Gastropub', desc: 'Bar-led with kitchen' },
  { value: 'cafe', name: 'Café / Coffee', desc: 'Counter, light cooking' },
  { value: 'takeaway', name: 'Takeaway / Delivery', desc: 'Food packed to go' },
  { value: 'catering', name: 'Catering / Events', desc: 'Off-site service' },
  { value: 'food_truck', name: 'Food Truck / Stall', desc: 'Mobile or market' },
];

const TEAM_SIZE_BANDS: Array<{ value: string; name: string }> = [
  { value: '1-3', name: '1–3 people' },
  { value: '4-10', name: '4–10 people' },
  { value: '11-25', name: '11–25 people' },
  { value: '26+', name: '26+ people' },
];

const SERVICES: Array<{ value: string; label: string }> = [
  { value: 'a_la_carte', label: 'Dine-in à la carte' },
  { value: 'events', label: 'Pre-booked group / events' },
  { value: 'bar_cocktails', label: 'Bar / cocktails' },
  { value: 'takeaway', label: 'Takeaway from premises' },
  { value: 'delivery', label: 'Delivery (in-house or Deliveroo)' },
  { value: 'ppds', label: 'Pre-packed for direct sale (PPDS)' },
];

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const step = Math.max(
    1,
    Math.min(STEP_COUNT, parseInt(params.step ?? '1', 10) || 1),
  );
  const errorMessage = params.error
    ? ERROR_MESSAGES[params.error] ?? params.error
    : null;

  return (
    <div className="pt-6" id="main">
      <div className="h-1 bg-rule mb-10 overflow-hidden" aria-hidden>
        <div
          className="h-full bg-gold transition-[width]"
          style={{ width: `${Math.round((step / STEP_COUNT) * 100)}%` }}
        />
      </div>

      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
        Step {step} of {STEP_COUNT}
      </div>

      {errorMessage && (
        <div className="border-l-[3px] border-l-urgent text-urgent bg-urgent/5 px-4 py-3 mb-4 font-serif italic text-sm">
          {errorMessage}
        </div>
      )}
      {params.detail && (
        <div className="border-l-[3px] border-l-urgent/40 text-muted bg-urgent/5 px-4 py-2 mb-6 font-mono text-xs">
          {params.detail}
        </div>
      )}

      {step === 1 && <Step1 />}
      {step === 2 && <Step2 />}
      {step === 3 && <Step3 />}
    </div>
  );
}

function Step1() {
  return (
    <>
      <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] mb-3">
        Kitchen name
      </h1>
      <p className="font-serif italic text-sm text-muted mb-8">
        What&apos;s your kitchen called? This shows on every record.
      </p>
      <form action={saveKitchenName} className="space-y-5">
        <div>
          <label
            htmlFor="kitchen_name"
            className="block font-sans font-semibold text-xs tracking-[0.08em] uppercase mb-2 text-ink"
          >
            Kitchen Name
          </label>
          <input
            id="kitchen_name"
            name="kitchen_name"
            type="text"
            required
            autoFocus
            placeholder="e.g. Berber & Q"
            className="w-full bg-card border border-rule px-3 py-3 text-sm focus:outline-none focus:border-gold transition-colors"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <Link
            href="/"
            className="border border-rule text-muted font-sans font-semibold text-xs tracking-[0.08em] uppercase py-3 px-6 hover:bg-card hover:text-ink transition-colors"
          >
            Skip
          </Link>
          <button
            type="submit"
            className="flex-1 bg-gold text-paper font-sans font-semibold text-xs tracking-[0.08em] uppercase py-3 px-6 hover:bg-gold-dark transition-colors"
          >
            Next →
          </button>
        </div>
      </form>
    </>
  );
}

function Step2() {
  return (
    <>
      <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] mb-3">
        About the kitchen
      </h1>
      <p className="font-serif italic text-sm text-muted mb-8">
        These choices set the defaults across Margins, Safety, and the HACCP wizard. You can change everything later.
      </p>
      <form action={saveKitchenProfile} className="space-y-7">
        <div>
          <label className="block font-sans font-semibold text-xs tracking-[0.08em] uppercase mb-3 text-ink">
            Kitchen type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {KITCHEN_TYPES.map((k, i) => (
              <label
                key={k.value}
                className="flex items-start gap-3 cursor-pointer px-4 py-3 border border-rule bg-card hover:border-gold has-[input:checked]:bg-gold-bg has-[input:checked]:border-gold transition-colors"
              >
                <input
                  type="radio"
                  name="kitchen_type"
                  value={k.value}
                  defaultChecked={i === 0}
                  required
                  className="mt-1 accent-gold"
                />
                <span>
                  <span className="font-serif text-[15px] text-ink leading-tight block">
                    {k.name}
                  </span>
                  <span className="font-sans text-xs text-muted mt-0.5 block">
                    {k.desc}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-sans font-semibold text-xs tracking-[0.08em] uppercase mb-3 text-ink">
            Team size
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TEAM_SIZE_BANDS.map((b, i) => (
              <label
                key={b.value}
                className="flex items-center justify-center gap-2 cursor-pointer px-4 py-3 border border-rule bg-card hover:border-gold has-[input:checked]:bg-gold-bg has-[input:checked]:border-gold transition-colors text-center"
              >
                <input
                  type="radio"
                  name="team_size_band"
                  value={b.value}
                  defaultChecked={i === 0}
                  required
                  className="accent-gold"
                />
                <span className="font-serif text-sm text-ink">{b.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-sans font-semibold text-xs tracking-[0.08em] uppercase mb-3 text-ink">
            Services you offer (tick any that apply)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SERVICES.map((s, i) => (
              <label
                key={s.value}
                className="flex items-center gap-3 cursor-pointer px-4 py-3 border border-rule bg-card hover:border-gold has-[input:checked]:bg-gold-bg has-[input:checked]:border-gold transition-colors"
              >
                <input
                  type="checkbox"
                  name="services"
                  value={s.value}
                  defaultChecked={i === 0}
                  className="accent-gold"
                />
                <span className="font-serif text-sm text-ink">{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Link
            href="/onboarding"
            className="border border-rule text-muted font-sans font-semibold text-xs tracking-[0.08em] uppercase py-3 px-6 hover:bg-card hover:text-ink transition-colors"
          >
            ← Back
          </Link>
          <button
            type="submit"
            className="flex-1 bg-gold text-paper font-sans font-semibold text-xs tracking-[0.08em] uppercase py-3 px-6 hover:bg-gold-dark transition-colors"
          >
            Save &amp; continue →
          </button>
        </div>
      </form>
    </>
  );
}

function Step3() {
  return (
    <>
      <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] mb-3">
        You&apos;re ready.
      </h1>
      <p className="font-serif italic text-base text-muted mb-8">
        Quick tour of what&apos;s where — then we&apos;ll drop you on your home.
      </p>

      <div className="space-y-3 mb-8">
        <TourRow
          eyebrow="Chef shell"
          title="The kitchen view"
          body="Home · Prep · Recipes · Menus · Margins · The Walk-in · Notebook · Inbox. Default landing for chef roles."
        />
        <TourRow
          eyebrow="Manager view"
          title="Site command"
          body="Menu Builder · Team · P&L · Deliveries · Suppliers · Compliance · Reports. Switch via Settings."
        />
        <TourRow
          eyebrow="Owner view"
          title="Business pulse"
          body="Cross-site rollup · Revenue · Cash · Bank comparison · Group reports. Owner roles only."
        />
        <TourRow
          eyebrow="Safety viewer"
          title="The compliance side"
          body="Daily diary · Probe · Issues · Cleaning · Training · HACCP wizard · EHO Visit Mode. The £20/site uplift on any tier."
        />
        <TourRow
          eyebrow="What you'll do first"
          title="Three actions to feel set up"
          body="1. Add a recipe (or import from a URL). 2. Scan your first invoice. 3. Tick today's opening check."
        />
      </div>

      <form action={completeOnboarding}>
        <div className="flex gap-3">
          <Link
            href="/onboarding?step=2"
            className="border border-rule text-muted font-sans font-semibold text-xs tracking-[0.08em] uppercase py-3 px-6 hover:bg-card hover:text-ink transition-colors"
          >
            ← Back
          </Link>
          <button
            type="submit"
            className="flex-1 bg-gold text-paper font-sans font-semibold text-xs tracking-[0.08em] uppercase py-3 px-6 hover:bg-gold-dark transition-colors"
          >
            Open my kitchen →
          </button>
        </div>
      </form>
    </>
  );
}

function TourRow({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-card border border-rule border-l-[3px] border-l-gold px-5 py-4">
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
        {eyebrow}
      </div>
      <div className="font-serif font-semibold text-base text-ink leading-tight mb-1">
        {title}
      </div>
      <div className="font-serif text-sm text-muted leading-relaxed">
        {body}
      </div>
    </div>
  );
}
