'use client';
import{useState,useRef}from'react';
import{useApp,uid}from'@/context/AppContext';
import{useAuth}from'@/context/AuthContext';
import{useSettings}from'@/context/SettingsContext';
import{dark,light}from'@/lib/theme';
export default function InvoicesView(){
  const{state:appState,actions:appActions}=useApp();
  const{tier}=useAuth();
  const{settings}=useSettings();
  const C=settings.resolved==='light'?light:dark;
  const sym=(appState.profile||{}).currencySymbol||'£';
  const bank=appState.ingredientsBank||[];
  const alerts=appState.priceAlerts||[];
  const invoices=appState.invoices||[];
  const[scanning,setScanning]=useState(false);
  const[scanResults,setScanResults]=useState<any[]>([]);
  const[priceChanges,setPriceChanges]=useState<any[]>([]);
  const[supplierName,setSupplierName]=useState('');
  const[view,setView]=useState<'bank'|'review'|'history'>('bank');
  const[search,setSearch]=useState('');
  const[deleteId,setDeleteId]=useState<string|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const apiKey=(appState.profile||{}).anthropicKey||process.env.NEXT_PUBLIC_ANTHROPIC_KEY||'';

  async function handleFile(file:File){
    if(tier!=='pro'){alert('Invoice scanning requires Pro.');return;}
    setScanning(true);
    try{
      let base64='';let mediaType=file.type;
      const arrayBuffer=await file.arrayBuffer();
      const bytes=new Uint8Array(arrayBuffer);let binary='';
      bytes.forEach(b=>binary+=String.fromCharCode(b));
      base64=btoa(binary);
      const res=await fetch('/api/mise/scan-invoice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base64,mediaType,apiKey})});
      const data=await res.json();
      processScanResults(data.items||[],file.name);
    }catch(e){alert('Scan failed. Check your API key.');setScanning(false);}
  }

  function processScanResults(items:any[],filename:string){
    setScanning(false);
    if(!items.length){alert('No items found. Try a clearer image.');return;}
    const changes=items.map(item=>{
      const match=bank.find((b:any)=>b.name.toLowerCase()===item.name.toLowerCase());
      if(match&&match.unitPrice&&item.unitPrice&&Math.abs(match.unitPrice-item.unitPrice)/match.unitPrice*100>=5){
        const change=item.unitPrice-match.unitPrice;
        return{id:uid(),name:item.name,unit:item.unit||match.unit,oldPrice:match.unitPrice,newPrice:item.unitPrice,change,pct:(change/match.unitPrice)*100,detectedAt:Date.now()};
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
    appActions.upsertBank(selected.map(i=>({name:i.name,qty:i.qty,unit:i.unit,unitPrice:i.unitPrice,totalPrice:i.totalPrice,supplier:supplierName||'Unknown'})));
    appActions.addInvoice({supplier:supplierName||'Unknown',itemCount:selected.length,priceChanges:priceChanges.length,scannedAt:Date.now()});
    setScanResults([]);setPriceChanges([]);setView('bank');
  }

  const filtered=bank.filter((i:any)=>(i.name||'').toLowerCase().includes(search.toLowerCase())||(i.supplier||'').toLowerCase().includes(search.toLowerCase()));
  const inp={width:'100%',background:C.surface2,border:'1px solid '+C.border,color:C.text,fontSize:'13px',padding:'9px 12px',outline:'none',fontFamily:'system-ui,sans-serif',boxSizing:'border-box' as const};

  if(view==='review')return(
    <div style={{padding:'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
        <div><h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text,marginBottom:'4px'}}>Review Scan</h1><p style={{fontSize:'12px',color:C.faint}}>{scanResults.length} items extracted</p></div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>{setScanResults([]);setPriceChanges([]);setView('bank');}} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'8px 14px',cursor:'pointer',borderRadius:'2px'}}>Cancel</button>
          <button onClick={confirmScan} style={{fontSize:'11px',fontWeight:700,background:C.gold,color:C.bg,border:'none',padding:'8px 16px',cursor:'pointer',borderRadius:'2px'}}>Add {scanResults.filter(i=>i.selected).length} to Bank</button>
        </div>
      </div>
      <div style={{marginBottom:'14px'}}><label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>Supplier Name</label><input value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="e.g. Brakes, Bidfood..." style={{...inp,maxWidth:'320px'}}/></div>
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
  );

  if(view==='history')return(
    <div style={{padding:'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
        <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text}}>Invoice History</h1>
        <button onClick={()=>setView('bank')} style={{fontSize:'11px',color:C.gold,background:C.goldDim,border:'1px solid '+C.gold+'40',padding:'8px 14px',cursor:'pointer',borderRadius:'2px'}}>← Ingredients Bank</button>
      </div>
      {invoices.length===0?<div style={{textAlign:'center',padding:'60px 0'}}><p style={{fontSize:'13px',color:C.faint}}>No invoices scanned yet.</p></div>:(
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {[...invoices].sort((a:any,b:any)=>b.scannedAt-a.scannedAt).map((inv:any)=>(
            <div key={inv.id} style={{background:C.surface,border:'1px solid '+C.border,borderRadius:'4px',padding:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                  <p style={{fontSize:'14px',color:C.text,fontWeight:500}}>{inv.supplier||'Unknown'}</p>
                  {inv.priceChanges>0&&<span style={{fontSize:'10px',fontWeight:700,color:C.red,background:C.red+'12',border:'0.5px solid '+C.red+'40',padding:'1px 6px',borderRadius:'2px'}}>{inv.priceChanges} price alert{inv.priceChanges>1?'s':''}</span>}
                </div>
                <p style={{fontSize:'12px',color:C.faint}}>{new Date(inv.scannedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} · {inv.itemCount} items</p>
              </div>
              {deleteId===inv.id?(
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <button onClick={()=>setDeleteId(null)} style={{fontSize:'11px',color:C.dim,background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
                  <button onClick={()=>{appActions.delInvoice(inv.id);setDeleteId(null);}} style={{fontSize:'11px',fontWeight:700,color:'#fff',background:C.red,border:'none',padding:'5px 10px',cursor:'pointer',borderRadius:'2px'}}>Confirm</button>
                </div>
              ):(
                <button onClick={()=>setDeleteId(inv.id)} style={{color:C.faint,background:'none',border:'none',cursor:'pointer',fontSize:'18px',padding:'0 4px'}}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return(
    <div style={{padding:'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:'24px'}}>
        <div><h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text,marginBottom:'4px'}}>Invoices &amp; Ingredients Bank</h1><p style={{fontSize:'12px',color:C.faint}}>{bank.length} ingredients · {invoices.length} invoices scanned</p></div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',justifyContent:'flex-end'}}>
          <button onClick={()=>setView('history')} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'10px 14px',cursor:'pointer',borderRadius:'2px'}}>History</button>
          <button onClick={()=>fileRef.current?.click()} disabled={scanning||tier!=='pro'} style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',background:C.gold,color:C.bg,border:'none',padding:'10px 16px',cursor:'pointer',borderRadius:'2px',opacity:(scanning||tier!=='pro')?0.5:1}}>
            {scanning?'Scanning...':(tier!=='pro'?'Pro Required':'+ Upload Invoice')}
          </button>
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);e.target.value='';}}/>
        </div>
      </div>
      {tier!=='pro'&&<div style={{background:C.gold+'10',border:'1px solid '+C.gold+'30',borderRadius:'4px',padding:'14px 16px',marginBottom:'16px'}}><p style={{fontSize:'13px',color:C.gold}}>Invoice scanning requires Pro. Upgrade to unlock.</p></div>}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ingredients or supplier..."
        style={{width:'100%',background:C.surface,border:'1px solid '+C.border,color:C.text,fontSize:'14px',padding:'12px 14px',outline:'none',fontFamily:'system-ui,sans-serif',marginBottom:'16px',boxSizing:'border-box'}}/>
      {filtered.length===0?<div style={{textAlign:'center',padding:'60px 0'}}><p style={{fontSize:'13px',color:C.faint}}>{bank.length===0?'No ingredients yet. Upload an invoice to build your bank.':'No results.'}</p></div>:(
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {filtered.map((item:any)=>{
            const hasAlert=alerts.find((a:any)=>a.name.toLowerCase()===item.name.toLowerCase());
            return(
              <div key={item.id} style={{background:C.surface,border:'1px solid '+C.border,borderRadius:'4px',padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
                    <p style={{fontSize:'14px',color:C.text}}>{item.name}</p>
                    {hasAlert&&<span style={{fontSize:'10px',fontWeight:700,color:hasAlert.change>0?C.red:C.greenLight}}>{hasAlert.change>0?'↑':'↓'}</span>}
                  </div>
                  <p style={{fontSize:'12px',color:C.faint}}>{item.supplier} · {sym}{(item.unitPrice||0).toFixed(2)}/{item.unit}</p>
                </div>
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
  );
}