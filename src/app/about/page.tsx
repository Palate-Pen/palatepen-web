import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function AboutPage() {
  return (
    <main>
      <Nav />
      <section className="pt-32 pb-24 px-6 md:px-14">
        <div className="max-w-4xl mx-auto">
          <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-4">About</p>
          <h1 className="font-fraunces font-light text-5xl md:text-7xl text-ink leading-tight mb-16">
            Jack <i className="text-mustard">Harrison</i>
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <p className="font-epilogue font-light text-base text-slate leading-relaxed mb-6">
                Palate & Pen was built on a simple frustration — the gap between how good the food is and how well it's presented, priced, and understood by the people eating it.
              </p>
              <p className="font-epilogue font-light text-base text-slate leading-relaxed mb-6">
                With a background in contract catering and marketing, I've spent years working across kitchen operations, menu development, and hospitality business strategy. I've seen how the right menu design, the right pricing, and the right systems can transform what a kitchen is capable of.
              </p>
              <p className="font-epilogue font-light text-base text-slate leading-relaxed">
                Palate & Pen brings all of that together — consultancy, design, and now Mise, a professional toolkit built specifically for working chefs.
              </p>
            </div>
            <div className="space-y-8">
              {[
                { label:'Expertise', value:'Contract Catering, Menu Engineering, GP Strategy, Kitchen Operations' },
                { label:'Location', value:'London, UK' },
                { label:'Contact', value:'jack@palateandpen.co.uk' },
                { label:'New Projects', value:'hello@palateandpen.co.uk' },
              ].map(i=>(
                <div key={i.label} className="border-t border-ink/10 pt-6">
                  <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-2">{i.label}</p>
                  <p className="font-fraunces font-light text-lg text-ink">{i.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}