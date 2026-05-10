const services = [
  { n:'01', title:'Menu Design', desc:'Bespoke print and digital menus — typography-led layouts that guide the eye and elevate the dining experience from first glance.' },
  { n:'02', title:'Culinary Consulting', desc:'Menu engineering, seasonal concept development, and food strategy rooted in real kitchen and hospitality expertise.' },
  { n:'03', title:'Kitchen Operations', desc:'Streamlining kitchen workflows, supplier relationships, and operational efficiency so your brigade can focus on the food.' },
  { n:'04', title:'GP Strategy', desc:'Gross profit analysis, menu engineering, and pricing strategy that protects your margins without compromising quality.' },
  { n:'05', title:'Menu Copywriting', desc:'Descriptions that sell. Words that create appetite, reflect your cuisine, and turn browsers into loyal guests.' },
  { n:'06', title:'Training', desc:'Practical training for your team — from kitchen operations and cost control to menu knowledge and service standards.' },
];

export default function Services() {
  return (
    <section className="py-24 px-6 md:px-14 bg-paper border-t border-ink/10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-baseline gap-5 mb-16">
          <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-mustard">Services</span>
          <h2 className="font-fraunces font-light text-4xl md:text-5xl text-ink">What we <i>do</i></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
          {services.map(s=>(
            <div key={s.n} className="border-t-2 border-ink pt-6">
              <div className="font-epilogue text-xs font-bold tracking-widest text-mustard mb-3">{s.n}</div>
              <h3 className="font-fraunces font-light text-2xl text-ink mb-3">{s.title}</h3>
              <p className="font-epilogue font-light text-sm text-slate leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}