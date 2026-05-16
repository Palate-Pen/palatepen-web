import Link from 'next/link';

export default function FlowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-8 md:px-14 py-8">
        <Link
          href="/"
          className="font-display font-semibold text-sm tracking-[0.3em] uppercase text-ink no-underline inline-flex items-center gap-1.5 hover:text-ink/80 transition-colors"
          aria-label="Palatable"
        >
          Palatable
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
        </Link>
      </header>
      <main className="flex-1 w-full max-w-[600px] mx-auto px-8 md:px-14 pb-20">
        {children}
      </main>
    </div>
  );
}
