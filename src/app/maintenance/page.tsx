import { maintenanceMessage } from '@/lib/maintenance';

export const metadata = {
  title: 'Back shortly — Palatable',
  description: 'Palatable is briefly offline for maintenance.',
};

/**
 * Maintenance page rendered when MAINTENANCE_MODE env var is true.
 * Routed by middleware; this page is reachable directly any time but
 * the redirect only kicks in when the flag is set.
 *
 * Webhook routes (Stripe, inbound email, cron) are explicitly NOT
 * redirected — see PASSTHROUGH_PREFIXES in src/lib/maintenance.ts —
 * so we never trigger provider retry/disable behaviour.
 */
export default function MaintenancePage() {
  const message = maintenanceMessage();
  const generatedAt = new Date().toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-6 md:px-10 py-8 border-b border-rule">
        <span
          className="font-display font-semibold text-sm tracking-[0.3em] uppercase text-ink inline-flex items-center gap-1.5"
          aria-label="Palatable"
        >
          Palatable
          <span className="w-1.5 h-1.5 rounded-full bg-gold" aria-hidden />
        </span>
      </header>

      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 md:px-10 py-16 md:py-24 flex flex-col justify-center">
        <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-5">
          Brief maintenance
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-normal text-ink leading-[1.05] tracking-[-0.02em] mb-5">
          Back in the{' '}
          <em className="text-gold italic font-medium">kitchen</em> — give us a minute.
        </h1>
        <p className="font-serif italic text-lg text-muted mb-10 leading-relaxed">
          {message}
        </p>

        <div className="bg-paper-warm border-l-[3px] border-gold px-6 py-5 mb-8">
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
            Need it urgently?
          </div>
          <p className="font-serif text-[15px] text-ink-soft leading-relaxed">
            Email{' '}
            <a
              href="mailto:hello@palateandpen.co.uk?subject=Palatable%20%E2%80%94%20urgent%20while%20down"
              className="text-gold hover:text-gold-dark transition-colors underline-offset-2 hover:underline"
            >
              hello@palateandpen.co.uk
            </a>{' '}
            and we&apos;ll be in touch. We monitor the inbox during
            service hours.
          </p>
        </div>

        <p className="font-sans text-[11px] text-muted-soft uppercase tracking-[0.2em]">
          Status checked at {generatedAt}
        </p>
      </main>

      <footer className="px-6 md:px-10 py-8 border-t border-rule">
        <div className="max-w-[1200px] mx-auto flex flex-wrap justify-between items-center gap-3 font-sans text-xs text-muted">
          <span>© 2026 Palate &amp; Pen Ltd</span>
          <a
            href="https://palateandpen.co.uk"
            className="hover:text-gold transition-colors"
          >
            palateandpen.co.uk
          </a>
        </div>
      </footer>
    </div>
  );
}
