'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';

const UNITS = ['kg','g','L','ml','each','bunch','tbsp','oz','lb'];

function gpColor(pct: number, target: number) {
  if (pct >= target) return 'text-mise-green-light';
  if (pct >= 65) return 'text-mise-gold';
  return 'text-mise-red';
}

export default function GPView() {
  const { state, actions } = useApp();
  const profile = state.profile||{};
  const sym = profile.currencySymbol||'£';
  const gpTarget = profile.gpTarget||70;
  const [dish, setDish] = useState('');
  const [sell, setSell] = useState('');
  const [target, setTarget] = useState(String(gpTarget));
  const [portions, setPortions] = useState('1');
  const [ings, setIngs] = useState<any[]>([]);
  const [ingName, setIngName] = useState('');
  const [ingQty, setIngQty] = useState('');
  const [ingUnit, setIngUnit] = useState('kg');
  const [ingPrice, setIngPrice] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const s = parseFloat(sell)||0;
  const p = parseInt(portions)||1;
  const totalCost = ings.reduce((a,b)=>a+b.line,0);
  const cost = totalCost/p;
  const gp = s-cost;
  const pct = s>0?(gp/s)*100:0;
  const tgt = parseFloat(target)||gpTarget;

  function addIng() {
    if (!ingName||!ingQty||!ingPrice) return;
    const qty=parseFloat(ingQty)||0, price=parseFloat(ingPrice)||0;
    let line=qty*price;
    if(ingUnit==='g') line=(qty/1000)*price;
    if(ingUnit==='ml') line=(qty/1000)*price;
    setIngs(prev=>[...prev,{ id:Date.now().toString(), name:ingName, qty, unit:ingUnit, price, line }]);
    setIngName(''); setIngQty(''); setIngPrice('');
  }

  if (showHistory) return (
    <div className="p-8 font-epilogue">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-fraunces font-light text-3xl text-mise-text">GP History</h1>
        <button onClick={()=>setShowHistory(false)} className="text-mise-gold text-sm hover:text-yellow-400 transition-colors">← Calculator</button>
      </div>
      {state.gpHistory.length===0?(
        <div className="text-center py-20"><p className="text-mise-faint">No saved calculations yet.</p></div>
      ):(
        <div className="space-y-3">
          {state.gpHistory.map((h:any)=>(
            <div key={h.id} className="flex items-center gap-4 bg-mise-surface border border-mise-border p-5">
              <div className="flex-1">
                <p className="text-mise-text font-medium mb-1">{h.name}</p>
                <p className="text-xs text-mise-faint">Sell {sym}{(h.sell||0).toFixed(2)} · Cost {sym}{(h.cost||0).toFixed(2)}/cover</p>
              </div>
              <p className={`font-fraunces font-light text-3xl ${gpColor(h.pct||0,h.target||70)}`}>{(h.pct||0).toFixed(1)}%</p>
              <button onClick={()=>actions.delGP(h.id)} className="text-mise-faint hover:text-mise-red transition-colors text-xl">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8 font-epilogue max-w-5xl">
      <div className="flex justify-between items-start mb-8">
        <h1 className="font-fraunces font-light text-3xl text-mise-text">GP Calculator</h1>
        <div className="flex gap-3">
          <button onClick={()=>setShowHistory(true)} className="text-xs font-medium tracking-widest uppercase border border-mise-border text-mise-dim px-4 py-2 hover:border-mise-border-light transition-colors">History</button>
          <button onClick={()=>{ setDish(''); setSell(''); setPortions('1'); setIngs([]); }} className="text-xs font-medium tracking-widest uppercase border border-mise-border text-mise-dim px-4 py-2 hover:border-mise-border-light transition-colors">Clear</button>
        </div>
      </div>

      {/* Results bar */}
      <div className="grid grid-cols-4 gap-px bg-mise-border border border-mise-border mb-8">
        {[{label:'Sell',val:s>0?sym+s.toFixed(2):'—',c:'text-mise-text'},{label:'Cost/Cover',val:cost>0?sym+cost.toFixed(2):'—',c:'text-mise-text'},{label:'GP',val:s>0?sym+gp.toFixed(2):'—',c:'text-mise-text'},{label:'GP %',val:s>0?pct.toFixed(1)+'%':'—',c:gpColor(pct,tgt)}].map(r=>(
          <div key={r.label} className="bg-mise-surface p-5 text-center">
            <p className="text-xs font-bold tracking-widest uppercase text-mise-faint mb-2">{r.label}</p>
            <p className={`font-fraunces font-light text-2xl ${r.c}`}>{r.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left — dish details */}
        <div className="space-y-4">
          <h2 className="font-fraunces font-light text-xl text-mise-text">Dish Details</h2>
          {[['Dish Name',dish,setDish,'e.g. Pan-seared Salmon','text'],['Selling Price ('+sym+' excl. VAT)',sell,setSell,'0.00','number'],['GP Target %',target,setTarget,String(gpTarget),'number'],['Covers / Portions',portions,setPortions,'1','number']].map(([label,val,setter,ph,type]:any)=>(
            <div key={label}>
              <label className="text-xs font-bold tracking-widest uppercase text-mise-faint block mb-2">{label}</label>
              <input type={type} value={val} onChange={e=>setter(e.target.value)} placeholder={ph}
                className="w-full bg-mise-surface border border-mise-border text-mise-text text-sm px-4 py-3 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
            </div>
          ))}

          {/* Benchmark bars */}
          {s>0&&(
            <div className="bg-mise-surface border border-mise-border p-5 mt-4">
              <p className="text-xs font-bold tracking-widest uppercase text-mise-faint mb-4">GP Benchmark</p>
              {[{label:'Your GP',val:pct,color:'bg-mise-gold'},{label:`Target ${tgt}%`,val:tgt,color:'bg-mise-green'},{label:'Industry Min 65%',val:65,color:'bg-mise-border-light'}].map(b=>(
                <div key={b.label} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-mise-faint">{b.label}</span>
                    <span className="text-mise-dim">{b.val.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-mise-surface3 rounded-full overflow-hidden">
                    <div className={`h-1.5 ${b.color} rounded-full transition-all duration-500`} style={{width:Math.min(Math.max(b.val,0),100)+'%'}}></div>
                  </div>
                </div>
              ))}
              <p className={`text-sm mt-3 ${gpColor(pct,tgt)}`}>
                {pct>=tgt?`On target! GP of ${pct.toFixed(1)}% meets your ${tgt}% goal.`:pct>=65?`GP of ${pct.toFixed(1)}% is below your ${tgt}% target. Price at ${sym}${(cost/(1-tgt/100)).toFixed(2)} to hit target.`:`GP of ${pct.toFixed(1)}% is below industry standard.Give the dish a review.`}
              </p>
            </div>
          )}

          <button onClick={()=>{ if(!dish.trim()) return; actions.addGP({ name:dish, sell:s, cost, gp, pct, currency:profile.currency||'GBP', target:tgt }); alert(dish+' saved to history.'); }}
            disabled={!dish.trim()||!s}
            className="w-full text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg py-3 hover:bg-yellow-400 transition-colors disabled:opacity-40">
            Save Calculation
          </button>
        </div>

        {/* Right — ingredients */}
        <div>
          <h2 className="font-fraunces font-light text-xl text-mise-text mb-4">Ingredients & Costs</h2>
          {ings.length>0&&(
            <div className="mb-4 border border-mise-border">
              <div className="grid grid-cols-5 gap-0 bg-mise-surface2 border-b border-mise-border">
                {['Ingredient','Qty','Cost/unit','Line',''].map((h,i)=>(
                  <div key={i} className="px-3 py-2 text-xs font-bold tracking-widest uppercase text-mise-faint">{h}</div>
                ))}
              </div>
              {ings.map(ing=>(
                <div key={ing.id} className="grid grid-cols-5 border-b border-mise-border last:border-0">
                  <div className="px-3 py-2 text-xs text-mise-text truncate">{ing.name}</div>
                  <div className="px-3 py-2 text-xs text-mise-dim">{ing.qty}{ing.unit}</div>
                  <div className="px-3 py-2 text-xs text-mise-dim">{sym}{ing.price.toFixed(2)}</div>
                  <div className="px-3 py-2 text-xs text-mise-gold">{sym}{ing.line.toFixed(3)}</div>
                  <div className="px-3 py-2 flex justify-end">
                    <button onClick={()=>setIngs(prev=>prev.filter(i=>i.id!==ing.id))} className="text-mise-faint hover:text-mise-red transition-colors">×</button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 bg-mise-surface2">
                <span className="text-xs text-mise-dim">Total ingredient cost</span>
                <span className="text-xs font-bold text-mise-gold">{sym}{totalCost.toFixed(3)}</span>
              </div>
            </div>
          )}

          <div className="space-y-3 bg-mise-surface border border-mise-border p-4">
            <p className="text-xs font-bold tracking-widest uppercase text-mise-faint">Add Ingredient</p>
            <input value={ingName} onChange={e=>setIngName(e.target.value)} placeholder="Ingredient name"
              className="w-full bg-mise-surface2 border border-mise-border text-mise-text text-sm px-3 py-2 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
            <div className="flex gap-2">
              <input value={ingQty} onChange={e=>setIngQty(e.target.value)} placeholder="Qty" type="number"
                className="flex-1 bg-mise-surface2 border border-mise-border text-mise-text text-sm px-3 py-2 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
              <select value={ingUnit} onChange={e=>setIngUnit(e.target.value)}
                className="bg-mise-surface2 border border-mise-border text-mise-text text-sm px-3 py-2 focus:outline-none">
                {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
              </select>
              <input value={ingPrice} onChange={e=>setIngPrice(e.target.value)} placeholder={sym+'/'+ingUnit} type="number"
                className="flex-1 bg-mise-surface2 border border-mise-border text-mise-text text-sm px-3 py-2 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
            </div>
            <button onClick={addIng} disabled={!ingName||!ingQty||!ingPrice}
              className="w-full text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg py-2.5 hover:bg-yellow-400 transition-colors disabled:opacity-40">
              + Add Ingredient
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}