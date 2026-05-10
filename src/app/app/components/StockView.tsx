'use client';
import { useState } from 'react';
import { useApp, uid } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';

function getStatus(qty: number|null, par: number|null, min: number|null) {
  if (qty===null||par===null) return 'unknown';
  if (qty<=(min||0)) return 'critical';
  if (qty<=par*0.3) return 'low';
  return 'good';
}

function statusColor(s: string, C: any) {
  if (s==='good') return C.greenLight;
  if (s==='low') return C.gold;
  if (s==='critical') return C.red;
  return C.faint;
}

export default function StockView() {
  const { state, actions } = useApp();
  const { tier } = useAuth();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const sym = (state.profile||{}).currencySymbol||'\u00a3';
  const bank = state.ingredientsBank||[];
  const stock = state.stockItems||[];
  const profile = state.profile||{};

  const [view, setView] = useState<'list'|'count'|'report'>('list');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [counts, setCounts] = useState<Record<string,string>>({});
  const [prevCounts, setPrevCounts] = useState<Record<string,number>>({});
  const [addName, setAddName] = useState('');
  const [addUnit, setAddUnit] = useState('kg');
  const [addPar, setAddPar] = useState('');
  const [addMin, setAddMin] = useState('');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [bankSearch, setBankSearch] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);

  const summary = {
    total: stock.length,
    good: stock.filter((i:any)=>getStatus(i.currentQty,i.parLevel,i.minLevel)==='good').length,
    low: stock.filter((i:any)=>getStatus(i.currentQty,i.parLevel,i.minLevel)==='low').length,
    critical: stock.filter((i:any)=>getStatus(i.currentQty,i.parLevel,i.minLevel)==='critical').length,
  };

  const totalValue = stock.reduce((acc:number,i:any)=>{
    const bankItem = bank.find((b:any)=>b.name.toLowerCase()===i.name.toLowerCase());
    const price = bankItem?.unitPrice || i.unitPrice || 0;
    return acc + ((i.currentQty||0) * price);
  }, 0);

  const filtered = stock.filter((i:any)=>{
    const ms=(i.name||'').toLowerCase().includes(search.toLowerCase());
    if (!ms) return false;
    if (filter==='all') return true;
    return getStatus(i.currentQty,i.parLevel,i.minLevel)===filter;
  });

  function startCount() {
    const c: Record<string,string> = {};
    const p: Record<string,number> = {};
    stock.forEach((i:any)=>{ c[i.id]=i.currentQty!==null?String(i.currentQty):''; p[i.id]=i.currentQty||0; });
    setCounts(c); setPrevCounts(p); setView('count');
  }

  function saveCount() {
    const now=Date.now();
    stock.forEach((i:any)=>{
      const v=counts[i.id];
      if(v!==undefined&&v!=='') actions.updStock(i.id,{currentQty:parseFloat(v)||0,lastCounted:now,prevQty:prevCounts[i.id]||0});
    });
    setView('report');
  }

  function saveItem() {
    if (!addName.trim()) return;
    const bankMatch = bank.find((b:any)=>b.name.toLowerCase()===addName.toLowerCase());
    actions.addStock({name:addName.trim(),unit:addUnit,parLevel:parseFloat(addPar)||null,minLevel:parseFloat(addMin)||null,unitPrice:bankMatch?.unitPrice||null,currentQty:null,lastCounted:null});
    setAddName(''); setAddUnit('kg'); setAddPar(''); setAddMin(''); setShowAdd(false);
  }

  const input: any = { width:'100%', background:C.surface2, border:`1px solid ${C.border}`, color:C.text, fontSize:'13px', padding:'9px 12px', outline:'none', fontFamily:'system-ui,sans-serif', boxSizing:'border-box' };
  const card: any = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:'4px' };

  const nextStockDate = () => {
    const day = profile.stockDay||1;
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), day);
    if (next <= now) next.setMonth(next.getMonth()+1);
    return next.toLocaleDateString('en-GB',{day:'numeric',month:'long'});
  };

  // Report view
  if (view==='report') {
    const usageItems = stock.map((i:any)=>{
      const prev = prevCounts[i.id]||0;
      const curr = i.currentQty||0;
      const usage = prev - curr;
      const bankItem = bank.find((b:any)=>b.name.toLowerCase()===i.name.toLowerCase());
      const price = bankItem?.unitPrice || i.unitPrice || 0;
      const value = curr * price;
      const usageValue = usage * price;
      return {...i, prev, usage, usageValue, value, price};
    });
    const totalCurrentValue = usageItems.reduce((a:number,i:any)=>a+i.value,0);
    const totalUsageValue = usageItems.reduce((a:number,i:any)=>a+i.usageValue,0);

    return (
      <div style={{padding:'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <div>
            <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text,marginBottom:'4px'}}>Stock Report</h1>
            <p style={{fontSize:'12px',color:C.faint}}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>window.print()} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'8px 14px',cursor:'pointer',borderRadius:'2px'}}>Print</button>
            <button onClick={()=>setView('list')} style={{fontSize:'11px',fontWeight:700,background:C.gold,color:C.bg,border:'none',padding:'8px 16px',cursor:'pointer',borderRadius:'2px'}}>Done</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'24px'}}>
          {[
            {l:'Closing Stock Value',v:`${sym}${totalCurrentValue.toFixed(2)}`},
            {l:'Usage Value',v:`${sym}${totalUsageValue.toFixed(2)}`},
            {l:'Items Counted',v:String(stock.length)},
          ].map(s=>(
            <div key={s.l} style={{...card,padding:'16px',textAlign:'center'}}>
              <p style={{fontSize:'10px',letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint,marginBottom:'6px'}}>{s.l}</p>
              <p style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'24px',color:C.gold}}>{s.v}</p>
            </div>
          ))}
        </div>

        <div style={{...card,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr',padding:'10px 16px',background:C.surface2,borderBottom:`1px solid ${C.border}`,gap:'8px'}}>
            {['Item','Unit Price','Prev Qty','Curr Qty','Usage','Value'].map(h=>(
              <p key={h} style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint}}>{h}</p>
            ))}
          </div>
          {usageItems.map((i:any)=>{
            const anomaly = i.usage > (i.parLevel||10)*0.8;
            return (
              <div key={i.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr',padding:'12px 16px',borderBottom:`1px solid ${C.border}`,gap:'8px',alignItems:'center',background:anomaly?`${C.red}06`:C.surface}}>
                <div>
                  <p style={{fontSize:'13px',color:C.text}}>{i.name}</p>
                  {anomaly&&<p style={{fontSize:'10px',color:C.red,fontWeight:700}}>High usage — check portioning</p>}
                </div>
                <p style={{fontSize:'13px',color:C.dim}}>{i.price?`${sym}${i.price.toFixed(2)}`:'—'}</p>
                <p style={{fontSize:'13px',color:C.dim}}>{i.prev} {i.unit}</p>
                <p style={{fontSize:'13px',color:C.text}}>{i.currentQty||0} {i.unit}</p>
                <p style={{fontSize:'13px',color:i.usage>0?C.red:C.greenLight}}>{i.usage>0?'+':''}{i.usage.toFixed(1)} {i.unit}</p>
                <p style={{fontSize:'13px',color:C.gold}}>{sym}{i.value.toFixed(2)}</p>
              </div>
            );
          })}
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr',padding:'12px 16px',background:C.surface2,gap:'8px'}}>
            <p style={{fontSize:'12px',fontWeight:700,color:C.text,gridColumn:'span 5'}}>Total closing stock value</p>
            <p style={{fontSize:'14px',fontWeight:700,color:C.gold}}>{sym}{totalCurrentValue.toFixed(2)}</p>
          </div>
        </div>
      </div>
    );
  }

  // Count mode
  if (view==='count') return (
    <div style={{padding:'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
        <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text}}>Stock Count</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setView('list')} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'8px 14px',cursor:'pointer',borderRadius:'2px'}}>Cancel</button>
          <button onClick={saveCount} style={{fontSize:'11px',fontWeight:700,background:C.gold,color:C.bg,border:'none',padding:'8px 16px',cursor:'pointer',borderRadius:'2px'}}>Save &amp; View Report</button>
        </div>
      </div>
      <p style={{fontSize:'13px',color:C.faint,marginBottom:'20px'}}>Enter current quantities. Leave blank to skip.</p>
      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
        {stock.map((i:any)=>{
          const bankItem = bank.find((b:any)=>b.name.toLowerCase()===i.name.toLowerCase());
          const price = bankItem?.unitPrice || i.unitPrice;
          return (
            <div key={i.id} style={{display:'flex',alignItems:'center',gap:'12px',background:C.surface,border:`1px solid ${C.border}`,borderRadius:'4px',padding:'14px 16px'}}>
              <div style={{flex:1}}>
                <p style={{fontSize:'14px',color:C.text,marginBottom:'3px'}}>{i.name}</p>
                <p style={{fontSize:'11px',color:C.faint}}>Par: {i.parLevel??'—'} · Min: {i.minLevel??'—'} {i.unit}{price?` · ${sym}${price.toFixed(2)}/${i.unit}`:''}</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <input type="number" value={counts[i.id]||''} onChange={e=>setCounts(prev=>({...prev,[i.id]:e.target.value}))}
                  placeholder="0" style={{width:'80px',background:C.surface2,border:`1px solid ${C.border}`,color:C.text,fontSize:'16px',padding:'8px 12px',outline:'none',textAlign:'center',fontFamily:'system-ui,sans-serif'}} />
                <p style={{fontSize:'12px',color:C.faint,width:'32px'}}>{i.unit}</p>
                {counts[i.id]&&price&&(
                  <p style={{fontSize:'12px',color:C.gold,width:'64px'}}>{sym}{(parseFloat(counts[i.id])*price).toFixed(2)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // List view
  return (
    <div style={{padding:'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:'24px'}}>
        <div>
          <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text,marginBottom:'4px'}}>Stock</h1>
          <p style={{fontSize:'12px',color:C.faint}}>Next stock take: {nextStockDate()} · Total value: {sym}{totalValue.toFixed(2)}</p>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',justifyContent:'flex-end'}}>
          {stock.length>0&&<button onClick={startCount} style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',background:C.gold,color:C.bg,border:'none',padding:'10px 16px',cursor:'pointer',borderRadius:'2px'}}>Start Count</button>}
          <button onClick={()=>setShowBankPicker(true)} style={{fontSize:'11px',color:C.gold,background:`${C.gold}12`,border:`1px solid ${C.gold}30`,padding:'10px 14px',cursor:'pointer',borderRadius:'2px'}}>From Bank</button>
          <button onClick={()=>setShowAdd(true)} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'10px 14px',cursor:'pointer',borderRadius:'2px'}}>+ Add Item</button>
        </div>
      </div>

      {stock.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'3px',marginBottom:'20px',background:C.border}}>
          {[{l:'Total',v:summary.total,c:C.text,k:'all'},{l:'Good',v:summary.good,c:C.greenLight,k:'good'},{l:'Low',v:summary.low,c:C.gold,k:'low'},{l:'Critical',v:summary.critical,c:C.red,k:'critical'}].map(b=>(
            <button key={b.k} onClick={()=>setFilter(b.k)} style={{background:filter===b.k?C.surface2:C.surface,padding:'14px',textAlign:'center',border:'none',cursor:'pointer',borderBottom:filter===b.k?`2px solid ${C.gold}`:'2px solid transparent'}}>
              <p style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'24px',color:b.c,marginBottom:'4px'}}>{b.v}</p>
              <p style={{fontSize:'10px',letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint}}>{b.l}</p>
            </button>
          ))}
        </div>
      )}

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stock..."
        style={{width:'100%',background:C.surface,border:`1px solid ${C.border}`,color:C.text,fontSize:'14px',padding:'12px 14px',outline:'none',fontFamily:'system-ui,sans-serif',marginBottom:'16px',boxSizing:'border-box'}} />

      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'60px 0'}}>
          <p style={{fontSize:'13px',color:C.faint}}>{stock.length===0?'No stock items yet. Add ingredients to track par levels and values.':'No items match that filter.'}</p>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {filtered.map((item:any)=>{
            const status=getStatus(item.currentQty,item.parLevel,item.minLevel);
            const sc=statusColor(status,C);
            const bankItem = bank.find((b:any)=>b.name.toLowerCase()===item.name.toLowerCase());
            const price = bankItem?.unitPrice || item.unitPrice || 0;
            const value = (item.currentQty||0)*price;
            return (
              <div key={item.id} style={{...card,padding:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:sc,flexShrink:0}}></div>
                <div style={{flex:1}}>
                  <p style={{fontSize:'14px',color:C.text,marginBottom:'3px'}}>{item.name}</p>
                  <p style={{fontSize:'11px',color:C.faint}}>
                    {item.currentQty!==null?`${item.currentQty} ${item.unit}`:'Not counted'} · Par: {item.parLevel??'—'} · Min: {item.minLevel??'—'}
                    {price?` · ${sym}${price.toFixed(2)}/${item.unit}`:''}
                    {value>0?` · Value: ${sym}${value.toFixed(2)}`:''}
                  </p>
                  {item.lastCounted&&<p style={{fontSize:'10px',color:C.faint,marginTop:'2px'}}>Counted {Math.floor((Date.now()-item.lastCounted)/86400000)===0?'today':Math.floor((Date.now()-item.lastCounted)/86400000)+'d ago'}</p>}
                </div>
                <span style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase',color:sc}}>{status==='unknown'?'—':status}</span>
                {deleteId===item.id?(
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <button onClick={()=>setDeleteId(null)} style={{fontSize:'11px',color:C.dim,background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
                    <button onClick={()=>{ actions.delStock(item.id); setDeleteId(null); }} style={{fontSize:'11px',fontWeight:700,color:'#fff',background:C.red,border:'none',padding:'5px 10px',cursor:'pointer',borderRadius:'2px'}}>Confirm</button>
                  </div>
                ):(
                  <button onClick={()=>setDeleteId(item.id)} style={{color:C.faint,background:'none',border:'none',cursor:'pointer',fontSize:'18px',padding:'0 4px'}}>×</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:'16px'}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,width:'100%',maxWidth:'440px',borderRadius:'4px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px',borderBottom:`1px solid ${C.border}`}}>
              <h3 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'20px',color:C.text}}>Add Stock Item</h3>
              <button onClick={()=>setShowAdd(false)} style={{background:'none',border:'none',color:C.faint,fontSize:'20px',cursor:'pointer'}}>×</button>
            </div>
            <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'14px'}}>
              {([['Item Name',addName,setAddName,'e.g. Salmon fillet'],['Unit',addUnit,setAddUnit,'kg, L, each...'],['Par Level',addPar,setAddPar,'Ideal quantity'],['Minimum Level',addMin,setAddMin,'Reorder trigger']] as any[]).map(([lbl,val,setter,ph])=>(
                <div key={lbl}>
                  <label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>{lbl}</label>
                  <input value={val} onChange={(e:any)=>setter(e.target.value)} placeholder={ph} style={input} />
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:'10px',padding:'16px 20px',borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,fontSize:'12px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'10px',cursor:'pointer',borderRadius:'2px'}}>Cancel</button>
              <button onClick={saveItem} disabled={!addName.trim()} style={{flex:1,fontSize:'12px',fontWeight:700,background:C.gold,color:C.bg,border:'none',padding:'10px',cursor:'pointer',borderRadius:'2px',opacity:!addName.trim()?0.4:1}}>Add Item</button>
            </div>
          </div>
        </div>
      )}

      {showBankPicker&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:'16px'}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,width:'100%',maxWidth:'440px',maxHeight:'80vh',display:'flex',flexDirection:'column',borderRadius:'4px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px',borderBottom:`1px solid ${C.border}`}}>
              <h3 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'20px',color:C.text}}>Ingredients Bank</h3>
              <button onClick={()=>setShowBankPicker(false)} style={{background:'none',border:'none',color:C.faint,fontSize:'20px',cursor:'pointer'}}>×</button>
            </div>
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`}}>
              <input value={bankSearch} onChange={e=>setBankSearch(e.target.value)} placeholder="Search ingredients..." style={input} />
            </div>
            <div style={{overflow:'auto',flex:1}}>
              {bank.filter((b:any)=>b.name.toLowerCase().includes(bankSearch.toLowerCase())).map((b:any)=>(
                <button key={b.id} onClick={()=>{ setAddName(b.name); setAddUnit(b.unit||'kg'); setShowBankPicker(false); setBankSearch(''); setShowAdd(true); }}
                  style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:`1px solid ${C.border}`,background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
                  <div>
                    <p style={{fontSize:'14px',color:C.text}}>{b.name}</p>
                    <p style={{fontSize:'11px',color:C.faint}}>{b.unit} · {b.supplier}</p>
                  </div>
                  <span style={{fontSize:'13px',color:C.gold}}>{sym}{(b.unitPrice||0).toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
