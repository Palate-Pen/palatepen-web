export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-between pt-24 pb-16 px-6 md:px-14 relative overflow-hidden bg-cream">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 font-fraunces italic text-[400px] text-mustard/5 leading-none pointer-events-none select-none">&</div>
      <div className="flex justify-between items-center">
        <span className="font-epilogue text-xs font-medium tracking-widest uppercase text-slate">Menu Design & Food Consultancy</span>
        <span className="font-epilogue text-xs text-slate tracking-wider">Est. 2026</span>
      </div>
      <div className="max-w-4xl">
        <p className="font-epilogue text-xs font-medium tracking-widest uppercase text-teal mb-6">Palate & Pen</p>
        <h1 className="font-fraunces font-light text-6xl md:text-8xl lg:text-9xl leading-none tracking-tight text-ink mb-10">
          We make your<br/>menu as good<br/>as your <span className="italic text-mustard">food.</span>
        </h1>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-end gap-8">
        <p className="font-fraunces italic text-lg md:text-xl text-slate max-w-md leading-relaxed border-l-2 border-mustard pl-5">
          Real kitchen experience meets considered design and strategy — so your dishes sell themselves before a single bite.
        </p>
        <div className="flex gap-3 flex-wrap">
          {['Menu Design','GP Strategy','Kitchen Ops','Palatable App'].map(s=>(
            <span key={s} className="font-epilogue text-xs font-medium tracking-wider uppercase bg-ink text-cream px-4 py-2 hover:bg-teal transition-colors cursor-default">{s}</span>
          ))}
        </div>
      </div>
    </section>
  );
}