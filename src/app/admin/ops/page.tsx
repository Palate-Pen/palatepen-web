import { ReseedDemoCard } from './ReseedDemoCard';

export const metadata = { title: 'Admin · Founder Ops — Palatable' };

export default function AdminOpsPage() {
  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1000px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Founder Admin
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        Founder Ops
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-10">
        The tools you actually use. Demo reseed up top; support inbox,
        feature flags, beta testers, pitch tracker, Stripe payouts come
        in over the next build.
      </p>

      <ReseedDemoCard />
    </div>
  );
}
