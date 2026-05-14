export const metadata = { title: 'Admin · System Health — Palatable' };

export default function AdminSystemPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1000px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Founder Admin
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        System Health
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-10">
        Infrastructure status, cron job runs, Supabase advisors, recent deploys, error logs.
      </p>
      <div className="bg-card border border-rule px-10 py-16 text-center">
        <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-gold mb-3">
          Coming Soon
        </div>
        <p className="font-serif italic text-muted">
          Page scaffolded — full domain build in a follow-up commit.
        </p>
      </div>
    </div>
  );
}
