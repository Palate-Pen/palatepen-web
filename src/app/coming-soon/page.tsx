export const metadata = {
  title: 'Palate & Pen — Coming Soon',
  description:
    'Palate & Pen — hospitality consulting. New site coming soon. For Palatable, visit app.palateandpen.co.uk.',
};

/**
 * Consulting-business landing for palateandpen.co.uk. Middleware rewrites
 * any request on the root domain (other than /admin which redirects to
 * the app subdomain) into this route. URLs in the browser keep whatever
 * the user typed; content is always this page until the consulting site
 * proper is built.
 */
export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-8 md:px-14 py-10">
        <div className="font-display text-2xl md:text-3xl font-semibold tracking-[0.16em] uppercase text-ink">
          <span>P</span>
          <span className="inline-block w-[7px] h-[7px] bg-gold rounded-full mx-1.5 relative -top-[5px]" />
          <span>alate</span>
          <span className="text-muted mx-2">&</span>
          <span>Pen</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[720px] mx-auto px-8 md:px-14 pb-20 flex flex-col justify-center">
        <div className="font-display font-semibold text-xs tracking-[0.5em] uppercase text-gold mb-5">
          Hospitality Consulting
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold uppercase tracking-[0.04em] text-ink mb-6 leading-[1.05]">
          A new site is{' '}
          <em className="text-gold font-semibold not-italic">in the kitchen</em>.
        </h1>
        <p className="font-serif italic text-lg md:text-xl text-muted mb-10 leading-relaxed">
          Palate &amp; Pen helps independent kitchens run a tighter back office. A proper site for the consulting work is on its way — until then, drop me a line.
        </p>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-12">
          <a
            href="mailto:hello@palateandpen.co.uk"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-4 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors text-center"
          >
            hello@palateandpen.co.uk
          </a>
          <a
            href="https://app.palateandpen.co.uk"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-4 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors text-center"
          >
            Looking for Palatable? →
          </a>
        </div>

        <p className="font-serif italic text-sm text-muted-soft">
          Palatable is our software for independent chefs — at{' '}
          <a
            href="https://app.palateandpen.co.uk"
            className="text-gold hover:text-gold-dark transition-colors"
          >
            app.palateandpen.co.uk
          </a>
          .
        </p>
      </main>

      <footer className="px-8 md:px-14 py-8 border-t border-rule">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-muted">
          © Palate &amp; Pen
        </div>
      </footer>
    </div>
  );
}
