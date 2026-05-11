export default function PalatableMockups() {
  const recipes = [
    { name:'Pan-seared Salmon, Dill Beurre Blanc', cat:'Main', gp:'74%', tag:'Imported', active:true },
    { name:'Beef Bourguignon', cat:'Main', tag:'2 notes', active:false },
    { name:'Sourdough Boule', cat:'Bread', tag:'Imported', active:false },
    { name:'Tarte Tatin, Creme Fraiche', cat:'Dessert', active:false },
  ];

  const invItems = [
    { name:'Chicken breast', qty:'5 kg', price:'8.40/kg' },
    { name:'Butter unsalted', qty:'2 kg', price:'4.20/kg' },
    { name:'Shallots', qty:'1 kg', price:'1.80/kg' },
  ];

  return (
    <section className="py-24 px-8 md:px-16 border-t border-palatable-border bg-palatable-bg">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-16">
          <p className="text-xs font-bold tracking-widest uppercase text-palatable-gold mb-3">See it in action</p>
          <h2 className="font-fraunces font-light text-palatable-text mb-4" style={{fontSize:'clamp(28px,4vw,48px)'}}>
            Built for the way chefs <i className="text-palatable-gold">actually work</i>
          </h2>
          <p className="text-base text-palatable-faint max-w-xl leading-relaxed">
            Every screen designed to save time and protect your margins — on your phone in the kitchen, or on screen in the office.
          </p>
        </div>

        {/* MOCKUP 1 — Recipe Library */}
        <div className="mb-20">
          <div className="mb-6">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-palatable-gold bg-palatable-gold/10 border border-palatable-gold/20 px-3 py-1 mb-3">Feature 01</span>
            <h3 className="font-fraunces font-light text-3xl text-palatable-text mb-3">Recipe Library</h3>
            <p className="text-sm text-palatable-faint leading-relaxed max-w-2xl">
              Your full recipe catalogue in one place. Import from any website with one tap — Claude AI reads the page and pulls in ingredients, method and timings automatically. Link recipes to your notebook ideas and cost them directly in the GP calculator.
            </p>
          </div>
          <div className="flex gap-5 items-start">
            {/* Browser */}
            <div className="flex-1 bg-palatable-surface border border-palatable-border rounded-lg overflow-hidden min-w-0">
              <div className="bg-palatable-surface2 border-b border-palatable-border px-3 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-palatable-border-light"></div><div className="w-2.5 h-2.5 rounded-full bg-palatable-border-light"></div><div className="w-2.5 h-2.5 rounded-full bg-palatable-border-light"></div></div>
                <div className="flex-1 bg-palatable-bg rounded px-3 py-1 text-xs text-palatable-faint">palateandpen.co.uk/palatable/app &middot; Recipes</div>
              </div>
              <div className="flex h-64">
                <Sidebar active="recipes" />
                <div className="flex-1 p-4 overflow-hidden">
                  <p className="text-xs font-medium text-palatable-text mb-1">Recipe Library</p>
                  <p className="text-xs text-palatable-faint mb-3">12 recipes saved</p>
                  {recipes.map(r=>(
                    <div key={r.name} className={`flex items-center gap-2 px-3 py-2 border rounded mb-1.5 ${r.active?'border-palatable-gold/30 bg-palatable-gold/5':'border-palatable-border bg-palatable-surface2'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.active?'bg-palatable-gold':'bg-palatable-border-light'}`}></div>
                      <span className="text-xs text-palatable-dim flex-1 truncate">{r.name}</span>
                      <span className="text-xs font-bold text-palatable-gold bg-palatable-gold/10 border border-palatable-gold/20 px-1.5 py-0.5 rounded flex-shrink-0">{r.cat}</span>
                      {r.gp&&<span className="text-xs font-bold text-palatable-gold bg-palatable-gold/10 border border-palatable-gold/20 px-1.5 py-0.5 rounded flex-shrink-0">GP {r.gp}</span>}
                      {r.tag&&<span className="text-xs text-palatable-faint bg-palatable-surface3 border border-palatable-border px-1.5 py-0.5 rounded flex-shrink-0">{r.tag}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Phone */}
            <Phone>
              <div className="text-xs font-medium text-palatable-text mb-0.5">Recipe Library</div>
              <div className="text-xs text-palatable-faint mb-2">12 recipes saved</div>
              {recipes.slice(0,3).map(r=>(
                <div key={r.name} className={`p-2 border rounded mb-1.5 ${r.active?'border-palatable-gold/30 bg-palatable-gold/5':'border-palatable-border bg-palatable-surface2'}`}>
                  <div className="text-xs text-palatable-dim mb-1 truncate">{r.name}</div>
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-xs font-bold text-palatable-gold bg-palatable-gold/10 border border-palatable-gold/20 px-1.5 py-0.5 rounded">{r.cat}</span>
                    {r.gp&&<span className="text-xs font-bold text-palatable-gold bg-palatable-gold/10 border border-palatable-gold/20 px-1.5 py-0.5 rounded">GP {r.gp}</span>}
                    {r.tag&&<span className="text-xs text-palatable-faint bg-palatable-surface3 border border-palatable-border px-1.5 py-0.5 rounded">{r.tag}</span>}
                  </div>
                </div>
              ))}
            </Phone>
          </div>
        </div>

        <div className="h-px bg-palatable-border mb-20"></div>

        {/* MOCKUP 2 — GP Calculator */}
        <div className="mb-20">
          <div className="mb-6">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-palatable-gold bg-palatable-gold/10 border border-palatable-gold/20 px-3 py-1 mb-3">Feature 02</span>
            <h3 className="font-fraunces font-light text-3xl text-palatable-text mb-3">GP Calculator</h3>
            <p className="text-sm text-palatable-faint leading-relaxed max-w-2xl">
              Cost any dish at ingredient level. Enter your sell price, add every ingredient with quantity and unit cost, and Palatable calculates your gross profit instantly. Benchmark bars show you against your own target and the industry standard — with smart advice on what to adjust.
            </p>
          </div>
          <div className="flex gap-5 items-start">
            <div className="flex-1 bg-palatable-surface border border-palatable-border rounded-lg overflow-hidden min-w-0">
              <div className="bg-palatable-surface2 border-b border-palatable-border px-3 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-palatable-border-light"></div><div className="w-2.5 h-2.5 rounded-full bg-palatable-border-light"></div><div className="w-2.5 h-2.5 rounded-full bg-palatable-border-light"></div></div>
                <div className="flex-1 bg-palatable-bg rounded px-3 py-1 text-xs text-palatable-faint">palateandpen.co.uk/palatable/app &middot; GP Calc</div>
              </div>
              <div className="flex h-64">
                <Sidebar active="gp" />
                <div className="flex-1 p-4 overflow-hidden">
                  <p className="text-xs font-medium text-palatable-text mb-1">GP Calculator</p>
                  <p className="text-xs text-palatable-faint mb-3">Pan-seared Salmon &mdash; sell price &pound;18.50 &middot; 4 ingredients</p>
                  <div className="grid grid-cols-4 border border-palatable-border rounded mb-3 overflow-hidden">
                    {[{l:'Sell',v:'£18.50',c:'text-palatable-text'},{l:'Cost',v:'£4.83',c:'text-palatable-text'},{l:'GP £',v:'£13.67',c:'text-palatable-green-light'},{l:'GP %',v:'73.9%',c:'text-palatable-gold'}].map((cell,i)=>(
                      <div key={cell.l} className={`p-2.5 text-center ${i<3?'border-r border-palatable-border':''}`}>
                        <div className="text-xs text-palatable-faint mb-1">{cell.l}</div>
                        <div className={`text-sm font-light ${cell.c}`}>{cell.v}</div>
                      </div>
                    ))}
                  </div>
                  {[{l:'Your GP',v:'73.9%',w:'74%',c:'bg-palatable-gold',tc:'text-palatable-gold'},{l:'Target 70%',v:'70%',w:'70%',c:'bg-palatable-green',tc:'text-palatable-green-light'},{l:'Industry min 65%',v:'65%',w:'65%',c:'bg-palatable-border-light',tc:'text-palatable-faint'}].map(b=>(
                    <div key={b.l} className="mb-2">
                      <div className="flex justify-between text-xs mb-1"><span className="text-palatable-faint">{b.l}</span><span className={b.tc}>{b.v}</span></div>
                      <div className="h-1.5 bg-palatable-surface3 rounded-full overflow-hidden"><div className={`h-1.5 ${b.c} rounded-full`} style={{width:b.w}}></div></div>
                    </div>
                  ))}
                  <div className="text-xs text-palatable-green-light bg-palatable-green/10 border border-palatable-green/20 px-3 py-2 rounded mt-2">On target &mdash; GP of 73.9% meets your 70% goal</div>
                </div>
              </div>
            </div>
            <Phone>
              <div className="text-xs font-medium text-palatable-text mb-0.5">GP Calculator</div>
              <div className="text-xs text-palatable-faint mb-2">Salmon &middot; &pound;18.50 sell</div>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {[{l:'Sell',v:'£18.50',gold:false},{l:'Cost',v:'£4.83',gold:false},{l:'GP %',v:'73.9%',gold:true}].map(c=>(
                  <div key={c.l} className={`p-1.5 border rounded text-center ${c.gold?'border-palatable-gold/30 bg-palatable-gold/5':'border-palatable-border bg-palatable-surface2'}`}>
                    <div className="text-xs text-palatable-faint mb-0.5">{c.l}</div>
                    <div className={`text-xs font-medium ${c.gold?'text-palatable-gold':'text-palatable-text'}`}>{c.v}</div>
                  </div>
                ))}
              </div>
              {[{l:'Your GP',v:'73.9%',w:'74%',c:'bg-palatable-gold'},{l:'Target',v:'70%',w:'70%',c:'bg-palatable-green'}].map(b=>(
                <div key={b.l} className="mb-1.5">
                  <div className="flex justify-between text-xs text-palatable-faint mb-1"><span>{b.l}</span><span>{b.v}</span></div>
                  <div className="h-1 bg-palatable-surface3 rounded-full overflow-hidden"><div className={`h-1 ${b.c} rounded-full`} style={{width:b.w}}></div></div>
                </div>
              ))}
              <div className="text-xs text-palatable-green-light bg-palatable-green/10 border border-palatable-green/20 px-2 py-1.5 rounded mt-2">On target &mdash; above 70% goal</div>
            </Phone>
          </div>
        </div>

        <div className="h-px bg-palatable-border mb-20"></div>

        {/* MOCKUP 3 — Invoice Scanning */}
        <div className="mb-4">
          <div className="mb-6">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-palatable-gold bg-palatable-gold/10 border border-palatable-gold/20 px-3 py-1 mb-3">Feature 03 &mdash; Pro</span>
            <h3 className="font-fraunces font-light text-3xl text-palatable-text mb-3">Invoice Scanning</h3>
            <p className="text-sm text-palatable-faint leading-relaxed max-w-2xl">
              Photograph any supplier invoice and Claude AI extracts every ingredient, quantity and unit price in seconds. Your ingredients bank updates automatically &mdash; and Palatable flags any price changes against your last delivery, so you always know when your costs are moving.
            </p>
          </div>
          <div className="flex gap-5 items-start">
            <div className="flex-1 bg-palatable-surface border border-palatable-border rounded-lg overflow-hidden min-w-0">
              <div className="bg-palatable-surface2 border-b border-palatable-border px-3 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-palatable-border-light"></div><div className="w-2.5 h-2.5 rounded-full bg-palatable-border-light"></div><div className="w-2.5 h-2.5 rounded-full bg-palatable-border-light"></div></div>
                <div className="flex-1 bg-palatable-bg rounded px-3 py-1 text-xs text-palatable-faint">palateandpen.co.uk/palatable/app &middot; Invoices</div>
              </div>
              <div className="flex h-64">
                <Sidebar active="invoices" />
                <div className="flex-1 p-4 overflow-hidden">
                  <p className="text-xs font-medium text-palatable-text mb-1">Ingredients Bank</p>
                  <p className="text-xs text-palatable-faint mb-3">Brakes invoice scanned &mdash; 11 items extracted</p>
                  <div className="bg-red-900/10 border border-red-800/30 rounded p-3 mb-3">
                    <p className="text-xs font-bold text-red-400 mb-2">2 Price Changes Detected</p>
                    {[{n:'Salmon fillet (kg)',from:'14.20',to:'15.80',pct:'+11.3%'},{n:'Double cream (L)',from:'2.40',to:'2.65',pct:'+10.4%'}].map(a=>(
                      <div key={a.n} className="flex items-center gap-2 bg-red-900/10 border border-red-800/20 rounded px-2 py-1.5 mb-1.5 last:mb-0">
                        <span className="text-xs text-palatable-dim flex-1">{a.n}</span>
                        <span className="text-xs text-palatable-faint">&pound;{a.from} &rarr; &pound;{a.to}</span>
                        <span className="text-xs font-bold text-red-400 bg-red-900/20 border border-red-800/20 px-1.5 py-0.5 rounded">{a.pct}</span>
                      </div>
                    ))}
                  </div>
                  {invItems.map(item=>(
                    <div key={item.name} className="flex items-center gap-2 px-3 py-2 bg-palatable-surface2 border border-palatable-border rounded mb-1.5">
                      <div className="w-3.5 h-3.5 rounded bg-palatable-gold flex items-center justify-center flex-shrink-0"><span className="text-palatable-bg text-xs font-bold">&check;</span></div>
                      <span className="text-xs text-palatable-dim flex-1">{item.name}</span>
                      <span className="text-xs text-palatable-faint">{item.qty}</span>
                      <span className="text-xs font-medium text-palatable-gold">&pound;{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Phone>
              <div className="text-xs font-medium text-palatable-text mb-0.5">Invoice Scan</div>
              <div className="text-xs text-palatable-faint mb-2">Brakes &middot; 11 items</div>
              <div className="bg-red-900/10 border border-red-800/30 rounded p-2 mb-2">
                <div className="text-xs font-bold text-red-400 mb-1.5">2 price alerts</div>
                {[{n:'Salmon fillet',p:'+11.3%'},{n:'Double cream',p:'+10.4%'}].map(a=>(
                  <div key={a.n} className="flex justify-between text-xs mb-1 last:mb-0">
                    <span className="text-palatable-dim">{a.n}</span>
                    <span className="text-red-400 font-bold">{a.p}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-palatable-faint mb-2 tracking-widest uppercase" style={{fontSize:'9px'}}>Extracted items</div>
              {invItems.map(item=>(
                <div key={item.name} className="flex items-center gap-1.5 px-2 py-1.5 bg-palatable-surface2 border border-palatable-border rounded mb-1.5">
                  <div className="w-3 h-3 rounded bg-palatable-gold flex items-center justify-center flex-shrink-0"><span className="text-palatable-bg font-bold" style={{fontSize:'7px'}}>&check;</span></div>
                  <span className="text-xs text-palatable-dim flex-1 truncate">{item.name}</span>
                  <span className="text-xs text-palatable-gold font-medium">&pound;{item.price}</span>
                </div>
              ))}
            </Phone>
          </div>
        </div>

      </div>
    </section>
  );
}

function Sidebar({ active }: { active: string }) {
  const items = [
    { id:'recipes', label:'Recipes' },
    { id:'notebook', label:'Notebook' },
    { id:'gp', label:'GP Calc' },
    { id:'invoices', label:'Invoices' },
    { id:'stock', label:'Stock' },
    { id:'profile', label:'Profile' },
  ];
  return (
    <div className="w-32 bg-palatable-surface2 border-r border-palatable-border p-3 flex-shrink-0">
      <div className="flex items-center gap-1 pb-3 mb-3 border-b border-palatable-border">
        <span className="font-fraunces font-bold italic text-palatable-text text-base" style={{letterSpacing:'-0.5px'}}>M</span>
        <div className="w-1.5 h-1.5 rounded-full bg-palatable-gold" style={{marginBottom:'5px'}}></div>
        <span className="font-fraunces font-light text-palatable-text text-base" style={{letterSpacing:'3px'}}>ISE</span>
      </div>
      {items.map(item=>(
        <div key={item.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs mb-0.5 ${item.id===active?'bg-palatable-gold/10 border border-palatable-gold/20 text-palatable-gold':'text-palatable-faint'}`}>
          <div className={`w-1 h-1 rounded-full ${item.id===active?'bg-palatable-gold':'bg-palatable-border-light'}`}></div>
          {item.label}
        </div>
      ))}
    </div>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-44 bg-palatable-surface border-2 border-palatable-border rounded-3xl overflow-hidden flex-shrink-0">
      <div className="h-5 bg-palatable-bg flex items-center justify-center">
        <div className="w-10 h-1.5 bg-palatable-border rounded-full"></div>
      </div>
      <div className="px-3 pt-2 pb-3">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-palatable-border">
          <div className="flex items-center gap-1">
            <span className="font-fraunces font-bold italic text-palatable-text text-base" style={{letterSpacing:'-0.5px'}}>M</span>
            <div className="w-1.5 h-1.5 rounded-full bg-palatable-gold" style={{marginBottom:'5px'}}></div>
            <span className="font-fraunces font-light text-palatable-text text-base" style={{letterSpacing:'3px'}}>ISE</span>
          </div>
          <div className="w-4 h-4 rounded bg-palatable-surface2 border border-palatable-border"></div>
        </div>
        {children}
      </div>
    </div>
  );
}