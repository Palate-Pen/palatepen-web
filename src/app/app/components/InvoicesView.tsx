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

// Score colour ramp for the reliability badges. Green > 8.5, gold 6.5-8.5,
// red below — chefs scanning the history want the at-a-glance signal first,
// the precise number second.
function scoreColour(score: number, C: any): string {
  if (score >= 8.5) return C.greenLight;
  if (score >= 6.5) return C.gold;
  return C.red;
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
  // Delivery-check flow. Set when scan + review is confirmed; the actual
  // save to state happens inside the modal handlers based on Yes / Flag.
  // pendingInvoice carries the fully-built invoice object so user-cancel
  // (refresh, navigate away) just drops it without committing.
  const[pendingInvoice,setPendingInvoice]=useState<any>(null);
  const[deliveryStep,setDeliveryStep]=useState<'check'|'flag'|null>(null);
  const[flagItems,setFlagItems]=useState<Array<{name:string;invoicedQty:number;receivedQty:number;received:boolean;note:string;unitPrice:number;unit:string}>>([]);
  const[expandedSupplier,setExpandedSupplier]=useState<string|null>(null);
  // Pre-computed reliability table — memoised against state.invoices so we
  // don't recompute on every keystroke during the flag flow.
  const reliability=useMemo(()=>buildSupplierReliability(invoices),[invoices]);
  const reliabilityIdx=useMemo(()=>reliabilityByName(reliability),[reliability]);
  const discrepancySummary=useMemo(()=>recentDiscrepancySummary(invoices),[invoices]);
  // API key is server-side only — we send the user's session token for Pro verification

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
    // Stash the invoice payload — actual save happens once the chef
    // answers the delivery check (or skips). Going straight to history
    // without the check is still possible via the modal's Skip link.
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

  // Save the pending invoice as confirmed — the happy path, one tap. Mirrors
  // the legacy "scan and done" flow but stamps an explicit status so the
  // reliability calc treats it as a deliberate "all arrived" signal rather
  // than a legacy unflagged row.
  function acceptDelivery(){
    if(!pendingInvoice)return;
    appActions.addInvoice({...pendingInvoice,status:'confirmed'});
    setPendingInvoice(null);
    setDeliveryStep(null);
  }
  // Open the flag sub-step. Seeds editable rows from pendingInvoice.items so
  // the chef adjusts down from the invoiced qty rather than entering everything
  // from scratch.
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
  // Save the pending invoice as flagged with the discrepancies captured by
  // the chef. Only include rows where the chef actually changed something
  // (qty reduced, marked not-received, or added a note) so the discrepancy
  // count downstream is meaningful.
  function saveFlagged(){
    if(!pendingInvoice)return;
    const discrepancies=flagItems.filter(d=>
      !d.received || d.receivedQty<d.invoicedQty || d.note.trim().length>0
    );
    appActions.addInvoice({
      ...pendingInvoice,
      status:'flagged',
      discrepancies:discrepancies.map(d=>({
        name:d.name,
        invoicedQty:d.invoicedQty,
        receivedQty:d.received?d.receivedQty:0,
        received:d.received,
        note:d.note.trim()||undefined,
        unitPrice:d.unitPrice,
        unit:d.unit,
      })),
    });
    setPendingInvoice(null);
    setDeliveryStep(null);
    setFlagItems([]);
  }
  // Skip the delivery check entirely (no status stamp). Keeps the flow
  // non-blocking — closing the modal without choosing still saves the
  // invoice so the chef's scan isn't lost.
  function skipDelivery(){
    if(!pendingInvoice){setDeliveryStep(null);return;}
    appActions.addInvoice(pendingInvoice);
    setPendingInvoice(null);
    setDeliveryStep(null);
    setFlagItems([]);
  }

  const filtered=bank.filter((i:any)=>(i.name||'').toLowerCase().includes(search.toLowerCase())||(i.supplier||'').toLowerCase().includes(search.toLowerCase()));
  const inp={width:'100%',background:C.surface2,border:'1px solid '+C.border,color:C.text,fontSize:'13px',padding:'9px 12px',outline:'none',fontFamily:'system-ui,sans-serif',boxSizing:'border-box' as const};
  const card={background:C.surface,border:'1px solid '+C.border,borderRadius:'4px'};

  // Delivery-check modal — overlays the active view. Two-step: initial Yes/Flag
  // choice, then the flag-detail sub-step with editable line items. Mobile-
  // first: stacked big tap buttons in the first step, full-width inputs in the
  // second. Backdrop click + ✕ both Skip (save without status) rather than
  // dismiss-without-save so the chef never loses their scan.
  const deliveryModalJSX = !deliveryStep || !pendingInvoice ? null : (
    <div role="dialog" aria-modal="true"
      onClick={()=>{ if(deliveryStep==='check') skipDelivery(); }}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:isMobile?'flex-end':'center',justifyContent:'center',zIndex:100,padding:isMobile?0:'16px'}}>
      <div onClick={e=>e.stopPropagation()}
        style={{
          background:C.surface,
          width:isMobile?'100%':'480px',
          maxWidth:'100%',
          maxHeight:isMobile?'92vh':'88vh',
          borderRadius:isMobile?'16px 16px 0 0':'8px',
          display:'flex',flexDirection:'column',
          overflow:'hidden',
          boxShadow:'0 -8px 30px rgba(0,0,0,0.3)',
        }}>
        {deliveryStep==='check' ? (
          // ── Step 1: Yes / Flag ────────────────────────────────
          <>
            <div style={{padding:'24px 24px 8px',position:'relative'}}>
              <button onClick={skipDelivery}
                aria-label="Skip delivery check"
                style={{position:'absolute',top:14,right:14,background:'transparent',border:'none',color:C.faint,fontSize:'22px',cursor:'pointer',padding:'4px 8px',lineHeight:1}}>×</button>
              <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.gold,marginBottom:'8px'}}>
                {pendingInvoice.supplier} · {pendingInvoice.itemCount} items
              </p>
              <h2 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'24px',color:C.text,marginBottom:'6px',lineHeight:1.2}}>
                Did everything arrive as expected?
              </h2>
              <p style={{fontSize:'13px',color:C.faint,lineHeight:1.5}}>
                Confirm the delivery now if everything&apos;s correct — or flag any short / missing items so they&apos;re tracked against the supplier.
              </p>
            </div>
            <div style={{padding:'20px 20px 24px',display:'flex',flexDirection:'column',gap:'10px'}}>
              <button onClick={acceptDelivery}
                style={{
                  background:C.greenLight,color:C.bg,
                  border:'none',padding:'18px 20px',
                  fontSize:'16px',fontWeight:700,letterSpacing:'0.3px',
                  cursor:'pointer',borderRadius:'8px',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',
                  minHeight:'56px',
                }}>
                <span style={{fontSize:'20px'}}>✓</span> Yes, all good
              </button>
              <button onClick={openFlagStep}
                style={{
                  background:C.gold+'14',color:C.gold,
                  border:'1.5px solid '+C.gold+'60',padding:'18px 20px',
                  fontSize:'16px',fontWeight:700,letterSpacing:'0.3px',
                  cursor:'pointer',borderRadius:'8px',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',
                  minHeight:'56px',
                }}>
                <span style={{fontSize:'18px'}}>⚑</span> Flag an issue
              </button>
              <button onClick={skipDelivery}
                style={{background:'transparent',color:C.faint,border:'none',padding:'12px',fontSize:'12px',cursor:'pointer',marginTop:'4px'}}>
                Skip this check
              </button>
            </div>
          </>
        ) : (
          // ── Step 2: Flag detail editor ────────────────────────
          <>
            <div style={{padding:'20px 24px 12px',borderBottom:'1px solid '+C.border,position:'relative'}}>
              <button onClick={()=>{setDeliveryStep('check');}}
                aria-label="Back to check"
                style={{position:'absolute',top:14,left:14,background:'transparent',border:'none',color:C.faint,fontSize:'14px',cursor:'pointer',padding:'4px 8px'}}>← Back</button>
              <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.gold,marginTop:'12px',marginBottom:'6px',textAlign:'center'}}>Flag issues</p>
              <h2 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'20px',color:C.text,textAlign:'center',marginBottom:'4px',lineHeight:1.2}}>
                Adjust quantities or untick missing items
              </h2>
              <p style={{fontSize:'12px',color:C.faint,textAlign:'center'}}>
                {pendingInvoice.supplier}
              </p>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'10px 16px'}}>
              {flagItems.map((d,idx)=>{
                const short=d.receivedQty<d.invoicedQty;
                const missing=!d.received;
                return(
                  <div key={idx} style={{
                    padding:'14px',
                    marginBottom:'8px',
                    background:missing?(C.red+'08'):short?(C.gold+'08'):C.surface2,
                    border:'1px solid '+(missing?C.red+'40':short?C.gold+'40':C.border),
                    borderRadius:'8px',
                  }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'10px',marginBottom:'10px'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:'14px',color:missing?C.faint:C.text,fontWeight:500,textDecoration:missing?'line-through':'none'}}>{d.name}</p>
                        <p style={{fontSize:'11px',color:C.faint,marginTop:'2px'}}>
                          Invoiced: {d.invoicedQty} {d.unit} · {sym}{(d.unitPrice||0).toFixed(2)}/{d.unit}
                        </p>
                      </div>
                      <button onClick={()=>setFlagItems(prev=>prev.map((x,i)=>i===idx?{...x,received:!x.received,receivedQty:!x.received?x.invoicedQty:0}:x))}
                        aria-label={d.received?'Mark as not received':'Mark as received'}
                        style={{
                          width:'44px',height:'44px',
                          background:d.received?C.greenLight+'20':C.red+'20',
                          color:d.received?C.greenLight:C.red,
                          border:'1.5px solid '+(d.received?C.greenLight+'60':C.red+'60'),
                          borderRadius:'8px',cursor:'pointer',
                          fontSize:'18px',fontWeight:700,
                          flexShrink:0,
                        }}>
                        {d.received?'✓':'✗'}
                      </button>
                    </div>
                    {d.received && (
                      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
                        <label style={{fontSize:'11px',color:C.faint,whiteSpace:'nowrap'}}>Received qty</label>
                        <input type="number" min={0} max={d.invoicedQty} step="0.01"
                          value={d.receivedQty}
                          onChange={e=>setFlagItems(prev=>prev.map((x,i)=>i===idx?{...x,receivedQty:Math.max(0,Math.min(x.invoicedQty,parseFloat(e.target.value)||0))}:x))}
                          style={{
                            flex:1,
                            background:C.surface,
                            border:'1px solid '+(short?C.gold+'60':C.border),
                            color:C.text,
                            fontSize:'15px',
                            padding:'10px 12px',
                            borderRadius:'6px',
                            outline:'none',
                            minHeight:'44px',
                            boxSizing:'border-box',
                          }}/>
                        <span style={{fontSize:'12px',color:C.faint,minWidth:'30px'}}>{d.unit}</span>
                      </div>
                    )}
                    <input type="text" placeholder="Optional note (e.g. damaged, wrong cut)"
                      value={d.note}
                      onChange={e=>setFlagItems(prev=>prev.map((x,i)=>i===idx?{...x,note:e.target.value}:x))}
                      style={{
                        width:'100%',
                        background:C.surface,
                        border:'1px solid '+C.border,
                        color:C.text,
                        fontSize:'13px',
                        padding:'10px 12px',
                        borderRadius:'6px',
                        outline:'none',
                        minHeight:'44px',
                        boxSizing:'border-box',
                      }}/>
                  </div>
                );
              })}
            </div>
            <div style={{padding:'14px 16px',borderTop:'1px solid '+C.border,display:'flex',gap:'8px'}}>
              <button onClick={skipDelivery}
                style={{flex:1,background:'transparent',color:C.faint,border:'1px solid '+C.border,padding:'14px',fontSize:'14px',fontWeight:600,cursor:'pointer',borderRadius:'6px',minHeight:'48px'}}>
                Cancel
              </button>
              <button onClick={saveFlagged}
                style={{flex:2,background:C.gold,color:C.bg,border:'none',padding:'14px',fontSize:'15px',fontWeight:700,cursor:'pointer',borderRadius:'6px',minHeight:'48px'}}>
                Save flagged invoice
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

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

  // ── REPORTS VIEW ───────────────────────────────────────────
  if(view==='reports'){
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
    const navBtn={fontSize:'14px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'6px 12px',cursor:'pointer',borderRadius:'2px'};
    const tabBtn=(active:boolean)=>({fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase' as const,background:active?C.gold:C.surface2,color:active?C.bg:C.dim,border:active?'none':'1px solid '+C.border,padding:'8px 16px',cursor:'pointer',borderRadius:'2px'});
    return(
      <>
      <div style={{padding:isMobile?'20px 16px':'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text}}>Reports</h1>
          <button onClick={()=>setView('bank')} style={{fontSize:'11px',color:C.gold,background:C.goldDim,border:'1px solid '+C.gold+'40',padding:'8px 14px',cursor:'pointer',borderRadius:'2px'}}>← Ingredients Bank</button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px',flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:'4px'}}>
            <button onClick={()=>{setReportPeriod('week');setReportOffset(0);}} style={tabBtn(reportPeriod==='week')}>Weekly</button>
            <button onClick={()=>{setReportPeriod('month');setReportOffset(0);}} style={tabBtn(reportPeriod==='month')}>Monthly</button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginLeft:'auto'}}>
            <button onClick={()=>setReportOffset(reportOffset-1)} style={navBtn}>←</button>
            <p style={{fontSize:'13px',color:C.text,minWidth:'200px',textAlign:'center'}}>{label}</p>
            <button onClick={()=>setReportOffset(Math.min(0,reportOffset+1))} disabled={reportOffset>=0} style={{...navBtn,opacity:reportOffset>=0?0.4:1,cursor:reportOffset>=0?'default':'pointer'}}>→</button>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}}>
          {[
            {l:'Total Spend',v:`${sym}${totalSpend.toFixed(2)}`,c:C.gold},
            {l:'Invoices',v:String(inPeriod.length),c:C.text},
            {l:'Items',v:String(itemCount),c:C.text},
            {l:'Price Changes',v:String(priceChangeCount),c:priceChangeCount>0?C.red:C.text},
          ].map(s=>(
            <div key={s.l} style={{...card,padding:'16px',textAlign:'center'}}>
              <p style={{fontSize:'10px',letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint,marginBottom:'6px'}}>{s.l}</p>
              <p style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'24px',color:s.c}}>{s.v}</p>
            </div>
          ))}
        </div>
        {inPeriod.length===0?(
          <div style={{textAlign:'center',padding:'60px 0'}}><p style={{fontSize:'13px',color:C.faint}}>No invoices in this period.</p></div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
            <div style={{...card,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid '+C.border}}><p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint}}>Spend by Supplier</p></div>
              {supplierRows.map(([sup,v])=>(
                <div key={sup} style={{padding:'10px 16px',borderBottom:'1px solid '+C.border}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <p style={{fontSize:'13px',color:C.text}}>{sup}</p>
                    <p style={{fontSize:'13px',color:C.gold}}>{sym}{v.toFixed(2)} <span style={{color:C.faint,fontSize:'11px'}}>· {((v/totalSpend)*100).toFixed(0)}%</span></p>
                  </div>
                  <div style={{height:'4px',background:C.surface2,borderRadius:'2px',overflow:'hidden'}}><div style={{width:`${(v/supMax)*100}%`,height:'100%',background:C.gold}}/></div>
                </div>
              ))}
            </div>
            <div style={{...card,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid '+C.border}}><p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint}}>Spend by Category</p></div>
              {categoryRows.map(([cat,v])=>(
                <div key={cat} style={{padding:'10px 16px',borderBottom:'1px solid '+C.border}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <p style={{fontSize:'13px',color:C.text}}>{cat}</p>
                    <p style={{fontSize:'13px',color:C.gold}}>{sym}{v.toFixed(2)} <span style={{color:C.faint,fontSize:'11px'}}>· {((v/totalSpend)*100).toFixed(0)}%</span></p>
                  </div>
                  <div style={{height:'4px',background:C.surface2,borderRadius:'2px',overflow:'hidden'}}><div style={{width:`${(v/catMax)*100}%`,height:'100%',background:C.gold}}/></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {allPriceChanges.length>0&&(
          <div style={{...card,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid '+C.border}}><p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint}}>Price Changes ({allPriceChanges.length})</p></div>
            {allPriceChanges.sort((a,b)=>Math.abs(b.pct||0)-Math.abs(a.pct||0)).map((c:any,i:number)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'16px',padding:'10px 16px',borderBottom:'1px solid '+C.border,alignItems:'center'}}>
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
      </div>
      {deliveryModalJSX}
      </>
    );
  }

  // ── DETAIL VIEW ────────────────────────────────────────────
  if(view==='detail'&&selectedInvoice)return(
    <>
    <div style={{padding:isMobile?'20px 16px':'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <button onClick={()=>{setView('history');setSelectedInvoice(null);}} style={{fontSize:'13px',color:C.gold,background:'none',border:'none',cursor:'pointer',marginBottom:'20px',display:'block'}}>
        ← Invoice History
      </button>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text,marginBottom:'4px'}}>{selectedInvoice.supplier||'Unknown Supplier'}</h1>
        <p style={{fontSize:'12px',color:C.faint}}>{new Date(selectedInvoice.scannedAt).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {selectedInvoice.itemCount} items scanned</p>
      </div>

      {/* Price changes section */}
      {(selectedInvoice.priceChangeDetails||[]).length>0&&(
        <div style={{...card,marginBottom:'20px',overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid '+C.border,background:C.red+'08',display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:C.red,flexShrink:0}}></div>
            <p style={{fontSize:'12px',fontWeight:700,color:C.red,letterSpacing:'0.5px'}}>{selectedInvoice.priceChangeDetails.length} price change{selectedInvoice.priceChangeDetails.length>1?'s':''} detected on this invoice</p>
          </div>
          <div style={{padding:'4px 0'}}>
            {selectedInvoice.priceChangeDetails.map((c:any,i:number)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'16px',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid '+C.border}}>
                <p style={{fontSize:'14px',color:C.text}}>{c.name}</p>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:'11px',color:C.faint,marginBottom:'2px'}}>Last recorded</p>
                  <p style={{fontSize:'13px',color:C.dim}}>{sym}{(c.oldPrice||0).toFixed(2)}/{c.unit}</p>
                </div>
                <div style={{textAlign:'center',fontSize:'16px',color:C.faint}}>→</div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:'11px',color:C.faint,marginBottom:'2px'}}>This invoice</p>
                  <p style={{fontSize:'14px',fontWeight:700,color:c.change>0?C.red:C.greenLight}}>{sym}{(c.newPrice||0).toFixed(2)}/{c.unit}</p>
                  <p style={{fontSize:'11px',color:c.change>0?C.red:C.greenLight}}>{c.change>0?'+':''}{(c.pct||0).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All items section */}
      {(selectedInvoice.items||[]).length>0&&(
        <div style={card}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid '+C.border}}>
            <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint}}>All Items Scanned</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'16px',padding:'10px 16px',background:C.surface2,borderBottom:'1px solid '+C.border}}>
            {['Ingredient','Qty','Unit Price','Total'].map(h=>(
              <p key={h} style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint,textAlign:h==='Ingredient'?'left':'right'}}>{h}</p>
            ))}
          </div>
          {selectedInvoice.items.map((item:any,i:number)=>{
            const hasChange=(selectedInvoice.priceChangeDetails||[]).find((c:any)=>c.name.toLowerCase()===item.name.toLowerCase());
            return(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'16px',padding:'12px 16px',borderBottom:'1px solid '+C.border,alignItems:'center',background:hasChange?C.red+'04':C.surface}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  {hasChange&&<div style={{width:'6px',height:'6px',borderRadius:'50%',background:hasChange.change>0?C.red:C.greenLight,flexShrink:0}}></div>}
                  <p style={{fontSize:'13px',color:C.text}}>{item.name}</p>
                </div>
                <p style={{fontSize:'13px',color:C.dim,textAlign:'right'}}>{item.qty} {item.unit}</p>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:'13px',color:hasChange?C.gold:C.text}}>{sym}{(item.unitPrice||0).toFixed(2)}</p>
                  {hasChange&&<p style={{fontSize:'10px',color:C.faint}}>was {sym}{(hasChange.oldPrice||0).toFixed(2)}</p>}
                </div>
                <p style={{fontSize:'13px',color:C.gold,textAlign:'right'}}>{item.totalPrice?sym+(item.totalPrice||0).toFixed(2):'—'}</p>
              </div>
            );
          })}
        </div>
      )}

      {!(selectedInvoice.items||[]).length&&!(selectedInvoice.priceChangeDetails||[]).length&&(
        <div style={{...card,padding:'40px',textAlign:'center'}}>
          <p style={{fontSize:'13px',color:C.faint}}>No detail data stored for this invoice.
Invoices scanned after this update will show full details.</p>
        </div>
      )}
    </div>
    {deliveryModalJSX}
    </>
  );

  // ── HISTORY VIEW ───────────────────────────────────────────
  if(view==='history')return(
    <>
    <div style={{padding:isMobile?'20px 16px':'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
        <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text}}>Invoice History</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setView('suppliers')} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'8px 14px',cursor:'pointer',borderRadius:'2px'}}>Suppliers</button>
          <button onClick={()=>setView('bank')} style={{fontSize:'11px',color:C.gold,background:C.goldDim,border:'1px solid '+C.gold+'40',padding:'8px 14px',cursor:'pointer',borderRadius:'2px'}}>← Ingredients Bank</button>
        </div>
      </div>
      {discrepancySummary.count>0&&(
        <div style={{background:C.gold+'12',border:'1px solid '+C.gold+'40',borderRadius:'4px',padding:'12px 14px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
          <span style={{fontSize:'18px'}}>⚑</span>
          <p style={{fontSize:'12px',color:C.dim,flex:1}}>
            <strong style={{color:C.gold}}>{discrepancySummary.count}</strong> flagged deliver{discrepancySummary.count===1?'y':'ies'} in the last 30 days · estimated <strong style={{color:C.gold}}>{sym}{discrepancySummary.value.toFixed(2)}</strong> in discrepancies. Tap any flagged invoice to review.
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
            return(
            <div key={inv.id} style={{...card,overflow:'hidden',borderColor:isFlagged?C.gold+'40':C.border}}>
              <button onClick={()=>{setSelectedInvoice(inv);setView('detail');}} style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'16px',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                    {isFlagged&&<span title="Delivery flagged" style={{fontSize:'13px',color:C.gold,flexShrink:0}}>⚑</span>}
                    <p style={{fontSize:'14px',color:C.text,fontWeight:500}}>{inv.supplier||'Unknown'}</p>
                    {rel&&(
                      <span title={`Reliability ${rel.score.toFixed(1)}/10 over ${rel.totalInvoices} invoice${rel.totalInvoices===1?'':'s'}`}
                        style={{fontSize:'10px',fontWeight:700,color:scoreColour(rel.score,C),background:scoreColour(rel.score,C)+'14',border:'0.5px solid '+scoreColour(rel.score,C)+'40',padding:'1px 6px',borderRadius:'2px'}}>
                        {rel.score.toFixed(1)}/10
                      </span>
                    )}
                    {inv.priceChanges>0&&(
                      <span style={{fontSize:'10px',fontWeight:700,color:C.red,background:C.red+'12',border:'0.5px solid '+C.red+'40',padding:'1px 6px',borderRadius:'2px'}}>
                        {inv.priceChanges} price change{inv.priceChanges>1?'s':''}
                      </span>
                    )}
                    {inv.status==='confirmed'&&(
                      <span title="Delivery confirmed" style={{fontSize:'11px',color:C.greenLight,flexShrink:0}}>✓</span>
                    )}
                  </div>
                  <p style={{fontSize:'12px',color:C.faint}}>
                    {new Date(inv.scannedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} · {inv.itemCount} items
                  </p>
                </div>
                <span style={{fontSize:'18px',color:C.faint}}>›</span>
              </button>
              {deleteId===inv.id?(
                <div style={{padding:'10px 16px',borderTop:'1px solid '+C.border,display:'flex',alignItems:'center',gap:'8px',background:C.red+'06'}}>
                  <p style={{fontSize:'12px',color:C.red,flex:1}}>Delete this invoice?</p>
                  <button onClick={()=>setDeleteId(null)} style={{fontSize:'11px',color:C.dim,background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
                  <button onClick={()=>{appActions.delInvoice(inv.id);setDeleteId(null);}} style={{fontSize:'11px',fontWeight:700,color:'#fff',background:C.red,border:'none',padding:'5px 12px',cursor:'pointer',borderRadius:'2px'}}>Confirm Delete</button>
                </div>
              ):(
                <button onClick={()=>setDeleteId(inv.id)} style={{width:'100%',padding:'8px 16px',background:'none',border:'none',borderTop:'1px solid '+C.border,cursor:'pointer',color:C.faint,fontSize:'11px',textAlign:'left'}}>Delete</button>
              )}
            </div>
          );})}
        </div>
      )}
    </div>
    {deliveryModalJSX}
    </>
  );

  // ── SUPPLIERS VIEW ─────────────────────────────────────────
  if(view==='suppliers')return(
    <>
    <div style={{padding:isMobile?'20px 16px':'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text,marginBottom:'4px'}}>Supplier reliability</h1>
          <p style={{fontSize:'12px',color:C.faint}}>{reliability.length} supplier{reliability.length===1?'':'s'} ranked by delivery reliability score</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setView('history')} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'8px 14px',cursor:'pointer',borderRadius:'2px'}}>History</button>
          <button onClick={()=>setView('bank')} style={{fontSize:'11px',color:C.gold,background:C.goldDim,border:'1px solid '+C.gold+'40',padding:'8px 14px',cursor:'pointer',borderRadius:'2px'}}>← Ingredients Bank</button>
        </div>
      </div>
      <p style={{fontSize:'11px',color:C.faint,marginBottom:'14px',lineHeight:1.5,maxWidth:'600px'}}>
        Score (0–10) blends the share of deliveries confirmed-as-correct with the £ value of discrepancies on flagged invoices. Trend compares the last 45 days to the prior 45. Tap a supplier to see their most common issue.
      </p>
      {reliability.length===0?(
        <div style={{textAlign:'center',padding:'60px 0'}}><p style={{fontSize:'13px',color:C.faint}}>No supplier history yet — scan a few invoices to start tracking.</p></div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {reliability.map(r=>{
            const expanded=expandedSupplier===r.nameKey;
            const trendIcon=r.trend==='improving'?'↑':r.trend==='declining'?'↓':r.trend==='stable'?'→':'·';
            const trendColor=r.trend==='improving'?C.greenLight:r.trend==='declining'?C.red:C.faint;
            return(
              <div key={r.nameKey} style={{...card,overflow:'hidden'}}>
                <button onClick={()=>setExpandedSupplier(expanded?null:r.nameKey)}
                  style={{width:'100%',display:'grid',gridTemplateColumns:isMobile?'1fr auto':'1fr 80px 100px 100px 50px',gap:'10px',alignItems:'center',padding:'16px',background:'transparent',border:'none',cursor:'pointer',textAlign:'left'}}>
                  <div style={{minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'4px'}}>
                      <span style={{fontSize:'14px',color:C.text,fontWeight:500}}>{r.name}</span>
                      <span title={`Reliability ${r.score.toFixed(1)}/10`}
                        style={{fontSize:'11px',fontWeight:700,color:scoreColour(r.score,C),background:scoreColour(r.score,C)+'14',border:'0.5px solid '+scoreColour(r.score,C)+'40',padding:'2px 8px',borderRadius:'2px'}}>
                        {r.score.toFixed(1)}/10
                      </span>
                      {r.flaggedCount>0&&(
                        <span style={{fontSize:'10px',color:C.gold}}>⚑ {r.flaggedCount}</span>
                      )}
                    </div>
                    <p style={{fontSize:'11px',color:C.faint}}>
                      {r.totalInvoices} invoice{r.totalInvoices===1?'':'s'} · {sym}{r.totalValue.toFixed(0)} total · {r.confirmedCount}/{r.totalInvoices} confirmed
                    </p>
                  </div>
                  {!isMobile&&(
                    <span style={{fontSize:'12px',color:C.dim,textAlign:'right'}}>{sym}{r.avgInvoiceValue.toFixed(0)} avg</span>
                  )}
                  {!isMobile&&(
                    <span title={`45d trend: ${r.trend}`}
                      style={{fontSize:'12px',color:trendColor,textAlign:'right',fontWeight:600}}>
                      {trendIcon} {r.trend==='insufficient_data'?'—':r.trend}
                    </span>
                  )}
                  {!isMobile&&(
                    <span style={{fontSize:'10px',color:C.faint,textAlign:'right'}}>{r.lastInvoiceTs?new Date(r.lastInvoiceTs).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—'}</span>
                  )}
                  <span style={{fontSize:'16px',color:C.faint}}>{expanded?'▾':'▸'}</span>
                </button>
                {expanded&&(
                  <div style={{padding:'10px 16px 16px',borderTop:'1px solid '+C.border,background:C.surface2}}>
                    <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4, 1fr)',gap:'10px',marginBottom:'12px'}}>
                      <div><p style={{fontSize:'10px',color:C.faint,textTransform:'uppercase',letterSpacing:'0.5px'}}>Last 45d</p><p style={{fontSize:'14px',color:scoreColour(r.scoreRecent,C),fontWeight:600}}>{r.scoreRecent.toFixed(1)}/10</p></div>
                      <div><p style={{fontSize:'10px',color:C.faint,textTransform:'uppercase',letterSpacing:'0.5px'}}>Prior 45d</p><p style={{fontSize:'14px',color:scoreColour(r.scorePrior,C),fontWeight:600}}>{r.scorePrior.toFixed(1)}/10</p></div>
                      <div><p style={{fontSize:'10px',color:C.faint,textTransform:'uppercase',letterSpacing:'0.5px'}}>Flagged</p><p style={{fontSize:'14px',color:r.flaggedCount>0?C.gold:C.dim,fontWeight:600}}>{r.flaggedCount}</p></div>
                      <div><p style={{fontSize:'10px',color:C.faint,textTransform:'uppercase',letterSpacing:'0.5px'}}>Discrepancy £</p><p style={{fontSize:'14px',color:r.totalDiscrepancyValue>0?C.red:C.dim,fontWeight:600}}>{sym}{r.totalDiscrepancyValue.toFixed(2)}</p></div>
                    </div>
                    {r.topIssue?(
                      <div style={{padding:'10px 12px',background:C.gold+'10',border:'0.5px solid '+C.gold+'40',borderRadius:'4px'}}>
                        <p style={{fontSize:'10px',color:C.faint,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'2px'}}>Most common issue</p>
                        <p style={{fontSize:'13px',color:C.text}}><strong style={{color:C.gold}}>{r.topIssue.name}</strong> flagged {r.topIssue.count}×</p>
                      </div>
                    ):(
                      <p style={{fontSize:'11px',color:C.faint,fontStyle:'italic'}}>No specific item issues — flags were on overall delivery.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    {deliveryModalJSX}
    </>
  );

  // ── REVIEW VIEW ────────────────────────────────────────────
  if(view==='review')return(
    <>
    <div style={{padding:isMobile?'20px 16px':'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
        <div>
          <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text,marginBottom:'4px'}}>Review Scan</h1>
          <p style={{fontSize:'12px',color:C.faint}}>{scanResults.length} items extracted — deselect any to exclude</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>{setScanResults([]);setPriceChanges([]);setView('bank');}} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'8px 14px',cursor:'pointer',borderRadius:'2px'}}>Cancel</button>
          <button onClick={confirmScan} style={{fontSize:'11px',fontWeight:700,background:C.gold,color:C.bg,border:'none',padding:'8px 16px',cursor:'pointer',borderRadius:'2px'}}>Add {scanResults.filter(i=>i.selected).length} to Bank</button>
        </div>
      </div>
      <div style={{marginBottom:'14px'}}>
        <label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>Supplier Name</label>
        <input value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="e.g. Brakes, Bidfood..." style={{...inp,maxWidth:'320px'}}/>
      </div>
      {priceChanges.length>0&&(
        <div style={{background:C.red+'08',border:'1px solid '+C.red+'30',borderRadius:'4px',padding:'14px 16px',marginBottom:'16px'}}>
          <p style={{fontSize:'12px',fontWeight:700,color:C.red,marginBottom:'8px'}}>{priceChanges.length} price change{priceChanges.length>1?'s':''} detected</p>
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
            style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',background:C.surface,border:'1px solid '+(item.selected?C.gold:C.border),borderRadius:'4px',cursor:'pointer',opacity:item.selected?1:0.5,textAlign:'left'}}>
            <div style={{width:'20px',height:'20px',borderRadius:'3px',background:item.selected?C.gold:C.surface2,border:'1px solid '+(item.selected?C.gold:C.border),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {item.selected&&<span style={{color:C.bg,fontSize:'12px',fontWeight:700}}>✓</span>}
            </div>
            <span style={{flex:1,fontSize:'14px',color:C.text}}>{item.name}</span>
            <span style={{fontSize:'12px',color:C.faint}}>{item.qty} {item.unit}</span>
            <span style={{fontSize:'14px',color:C.gold,fontWeight:500}}>{sym}{(item.unitPrice||0).toFixed(2)}</span>
          </button>
        ))}
      </div>
    </div>
    {deliveryModalJSX}
    </>
  );

  // ── BANK VIEW (default) ────────────────────────────────────
  return(
    <>
    <div style={{padding:isMobile?'20px 16px':'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:'24px'}}>
        <div>
          <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text,marginBottom:'4px'}}>Invoices &amp; Ingredients Bank</h1>
          <p style={{fontSize:'12px',color:C.faint}}>{bank.length} ingredients · {invoices.length} invoices scanned</p>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',justifyContent:'flex-end'}}>
          {(()=>{
            const uBank=bank.filter((b:any)=>!b.category);
            const uStock=(appState.stockItems||[]).filter((s:any)=>!s.category);
            const total=uBank.length+uStock.length;
            if(!total)return null;
            return(
              <button onClick={()=>{
                if(uBank.length)appActions.upsertBank(uBank.map((b:any)=>({name:b.name,category:guessCategory(b.name)})));
                uStock.forEach((s:any)=>appActions.updStock(s.id,{category:guessCategory(s.name)}));
              }} title={`Assign categories to ${total} uncategorized item${total>1?'s':''} across bank and stock`}
                style={{fontSize:'11px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'10px 14px',cursor:'pointer',borderRadius:'2px'}}>Auto-categorize ({total})</button>
            );
          })()}
          <button onClick={()=>{setReportPeriod('week');setReportOffset(0);setView('reports');}} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'10px 14px',cursor:'pointer',borderRadius:'2px'}}>Reports</button>
          <button onClick={()=>setView('suppliers')} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'10px 14px',cursor:'pointer',borderRadius:'2px'}}>Suppliers</button>
          <button onClick={()=>setView('history')} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'10px 14px',cursor:'pointer',borderRadius:'2px'}}>
            History {invoices.length>0&&<span style={{marginLeft:'4px',fontSize:'10px',background:C.border,padding:'1px 5px',borderRadius:'2px'}}>{invoices.length}</span>}
          </button>
          {flagAiInvoiceScan && (
            <button onClick={()=>fileRef.current?.click()} disabled={scanning||!isPaid}
              style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',background:C.gold,color:C.bg,border:'none',padding:'10px 16px',cursor:'pointer',borderRadius:'2px',opacity:(scanning||!isPaid)?0.5:1}}>
              {scanning?'Scanning...':(!isPaid?'Paid Plan Required':'+ Upload Invoice')}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);e.target.value='';}}/>
        </div>
      </div>
      {!isPaid&&(
        <div style={{background:C.gold+'10',border:'1px solid '+C.gold+'30',borderRadius:'4px',padding:'14px 16px',marginBottom:'16px'}}>
          <p style={{fontSize:'13px',color:C.gold}}>Invoice scanning is included on Pro, Kitchen, and Group plans. Upgrade to unlock.</p>
        </div>
      )}
      {discrepancySummary.count>0&&(
        <button onClick={()=>setView('history')}
          style={{display:'flex',alignItems:'center',gap:'12px',width:'100%',background:C.gold+'10',border:'1px solid '+C.gold+'40',borderRadius:'4px',padding:'12px 14px',marginBottom:'16px',cursor:'pointer',textAlign:'left'}}>
          <span style={{fontSize:'18px',color:C.gold}}>⚑</span>
          <p style={{fontSize:'12px',color:C.dim,flex:1,lineHeight:1.5}}>
            <strong style={{color:C.gold}}>{discrepancySummary.count}</strong> flagged deliver{discrepancySummary.count===1?'y':'ies'} in the last 30 days — estimated <strong style={{color:C.gold}}>{sym}{discrepancySummary.value.toFixed(2)}</strong> in discrepancies. Tap to review.
          </p>
          <span style={{fontSize:'18px',color:C.gold}}>›</span>
        </button>
      )}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ingredients or supplier..."
        style={{width:'100%',background:C.surface,border:'1px solid '+C.border,color:C.text,fontSize:'14px',padding:'12px 14px',outline:'none',fontFamily:'system-ui,sans-serif',marginBottom:'16px',boxSizing:'border-box'}}/>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'60px 0'}}>
          <p style={{fontSize:'13px',color:C.faint}}>{bank.length===0?'No ingredients yet. Upload an invoice to build your bank.':'No results.'}</p>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {filtered.map((item:any)=>{
            const hasAlert=alerts.find((a:any)=>a.name.toLowerCase()===item.name.toLowerCase());
            return(
              <div key={item.id} style={{...card,padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
                    <p style={{fontSize:'14px',color:C.text}}>{item.name}</p>
                    {hasAlert&&<span style={{fontSize:'10px',fontWeight:700,color:hasAlert.change>0?C.red:C.greenLight}}>{hasAlert.change>0?'↑':'↓'} {Math.abs(hasAlert.pct||0).toFixed(1)}%</span>}
                  </div>
                  <p style={{fontSize:'12px',color:C.faint}}>
                    {item.supplier} · {sym}{(item.unitPrice||0).toFixed(2)}/{item.unit}
                    {hasAlert&&<span style={{color:C.faint}}> · was {sym}{(hasAlert.oldPrice||0).toFixed(2)}</span>}
                  </p>
                </div>
                <select value={item.category||'Other'} onChange={e=>appActions.upsertBank([{name:item.name,category:e.target.value}])}
                  style={{fontSize:'11px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'5px 8px',borderRadius:'2px',outline:'none',fontFamily:'system-ui,sans-serif',cursor:'pointer'}}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                {deleteId===item.id?(
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <button onClick={()=>setDeleteId(null)} style={{fontSize:'11px',color:C.dim,background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
                    <button onClick={()=>{appActions.delBank(item.id);setDeleteId(null);}} style={{fontSize:'11px',fontWeight:700,color:'#fff',background:C.red,border:'none',padding:'5px 10px',cursor:'pointer',borderRadius:'2px'}}>Confirm</button>
                  </div>
                ):(
                  <button onClick={()=>setDeleteId(item.id)} style={{color:C.faint,background:'none',border:'none',cursor:'pointer',fontSize:'18px',padding:'0 4px'}}>×</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    {deliveryModalJSX}
    </>
  );
}