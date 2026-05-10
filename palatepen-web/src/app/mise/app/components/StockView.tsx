'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import ProGate from './ProGate';

function statusColor(status: string) {
  if (status==='good') return 'bg-mise-green-light';
  if (status==='low') return 'bg-mise-gold';
  return 'bg-mise-red';
}

function getStatus(current: number|null, par: number|null, min: number|null) {
  if (current===null||par===null) return 'unknown';
  if (current<=(min||0)) return 'critical';
  if (current<=par*0.3) return 'low';
  return 'good';
}

export default function StockView() {
  const { tier } = useAuth();
  const { state, actions } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUnit, setAddUnit] = useState('kg');
  const [addPar, setAddPar] = useState('');
  const [addMin, setAddMin] = useState('');
  const [editId, setEditId] = useState<string|null>(null);
  const [countMode, setCountMode] = useState(false);
  const [counts, setCounts] = useState<Record<string,string>>({});

  const stock = state.stockItems||[];

  const filtered = stock.filter((i:any)=>{
    const ms=(i.name||'').toLowerCase().includes(search.toLowerCase());
    if (!ms) return false;
    if (filter==='all') return true;
    return getStatus(i.currentQty,i.parLevel,i.minLevel)===filter;
  });

  const summary = { total:stock.length, good:stock.filter((i:any)=>getStatus(i.currentQty,i.parLevel,i.minLevel)==='good').length, low:stock.filter((i:any)=>getStatus(i.currentQty,i.parLevel,i.minLevel)==='low').length, critical:stock.filter((i:any)=>getStatus(i.currentQty,i.parLevel,i.minLevel)==='critical').length };

  function saveItem() {
    if (!addName.trim()) return;
    actions.addStock({ name:addName.trim(), unit:addUnit, parLevel:parseFloat(addPar)||null, minLevel:parseFloat(addMin)||null, currentQty:null });
    setAddName(''); setAddUnit('kg'); setAddPar(''); setAddMin(''); setShowAdd(false);
  }

  function saveCount() {
    const now=Date.now();
    stock.forEach((i:any)=>{ const v=counts[i.id]; if(v!==undefined&&v!=='') actions.updStock(i.id,{currentQty:parseFloat(v)||0,lastCounted:now}); });
    setCountMode(false);
  }

  return (
    <ProGate feature="stock" title="Stock Counter" tier={tier}
      desc="Set par levels, run your counts, and see Good, Low, and Critical status across your entire store.">
      <div className="p-8 font-epilogue">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="font-fraunces font-light text-3xl text-mise-text mb-1">Stock Counter</h1>
            <p className="text-sm text-mise-faint">{stock.length} items tracked</p>
          </div>
          <div className="flex gap-3">
            {stock.length>0&&<button onClick={()=>{ const c:any={}; stock.forEach((i:any)=>{ c[i.id]=i.currentQty!==null?String(i.currentQty):''; }); setCounts(c); setCountMode(true); }} className="text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg px-5 py-2.5 hover:bg-yellow-400 transition-colors">Count Now</button>}
            <button onClick={()=>setShowAdd(true)} className="text-xs font-medium tracking-widest uppercase border border-mise-border text-mise-dim px-5 py-2.5 hover:border-mise-border-light transition-colors">+ Add Item</button>
          </div>
        </div>

        {/* Summary tabs */}
        {stock.length>0&&(
          <div className="flex border-b border-mise-border mb-6">
            {[{label:'All',val:summary.total,key:'all'},{label:'Good',val:summary.good,key:'good'},{label:'Low',val:summary.low,key:'low'},{label:'Critical',val:summary.critical,key:'critical'}].map(b=>(
              <button key={b.key} onClick={()=>setFilter(b.key)} className={`flex items-center gap-2 px-5 py-3 text-sm border-b-2 transition-colors ${filter===b.key?'border-mise-gold text-mise-gold':'border-transparent text-mise-dim hover:text-mise-text'}`}>
                {b.label} <span className="text-xs bg-mise-surface2 border border-mise-border px-2 py-0.5 rounded">{b.val}</span>
              </button>
            ))}
          </div>
        )}

        {/* Count mode */}
        {countMode&&(
          <div className="mb-6 bg-mise-surface border border-mise-gold/30 p-6">
            <div className="flex justify-between items-center mb-4">
              <p className="font-fraunces font-light text-xl text-mise-text">Stock Count</p>
              <div className="flex gap-3">
                <button onClick={()=>setCountMode(false)} className="text-xs text-mise-dim hover:text-mise-text transition-colors tracking-widest uppercase">Cancel</button>
                <button onClick={saveCount} className="text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg px-4 py-2 hover:bg-yellow-400 transition-colors">Save Count</button>
              </div>
            </div>
            <div className="space-y-2">
              {stock.map((i:any)=>(
                <div key={i.id} className="flex items-center gap-4 bg-mise-surface2 border border-mise-border p-3">
                  <div className="flex-1">
                    <p className="text-sm text-mise-text">{i.name}</p>
                    <p className="text-xs text-mise-faint">Par: {i.parLevel??'—'} · Min: {i.minLevel??'—'} {i.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={counts[i.id]||''} onChange={e=>setCounts(prev=>({...prev,[i.id]:e.target.value}))}
                      placeholder="0" className="w-20 bg-mise-surface border border-mise-border text-mise-text text-sm px-3 py-2 focus:outline-none focus:border-mise-gold text-center" />
                    <span className="text-xs text-mise-faint w-8">{i.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stock..."
          className="w-full bg-mise-surface border border-mise-border text-mise-text text-sm px-4 py-3 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint mb-4" />

        {filtered.length===0?(
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-mise-faint">{stock.length===0?'No stock items yet. Add ingredients to track par levels.':'No items match that filter.'}</p>
          </div>
        ):(
          <div className="space-y-2">
            {filtered.map((item:any)=>{
              const status=getStatus(item.currentQty,item.parLevel,item.minLevel);
              return (
                <div key={item.id} className="flex items-center gap-4 bg-mise-surface border border-mise-border p-5 hover:border-mise-border-light transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor(status)}`}></div>
                  <div className="flex-1">
                    <p className="text-mise-text font-medium mb-1">{item.name}</p>
                    <p className="text-xs text-mise-faint">
                      Current: {item.currentQty!==null?item.currentQty+' '+item.unit:'Not counted'} · Par: {item.parLevel??'—'} · Min: {item.minLevel??'—'}
                      {item.lastCounted&&` · Counted ${Math.floor((Date.now()-item.lastCounted)/86400000)===0?'today':Math.floor((Date.now()-item.lastCounted)/86400000)+'d ago'}`}
                    </p>
                  </div>
                  <span className={`text-xs font-bold tracking-widest uppercase ${status==='good'?'text-mise-green-light':status==='low'?'text-mise-gold':status==='critical'?'text-mise-red':'text-mise-faint'}`}>
                    {status==='unknown'?'—':status.charAt(0).toUpperCase()+status.slice(1)}
                  </span>
                  <button onClick={()=>{ if(confirm('Remove '+item.name+'?')) actions.delStock(item.id); }} className="text-mise-faint hover:text-mise-red transition-colors text-xl">×</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add modal */}
        {showAdd&&(
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-mise-surface border border-mise-border w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b border-mise-border">
                <h3 className="font-fraunces font-light text-xl text-mise-text">Add Stock Item</h3>
                <button onClick={()=>setShowAdd(false)} className="text-mise-faint hover:text-mise-dim text-xl">×</button>
              </div>
              <div className="p-6 space-y-4">
                {[['Ingredient Name',addName,setAddName,'e.g. Chicken Breast'],['Unit',addUnit,setAddUnit,'kg, L, each...'],['Par Level',addPar,setAddPar,'e.g. 10'],['Minimum Level',addMin,setAddMin,'e.g. 3']].map(([label,val,setter,ph]:any)=>(
                  <div key={label}>
                    <label className="text-xs font-bold tracking-widest uppercase text-mise-faint block mb-2">{label}</label>
                    <input value={val} onChange={e=>setter(e.target.value)} placeholder={ph}
                      className="w-full bg-mise-surface2 border border-mise-border text-mise-text text-sm px-3 py-2 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 p-6 border-t border-mise-border">
                <button onClick={()=>setShowAdd(false)} className="flex-1 text-xs font-medium tracking-widest uppercase border border-mise-border text-mise-dim py-2.5 hover:border-mise-border-light transition-colors">Cancel</button>
                <button onClick={saveItem} disabled={!addName.trim()} className="flex-1 text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg py-2.5 hover:bg-yellow-400 transition-colors disabled:opacity-40">Add Item</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProGate>
  );
}