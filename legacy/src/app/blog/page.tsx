import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

const posts = [
  { slug:'gp-margins-explained', title:'GP margins explained — what every chef needs to know', category:'Business', date:'May 2026', excerpt:'Understanding gross profit is the single most important business skill a chef can develop. Here is a plain-English guide to the numbers that determine whether a kitchen thrives or fails.' },
  { slug:'menu-engineering-psychology', title:'The psychology of menu design — how layout drives orders', category:'Menu Design', date:'May 2026', excerpt:'Where you place a dish on a menu determines how often it gets ordered. The science behind this is fascinating, learnable, and directly actionable for any chef or operator.' },
  { slug:'stock-counting-made-simple', title:'Stock counting made simple — the system that actually works', category:'Kitchen Ops', date:'May 2026', excerpt:'A par level system paired with a weekly count takes 20 minutes and eliminates the guesswork from ordering. Here is exactly how to set it up.' },
];

export default function BlogPage() {
  return (
    <main>
      <Nav />
      <section className="bg-ink pt-32 pb-24 px-6 md:px-14">
        <div className="max-w-6xl mx-auto">
          <p className="font-epilogue text-xs font-medium tracking-widest uppercase text-teal mb-4">Blog</p>
          <h1 className="font-fraunces font-light text-cream leading-tight" style={{fontSize:'clamp(40px,7vw,80px)'}}>
            Writing &amp; <i className="text-mustard">ideas</i>
          </h1>
        </div>
      </section>
      <section className="bg-cream py-24 px-6 md:px-14">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
            {posts.map(p => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group bg-paper hover:bg-mustard-pale transition-colors p-8 border border-ink/5">
                <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-4 block">{p.category}</span>
                <h2 className="font-fraunces font-light text-2xl text-ink leading-snug mb-4 group-hover:text-teal transition-colors">{p.title}</h2>
                <p className="font-epilogue font-light text-sm text-slate leading-relaxed mb-6">{p.excerpt}</p>
                <span className="font-epilogue text-xs text-slate">{p.date}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}