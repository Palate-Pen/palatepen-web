import Link from 'next/link';

const posts = [
  { slug:'gp-margins-explained', title:'GP margins explained — what every chef needs to know', category:'Business', date:'May 2026' },
  { slug:'menu-engineering-psychology', title:'The psychology of menu design — how layout drives orders', category:'Menu Design', date:'May 2026' },
  { slug:'supplier-invoice-scanning', title:'Why scanning your invoices weekly changes everything', category:'Kitchen Ops', date:'May 2026' },
];

export default function BlogPreview() {
  return (
    <section className="py-24 px-6 md:px-14 bg-cream border-t border-ink/10">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-baseline mb-16">
          <div className="flex items-baseline gap-5">
            <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-mustard">From the Blog</span>
            <h2 className="font-fraunces font-light text-4xl md:text-5xl text-ink">Latest <i>writing</i></h2>
          </div>
          <Link href="/blog" className="font-epilogue text-xs tracking-widest uppercase text-teal hover:text-ink transition-colors hidden md:block">All Posts</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
          {posts.map(p=>(
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group bg-paper hover:bg-mustard-pale transition-colors p-8 border border-ink/5">
              <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-4 block">{p.category}</span>
              <h3 className="font-fraunces font-light text-xl text-ink leading-snug mb-6 group-hover:text-teal transition-colors">{p.title}</h3>
              <span className="font-epilogue text-xs text-slate">{p.date}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}