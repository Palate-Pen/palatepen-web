import Link from 'next/link';

export const metadata = {
  title: 'Coming soon — Palatable',
  description: 'Sign-ups and trials open shortly. Drop us a line to get early access.',
};

/**
 * Pre-launch CTA target. Every "Start trial" / "Sign up" / "Sign in"
 * button on the public landing routes here so visitors don't hit a
 * dead end or a half-built signup form. Founder still has direct
 * /signin access.
 */
export default function ComingSoonFeaturePage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-6 md:px-10 py-8 border-b border-rule">
        <Link
          href="/"
          className="font-display font-semibold text-sm tracking-[0.3em] uppercase text-ink no-underline inline-flex items-center gap-1.5"
        >
          Palatable
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
        </Link>
      </header>

      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 md:px-10 py-16 md:py-24 flex flex-col justify-center">
        <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-5">
          Almost open
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-normal text-ink leading-[1.05] tracking-[-0.02em] mb-5">
          Trials and sign-ins open{' '}
          <em className="text-gold italic font-medium">very soon</em>.
        </h1>
        <p className="font-serif italic text-lg text-muted mb-10 leading-relaxed">
          We&apos;re finishing the last few pieces before letting kitchens in. Drop your email and we&apos;ll be in touch the moment the door opens — you&apos;ll be first.
        </p>

        <div className="flex flex-col md:flex-row gap-3.5 mb-12">
          <a
            href="mailto:hello@palateandpen.co.uk?subject=Palatable%20early%20access"
            className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase px-7 py-4 bg-ink text-paper border border-ink hover:bg-gold hover:border-gold transition-colors inline-flex items-center justify-center gap-2.5"
          >
            Get Early Access
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
          <Link
            href="/"
            className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase px-7 py-4 bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper transition-colors text-center"
          >
            Back to Landing
          </Link>
        </div>

        <div className="bg-paper-warm border-l-[3px] border-gold px-6 py-5">
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
            While you wait
          </div>
          <p className="font-serif text-[15px] text-ink-soft leading-relaxed">
            Have a look at{' '}
            <a
              href="https://www.palateandpen.co.uk"
              className="text-gold hover:text-gold-dark transition-colors underline-offset-2 hover:underline"
            >
              Palate &amp; Pen
            </a>
            {' '}— the consulting practice behind Palatable. Menu design, kitchen operations, GP work. Built by the same chef who&apos;s building the software.
          </p>
        </div>
      </main>

      <footer className="px-6 md:px-10 py-8 border-t border-rule">
        <div className="max-w-[1200px] mx-auto flex flex-wrap justify-between items-center gap-3 font-sans text-xs text-muted">
          <span>© 2026 Palate &amp; Pen Ltd</span>
          <a
            href="mailto:hello@palateandpen.co.uk"
            className="hover:text-gold transition-colors"
          >
            hello@palateandpen.co.uk
          </a>
        </div>
      </footer>
    </div>
  );
}
