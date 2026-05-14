import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <main>
      <Nav />
      <section className="bg-ink pt-32 pb-24 px-6 md:px-14 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 font-fraunces italic text-[400px] text-mustard/5 leading-none pointer-events-none select-none hidden lg:block">&amp;</div>
        <div className="max-w-6xl mx-auto">
          <p className="font-epilogue text-xs font-medium tracking-widest uppercase text-teal mb-4">About</p>
          <h1 className="font-fraunces font-light text-cream leading-tight mb-8" style={{fontSize:'clamp(40px,7vw,80px)'}}>
            Food consultancy<br/><i className="text-mustard">with real experience</i>
          </h1>
          <p className="font-fraunces italic text-xl text-slate max-w-xl leading-relaxed border-l-2 border-mustard pl-5">
            We bridge the gap between how good the food is and how well it&apos;s presented, priced, and understood.
          </p>
        </div>
      </section>

      <section className="py-24 px-6 md:px-14 bg-cream">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h2 className="font-fraunces font-light text-4xl text-ink mb-8">What Palate <span className="italic text-mustard">&amp;</span> Pen does</h2>
            <p className="font-epilogue font-light text-base text-slate leading-relaxed mb-6">
              Palate &amp; Pen was built on a simple frustration — the gap between how good the food is and how well it is presented, priced, and understood by the people eating it.
            </p>
            <p className="font-epilogue font-light text-base text-slate leading-relaxed mb-6">
              We work with restaurants, hospitality venues, and individual chefs to close that gap. Whether that means redesigning a menu that under-sells brilliant food, engineering a more profitable dish list, streamlining a kitchen operation, or training a team to understand the numbers behind their craft.
            </p>
            <p className="font-epilogue font-light text-base text-slate leading-relaxed mb-10">
              Every engagement is different. Every kitchen has its own challenges, its own strengths, and its own story to tell. We bring the expertise to help you tell it better — and run it more profitably.
            </p>
            <Link href="/contact" className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-ink text-cream px-8 py-4 hover:bg-teal transition-colors">Start a Conversation</Link>
          </div>
          <div className="space-y-8">
            {[
              { label:'Founded', value:'2026, London' },
              { label:'Specialisms', value:'Menu Design, GP Strategy, Kitchen Operations, Culinary Consulting, Training' },
              { label:'Clients', value:'Restaurants, hospitality venues, contract caterers, individual chefs' },
              { label:'Contact', value:'hello@palateandpen.co.uk' },
            ].map(i => (
              <div key={i.label} className="border-t border-ink/10 pt-6">
                <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-2">{i.label}</p>
                <p className="font-fraunces font-light text-lg text-ink">{i.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 md:px-14 bg-paper border-t border-ink/10">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-fraunces font-light text-4xl text-ink mb-16">Why it <i className="text-mustard">matters</i></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {[
              { color:'bg-teal', title:'Taste, strategy, story.', body:'Great food deserves a great menu. Not a list of dishes — a considered, designed piece of communication that guides guests, sells your best work, and reflects the quality of what comes out of your kitchen.' },
              { color:'bg-mustard', title:'Margins protect kitchens.', body:'Most hospitality businesses fail not because the food is bad, but because the numbers do not work. We help chefs and operators understand their GP, engineer their menus for profitability, and protect the margins that keep their doors open.' },
              { color:'bg-paper', title:'Operations enable creativity.', body:'A well-run kitchen is a creative kitchen. When your systems, your suppliers, and your team are working in harmony, you get to focus on what you do best. We help build the operational foundations that make great cooking possible.' },
            ].map((c,i) => (
              <div key={i} className={`${c.color} p-10 border border-ink/5`}>
                <h3 className={`font-fraunces italic text-xl leading-snug mb-4 ${c.color==='bg-teal'?'text-white':c.color==='bg-mustard'?'text-ink':'text-ink-soft'}`}>{c.title}</h3>
                <p className={`font-epilogue font-light text-sm leading-relaxed ${c.color==='bg-teal'?'text-white/70':c.color==='bg-mustard'?'text-ink/70':'text-slate'}`}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}