'use client';
import { useState, useEffect } from 'react';
import { useApp, uid } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { CATEGORIES, guessCategory } from '@/lib/categorize';
import { useIsMobile } from '@/lib/useIsMobile';
import { useOutlet } from '@/context/OutletContext';
import { scopeByOutlet } from '@/lib/outlets';

// Amber distinct from brand gold — gold is the brand accent, amber is the
// "attention" channel (low stock, variances).
const AMBER = '#E8AE20';

function getStatus(qty: number|null, par: number|null, min: number|null) {
  if (qty===null||par===null) return 'unknown';
  if (qty<=(min||0)) return 'critical';
  if (qty<=par*0.3) return 'low';
  return 'good';
}

function statusColor(s: string, C: any) {
  if (s==='good') return C.greenLight;
  if (s==='low') return AMBER;
  if (s==='critical') return C.red;
  return C.faint;
}

export default function StockView() {
  const { state, actions } = useApp();
  const { tier } = useAuth();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const isMobile = useIsMobile();
  const sym = (state.profile||{}).currencySymbol||'£';
  const bank = state.ingredientsBank||[];
  const { activeOutletId, isMultiOutlet } = useOutlet();
  const stock = scopeByOutlet(state.stockItems||[], activeOutletId, isMultiOutlet);
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
  const [addCategory, setAddCategory] = useState('Other');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [bankSearch, setBankSearch] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editParLevel, setEditParLevel] = useState('');
  const [editMinLevel, setEditMinLevel] = useState('');
  const [editCategory, setEditCategory] = useState('Other');

  function startEdit(item:any) {
    setEditId(item.id);
    setEditName(item.name||'');
    setEditUnit(item.unit||'');
    setEditUnitPrice(item.unitPrice!=null?String(item.unitPrice):'');
    setEditParLevel(item.parLevel!=null?String(item.parLevel):'');
    setEditMinLevel(item.minLevel!=null?String(item.minLevel):'');
    setEditCategory(item.category||'Other');
  }

  function closeEdit() { setEditId(null); }

  useEffect(()=>{
    if (!editId||!editName.trim()) return;
    const t = setTimeout(()=>{
      actions.updStock(editId,{
        name:editName.trim(),
        unit:editUnit.trim()||'each',
        unitPrice:editUnitPrice===''?null:parseFloat(editUnitPrice),
        parLevel:editParLevel===''?null:parseFloat(editParLevel),
        minLevel:editMinLevel===''?null:parseFloat(editMinLevel),
        category:editCategory,
      });
    },400);
    return ()=>clearTimeout(t);
  },[editId,editName,editUnit,editUnitPrice,editParLevel,editMinLevel,editCategory]);

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
    if (categoryFilter!=='all' && (i.category||'Other')!==categoryFilter) return false;
    if (filter==='all') return true;
    return getStatus(i.currentQty,i.parLevel,i.minLevel)===filter;
  });

  const grouped: Record<string, any[]> = {};
  filtered.forEach((i:any)=>{
    const cat = i.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(i);
  });
  const orderedCategories = CATEGORIES.filter(c => grouped[c]);

  const criticalItems = stock.filter((i:any)=>getStatus(i.currentQty,i.parLevel,i.minLevel)==='critical');

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

  const uncatStock = stock.filter((i:any)=>!i.category);
  const uncatBank = bank.filter((b:any)=>!b.category);
  const uncategorizedCount = uncatStock.length + uncatBank.length;
  function autoCategorize() {
    uncatStock.forEach((i:any)=>actions.updStock(i.id,{category:guessCategory(i.name)}));
    if (uncatBank.length) actions.upsertBank(uncatBank.map((b:any)=>({name:b.name,category:guessCategory(b.name)})));
  }

  // Summary-format stock report CSV — totals → category breakdown →
  // variance flags → optional raw line detail. Mirrors the on-screen layout.
  function downloadReport(usageItems: any[], date: string) {
    const biz = (state.profile?.businessName || '').trim();
    const rows: any[][] = [];
    if (biz) rows.push([biz]);
    rows.push(['Stock Summary Report — ' + date]);
    rows.push(['']);

    const totalClosing = usageItems.reduce((a: number, i: any) => a + i.value, 0);
    const totalUsage = usageItems.reduce((a: number, i: any) => a + i.usageValue, 0);
    const counted = usageItems.filter((i: any) => i.currentQty != null && i.currentQty !== '');
    const notCounted = usageItems.filter((i: any) => i.currentQty == null || i.currentQty === '');
    const highUsage = usageItems.filter((i: any) => (i.parLevel || 0) > 0 && i.usage > (i.parLevel || 0) * 0.8);
    const negativeUsage = usageItems.filter((i: any) => i.usage < 0);
    const belowPar = usageItems.filter((i: any) => (i.parLevel || 0) > 0 && (i.currentQty || 0) < (i.parLevel || 0) && (i.currentQty != null));

    rows.push(['== TOTALS ==']);
    rows.push(['Closing Stock Value', sym + totalClosing.toFixed(2)]);
    rows.push(['Total Usage Value', sym + totalUsage.toFixed(2)]);
    rows.push(['Items Counted', String(counted.length) + ' of ' + usageItems.length]);
    rows.push(['']);

    const byCat = new Map<string, { count: number; closing: number; usage: number }>();
    for (const i of usageItems) {
      const c = i.category || 'Other';
      const acc = byCat.get(c) || { count: 0, closing: 0, usage: 0 };
      acc.count++;
      acc.closing += i.value;
      acc.usage += i.usageValue;
      byCat.set(c, acc);
    }
    rows.push(['== BY CATEGORY ==']);
    rows.push(['Category', 'Items', 'Closing Value', 'Usage Value', '% of Closing']);
    const sortedCats = Array.from(byCat.entries()).sort((a, b) => b[1].closing - a[1].closing);
    for (const [cat, t] of sortedCats) {
      const pct = totalClosing > 0 ? ((t.closing / totalClosing) * 100).toFixed(1) + '%' : '—';
      rows.push([cat, String(t.count), sym + t.closing.toFixed(2), sym + t.usage.toFixed(2), pct]);
    }
    rows.push(['']);

    if (highUsage.length || negativeUsage.length || notCounted.length || belowPar.length) {
      rows.push(['== VARIANCES & FLAGS ==']);
      if (highUsage.length) {
        rows.push(['']);
        rows.push(['High Usage (above 80% of par level):']);
        rows.push(['Item', 'Category', 'Usage', 'Par', 'Cost Impact']);
        for (const i of highUsage) rows.push([i.name, i.category || 'Other', i.usage.toFixed(2) + ' ' + i.unit, String(i.parLevel || 0), sym + i.usageValue.toFixed(2)]);
      }
      if (negativeUsage.length) {
        rows.push(['']);
        rows.push(['Negative Usage (stock gained — check for unrecorded deliveries):']);
        rows.push(['Item', 'Category', 'Gained']);
        for (const i of negativeUsage) rows.push([i.name, i.category || 'Other', Math.abs(i.usage).toFixed(2) + ' ' + i.unit]);
      }
      if (belowPar.length) {
        rows.push(['']);
        rows.push(['Below Par (running low):']);
        rows.push(['Item', 'Category', 'Current', 'Par']);
        for (const i of belowPar) rows.push([i.name, i.category || 'Other', String(i.currentQty || 0) + ' ' + i.unit, String(i.parLevel || 0)]);
      }
      if (notCounted.length) {
        rows.push(['']);
        rows.push(['Not Counted (skipped during count):']);
        rows.push(['Item', 'Category', 'Unit']);
        for (const i of notCounted) rows.push([i.name, i.category || 'Other', i.unit || '—']);
      }
      rows.push(['']);
    }

    rows.push(['== FULL LINE DETAIL ==']);
    rows.push(['Item', 'Category', 'Unit', 'Unit Price', 'Prev Qty', 'Curr Qty', 'Usage', 'Usage Value', 'Closing Value']);
    for (const i of usageItems) {
      rows.push([
        i.name,
        i.category || 'Other',
        i.unit,
        i.price ? sym + i.price.toFixed(2) : '—',
        i.prev,
        i.currentQty ?? '',
        i.usage.toFixed(2),
        sym + i.usageValue.toFixed(2),
        sym + i.value.toFixed(2),
      ]);
    }

    const csv = rows.map(r => r.map((cell: any) => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-summary-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function saveItem() {
    const trimmed = addName.trim();
    if (!trimmed) return;
    const dupe = stock.find((s:any) => (s.name || '').toLowerCase().trim() === trimmed.toLowerCase());
    if (dupe) { alert('"' + trimmed + '" is already in your stock list.'); return; }
    const bankMatch = bank.find((b:any)=>b.name.toLowerCase()===addName.toLowerCase());
    actions.addStock({name:trimmed,unit:addUnit,category:addCategory,parLevel:parseFloat(addPar)||null,minLevel:parseFloat(addMin)||null,unitPrice:bankMatch?.unitPrice||null,currentQty:null,lastCounted:null,...(isMultiOutlet&&activeOutletId?{outletId:activeOutletId}:{})});
    setAddName(''); setAddUnit('kg'); setAddPar(''); setAddMin(''); setAddCategory('Other'); setShowAdd(false);
  }

  // ── Shared design primitives ──────────────────────────────
  const PAD = isMobile ? '20px 16px' : '32px';
  const CARD_RADIUS = '8px';
  const card: any = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: CARD_RADIUS };
  const inp: any = { width:'100%', background:C.surface2, border:`1px solid ${C.border}`, color:C.text, fontSize:'13px', padding:'10px 12px', outline:'none', fontFamily:'system-ui,sans-serif', boxSizing:'border-box', borderRadius:'6px' };

  const nextStockDate = () => {
    const day = profile.stockDay||1;
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), day);
    if (next <= now) next.setMonth(next.getMonth()+1);
    return next.toLocaleDateString('en-GB',{day:'numeric',month:'long'});
  };

  // ── REPORT VIEW ───────────────────────────────────────────
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

    type CatRow = { category: string; count: number; closing: number; usage: number };
    const catMap = new Map<string, CatRow>();
    for (const i of usageItems) {
      const c = i.category || 'Other';
      const acc = catMap.get(c) || { category: c, count: 0, closing: 0, usage: 0 };
      acc.count++;
      acc.closing += i.value;
      acc.usage += i.usageValue;
      catMap.set(c, acc);
    }
    const catRows = Array.from(catMap.values()).sort((a, b) => b.closing - a.closing);

    const counted = usageItems.filter((i:any) => i.currentQty != null);
    const notCounted = usageItems.filter((i:any) => i.currentQty == null);
    const highUsage = usageItems.filter((i:any) => (i.parLevel || 0) > 0 && i.usage > (i.parLevel || 0) * 0.8);
    const negativeUsage = usageItems.filter((i:any) => i.usage < 0);
    const belowPar = usageItems.filter((i:any) => (i.parLevel || 0) > 0 && (i.currentQty || 0) < (i.parLevel || 0) && i.currentQty != null);

    const sectionLabel: any = { fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '10px' };

    return (
      <div style={{padding:PAD,fontFamily:'-apple-system,system-ui,sans-serif',color:C.text,minHeight:'100vh'}}>
        <div style={{display:'flex',flexDirection:isMobile?'column':'row',justifyContent:'space-between',alignItems:isMobile?'stretch':'center',gap:isMobile?'12px':0,marginBottom:'18px'}}>
          <div>
            <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:isMobile?'24px':'28px',color:C.text,marginBottom:'4px',lineHeight:1.1}}>Stock summary</h1>
            <p style={{fontSize:'12px',color:C.faint}}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <div style={{display:'flex',gap:'8px',flexDirection:isMobile?'column':'row'}}>
            <button onClick={()=>window.print()} style={{fontSize:'12px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'9px 14px',cursor:'pointer',borderRadius:'6px',width:isMobile?'100%':'auto'}}>Print</button>
            <button onClick={()=>downloadReport(usageItems, new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}))} style={{fontSize:'12px',fontWeight:600,color:C.gold,background:`${C.gold}14`,border:`1px solid ${C.gold}40`,padding:'9px 14px',cursor:'pointer',borderRadius:'6px',width:isMobile?'100%':'auto'}}>Download CSV</button>
            <button onClick={()=>setView('list')} style={{fontSize:'12px',fontWeight:700,background:C.gold,color:C.bg,border:'none',padding:'10px 16px',cursor:'pointer',borderRadius:'6px',width:isMobile?'100%':'auto'}}>Done</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:'10px',marginBottom:'24px'}}>
          {[
            {l:'Closing stock value',v:`${sym}${totalCurrentValue.toFixed(2)}`,c:C.gold},
            {l:'Usage value',v:`${sym}${totalUsageValue.toFixed(2)}`,c:C.text},
            {l:'Items counted',v:`${counted.length} of ${stock.length}`,c:C.text},
            {l:'Flags',v:String(highUsage.length+negativeUsage.length+notCounted.length+belowPar.length),c:(highUsage.length+negativeUsage.length+notCounted.length+belowPar.length)>0?AMBER:C.text},
          ].map(s=>(
            <div key={s.l} style={{...card,padding:'14px 16px'}}>
              <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint,marginBottom:'8px'}}>{s.l}</p>
              <p style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'22px',color:s.c,lineHeight:1.1}}>{s.v}</p>
            </div>
          ))}
        </div>

        <div style={{marginBottom:'24px'}}>
          <p style={sectionLabel}>By category</p>
          <div style={{...card,overflow:isMobile?'auto':'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1.2fr 1.2fr 1fr',padding:'10px 16px',background:C.surface2,borderBottom:`1px solid ${C.border}`,gap:'8px',minWidth:isMobile?'520px':undefined}}>
              {['Category','Items','Closing','Usage','% of Closing'].map(h=>(
                <p key={h} style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint}}>{h}</p>
              ))}
            </div>
            {catRows.length === 0 ? (
              <p style={{fontSize:'12px',color:C.faint,padding:'16px'}}>No stock to summarise.</p>
            ) : catRows.map(r=>{
              const pct = totalCurrentValue > 0 ? (r.closing / totalCurrentValue) * 100 : 0;
              return (
                <div key={r.category} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1.2fr 1.2fr 1fr',padding:'10px 16px',borderBottom:`1px solid ${C.border}`,gap:'8px',alignItems:'center',minWidth:isMobile?'520px':undefined}}>
                  <p style={{fontSize:'13px',color:C.text}}>{r.category}</p>
                  <p style={{fontSize:'13px',color:C.dim}}>{r.count}</p>
                  <p style={{fontSize:'13px',color:C.gold,fontWeight:600}}>{sym}{r.closing.toFixed(2)}</p>
                  <p style={{fontSize:'13px',color:C.dim}}>{sym}{r.usage.toFixed(2)}</p>
                  <p style={{fontSize:'12px',color:C.faint}}>{pct.toFixed(1)}%</p>
                </div>
              );
            })}
            {catRows.length > 0 && (
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1.2fr 1.2fr 1fr',padding:'10px 16px',gap:'8px',background:C.surface2}}>
                <p style={{fontSize:'12px',fontWeight:700,color:C.text}}>Total</p>
                <p style={{fontSize:'12px',fontWeight:700,color:C.text}}>{stock.length}</p>
                <p style={{fontSize:'13px',fontWeight:700,color:C.gold}}>{sym}{totalCurrentValue.toFixed(2)}</p>
                <p style={{fontSize:'13px',fontWeight:700,color:C.text}}>{sym}{totalUsageValue.toFixed(2)}</p>
                <p style={{fontSize:'12px',color:C.faint}}>100%</p>
              </div>
            )}
          </div>
        </div>

        {(highUsage.length + negativeUsage.length + notCounted.length + belowPar.length) > 0 && (
          <div style={{marginBottom:'24px'}}>
            <p style={sectionLabel}>Variances &amp; flags</p>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {highUsage.length > 0 && (
                <div style={{...card,padding:'14px 16px',borderLeft:`3px solid ${C.red}`}}>
                  <p style={{fontSize:'12px',fontWeight:700,color:C.red,marginBottom:'8px'}}>⚠ High usage <span style={{color:C.faint,fontWeight:400}}>· {highUsage.length} item{highUsage.length===1?'':'s'} above 80% of par — check portioning or wastage</span></p>
                  <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'4px'}}>
                    {highUsage.map((i:any)=>(
                      <li key={i.id} style={{fontSize:'12px',color:C.text,display:'flex',justifyContent:'space-between',gap:'8px'}}>
                        <span>{i.name}<span style={{color:C.faint,marginLeft:'6px'}}>· {i.category || 'Other'}</span></span>
                        <span style={{color:C.red,fontWeight:600,flexShrink:0}}>{i.usage.toFixed(1)} {i.unit} · {sym}{i.usageValue.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {negativeUsage.length > 0 && (
                <div style={{...card,padding:'14px 16px',borderLeft:`3px solid ${AMBER}`}}>
                  <p style={{fontSize:'12px',fontWeight:700,color:AMBER,marginBottom:'8px'}}>⚠ Negative usage <span style={{color:C.faint,fontWeight:400}}>· {negativeUsage.length} item{negativeUsage.length===1?'':'s'} gained stock — check for unrecorded deliveries</span></p>
                  <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'4px'}}>
                    {negativeUsage.map((i:any)=>(
                      <li key={i.id} style={{fontSize:'12px',color:C.text,display:'flex',justifyContent:'space-between',gap:'8px'}}>
                        <span>{i.name}<span style={{color:C.faint,marginLeft:'6px'}}>· {i.category || 'Other'}</span></span>
                        <span style={{color:AMBER,fontWeight:600,flexShrink:0}}>+{Math.abs(i.usage).toFixed(1)} {i.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {belowPar.length > 0 && (
                <div style={{...card,padding:'14px 16px',borderLeft:`3px solid ${AMBER}`}}>
                  <p style={{fontSize:'12px',fontWeight:700,color:AMBER,marginBottom:'8px'}}>↓ Below par <span style={{color:C.faint,fontWeight:400}}>· {belowPar.length} item{belowPar.length===1?'':'s'} running low — consider reordering</span></p>
                  <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'4px'}}>
                    {belowPar.map((i:any)=>(
                      <li key={i.id} style={{fontSize:'12px',color:C.text,display:'flex',justifyContent:'space-between',gap:'8px'}}>
                        <span>{i.name}<span style={{color:C.faint,marginLeft:'6px'}}>· {i.category || 'Other'}</span></span>
                        <span style={{color:AMBER,fontWeight:600,flexShrink:0}}>{i.currentQty || 0} of {i.parLevel || 0} {i.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {notCounted.length > 0 && (
                <div style={{...card,padding:'14px 16px',borderLeft:`3px solid ${C.faint}`}}>
                  <p style={{fontSize:'12px',fontWeight:700,color:C.dim,marginBottom:'8px'}}>○ Not counted <span style={{color:C.faint,fontWeight:400}}>· {notCounted.length} item{notCounted.length===1?'':'s'} skipped during this count</span></p>
                  <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'4px'}}>
                    {notCounted.map((i:any)=>(
                      <li key={i.id} style={{fontSize:'12px',color:C.text}}>
                        {i.name}<span style={{color:C.faint,marginLeft:'6px'}}>· {i.category || 'Other'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <details style={{marginBottom:'24px'}}>
          <summary style={{cursor:'pointer',padding:'10px 0',color:C.dim,fontSize:'12px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase'}}>
            Full line detail <span style={{color:C.faint,fontWeight:400}}>({stock.length} item{stock.length===1?'':'s'})</span>
          </summary>
          <div style={{...card,overflow:isMobile?'auto':'hidden',marginTop:'10px'}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr',padding:'10px 16px',background:C.surface2,borderBottom:`1px solid ${C.border}`,gap:'8px',minWidth:isMobile?'620px':undefined}}>
              {['Item','Unit Price','Prev Qty','Curr Qty','Usage','Value'].map(h=>(
                <p key={h} style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint}}>{h}</p>
              ))}
            </div>
            {usageItems.map((i:any)=>{
              const anomaly = (i.parLevel||0) > 0 && i.usage > (i.parLevel||0)*0.8;
              return (
                <div key={i.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr',padding:'12px 16px',borderBottom:`1px solid ${C.border}`,gap:'8px',alignItems:'center',background:anomaly?`${C.red}06`:C.surface,minWidth:isMobile?'620px':undefined}}>
                  <div>
                    <p style={{fontSize:'13px',color:C.text}}>{i.name}</p>
                    <p style={{fontSize:'10px',color:C.faint}}>{i.category || 'Other'}</p>
                  </div>
                  <p style={{fontSize:'13px',color:C.dim}}>{i.price?`${sym}${i.price.toFixed(2)}`:'—'}</p>
                  <p style={{fontSize:'13px',color:C.dim}}>{i.prev} {i.unit}</p>
                  <p style={{fontSize:'13px',color:C.text}}>{i.currentQty != null ? i.currentQty : '—'} {i.currentQty != null ? i.unit : ''}</p>
                  <p style={{fontSize:'13px',color:i.usage>0?C.red:i.usage<0?AMBER:C.greenLight}}>{i.usage>0?'+':''}{i.usage.toFixed(1)} {i.unit}</p>
                  <p style={{fontSize:'13px',color:C.gold}}>{sym}{i.value.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </details>
      </div>
    );
  }

  // ── COUNT VIEW ────────────────────────────────────────────
  if (view==='count') return (
    <div style={{padding:PAD,fontFamily:'-apple-system,system-ui,sans-serif',color:C.text,minHeight:'100vh'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px',gap:'12px',flexWrap:'wrap'}}>
        <div>
          <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:isMobile?'24px':'28px',color:C.text,lineHeight:1.1}}>Stock count</h1>
          <p style={{fontSize:'12px',color:C.faint,marginTop:'4px'}}>Enter current quantities. Leave blank to skip.</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setView('list')} style={{fontSize:'12px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'9px 14px',cursor:'pointer',borderRadius:'6px'}}>Cancel</button>
          <button onClick={saveCount} style={{fontSize:'12px',fontWeight:700,background:C.gold,color:C.bg,border:'none',padding:'10px 16px',cursor:'pointer',borderRadius:'6px'}}>Save &amp; view report</button>
        </div>
      </div>
      {(()=>{
        const cg: Record<string, any[]> = {};
        stock.forEach((i:any)=>{ const c=i.category||'Other'; (cg[c]=cg[c]||[]).push(i); });
        const cats = CATEGORIES.filter(c=>cg[c]);
        return (
          <div style={{display:'flex',flexDirection:'column',gap:'18px'}}>
            {cats.map(cat=>(
              <div key={cat}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                  <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint}}>{cat} <span style={{color:C.dim}}>· {cg[cat].length}</span></p>
                  <div style={{flex:1,height:'1px',background:C.border}}/>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                  {cg[cat].map((i:any)=>{
                    const bankItem = bank.find((b:any)=>b.name.toLowerCase()===i.name.toLowerCase());
                    const price = bankItem?.unitPrice || i.unitPrice;
                    return (
                      <div key={i.id} style={{...card,padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:'14px',color:C.text,marginBottom:'2px'}}>{i.name}</p>
                          <p style={{fontSize:'11px',color:C.faint}}>Par: {i.parLevel??'—'} · Min: {i.minLevel??'—'} {i.unit}{price?` · ${sym}${price.toFixed(2)}/${i.unit}`:''}</p>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <input type="number" value={counts[i.id]||''} onChange={e=>setCounts(prev=>({...prev,[i.id]:e.target.value}))}
                            placeholder="0" style={{width:'80px',background:C.surface2,border:`1px solid ${C.border}`,color:C.text,fontSize:'16px',padding:'10px 12px',outline:'none',textAlign:'center',borderRadius:'6px',boxSizing:'border-box'}} />
                          <p style={{fontSize:'12px',color:C.faint,width:'32px'}}>{i.unit}</p>
                          {counts[i.id]&&price&&(
                            <p style={{fontSize:'12px',color:C.gold,width:'64px',textAlign:'right'}}>{sym}{(parseFloat(counts[i.id])*price).toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );

  // ── LIST VIEW (default) ───────────────────────────────────
  return (
    <div style={{padding:PAD,fontFamily:'-apple-system,system-ui,sans-serif',color:C.text,minHeight:'100vh'}}>
      {/* Top bar */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap',marginBottom:'14px'}}>
        <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:isMobile?'24px':'28px',color:C.text,lineHeight:1.1}}>Stock</h1>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          <button onClick={()=>setShowBankPicker(true)}
            style={{fontSize:'12px',color:C.gold,background:'transparent',border:`1px solid ${C.gold}60`,padding:'9px 14px',cursor:'pointer',borderRadius:'6px'}}>
            From bank
          </button>
          <button onClick={()=>setShowAdd(true)}
            style={{fontSize:'12px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'9px 14px',cursor:'pointer',borderRadius:'6px'}}>
            + Add item
          </button>
          {stock.length>0&&(
            <button onClick={startCount}
              style={{display:'inline-flex',alignItems:'center',gap:'8px',fontSize:'12px',fontWeight:700,letterSpacing:'0.3px',background:C.gold,color:C.bg,border:'none',padding:'10px 16px',cursor:'pointer',borderRadius:'6px'}}>
              <span style={{fontSize:'14px',lineHeight:1}}>☷</span>
              Start count
            </button>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'18px',flexWrap:'wrap',gap:'8px',fontSize:'12px'}}>
        <p style={{color:C.faint}}>Next stock take: <span style={{color:C.text}}>{nextStockDate()}</span></p>
        <p style={{color:C.faint}}>Total value: <span style={{color:C.gold,fontWeight:600}}>{sym}{totalValue.toFixed(2)}</span></p>
      </div>

      {/* Filter tiles */}
      {stock.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:'10px',marginBottom:'14px'}}>
          {[
            {l:'Total',v:summary.total,c:C.text,k:'all'},
            {l:'Good',v:summary.good,c:C.greenLight,k:'good'},
            {l:'Low',v:summary.low,c:AMBER,k:'low'},
            {l:'Critical',v:summary.critical,c:C.red,k:'critical'},
          ].map(b=>{
            const active=filter===b.k;
            return(
              <button key={b.k} onClick={()=>setFilter(b.k)}
                style={{
                  background:active?C.surface:C.surface,
                  border:`1px solid ${active?C.gold+'60':C.border}`,
                  borderBottom:active?`2px solid ${C.gold}`:`1px solid ${C.border}`,
                  borderRadius:CARD_RADIUS,
                  padding:'14px 16px',textAlign:'left',cursor:'pointer',
                }}>
                <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint,marginBottom:'8px'}}>{b.l}</p>
                <p style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'24px',color:b.c,lineHeight:1.1}}>{b.v}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Search + category */}
      <div style={{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:'200px',position:'relative'}}>
          <span style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',color:C.faint,pointerEvents:'none'}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stock…"
            style={{...inp,paddingLeft:'34px',padding:'11px 14px 11px 34px',fontSize:'14px'}}/>
        </div>
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}
          style={{width:'180px',background:C.surface,border:`1px solid ${C.border}`,color:C.text,fontSize:'13px',padding:'11px 12px',outline:'none',cursor:'pointer',borderRadius:'6px',boxSizing:'border-box'}}>
          <option value="all">All categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {uncategorizedCount>0&&(
          <button onClick={autoCategorize} title={`Assign categories to ${uncategorizedCount} uncategorized item${uncategorizedCount>1?'s':''}`}
            style={{fontSize:'11px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'10px 12px',cursor:'pointer',borderRadius:'6px'}}>
            Auto-categorize ({uncategorizedCount})
          </button>
        )}
      </div>

      {/* Critical alerts banner */}
      {criticalItems.length>0&&(
        <div style={{...card,background:`${C.red}10`,borderColor:`${C.red}40`,padding:'12px 14px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
          <span style={{fontSize:'18px',color:C.red}}>⚠</span>
          <p style={{fontSize:'12px',color:C.dim,flex:1,lineHeight:1.5}}>
            <strong style={{color:C.red}}>{criticalItems.length} critical item{criticalItems.length===1?'':'s'}</strong> below minimum — consider ordering{criticalItems.length<=3?`: ${criticalItems.map((i:any)=>i.name).join(', ')}`:'.'}
          </p>
        </div>
      )}

      {/* List */}
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'60px 0'}}>
          <p style={{fontSize:'13px',color:C.faint}}>{stock.length===0?'No stock items yet. Add ingredients to track par levels and values.':'No items match that filter.'}</p>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:'18px'}}>
          {orderedCategories.map((cat:string)=>(
            <div key={cat}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint}}>{cat} <span style={{color:C.dim}}>· {grouped[cat].length}</span></p>
                <div style={{flex:1,height:'1px',background:C.border}}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {grouped[cat].map((item:any)=>{
                  const status=getStatus(item.currentQty,item.parLevel,item.minLevel);
                  const sc=statusColor(status,C);
                  const bankItem = bank.find((b:any)=>b.name.toLowerCase()===item.name.toLowerCase());
                  const price = bankItem?.unitPrice || item.unitPrice || 0;
                  const value = (item.currentQty||0)*price;
                  const isEditing = editId===item.id;
                  if (isEditing) {
                    const lblStyle = {fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase' as const,color:C.faint,display:'block',marginBottom:'6px'};
                    return (
                      <div key={item.id} style={{...card,padding:'16px',borderColor:`${C.gold}60`}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px',marginBottom:'14px',flexWrap:'wrap'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                            <p style={{fontSize:'14px',color:C.text,fontWeight:600}}>{editName||item.name}</p>
                            <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase',color:C.gold,background:`${C.gold}14`,border:`0.5px solid ${C.gold}40`,padding:'2px 6px',borderRadius:'3px'}}>Editing</span>
                          </div>
                          <p style={{fontSize:'10px',color:C.faint,fontStyle:'italic'}}>Auto-saves</p>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'2fr 1fr 1fr 1fr 1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                          <div><label style={lblStyle}>Name</label><input value={editName} onChange={e=>setEditName(e.target.value)} style={inp} /></div>
                          <div><label style={lblStyle}>Category</label><select value={editCategory} onChange={e=>setEditCategory(e.target.value)} style={{...inp,cursor:'pointer'}}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                          <div><label style={lblStyle}>Unit</label><input value={editUnit} onChange={e=>setEditUnit(e.target.value)} style={inp} /></div>
                          <div><label style={lblStyle}>Unit price</label><input type="number" value={editUnitPrice} onChange={e=>setEditUnitPrice(e.target.value)} style={inp} /></div>
                          <div><label style={lblStyle}>Par level</label><input type="number" value={editParLevel} onChange={e=>setEditParLevel(e.target.value)} style={inp} /></div>
                          <div><label style={lblStyle}>Min level</label><input type="number" value={editMinLevel} onChange={e=>setEditMinLevel(e.target.value)} style={inp} /></div>
                        </div>
                        <div style={{display:'flex',justifyContent:'flex-end',gap:'8px'}}>
                          <button onClick={closeEdit} style={{fontSize:'12px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'8px 14px',cursor:'pointer',borderRadius:'6px'}}>Cancel</button>
                          <button onClick={closeEdit} style={{fontSize:'12px',fontWeight:700,background:C.gold,color:C.bg,border:'none',padding:'9px 18px',cursor:'pointer',borderRadius:'6px'}}>Done</button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={item.id} onClick={()=>{ if(deleteId!==item.id) startEdit(item); }}
                      style={{...card,padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px',cursor:'pointer'}}>
                      <div style={{width:'10px',height:'10px',borderRadius:'50%',background:sc,flexShrink:0}}></div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:'13px',color:C.text,marginBottom:'3px'}}>{item.name}</p>
                        <p style={{fontSize:'11px',color:C.faint}}>
                          {item.currentQty!==null?`${item.currentQty} ${item.unit}`:'Not counted'} · Par: {item.parLevel??'—'} · Min: {item.minLevel??'—'}
                          {price?` · ${sym}${price.toFixed(2)}/${item.unit}`:''}
                        </p>
                        {item.lastCounted&&<p style={{fontSize:'10px',color:C.faint,marginTop:'2px'}}>Counted {Math.floor((Date.now()-item.lastCounted)/86400000)===0?'today':Math.floor((Date.now()-item.lastCounted)/86400000)+'d ago'}</p>}
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        {value>0&&<p style={{fontSize:'13px',color:C.gold,fontWeight:600}}>{sym}{value.toFixed(2)}</p>}
                        <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase',color:sc,marginTop:value>0?'2px':0}}>{status==='unknown'?'—':status}</p>
                      </div>
                      {deleteId===item.id?(
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>setDeleteId(null)} style={{fontSize:'11px',color:C.dim,background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
                          <button onClick={()=>{ actions.delStock(item.id); setDeleteId(null); }} style={{fontSize:'11px',fontWeight:700,color:'#fff',background:C.red,border:'none',padding:'5px 10px',cursor:'pointer',borderRadius:'4px'}}>Confirm</button>
                        </div>
                      ):(
                        <button onClick={e=>{ e.stopPropagation(); setDeleteId(item.id); }} style={{color:C.faint,background:'none',border:'none',cursor:'pointer',fontSize:'18px',padding:'0 4px'}}>×</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:'16px'}}
          onClick={()=>setShowAdd(false)}>
          <div onClick={e=>e.stopPropagation()} style={{...card,width:'100%',maxWidth:'440px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 20px',borderBottom:`1px solid ${C.border}`}}>
              <h3 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'20px',color:C.text}}>Add stock item</h3>
              <button onClick={()=>setShowAdd(false)} style={{background:'none',border:'none',color:C.faint,fontSize:'22px',cursor:'pointer',padding:'4px 8px',lineHeight:1}}>×</button>
            </div>
            <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:'12px'}}>
              <div>
                <label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>Item name</label>
                <input value={addName} onChange={e=>setAddName(e.target.value)} placeholder="e.g. Salmon fillet" style={inp} />
              </div>
              <div>
                <label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>Category</label>
                <select value={addCategory} onChange={e=>setAddCategory(e.target.value)} style={{...inp,cursor:'pointer'}}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {([['Unit',addUnit,setAddUnit,'kg, L, each…'],['Par level',addPar,setAddPar,'Ideal quantity'],['Min level',addMin,setAddMin,'Reorder trigger']] as any[]).map(([lbl,val,setter,ph])=>(
                <div key={lbl}>
                  <label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>{lbl}</label>
                  <input value={val} onChange={(e:any)=>setter(e.target.value)} placeholder={ph} style={inp} />
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:'8px',padding:'14px 20px',borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,fontSize:'13px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'11px',cursor:'pointer',borderRadius:'6px'}}>Cancel</button>
              <button onClick={saveItem} disabled={!addName.trim()} style={{flex:1,fontSize:'13px',fontWeight:700,background:C.gold,color:C.bg,border:'none',padding:'11px',cursor:!addName.trim()?'not-allowed':'pointer',borderRadius:'6px',opacity:!addName.trim()?0.4:1}}>Add item</button>
            </div>
          </div>
        </div>
      )}

      {/* Bank picker modal */}
      {showBankPicker&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:'16px'}}
          onClick={()=>setShowBankPicker(false)}>
          <div onClick={e=>e.stopPropagation()} style={{...card,width:'100%',maxWidth:'440px',maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 20px',borderBottom:`1px solid ${C.border}`}}>
              <h3 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'20px',color:C.text}}>Ingredients bank</h3>
              <button onClick={()=>setShowBankPicker(false)} style={{background:'none',border:'none',color:C.faint,fontSize:'22px',cursor:'pointer',padding:'4px 8px',lineHeight:1}}>×</button>
            </div>
            <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`}}>
              <input value={bankSearch} onChange={e=>setBankSearch(e.target.value)} placeholder="Search ingredients…" style={inp} />
            </div>
            <div style={{overflow:'auto',flex:1}}>
              {(() => {
                const inStock = new Set((stock || []).map((s:any) => (s.name || '').toLowerCase().trim()));
                const filteredBank = bank.filter((b:any) => (b.name || '').toLowerCase().includes(bankSearch.toLowerCase()));
                if (filteredBank.length === 0) return <p style={{fontSize:'12px',color:C.faint,padding:'24px',textAlign:'center'}}>No matching ingredients</p>;
                return filteredBank.map((b:any) => {
                  const dupe = inStock.has((b.name || '').toLowerCase().trim());
                  return (
                    <button key={b.id} disabled={dupe}
                      onClick={() => { if (dupe) return; setAddName(b.name); setAddUnit(b.unit||'kg'); setAddCategory(b.category||'Other'); setShowBankPicker(false); setBankSearch(''); setShowAdd(true); }}
                      title={dupe ? 'Already in stock' : ''}
                      style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:`1px solid ${C.border}`,background:'none',border:'none',cursor:dupe?'not-allowed':'pointer',textAlign:'left',opacity:dupe?0.45:1}}>
                      <div>
                        <p style={{fontSize:'14px',color:C.text}}>{b.name}</p>
                        <p style={{fontSize:'11px',color:C.faint}}>{b.unit} · {b.supplier}{dupe ? ' · in stock' : ''}</p>
                      </div>
                      <span style={{fontSize:'13px',color:dupe?C.faint:C.gold,fontWeight:600}}>{sym}{(b.unitPrice||0).toFixed(2)}</span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
