import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

const services = [
  {
    title: 'Culinary Consulting',
    paras: [
      'Every menu should tell a story and make commercial sense. We work with chefs and operators on concept development, seasonal menu planning, and food strategy — bringing the kind of kitchen-floor perspective that turns good menus into great ones.',
      'From fine dining to contract catering, we help you build a food offer that is coherent, exciting, and built to last.',
    ],
    cta: 'Discuss your menu',
  },
  {
    title: 'Menu Design',
    paras: [
      'A menu is a sales tool. The way it looks, the way it reads, and the way it guides a guest’s eye all have a direct impact on what gets ordered and how much gets spent.',
      'We design bespoke print and digital menus that reflect the quality of your food — typographically considered, carefully laid out, and built to perform.',
    ],
    cta: 'See what’s possible',
  },
  {
    title: 'Menu Engineering',
    paras: [
      'Not all dishes are equal. Menu engineering is the process of understanding which dishes are popular, which are profitable, and how to design your menu around that knowledge.',
      'We analyse your sales data, your food costs, and your menu structure to help you make decisions that improve GP without affecting the guest experience.',
    ],
    cta: 'Review your menu',
  },
  {
    title: 'GP Strategy',
    paras: [
      'Gross profit is the number that determines whether a hospitality business survives. Most operators know their GP — far fewer understand exactly what’s driving it or how to improve it.',
      'We provide clear, practical GP analysis and pricing strategy that protects your margins, identifies the problem dishes, and gives you a roadmap to a more profitable operation.',
    ],
    cta: 'Talk numbers',
  },
  {
    title: 'Kitchen Operations',
    paras: [
      'A well-run kitchen is the foundation of everything. We work with operators to streamline workflows, improve supplier relationships, reduce waste, and build the systems that allow a kitchen team to perform consistently.',
      'From opening new sites to turning around struggling operations, we bring the experience to make it work.',
    ],
    cta: 'Improve your operation',
  },
  {
    title: 'Training',
    paras: [
      'The best investment a hospitality business can make is in its people. We provide practical, kitchen-focused training — from cost control and GP awareness to menu knowledge, service standards, and team management.',
      'All training is tailored to your operation, your team, and your goals.',
    ],
    cta: 'Train your team',
  },
];

export default function ServicesPage() {
  return (
    <main>
      <Nav />
      <section className="bg-ink pt-32 pb-24 px-6 md:px-14">
        <div className="max-w-6xl mx-auto">
          <p className="font-epilogue text-xs font-medium tracking-widest uppercase text-teal mb-4">Services</p>
          <h1 className="font-fraunces font-light text-cream leading-tight mb-8" style={{fontSize:'clamp(40px,7vw,80px)'}}>
            What we <i className="text-mustard">do</i>
          </h1>
          <p className="font-fraunces italic text-xl text-slate max-w-xl leading-relaxed border-l-2 border-mustard pl-5">
            All engagements are bespoke. Pricing is based on scope, not a rate card — get in touch to discuss your project.
          </p>
        </div>
      </section>

      <section className="bg-cream py-24 px-6 md:px-14">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink/10">
            {services.map(s => (
              <div key={s.title} className="bg-cream p-10 md:p-12">
                <h2 className="font-fraunces font-light text-3xl text-ink mb-6">{s.title}</h2>
                {s.paras.map((para, i) => (
                  <p key={i} className="font-epilogue font-light text-sm text-slate leading-relaxed mb-4 last:mb-0">{para}</p>
                ))}
                <Link href="/contact" className="inline-block mt-8 font-epilogue text-xs font-medium tracking-widest uppercase border border-ink text-ink px-5 py-2.5 hover:bg-ink hover:text-cream transition-colors">
                  {s.cta} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-teal py-20 px-6 md:px-14">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="font-fraunces font-light text-3xl text-white mb-3">Not sure where to start?</h2>
            <p className="font-epilogue font-light text-base text-white/70 max-w-md">
              Every project starts with a conversation. Tell us about your operation and we will tell you honestly whether and how we can help.
            </p>
          </div>
          <Link href="/contact" className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-white text-teal px-8 py-4 hover:bg-cream transition-colors flex-shrink-0">
            Get in Touch
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}