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
          className="font-serif text-2xl text-ink hover:text-ink/80 transition-colors"
        >
          <span className="italic">P</span>
          <span className="text-gold">.</span>
          <span>alatable</span>
        </Link>
      </header>
      <main className="flex-1 w-full max-w-[600px] mx-auto px-8 md:px-14 pb-20">
        {children}
      </main>
    </div>
  );
}
