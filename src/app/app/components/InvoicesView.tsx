'use client';
import{useState,useRef,useMemo}from'react';
import{useApp,uid}from'@/context/AppContext';
import{useAuth}from'@/context/AuthContext';
import{useSettings}from'@/context/SettingsContext';
import{dark,light}from'@/lib/theme';
import{supabase}from'@/lib/supabase';
import{CATEGORIES,guessCategory}from'@/lib/categorize';
import{useIsMobile}from'@/lib/useIsMobile';
import{useFeatureFlag}from'@/lib/usePlatformConfig';
import{buildSupplierReliability,reliabilityByName,recentDiscrepancySummary,type SupplierReliability}from'@/lib/supplierReliability';

// Amber is a distinct token from brand gold in the redesign spec — gold is
// the brand accent (titles, primary buttons), amber is the "attention-but-
// not-error" channel (flagged deliveries, in-progress states).
const AMBER='#E8AE20';

function scoreColour(s:number,C:any){return s>=8.5?C.greenLight:s>=6.5?C.gold:C.red;}
function initials(name:string){
  const w=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(w.length===0)return '?';
  if(w.length===1)return w[0].slice(0,2).toUpperCase();
  return (w[0][0]+w[w.length-1][0]).toUpperCase();
}

export default function InvoicesView(){
  const{state:appState,actions:appActions}=useApp();
  const{tier}=useAuth();
  const{settings}=useSettings();
  const C=settings.resolved==='light'?light:dark;
  const isPaid=['pro','kitchen','group'].includes(tier);
  const isMobile=useIsMobile();
  const flagAiInvoiceScan=useFeatureFlag('aiInvoiceScan',(appState.profile as any)?.featureOverrides);
  const sym=(appState.profile||{}).currencySymbol||'£';
  const bank=appState.ingredientsBank||[];
  const alerts=appState.priceAlerts||[];
  const invoices=appState.invoices||[];
  const profile=appState.profile||{};

  const[scanning,setScanning]=useState(false);
  const[scanResults,setScanResults]=useState<any[]>([]);
  const[priceChanges,setPriceChanges]=useState<any[]>([]);
  const[supplierName,setSupplierName]=useState('');
  const[view,setView]=useState<'bank'|'review'|'history'|'detail'|'reports'|'suppliers'>('bank');
  const[search,setSearch]=useState('');
  const[deleteId,setDeleteId]=useState<string|null>(null);
  const[selectedInvoice,setSelectedInvoice]=useState<any>(null);
  const[reportPeriod,setReportPeriod]=useState<'week'|'month'>('week');
  const[reportOffset,setReportOffset]=useState(0);
  const fileRef=useRef<HTMLInputElement>(null);
  const[pendingInvoice,setPendingInvoice]=useState<any>(null);
  const[deliveryStep,setDeliveryStep]=useState<'check'|'flag'|null>(null);
  const[flagItems,setFlagItems]=useState<Array<{name:string;invoicedQty:number;receivedQty:number;received:boolean;note:string;unitPrice:number;unit:string}>>([]);
  const[expandedSupplier,setExpandedSupplier]=useState<string|null>(null);
  const[showInbox,setShowInbox]=useState(false);
  const[inboxCopied,setInboxCopied]=useState(false);

  const reliability=useMemo(()=>buildSupplierReliability(invoices),[invoices]);
  const reliabilityIdx=useMemo(()=>reliabilityByName(reliability),[reliability]);
  const discrepancySummary=useMemo(()=>recentDiscrepancySummary(invoices),[invoices]);

  // Inbox address — feature gate + tier gate handled by Settings; this is just
  // a read of the existing token for the top-bar "Forward email" affordance.
  const inboxToken:string=(profile as any).invoiceInboxToken||'';
  const inboxAddress=inboxToken?`invoices+${inboxToken}@palateandpen.co.uk`:'';

  async function handleFile(file:File){
    if(!isPaid){alert('Invoice scanning requires Pro, Kitchen, or Group.');return;}
    setScanning(true);
    try{
      const arrayBuffer=await file.arrayBuffer();
      const bytes=new Uint8Array(arrayBuffer);
      let binary='';bytes.forEach(b=>binary+=String.fromCharCode(b));
      const base64=btoa(binary);
      const mediaType=file.type;
      const res=await fetch('/api/palatable/scan-invoice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base64,mediaType,userToken:await supabase.auth.getSession().then(r=>r.data.session?.access_token||'')})});
      const data=await res.json();
      processScanResults(data.items||[],file.name);
    }catch(e){alert('Scan failed. Check your API key in admin.');setScanning(false);}
  }

  function processScanResults(items:any[],filename:string){
    setScanning(false);
    if(!items.length){alert('No items found. Try a clearer image.');return;}
    const changes=items.map(item=>{
      const match=bank.find((b:any)=>b.name.toLowerCase()===item.name.toLowerCase());
      if(match&&match.unitPrice&&item.unitPrice){
        const pctDiff=Math.abs(match.unitPrice-item.unitPrice)/match.unitPrice*100;
        if(pctDiff>=5){
          const change=item.unitPrice-match.unitPrice;
          return{id:uid(),name:item.name,unit:item.unit||match.unit,oldPrice:match.unitPrice,newPrice:item.unitPrice,change,pct:(change/match.unitPrice)*100,detectedAt:Date.now()};
        }
      }
      return null;
    }).filter(Boolean);
    setPriceChanges(changes as any[]);
    setScanResults(items.map((i,idx)=>({...i,id:String(idx),selected:true})));
    setView('review');
    if(filename)setSupplierName(filename.replace(/.[^.]+$/,'').replace(/[-_]/g,' '));
  }

  function confirmScan(){
    const selected=scanResults.filter(i=>i.selected);
    if(!selected.length){alert('Select at least one item');return;}
    if(priceChanges.length>0)appActions.addAlerts(priceChanges);
    const withCat=selected.map(i=>{
      const existing=bank.find((b:any)=>b.name.toLowerCase()===i.name.toLowerCase());
      return {...i, category: existing?.category || guessCategory(i.name)};
    });
    appActions.upsertBank(withCat.map(i=>({name:i.name,qty:i.qty,unit:i.unit,unitPrice:i.unitPrice,totalPrice:i.totalPrice,supplier:supplierName||'Unknown',category:i.category})));
    setPendingInvoice({
      supplier:supplierName||'Unknown',
      itemCount:withCat.length,
      priceChanges:priceChanges.length,
      items:withCat,
      priceChangeDetails:priceChanges,
      scannedAt:Date.now(),
    });
    setDeliveryStep('check');
    setScanResults([]);setPriceChanges([]);setView('bank');
  }

  function acceptDelivery(){
    if(!pendingInvoice)return;
    appActions.addInvoice({...pendingInvoice,status:'confirmed'});
    setPendingInvoice(null);setDeliveryStep(null);
  }
  function openFlagStep(){
    if(!pendingInvoice)return;
    setFlagItems((pendingInvoice.items||[]).map((it:any)=>({
      name:String(it?.name||''),
      invoicedQty:Number(it?.qty)||0,
      receivedQty:Number(it?.qty)||0,
      received:true,
      note:'',
      unitPrice:Number(it?.unitPrice)||0,
      unit:String(it?.unit||''),
    })));
    setDeliveryStep('flag');
  }
  function saveFlagged(){
    if(!pendingInvoice)return;
    const discrepancies=flagItems.filter(d=>!d.received||d.receivedQty<d.invoicedQty||d.note.trim().length>0);
    appActions.addInvoice({
      ...pendingInvoice,
      status:'flagged',
      discrepancies:discrepancies.map(d=>({
        name:d.name,invoicedQty:d.invoicedQty,receivedQty:d.received?d.receivedQty:0,
        received:d.received,note:d.note.trim()||undefined,unitPrice:d.unitPrice,unit:d.unit,
      })),
    });
    setPendingInvoice(null);setDeliveryStep(null);setFlagItems([]);
  }
  function skipDelivery(){
    if(!pendingInvoice){setDeliveryStep(null);return;}
    appActions.addInvoice(pendingInvoice);
    setPendingInvoice(null);setDeliveryStep(null);setFlagItems([]);
  }

  function copyInboxAddress(){
    if(!inboxAddress)return;
    try{
      navigator.clipboard?.writeText(inboxAddress);
      setInboxCopied(true);
      setTimeout(()=>setInboxCopied(false),1500);
    }catch{}
  }

  // ── Derived display data ──────────────────────────────────
  const filtered=bank.filter((i:any)=>(i.name||'').toLowerCase().includes(search.toLowerCase())||(i.supplier||'').toLowerCase().includes(search.toLowerCase()));

  // Summary tiles: month-to-date spend + invoices scanned (all time) + total
  // active price alerts + last-30-day flagged deliveries. Rendered on the four
  // primary nav-pill views; hidden during the deeper drill-ins.
  const monthStart=new Date();monthStart.setDate(1);monthStart.setHours(0,0,0,0);
  const monthSpend=invoices.filter((i:any)=>(i.scannedAt||0)>=monthStart.getTime()).reduce((s:number,inv:any)=>{
    if(typeof inv.total==='number'&&inv.total>0)return s+inv.total;
    return s+(inv.items||[]).reduce((ss:number,it:any)=>ss+(it.totalPrice||((it.unitPrice||0)*(it.qty||0))||0),0);
  },0);

  // ── Helpers (period range for the existing reports view) ───
  function periodRange(period:'week'|'month',offset:number){
    const now=new Date();
    if(period==='week'){
      const day=now.getDay()||7;
      const start=new Date(now);start.setDate(now.getDate()-(day-1)+offset*7);start.setHours(0,0,0,0);
      const end=new Date(start);end.setDate(start.getDate()+6);end.setHours(23,59,59,999);
      const fmt=(d:Date)=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
      return{start,end,label:`${fmt(start)} — ${fmt(end)} ${end.getFullYear()}`};
    }
    const start=new Date(now.getFullYear(),now.getMonth()+offset,1);
    const end=new Date(now.getFullYear(),now.getMonth()+offset+1,0,23,59,59,999);
    return{start,end,label:start.toLocaleDateString('en-GB',{month:'long',year:'numeric'})};
  }

  // ── Shared styling primitives ─────────────────────────────
  const PAD=isMobile?'20px 16px':'32px';
  const CARD_RADIUS='8px';
  const card:any={background:C.surface,border:`1px solid ${C.border}`,borderRadius:CARD_RADIUS};
  const inp:any={width:'100%',background:C.surface2,border:`1px solid ${C.border}`,color:C.text,fontSize:'13px',padding:'10px 12px',outline:'none',fontFamily:'system-ui,sans-serif',boxSizing:'border-box',borderRadius:'6px'};

  // ── Top bar (always rendered) ─────────────────────────────
  const topBar=(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap',marginBottom:'18px'}}>
      <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:isMobile?'24px':'28px',color:C.text,lineHeight:1.1}}>Invoices</h1>
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
        {inboxToken&&(
          <button onClick={()=>setShowInbox(v=>!v)}
            style={{display:'inline-flex',alignItems:'center',gap:'8px',fontSize:'12px',fontWeight:600,letterSpacing:'0.3px',color:C.gold,background:'transparent',border:`1px solid ${C.gold}60`,padding:'9px 14px',cursor:'pointer',borderRadius:'6px'}}>
            <span style={{fontSize:'14px',lineHeight:1}}>✉</span>
            Forward email
          </button>
        )}
        {flagAiInvoiceScan&&(
          <button onClick={()=>fileRef.current?.click()} disabled={scanning||!isPaid}
            style={{display:'inline-flex',alignItems:'center',gap:'8px',fontSize:'12px',fontWeight:700,letterSpacing:'0.3px',color:C.bg,background:C.gold,border:'none',padding:'10px 16px',cursor:scanning||!isPaid?'not-allowed':'pointer',borderRadius:'6px',opacity:scanning||!isPaid?0.55:1}}>
            <span style={{fontSize:'14px',lineHeight:1}}>↑</span>
            {scanning?'Scanning…':(!isPaid?'Pro required':'Scan invoice')}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);e.target.value='';}}/>
      </div>
    </div>
  );

  // Inbox-address inline expansion — toggled by "Forward email" button.
  const inboxStrip=showInbox&&inboxAddress?(
    <div style={{...card,padding:'12px 14px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
      <span style={{fontSize:'11px',color:C.faint,letterSpacing:'0.5px',textTransform:'uppercase'}}>Forward to</span>
      <code style={{flex:1,minWidth:'200px',fontFamily:'monospace',fontSize:'13px',color:C.gold,background:`${C.gold}10`,padding:'6px 10px',borderRadius:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inboxAddress}</code>
      <button onClick={copyInboxAddress} style={{fontSize:'11px',fontWeight:600,color:C.gold,background:'transparent',border:`1px solid ${C.gold}60`,padding:'6px 10px',cursor:'pointer',borderRadius:'4px'}}>{inboxCopied?'✓ Copied':'Copy'}</button>
    </div>
  ):null;

  // ── Nav pills ─────────────────────────────────────────────
  const navPills=(
    <div style={{display:'flex',gap:'4px',borderBottom:`1px solid ${C.border}`,marginBottom:'18px',overflowX:'auto'}}>
      {([
        {id:'bank',label:'Ingredients bank'},
        {id:'history',label:'History'},
        {id:'suppliers',label:'Suppliers'},
        {id:'reports',label:'Reports'},
      ] as const).map(p=>{
        const active=view===p.id||(p.id==='history'&&view==='detail');
        return(
          <button key={p.id} onClick={()=>{ if(p.id==='reports'){setReportPeriod('week');setReportOffset(0);} setView(p.id); }}
            style={{
              fontSize:'13px',fontWeight:active?700:500,letterSpacing:'0.2px',
              color:active?C.gold:C.dim,background:'transparent',
              border:'none',borderBottom:active?`2px solid ${C.gold}`:'2px solid transparent',
              padding:'10px 14px',cursor:'pointer',whiteSpace:'nowrap',
            }}>
            {p.label}
          </button>
        );
      })}
    </div>
  );

  // ── Summary tiles ─────────────────────────────────────────
  const summaryTiles=(
    <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:'10px',marginBottom:'18px'}}>
      {[
        {l:'Total spend this month',v:`${sym}${monthSpend.toFixed(0)}`,c:C.gold},
        {l:'Invoices scanned',v:String(invoices.length),c:C.text},
        {l:'Price alerts',v:String(alerts.length),c:alerts.length>0?C.red:C.text},
        {l:'Flagged deliveries',v:String(discrepancySummary.count),c:discrepancySummary.count>0?AMBER:C.text},
      ].map(t=>(
        <div key={t.l} style={{...card,padding:'14px 16px'}}>
          <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint,marginBottom:'8px'}}>{t.l}</p>
          <p style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'24px',color:t.c,lineHeight:1.1}}>{t.v}</p>
        </div>
      ))}
    </div>
  );

  // ── Delivery check inline (takes over body when active) ───
  const deliveryInline=!deliveryStep||!pendingInvoice?null:(
    <div style={{...card,padding:isMobile?'18px':'22px',marginBottom:'18px',borderColor:`${AMBER}50`,background:`${AMBER}06`}}>
      {deliveryStep==='check'?(
        <>
          <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:AMBER,marginBottom:'8px'}}>Delivery check</p>
          <h2 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'22px',color:C.text,marginBottom:'6px',lineHeight:1.2}}>
            {pendingInvoice.supplier} · {new Date(pendingInvoice.scannedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long'})}
          </h2>
          <p style={{fontSize:'13px',color:C.faint,marginBottom:'18px'}}>
            {pendingInvoice.itemCount} item{pendingInvoice.itemCount===1?'':'s'} scanned · did everything arrive as expected?
          </p>
          <div style={{display:'flex',gap:'8px',flexDirection:isMobile?'column':'row'}}>
            <button onClick={acceptDelivery}
              style={{flex:1,minHeight:'48px',padding:'12px 16px',background:`${C.greenLight}18`,color:C.greenLight,border:`1.5px solid ${C.greenLight}60`,borderRadius:'8px',fontSize:'14px',fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
              <span style={{fontSize:'16px'}}>✓</span> Yes, all good
            </button>
            <button onClick={openFlagStep}
              style={{flex:1,minHeight:'48px',padding:'12px 16px',background:`${AMBER}18`,color:AMBER,border:`1.5px solid ${AMBER}60`,borderRadius:'8px',fontSize:'14px',fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
              <span style={{fontSize:'14px'}}>⚑</span> Flag an issue
            </button>
            <button onClick={skipDelivery}
              style={{minHeight:'48px',padding:'12px 16px',background:'transparent',color:C.faint,border:'none',fontSize:'13px',cursor:'pointer'}}>
              Skip
            </button>
          </div>
        </>
      ):(
        <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'14px',flexWrap:'wrap',gap:'6px'}}>
            <div>
              <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:AMBER,marginBottom:'4px'}}>Flag issues</p>
              <h2 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'20px',color:C.text}}>Adjust quantities or untick missing items</h2>
            </div>
            <button onClick={()=>setDeliveryStep('check')} style={{fontSize:'12px',color:C.faint,background:'transparent',border:'none',cursor:'pointer'}}>← Back</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'16px'}}>
            {flagItems.map((d,idx)=>{
              const short=d.receivedQty<d.invoicedQty;
              const missing=!d.received;
              return(
                <div key={idx} style={{padding:'12px',background:missing?`${C.red}08`:short?`${AMBER}08`:C.surface2,border:`1px solid ${missing?C.red+'40':short?AMBER+'40':C.border}`,borderRadius:'8px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'10px',marginBottom:'10px'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:'14px',color:missing?C.faint:C.text,fontWeight:500,textDecoration:missing?'line-through':'none'}}>{d.name}</p>
                      <p style={{fontSize:'11px',color:C.faint,marginTop:'2px'}}>Invoiced: {d.invoicedQty} {d.unit} · {sym}{(d.unitPrice||0).toFixed(2)}/{d.unit}</p>
                    </div>
                    <button onClick={()=>setFlagItems(prev=>prev.map((x,i)=>i===idx?{...x,received:!x.received,receivedQty:!x.received?x.invoicedQty:0}:x))}
                      aria-label={d.received?'Mark as not received':'Mark as received'}
                      style={{width:'44px',height:'44px',background:d.received?`${C.greenLight}20`:`${C.red}20`,color:d.received?C.greenLight:C.red,border:`1.5px solid ${d.received?C.greenLight+'60':C.red+'60'}`,borderRadius:'8px',cursor:'pointer',fontSize:'18px',fontWeight:700,flexShrink:0}}>
                      {d.received?'✓':'✗'}
                    </button>
                  </div>
                  {d.received&&(
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                      <label style={{fontSize:'11px',color:C.faint,whiteSpace:'nowrap'}}>Received qty</label>
                      <input type="number" min={0} max={d.invoicedQty} step="0.01" value={d.receivedQty}
                        onChange={e=>setFlagItems(prev=>prev.map((x,i)=>i===idx?{...x,receivedQty:Math.max(0,Math.min(x.invoicedQty,parseFloat(e.target.value)||0))}:x))}
                        style={{flex:1,background:C.surface,border:`1px solid ${short?AMBER+'60':C.border}`,color:C.text,fontSize:'15px',padding:'10px 12px',borderRadius:'6px',outline:'none',minHeight:'44px',boxSizing:'border-box'}}/>
                      <span style={{fontSize:'12px',color:C.faint,minWidth:'30px'}}>{d.unit}</span>
                    </div>
                  )}
                  <input type="text" placeholder="Optional note (damaged, wrong cut, etc.)" value={d.note}
                    onChange={e=>setFlagItems(prev=>prev.map((x,i)=>i===idx?{...x,note:e.target.value}:x))}
                    style={{...inp,minHeight:'44px'}}/>
                </div>
              );
            })}
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={skipDelivery} style={{flex:1,minHeight:'44px',padding:'12px',background:'transparent',color:C.faint,border:`1px solid ${C.border}`,borderRadius:'6px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>Cancel</button>
            <button onClick={saveFlagged} style={{flex:2,minHeight:'44px',padding:'12px',background:C.gold,color:C.bg,border:'none',borderRadius:'6px',fontSize:'14px',fontWeight:700,cursor:'pointer'}}>Save flagged invoice</button>
          </div>
        </>
      )}
    </div>
  );

  // ── BANK VIEW BODY ────────────────────────────────────────
  function renderBankBody(){
    return(
      <>
        {discrepancySummary.count>0&&(
          <button onClick={()=>setView('history')}
            style={{display:'flex',alignItems:'center',gap:'12px',width:'100%',background:`${AMBER}10`,border:`1px solid ${AMBER}40`,borderRadius:'8px',padding:'12px 14px',marginBottom:'16px',cursor:'pointer',textAlign:'left'}}>
            <span style={{fontSize:'18px',color:AMBER}}>⚑</span>
            <p style={{fontSize:'12px',color:C.dim,flex:1,lineHeight:1.5}}>
              <strong style={{color:AMBER}}>{discrepancySummary.count}</strong> delivery discrepanc{discrepancySummary.count===1?'y':'ies'} flagged in the last 30 days — <strong style={{color:AMBER}}>{sym}{discrepancySummary.value.toFixed(2)}</strong> estimated variance.
            </p>
            <span style={{fontSize:'16px',color:AMBER}}>›</span>
          </button>
        )}

        {/* Big scan/upload affordance */}
        {flagAiInvoiceScan&&(
          <button onClick={()=>fileRef.current?.click()} disabled={scanning||!isPaid}
            style={{
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'8px',
              width:'100%',padding:isMobile?'28px 20px':'40px 24px',
              background:C.surface2,border:`2px dashed ${C.border}`,borderRadius:'12px',
              marginBottom:'20px',cursor:scanning||!isPaid?'not-allowed':'pointer',
              opacity:scanning||!isPaid?0.55:1,
            }}>
            <div style={{width:'56px',height:'56px',borderRadius:'50%',background:`${C.gold}14`,border:`1px solid ${C.gold}40`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'4px'}}>
              <span style={{fontSize:'24px'}}>📷</span>
            </div>
            <p style={{fontSize:'16px',fontWeight:600,color:C.text}}>{scanning?'Scanning your invoice…':'Scan or upload an invoice'}</p>
            {inboxAddress?(
              <p style={{fontSize:'12px',color:C.faint,textAlign:'center'}}>
                or email it to <span style={{color:C.gold}}>{inboxAddress}</span>
              </p>
            ):(
              <p style={{fontSize:'12px',color:C.faint,textAlign:'center'}}>PDF, JPG, PNG or HEIC</p>
            )}
          </button>
        )}

        {!isPaid&&(
          <div style={{...card,background:`${C.gold}10`,borderColor:`${C.gold}30`,padding:'14px 16px',marginBottom:'16px'}}>
            <p style={{fontSize:'13px',color:C.gold}}>Invoice scanning is included on Pro, Kitchen, and Group plans. Upgrade to unlock.</p>
          </div>
        )}

        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ingredients or supplier…"
          style={{...inp,padding:'12px 14px',fontSize:'14px',marginBottom:'14px'}}/>

        {filtered.length===0?(
          <div style={{textAlign:'center',padding:'40px 0'}}>
            <p style={{fontSize:'13px',color:C.faint}}>{bank.length===0?'No ingredients yet. Scan an invoice to build your bank.':'No results.'}</p>
          </div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            {filtered.map((item:any)=>{
              const hasAlert=alerts.find((a:any)=>a.name.toLowerCase()===item.name.toLowerCase());
              return(
                <div key={item.id} style={{...card,padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                      <p style={{fontSize:'14px',color:C.text,fontWeight:500}}>{item.name}</p>
                      {hasAlert&&(
                        <span style={{fontSize:'10px',fontWeight:700,color:hasAlert.change>0?C.red:C.greenLight,background:(hasAlert.change>0?C.red:C.greenLight)+'14',border:`0.5px solid ${(hasAlert.change>0?C.red:C.greenLight)}40`,padding:'2px 6px',borderRadius:'3px'}}>
                          {hasAlert.change>0?'↑':'↓'} {Math.abs(hasAlert.pct||0).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <p style={{fontSize:'11px',color:C.faint}}>
                      {item.supplier} · {sym}{(item.unitPrice||0).toFixed(2)}/{item.unit}
                      {hasAlert&&<span style={{color:C.faint}}> · was {sym}{(hasAlert.oldPrice||0).toFixed(2)}</span>}
                    </p>
                  </div>
                  <select value={item.category||'Other'} onChange={e=>appActions.upsertBank([{name:item.name,category:e.target.value}])}
                    style={{fontSize:'11px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'6px 8px',borderRadius:'4px',outline:'none',cursor:'pointer'}}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  {deleteId===item.id?(
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <button onClick={()=>setDeleteId(null)} style={{fontSize:'11px',color:C.dim,background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
                      <button onClick={()=>{appActions.delBank(item.id);setDeleteId(null);}} style={{fontSize:'11px',fontWeight:700,color:'#fff',background:C.red,border:'none',padding:'5px 10px',cursor:'pointer',borderRadius:'4px'}}>Delete</button>
                    </div>
                  ):(
                    <button onClick={()=>setDeleteId(item.id)} style={{color:C.faint,background:'none',border:'none',cursor:'pointer',fontSize:'18px',padding:'0 4px'}}>×</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ── HISTORY VIEW BODY ─────────────────────────────────────
  function renderHistoryBody(){
    return(
      <>
        {discrepancySummary.count>0&&(
          <div style={{...card,background:`${AMBER}10`,borderColor:`${AMBER}40`,padding:'12px 14px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
            <span style={{fontSize:'18px',color:AMBER}}>⚑</span>
            <p style={{fontSize:'12px',color:C.dim,flex:1,lineHeight:1.5}}>
              <strong style={{color:AMBER}}>{discrepancySummary.count}</strong> delivery discrepanc{discrepancySummary.count===1?'y':'ies'} flagged in the last 30 days — <strong style={{color:AMBER}}>{sym}{discrepancySummary.value.toFixed(2)}</strong> estimated variance.
            </p>
          </div>
        )}
        {invoices.length===0?(
          <div style={{textAlign:'center',padding:'60px 0'}}><p style={{fontSize:'13px',color:C.faint}}>No invoices scanned yet.</p></div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            {[...invoices].sort((a:any,b:any)=>b.scannedAt-a.scannedAt).map((inv:any)=>{
              const rel=reliabilityIdx.get((inv.supplier||'').toLowerCase().replace(/\s+/g,' ').trim());
              const isFlagged=inv.status==='flagged';
              const isConfirmed=inv.status==='confirmed';
              const total=typeof inv.total==='number'&&inv.total>0?inv.total:(inv.items||[]).reduce((s:number,it:any)=>s+(it.totalPrice||((it.unitPrice||0)*(it.qty||0))||0),0);
              const iconBg=isFlagged?`${AMBER}18`:isConfirmed?`${C.greenLight}18`:`${C.gold}14`;
              const iconColor=isFlagged?AMBER:isConfirmed?C.greenLight:C.gold;
              const iconGlyph=isFlagged?'⚑':isConfirmed?'✓':'≡';
              return(
                <div key={inv.id} style={{...card,overflow:'hidden',borderColor:isFlagged?`${AMBER}50`:C.border}}>
                  <button onClick={()=>{setSelectedInvoice(inv);setView('detail');}}
                    style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'8px',background:iconBg,border:`1px solid ${iconColor}40`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:'16px',color:iconColor}}>{iconGlyph}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'2px'}}>
                        <p style={{fontSize:'13px',color:C.text,fontWeight:500}}>{inv.supplier||'Unknown'}</p>
                        {rel&&(
                          <span title={`Reliability ${rel.score.toFixed(1)}/10`}
                            style={{fontSize:'10px',fontWeight:700,color:scoreColour(rel.score,C),background:scoreColour(rel.score,C)+'14',border:`0.5px solid ${scoreColour(rel.score,C)}40`,padding:'1px 6px',borderRadius:'3px'}}>
                            {rel.score.toFixed(1)}/10
                          </span>
                        )}
                      </div>
                      <p style={{fontSize:'11px',color:C.faint}}>
                        {new Date(inv.scannedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} · {inv.itemCount} item{inv.itemCount===1?'':'s'}{inv.priceChanges>0?` · ${inv.priceChanges} price change${inv.priceChanges>1?'s':''}`:''}
                      </p>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px',flexShrink:0}}>
                      <p style={{fontSize:'14px',color:C.gold,fontWeight:600}}>{sym}{total.toFixed(2)}</p>
                      {isFlagged?(
                        <span style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase',color:AMBER,background:`${AMBER}14`,border:`0.5px solid ${AMBER}40`,padding:'2px 6px',borderRadius:'3px'}}>Delivery flagged</span>
                      ):isConfirmed?(
                        <span style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase',color:C.greenLight,background:`${C.greenLight}14`,border:`0.5px solid ${C.greenLight}40`,padding:'2px 6px',borderRadius:'3px'}}>Confirmed</span>
                      ):inv.priceChanges>0?(
                        <span style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase',color:C.red,background:`${C.red}14`,border:`0.5px solid ${C.red}40`,padding:'2px 6px',borderRadius:'3px'}}>{inv.priceChanges} alert{inv.priceChanges>1?'s':''}</span>
                      ):null}
                    </div>
                  </button>
                  {deleteId===inv.id?(
                    <div style={{padding:'10px 16px',borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:'8px',background:`${C.red}06`}}>
                      <p style={{fontSize:'12px',color:C.red,flex:1}}>Delete this invoice?</p>
                      <button onClick={()=>setDeleteId(null)} style={{fontSize:'11px',color:C.dim,background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
                      <button onClick={()=>{appActions.delInvoice(inv.id);setDeleteId(null);}} style={{fontSize:'11px',fontWeight:700,color:'#fff',background:C.red,border:'none',padding:'5px 12px',cursor:'pointer',borderRadius:'4px'}}>Confirm</button>
                    </div>
                  ):(
                    <button onClick={()=>setDeleteId(inv.id)} style={{width:'100%',padding:'7px 16px',background:'none',border:'none',borderTop:`1px solid ${C.border}`,cursor:'pointer',color:C.faint,fontSize:'11px',textAlign:'left'}}>Delete</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ── DETAIL VIEW BODY ──────────────────────────────────────
  function renderDetailBody(){
    if(!selectedInvoice)return null;
    return(
      <>
        <button onClick={()=>{setView('history');setSelectedInvoice(null);}}
          style={{fontSize:'12px',color:C.gold,background:'none',border:'none',cursor:'pointer',marginBottom:'16px'}}>
          ← Back to history
        </button>
        <div style={{marginBottom:'18px'}}>
          <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.gold,marginBottom:'6px'}}>Invoice detail</p>
          <h2 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'24px',color:C.text,lineHeight:1.2}}>
            {selectedInvoice.supplier||'Unknown supplier'}
          </h2>
          <p style={{fontSize:'12px',color:C.faint,marginTop:'4px'}}>
            {new Date(selectedInvoice.scannedAt).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {selectedInvoice.itemCount} items scanned
          </p>
        </div>

        {(selectedInvoice.priceChangeDetails||[]).length>0&&(
          <div style={{...card,marginBottom:'16px',overflow:'hidden',background:`${C.red}06`,borderColor:`${C.red}40`}}>
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.red}30`,display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{width:'8px',height:'8px',borderRadius:'50%',background:C.red}}></span>
              <p style={{fontSize:'12px',fontWeight:700,color:C.red,letterSpacing:'0.3px'}}>
                {selectedInvoice.priceChangeDetails.length} price change{selectedInvoice.priceChangeDetails.length>1?'s':''} detected
              </p>
            </div>
            {selectedInvoice.priceChangeDetails.map((c:any,i:number)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'14px',alignItems:'center',padding:'12px 16px',borderBottom:`1px solid ${C.border}`}}>
                <p style={{fontSize:'13px',color:C.text}}>{c.name}</p>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:'10px',color:C.faint}}>Was</p>
                  <p style={{fontSize:'12px',color:C.dim}}>{sym}{(c.oldPrice||0).toFixed(2)}/{c.unit}</p>
                </div>
                <span style={{fontSize:'14px',color:C.faint}}>→</span>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:'10px',color:C.faint}}>Now</p>
                  <p style={{fontSize:'13px',fontWeight:700,color:c.change>0?C.red:C.greenLight}}>{sym}{(c.newPrice||0).toFixed(2)}/{c.unit}</p>
                  <p style={{fontSize:'10px',color:c.change>0?C.red:C.greenLight}}>{c.change>0?'+':''}{(c.pct||0).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {(selectedInvoice.items||[]).length>0&&(
          <div style={{...card,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`}}>
              <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint}}>All items scanned</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:'12px',padding:'10px 16px',background:C.surface2,borderBottom:`1px solid ${C.border}`}}>
              {['Ingredient','Qty','Unit price','Total'].map((h,i)=>(
                <p key={h} style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint,textAlign:i===0?'left':'right'}}>{h}</p>
              ))}
            </div>
            {selectedInvoice.items.map((item:any,i:number)=>{
              const hasChange=(selectedInvoice.priceChangeDetails||[]).find((c:any)=>c.name.toLowerCase()===item.name.toLowerCase());
              return(
                <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:'12px',padding:'12px 16px',borderBottom:`1px solid ${C.border}`,alignItems:'center',background:hasChange?`${C.red}04`:'transparent'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    {hasChange&&<span style={{width:'6px',height:'6px',borderRadius:'50%',background:hasChange.change>0?C.red:C.greenLight,flexShrink:0}}></span>}
                    <p style={{fontSize:'13px',color:C.text}}>{item.name}</p>
                  </div>
                  <p style={{fontSize:'12px',color:C.dim,textAlign:'right'}}>{item.qty} {item.unit}</p>
                  <p style={{fontSize:'13px',color:hasChange?C.gold:C.text,textAlign:'right'}}>{sym}{(item.unitPrice||0).toFixed(2)}</p>
                  <p style={{fontSize:'13px',color:C.gold,textAlign:'right'}}>{item.totalPrice?sym+(item.totalPrice).toFixed(2):'—'}</p>
                </div>
              );
            })}
          </div>
        )}

        {(selectedInvoice.discrepancies||[]).length>0&&(
          <div style={{...card,marginTop:'16px',background:`${AMBER}06`,borderColor:`${AMBER}40`,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${AMBER}30`,display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{fontSize:'14px',color:AMBER}}>⚑</span>
              <p style={{fontSize:'12px',fontWeight:700,color:AMBER,letterSpacing:'0.3px'}}>Delivery discrepancies</p>
            </div>
            {selectedInvoice.discrepancies.map((d:any,i:number)=>(
              <div key={i} style={{padding:'10px 16px',borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:'10px',marginBottom:'4px'}}>
                  <p style={{fontSize:'13px',color:C.text}}>{d.name}</p>
                  <p style={{fontSize:'12px',color:d.received?AMBER:C.red,fontWeight:600}}>
                    {d.received?`${d.receivedQty} of ${d.invoicedQty} ${d.unit}`:'Not received'}
                  </p>
                </div>
                {d.note&&<p style={{fontSize:'11px',color:C.faint,fontStyle:'italic'}}>{d.note}</p>}
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // ── REVIEW VIEW BODY ──────────────────────────────────────
  function renderReviewBody(){
    return(
      <>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px',gap:'12px',flexWrap:'wrap'}}>
          <div>
            <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.gold,marginBottom:'4px'}}>Review scan</p>
            <h2 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'22px',color:C.text}}>{scanResults.length} item{scanResults.length===1?'':'s'} extracted</h2>
            <p style={{fontSize:'12px',color:C.faint,marginTop:'2px'}}>Deselect any to exclude, name the supplier, then confirm.</p>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>{setScanResults([]);setPriceChanges([]);setView('bank');}}
              style={{fontSize:'12px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'9px 14px',cursor:'pointer',borderRadius:'6px'}}>Cancel</button>
            <button onClick={confirmScan}
              style={{fontSize:'12px',fontWeight:700,background:C.gold,color:C.bg,border:'none',padding:'10px 16px',cursor:'pointer',borderRadius:'6px'}}>
              Confirm {scanResults.filter(i=>i.selected).length} item{scanResults.filter(i=>i.selected).length===1?'':'s'}
            </button>
          </div>
        </div>

        <div style={{...card,padding:'14px',marginBottom:'14px'}}>
          <label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>Supplier name</label>
          <input value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="e.g. Brakes, Bidfood…" style={{...inp,maxWidth:'360px'}}/>
        </div>

        {priceChanges.length>0&&(
          <div style={{...card,background:`${C.red}08`,borderColor:`${C.red}40`,padding:'12px 14px',marginBottom:'14px'}}>
            <p style={{fontSize:'12px',fontWeight:700,color:C.red,marginBottom:'8px'}}>{priceChanges.length} price change{priceChanges.length>1?'s':''} detected vs bank</p>
            {priceChanges.map((c:any,i:number)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'4px'}}>
                <span style={{color:C.dim}}>{c.name}</span>
                <span style={{color:c.change>0?C.red:C.greenLight}}>{sym}{c.oldPrice.toFixed(2)} → {sym}{c.newPrice.toFixed(2)} ({c.change>0?'+':''}{c.pct.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {scanResults.map(item=>(
            <button key={item.id} onClick={()=>setScanResults(prev=>prev.map(i=>i.id===item.id?{...i,selected:!i.selected}:i))}
              style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',background:C.surface,border:`1px solid ${item.selected?C.gold:C.border}`,borderRadius:'8px',cursor:'pointer',opacity:item.selected?1:0.55,textAlign:'left'}}>
              <div style={{width:'22px',height:'22px',borderRadius:'4px',background:item.selected?C.gold:C.surface2,border:`1px solid ${item.selected?C.gold:C.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {item.selected&&<span style={{color:C.bg,fontSize:'13px',fontWeight:700}}>✓</span>}
              </div>
              <span style={{flex:1,fontSize:'14px',color:C.text}}>{item.name}</span>
              <span style={{fontSize:'12px',color:C.faint}}>{item.qty} {item.unit}</span>
              <span style={{fontSize:'13px',color:C.gold,fontWeight:600}}>{sym}{(item.unitPrice||0).toFixed(2)}</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  // ── SUPPLIERS VIEW BODY ───────────────────────────────────
  function renderSuppliersBody(){
    const ninetyAgo=Date.now()-90*86400000;
    const ninetyInvoices=invoices.filter((i:any)=>(i.scannedAt||0)>=ninetyAgo);
    const ninetySpend=ninetyInvoices.reduce((s:number,inv:any)=>{
      if(typeof inv.total==='number'&&inv.total>0)return s+inv.total;
      return s+(inv.items||[]).reduce((ss:number,it:any)=>ss+(it.totalPrice||((it.unitPrice||0)*(it.qty||0))||0),0);
    },0);
    const ninetyFlagged=ninetyInvoices.filter((i:any)=>i.status==='flagged').length;
    const avgScore=reliability.length>0?reliability.reduce((s,r)=>s+r.score,0)/reliability.length:0;

    return(
      <>
        <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:'10px',marginBottom:'14px'}}>
          {[
            {l:'Active suppliers',v:String(reliability.length),c:C.text},
            {l:'Total spend 90 days',v:`${sym}${ninetySpend.toFixed(0)}`,c:C.gold},
            {l:'Flagged deliveries',v:String(ninetyFlagged),c:ninetyFlagged>0?AMBER:C.text},
            {l:'Average reliability',v:reliability.length>0?`${avgScore.toFixed(1)}/10`:'—',c:avgScore>=8?C.greenLight:avgScore>=6?C.gold:C.red},
          ].map(t=>(
            <div key={t.l} style={{...card,padding:'14px 16px'}}>
              <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint,marginBottom:'8px'}}>{t.l}</p>
              <p style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'22px',color:t.c,lineHeight:1.1}}>{t.v}</p>
            </div>
          ))}
        </div>

        <div style={{...card,borderLeft:`3px solid ${C.gold}`,padding:'12px 14px',marginBottom:'18px'}}>
          <p style={{fontSize:'11px',color:C.dim,lineHeight:1.5}}>
            Score (0–10) blends the share of deliveries confirmed-as-correct with the £ value of discrepancies on flagged invoices. Trend compares the last 45 days to the prior 45. Tap a supplier to see their most common issue and price history.
          </p>
        </div>

        <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,marginBottom:'10px'}}>Supplier reliability — ranked worst first</p>

        {reliability.length===0?(
          <div style={{textAlign:'center',padding:'60px 0'}}><p style={{fontSize:'13px',color:C.faint}}>No supplier history yet — scan a few invoices to start tracking.</p></div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {reliability.map(r=>{
              const expanded=expandedSupplier===r.nameKey;
              const trendIcon=r.trend==='improving'?'↑':r.trend==='declining'?'↓':r.trend==='stable'?'→':'·';
              const trendColor=r.trend==='improving'?C.greenLight:r.trend==='declining'?C.red:C.faint;
              const accuracyPct=r.totalInvoices>0?(r.confirmedCount/r.totalInvoices)*100:100;
              const flaggedRatio=r.totalInvoices>0?`${r.flaggedCount}/${r.totalInvoices}`:'0/0';
              // Price-change rows for this supplier — across all their invoices' priceChangeDetails.
              const priceHistory:any[]=[];
              for(const inv of invoices){
                if((inv.supplier||'').toLowerCase().trim()!==r.name.toLowerCase().trim())continue;
                for(const c of (inv.priceChangeDetails||[])) priceHistory.push({...c,supplier:r.name,detectedAt:c.detectedAt||inv.scannedAt});
              }
              priceHistory.sort((a,b)=>(b.detectedAt||0)-(a.detectedAt||0));
              // Items supplied — unique ingredient names from this supplier's invoices.
              const items=new Set<string>();
              for(const inv of invoices){
                if((inv.supplier||'').toLowerCase().trim()!==r.name.toLowerCase().trim())continue;
                for(const it of (inv.items||[])) if(it.name)items.add(it.name);
              }
              return(
                <div key={r.nameKey} style={{...card,overflow:'hidden'}}>
                  <button onClick={()=>setExpandedSupplier(expanded?null:r.nameKey)}
                    style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',background:'transparent',border:'none',cursor:'pointer',textAlign:'left'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'50%',background:`${C.gold}18`,color:C.gold,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:700,fontFamily:'Georgia,serif',flexShrink:0}}>
                      {initials(r.name)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:'14px',color:C.text,fontWeight:500,marginBottom:'2px'}}>{r.name}</p>
                      <p style={{fontSize:'11px',color:C.faint}}>
                        Last invoice {r.lastInvoiceTs?new Date(r.lastInvoiceTs).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—'} · {r.totalInvoices} on file
                      </p>
                    </div>
                    {!isMobile&&(
                      <>
                        <div style={{textAlign:'right',minWidth:'80px'}}>
                          <p style={{fontSize:'10px',color:C.faint,textTransform:'uppercase',letterSpacing:'0.5px'}}>90d spend</p>
                          <p style={{fontSize:'13px',color:C.gold,fontWeight:600}}>{sym}{r.totalValue.toFixed(0)}</p>
                        </div>
                        <div style={{textAlign:'right',minWidth:'70px'}}>
                          <p style={{fontSize:'10px',color:C.faint,textTransform:'uppercase',letterSpacing:'0.5px'}}>Flagged</p>
                          <p style={{fontSize:'13px',color:r.flaggedCount>0?AMBER:C.dim,fontWeight:600}}>{flaggedRatio}</p>
                        </div>
                        <div title={`Trend: ${r.trend}`} style={{textAlign:'right',minWidth:'40px',color:trendColor,fontSize:'18px',fontWeight:700}}>
                          {trendIcon}
                        </div>
                      </>
                    )}
                    <span title={`Reliability ${r.score.toFixed(1)}/10`}
                      style={{fontSize:'12px',fontWeight:700,color:scoreColour(r.score,C),background:scoreColour(r.score,C)+'14',border:`1px solid ${scoreColour(r.score,C)}40`,padding:'5px 9px',borderRadius:'4px',flexShrink:0}}>
                      {r.score.toFixed(1)}/10
                    </span>
                    <span style={{fontSize:'14px',color:C.faint,flexShrink:0}}>{expanded?'▾':'▸'}</span>
                  </button>
                  {expanded&&(
                    <div style={{padding:'12px 16px 18px',borderTop:`1px solid ${C.border}`,background:C.surface2}}>
                      {/* Stat tiles */}
                      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:'8px',marginBottom:'14px'}}>
                        {[
                          {l:'Score last 45d',v:`${r.scoreRecent.toFixed(1)}/10`,c:scoreColour(r.scoreRecent,C)},
                          {l:'Score prior 45d',v:`${r.scorePrior.toFixed(1)}/10`,c:scoreColour(r.scorePrior,C)},
                          {l:'Total discrepancy',v:`${sym}${r.totalDiscrepancyValue.toFixed(2)}`,c:r.totalDiscrepancyValue>0?C.red:C.dim},
                          {l:'Delivery accuracy',v:`${accuracyPct.toFixed(0)}%`,c:accuracyPct>=80?C.greenLight:accuracyPct>=60?C.gold:C.red},
                        ].map(t=>(
                          <div key={t.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:'6px',padding:'10px 12px'}}>
                            <p style={{fontSize:'10px',color:C.faint,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px'}}>{t.l}</p>
                            <p style={{fontSize:'15px',color:t.c,fontWeight:600}}>{t.v}</p>
                          </div>
                        ))}
                      </div>

                      {/* Top issue callout */}
                      {r.topIssue?(
                        <div style={{background:`${C.gold}10`,border:`1px solid ${C.gold}40`,borderRadius:'6px',padding:'10px 12px',marginBottom:'14px'}}>
                          <p style={{fontSize:'10px',color:C.faint,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'2px'}}>Most common issue</p>
                          <p style={{fontSize:'13px',color:C.text}}><strong style={{color:C.gold}}>{r.topIssue.name}</strong> flagged {r.topIssue.count}×</p>
                        </div>
                      ):r.flaggedCount===0?(
                        <p style={{fontSize:'11px',color:C.faint,fontStyle:'italic',marginBottom:'14px'}}>No flagged deliveries — every invoice from this supplier has been confirmed.</p>
                      ):(
                        <p style={{fontSize:'11px',color:C.faint,fontStyle:'italic',marginBottom:'14px'}}>Flags were on overall delivery, not a specific item.</p>
                      )}

                      {/* Price change history */}
                      {priceHistory.length>0&&(
                        <>
                          <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,marginBottom:'6px'}}>Price changes</p>
                          <div style={{...card,overflow:'hidden',marginBottom:'14px'}}>
                            {priceHistory.slice(0,8).map((c:any,i:number)=>(
                              <div key={i} style={{display:'grid',gridTemplateColumns:'1.4fr 0.8fr auto',gap:'8px',padding:'8px 12px',borderBottom:`1px solid ${C.border}`,alignItems:'center',fontSize:'12px'}}>
                                <span style={{color:C.text}}>{c.name}</span>
                                <span style={{color:C.faint,textAlign:'right'}}>{c.detectedAt?new Date(c.detectedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—'}</span>
                                <span style={{color:c.change>0?C.red:C.greenLight,textAlign:'right',fontWeight:600}}>
                                  {sym}{(c.oldPrice||0).toFixed(2)} → {sym}{(c.newPrice||0).toFixed(2)} ({c.change>0?'+':''}{(c.pct||0).toFixed(1)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Items supplied chips */}
                      {items.size>0&&(
                        <>
                          <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,marginBottom:'6px'}}>Items supplied ({items.size})</p>
                          <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'14px'}}>
                            {Array.from(items).slice(0,30).map(n=>(
                              <span key={n} style={{fontSize:'11px',color:C.dim,background:C.surface,border:`1px solid ${C.border}`,padding:'4px 10px',borderRadius:'12px'}}>{n}</span>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Contact (placeholder — no rep storage in current data model) */}
                      <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,marginBottom:'6px'}}>Contact</p>
                      <div style={{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'14px'}}>
                        <p style={{fontSize:'12px',color:C.faint,fontStyle:'italic'}}>Add a supplier rep / phone / email to a future contact card — not currently stored.</p>
                      </div>

                      {/* Action buttons */}
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                        <button disabled title="Coming in Phase 3 — Supplier ordering"
                          style={{fontSize:'12px',fontWeight:700,color:C.bg,background:`${C.gold}80`,border:'none',padding:'9px 14px',cursor:'not-allowed',borderRadius:'6px',opacity:0.6}}>
                          Raise purchase order
                        </button>
                        <button disabled title="No phone stored"
                          style={{fontSize:'12px',color:C.dim,background:'transparent',border:`1px solid ${C.border}`,padding:'9px 14px',cursor:'not-allowed',borderRadius:'6px',opacity:0.6}}>
                          Call rep
                        </button>
                        <button onClick={()=>setView('history')}
                          style={{fontSize:'12px',color:C.dim,background:'transparent',border:`1px solid ${C.border}`,padding:'9px 14px',cursor:'pointer',borderRadius:'6px'}}>
                          Full history
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ── REPORTS VIEW BODY (kept as-is, styled to new tokens) ──
  function renderReportsBody(){
    const{start,end,label}=periodRange(reportPeriod,reportOffset);
    const inPeriod=invoices.filter((i:any)=>i.scannedAt>=start.getTime()&&i.scannedAt<=end.getTime());
    const itemValue=(it:any)=>it.totalPrice||((it.unitPrice||0)*(it.qty||0))||0;
    const totalSpend=inPeriod.reduce((s:number,inv:any)=>s+(inv.items||[]).reduce((ss:number,it:any)=>ss+itemValue(it),0),0);
    const itemCount=inPeriod.reduce((s:number,inv:any)=>s+(inv.itemCount||(inv.items||[]).length),0);
    const priceChangeCount=inPeriod.reduce((s:number,inv:any)=>s+(inv.priceChanges||(inv.priceChangeDetails||[]).length),0);
    const bySupplier:Record<string,number>={};
    const byCategory:Record<string,number>={};
    const allPriceChanges:any[]=[];
    inPeriod.forEach((inv:any)=>{
      const sup=inv.supplier||'Unknown';
      const subtotal=(inv.items||[]).reduce((ss:number,it:any)=>ss+itemValue(it),0);
      bySupplier[sup]=(bySupplier[sup]||0)+subtotal;
      (inv.items||[]).forEach((it:any)=>{
        const cat=it.category||guessCategory(it.name);
        byCategory[cat]=(byCategory[cat]||0)+itemValue(it);
      });
      (inv.priceChangeDetails||[]).forEach((c:any)=>allPriceChanges.push({...c,scannedAt:inv.scannedAt,supplier:inv.supplier}));
    });
    const supplierRows=Object.entries(bySupplier).sort((a,b)=>b[1]-a[1]);
    const categoryRows=Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
    const supMax=supplierRows[0]?.[1]||1;
    const catMax=categoryRows[0]?.[1]||1;

    return(
      <>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'18px',flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:'2px'}}>
            {(['week','month'] as const).map(p=>(
              <button key={p} onClick={()=>{setReportPeriod(p);setReportOffset(0);}}
                style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.3px',background:reportPeriod===p?C.gold:'transparent',color:reportPeriod===p?C.bg:C.dim,border:reportPeriod===p?'none':`1px solid ${C.border}`,padding:'8px 14px',cursor:'pointer',borderRadius:'6px',textTransform:'capitalize'}}>
                {p==='week'?'Weekly':'Monthly'}
              </button>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginLeft:'auto'}}>
            <button onClick={()=>setReportOffset(reportOffset-1)} style={{fontSize:'14px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'6px 12px',cursor:'pointer',borderRadius:'6px'}}>←</button>
            <p style={{fontSize:'13px',color:C.text,minWidth:'200px',textAlign:'center'}}>{label}</p>
            <button onClick={()=>setReportOffset(Math.min(0,reportOffset+1))} disabled={reportOffset>=0} style={{fontSize:'14px',color:C.dim,background:C.surface2,border:`1px solid ${C.border}`,padding:'6px 12px',cursor:reportOffset>=0?'default':'pointer',borderRadius:'6px',opacity:reportOffset>=0?0.4:1}}>→</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:'10px',marginBottom:'18px'}}>
          {[
            {l:'Total spend',v:`${sym}${totalSpend.toFixed(2)}`,c:C.gold},
            {l:'Invoices',v:String(inPeriod.length),c:C.text},
            {l:'Items',v:String(itemCount),c:C.text},
            {l:'Price changes',v:String(priceChangeCount),c:priceChangeCount>0?C.red:C.text},
          ].map(t=>(
            <div key={t.l} style={{...card,padding:'14px 16px'}}>
              <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint,marginBottom:'8px'}}>{t.l}</p>
              <p style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'22px',color:t.c,lineHeight:1.1}}>{t.v}</p>
            </div>
          ))}
        </div>

        {inPeriod.length===0?(
          <div style={{textAlign:'center',padding:'60px 0'}}><p style={{fontSize:'13px',color:C.faint}}>No invoices in this period.</p></div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div style={{...card,overflow:'hidden'}}>
              <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}>
                <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint}}>Spend by supplier</p>
              </div>
              {supplierRows.map(([sup,v])=>(
                <div key={sup} style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <p style={{fontSize:'13px',color:C.text}}>{sup}</p>
                    <p style={{fontSize:'13px',color:C.gold}}>{sym}{v.toFixed(2)} <span style={{color:C.faint,fontSize:'11px'}}>· {((v/totalSpend)*100).toFixed(0)}%</span></p>
                  </div>
                  <div style={{height:'4px',background:C.surface2,borderRadius:'2px',overflow:'hidden'}}>
                    <div style={{width:`${(v/supMax)*100}%`,height:'100%',background:C.gold}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{...card,overflow:'hidden'}}>
              <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}>
                <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint}}>Spend by category</p>
              </div>
              {categoryRows.map(([cat,v])=>(
                <div key={cat} style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <p style={{fontSize:'13px',color:C.text}}>{cat}</p>
                    <p style={{fontSize:'13px',color:C.gold}}>{sym}{v.toFixed(2)} <span style={{color:C.faint,fontSize:'11px'}}>· {((v/totalSpend)*100).toFixed(0)}%</span></p>
                  </div>
                  <div style={{height:'4px',background:C.surface2,borderRadius:'2px',overflow:'hidden'}}>
                    <div style={{width:`${(v/catMax)*100}%`,height:'100%',background:C.gold}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {allPriceChanges.length>0&&(
          <div style={{...card,overflow:'hidden'}}>
            <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}>
              <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint}}>Price changes ({allPriceChanges.length})</p>
            </div>
            {allPriceChanges.sort((a,b)=>Math.abs(b.pct||0)-Math.abs(a.pct||0)).map((c:any,i:number)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'14px',padding:'10px 14px',borderBottom:`1px solid ${C.border}`,alignItems:'center'}}>
                <div>
                  <p style={{fontSize:'13px',color:C.text}}>{c.name}</p>
                  <p style={{fontSize:'10px',color:C.faint}}>{c.supplier||'Unknown'} · {new Date(c.scannedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</p>
                </div>
                <p style={{fontSize:'12px',color:C.dim}}>{sym}{(c.oldPrice||0).toFixed(2)}</p>
                <p style={{fontSize:'14px',color:C.faint}}>→</p>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:'13px',fontWeight:700,color:c.change>0?C.red:C.greenLight}}>{sym}{(c.newPrice||0).toFixed(2)}</p>
                  <p style={{fontSize:'10px',color:c.change>0?C.red:C.greenLight}}>{c.change>0?'+':''}{(c.pct||0).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // ── ROOT RENDER ────────────────────────────────────────────
  // Summary tiles + nav pills are hidden on review and detail (focused flows
  // where chrome would distract). Delivery check inline takes over the body
  // area when active, so the chef sees the prompt without losing the topbar.
  const showChrome=view!=='review'&&view!=='detail';
  let body:React.ReactNode;
  if(deliveryStep) body=deliveryInline;
  else if(view==='bank') body=renderBankBody();
  else if(view==='history') body=renderHistoryBody();
  else if(view==='detail') body=renderDetailBody();
  else if(view==='review') body=renderReviewBody();
  else if(view==='suppliers') body=renderSuppliersBody();
  else if(view==='reports') body=renderReportsBody();

  return(
    <div style={{padding:PAD,fontFamily:'-apple-system,system-ui,sans-serif',color:C.text,minHeight:'100vh'}}>
      {topBar}
      {inboxStrip}
      {showChrome&&!deliveryStep&&navPills}
      {showChrome&&!deliveryStep&&summaryTiles}
      {body}
    </div>
  );
}
