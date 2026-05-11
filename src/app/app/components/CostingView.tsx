'use client';
import{useState,useEffect}from'react';
import{useApp,uid}from'@/context/AppContext';
import{useAuth}from'@/context/AuthContext';
import{useSettings}from'@/context/SettingsContext';
import{dark,light}from'@/lib/theme';
const UNITS=['kg','g','L','ml','each','bunch','tbsp','oz','lb'];
function gpColor(pct:number,target:number,C:any){if(pct>=target)return C.greenLight;if(pct>=65)return C.gold;return C.red;}
export default function CostingView(){
  const{state,actions}=useApp();
  const{tier}=useAuth();
  const{settings}=useSettings();
  const C=settings.resolved==='light'?light:dark;
  const profile=state.profile||{};
  const sym=profile.currencySymbol||'£';
  const gpTarget=profile.gpTarget||72;
  const[dish,setDish]=useState('');
  const[sell,setSell]=useState('');
  const[target,setTarget]=useState(String(gpTarget));
  const[portions,setPortions]=useState('1');
  const[ings,setIngs]=useState<any[]>([]);
  const[ingName,setIngName]=useState('');
  const[ingQty,setIngQty]=useState('');
  const[ingUnit,setIngUnit]=useState('kg');
  const[ingPrice,setIngPrice]=useState('');
  const[historyOpen,setHistoryOpen]=useState(true);
  const[deleteId,setDeleteId]=useState<string|null>(null);
  const[editingId,setEditingId]=useState<string|null>(null);
  const[priceAlerts,setPriceAlerts]=useState<string[]>([]);
  const s=parseFloat(sell)||0;
  const p=parseInt(portions)||1;
  const totalCost=ings.reduce((a,b)=>a+b.line,0);
  const cost=totalCost/p;
  const gp=s-cost;
  const pct=s>0?(gp/s)*100:0;
  const tgt=parseFloat(target)||gpTarget;
  useEffect(()=>{
    if(!editingId)return;
    const saved=state.gpHistory.find((h:any)=>h.id===editingId);
    if(!saved?.ingredients)return;
    const alerts:string[]=[];
    saved.ingredients.forEach((ing:any)=>{
      const banked=state.ingredientsBank.find((b:any)=>b.name.toLowerCase()===ing.name.toLowerCase());
      if(banked&&banked.unitPrice&&ing.price){
        const diff=Math.abs((banked.unitPrice-ing.price)/ing.price*100);
        if(diff>=5)alerts.push(ing.name+': was '+sym+ing.price.toFixed(2)+', now '+sym+banked.unitPrice.toFixed(2)+' ('+(banked.unitPrice>ing.price?'+':'')+((banked.unitPrice-ing.price)/ing.price*100).toFixed(1)+'%)');
      }
    });
    setPriceAlerts(alerts);
  },[editingId]);
  useEffect(()=>{
    if(!editingId||!dish.trim())return;
    const t=setTimeout(()=>{
      actions.updGP(editingId,{name:dish,sell:s,cost,gp,pct,currency:'GBP',target:tgt,portions:p,ingredients:ings,savedAt:Date.now()});
    },600);
    return()=>clearTimeout(t);
  },[editingId,dish,sell,target,portions,ings]);
  function loadHistory(h:any){setDish(h.name||'');setSell(String(h.sell||''));setTarget(String(h.target||gpTarget));setPortions(String(h.portions||1));setIngs(h.ingredients||[]);setEditingId(h.id);}
  function addIng(){
    if(!ingName||!ingQty||!ingPrice)return;
    const qty=parseFloat(ingQty)||0,price=parseFloat(ingPrice)||0;
    let line=qty*price;
    if(ingUnit==='g')line=(qty/1000)*price;
    if(ingUnit==='ml')line=(qty/1000)*price;
    setIngs(prev=>[...prev,{id:Date.now().toString(),name:ingName,qty,unit:ingUnit,price,line}]);
    setIngName('');setIngQty('');setIngPrice('');
  }
  function autofillPrice(name:string){const m=state.ingredientsBank.find((b:any)=>b.name.toLowerCase()===name.toLowerCase());if(m?.unitPrice)setIngPrice(String(m.unitPrice));}
  function saveCosting(){
    if(!dish.trim())return;
    const item={id:editingId||uid(),name:dish,sell:s,cost,gp,pct,currency:'GBP',target:tgt,portions:p,ingredients:ings,savedAt:Date.now()};
    if(editingId)actions.updGP(editingId,item);else actions.addGP(item);
    setEditingId(item.id);setPriceAlerts([]);
  }
  function clearForm(){setDish('');setSell('');setPortions('1');setIngs([]);setEditingId(null);setPriceAlerts([]);}
  function updateAllPrices(){
    ings.forEach(ing=>{const b=state.ingredientsBank.find((bk:any)=>bk.name.toLowerCase()===ing.name.toLowerCase());if(b?.unitPrice){let line=ing.qty*b.unitPrice;if(ing.unit==='g')line=(ing.qty/1000)*b.unitPrice;if(ing.unit==='ml')line=(ing.qty/1000)*b.unitPrice;setIngs(prev=>prev.map(i=>i.id===ing.id?{...i,price:b.unitPrice,line}:i));}});
    setPriceAlerts([]);
  }
  const inp={width:'100%',background:C.surface2,border:'1px solid '+C.border,color:C.text,fontSize:'13px',padding:'9px 12px',outline:'none',fontFamily:'system-ui,sans-serif',boxSizing:'border-box' as const};
  return(
    <div style={{display:'flex',height:'100vh',fontFamily:'system-ui,sans-serif',overflow:'hidden'}}>
      <div style={{flex:1,overflow:'auto',padding:'32px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <div>
            <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text,marginBottom:'4px'}}>Costing</h1>
            {editingId&&<p style={{fontSize:'12px',color:C.faint}}>Editing saved costing</p>}
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={clearForm} style={{fontSize:'11px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'8px 14px',cursor:'pointer',borderRadius:'2px'}}>New</button>
            <button onClick={saveCosting} disabled={!dish.trim()||!s} style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',background:C.gold,color:C.bg,padding:'8px 16px',border:'none',cursor:'pointer',borderRadius:'2px',opacity:(!dish.trim()||!s)?0.4:1}}>{editingId?'Update':'Save Costing'}</button>
          </div>
        </div>
        {priceAlerts.length>0&&(
          <div style={{background:C.red+'10',border:'1px solid '+C.red+'40',borderRadius:'4px',padding:'14px 16px',marginBottom:'16px'}}>
            <p style={{fontSize:'12px',fontWeight:700,color:C.red,marginBottom:'8px'}}>{priceAlerts.length} price change{priceAlerts.length>1?'s':''} since last saved</p>
            {priceAlerts.map((a,i)=><p key={i} style={{fontSize:'12px',color:C.dim,marginBottom:'4px'}}>{a}</p>)}
            <button onClick={updateAllPrices} style={{marginTop:'8px',fontSize:'11px',fontWeight:700,color:C.gold,background:C.goldDim,border:'1px solid '+C.gold+'40',padding:'6px 12px',cursor:'pointer',borderRadius:'2px'}}>Update all to current prices</button>
          </div>
        )}
        {s>0&&pct<tgt&&(
          <div style={{background:C.red+'08',border:'1px solid '+C.red+'30',borderRadius:'4px',padding:'12px 16px',marginBottom:'16px'}}>
            <p style={{fontSize:'12px',color:C.red}}>GP of {pct.toFixed(1)}% is below your {tgt}% target. Price at {sym}{(cost/(1-tgt/100)).toFixed(2)} to hit target.</p>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',border:'1px solid '+C.border,borderRadius:'4px',overflow:'hidden',marginBottom:'20px'}}>
          {[{l:'Sell',v:s>0?sym+s.toFixed(2):'—',c:C.text},{l:'Cost/Cover',v:cost>0?sym+cost.toFixed(2):'—',c:C.text},{l:'GP',v:s>0?sym+gp.toFixed(2):'—',c:C.text},{l:'GP %',v:s>0?pct.toFixed(1)+'%':'—',c:gpColor(pct,tgt,C)}].map((r,i)=>(
            <div key={r.l} style={{padding:'14px',textAlign:'center',background:C.surface,borderRight:i<3?'1px solid '+C.border:'none'}}>
              <p style={{fontSize:'10px',letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint,marginBottom:'6px'}}>{r.l}</p>
              <p style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'20px',color:r.c}}>{r.v}</p>
            </div>
          ))}
        </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
          {/* Dish name with recipe autocomplete */}
          <div style={{position:'relative'}}>
            <label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>Dish Name</label>
            <input value={dish} onChange={e=>setDish(e.target.value)} placeholder="Search recipes or enter dish name..." style={{...inp,width:'100%'}}/>
            {dish.length>1&&state.recipes.filter((r:any)=>r.title.toLowerCase().includes(dish.toLowerCase())&&r.title.toLowerCase()!==dish.toLowerCase()).slice(0,6).length>0&&(
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:C.surface,border:'1px solid '+C.gold+'60',borderTop:'none',zIndex:50,maxHeight:'200px',overflow:'auto',borderRadius:'0 0 3px 3px',boxShadow:'0 4px 12px rgba(0,0,0,0.3)'}}>
                {state.recipes.filter((r:any)=>r.title.toLowerCase().includes(dish.toLowerCase())&&r.title.toLowerCase()!==dish.toLowerCase()).slice(0,6).map((r:any)=>(
                  <button key={r.id} onMouseDown={e=>{e.preventDefault();setDish(r.title);}}
                    style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:'none',border:'none',borderBottom:'1px solid '+C.border,cursor:'pointer',textAlign:'left'}}>
                    <span style={{fontSize:'13px',color:C.text}}>{r.title}</span>
                    <span style={{fontSize:'11px',color:C.faint}}>{r.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div><label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>Selling Price ({sym} excl. VAT)</label><input type="number" value={sell} onChange={e=>setSell(e.target.value)} placeholder="0.00" style={inp}/></div>
          <div><label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>GP Target %</label><input type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder={String(gpTarget)} style={inp}/></div>
          <div><label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>Covers / Portions</label><input type="number" value={portions} onChange={e=>setPortions(e.target.value)} placeholder="1" style={inp}/></div>
        </div>
        {s>0&&(
          <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:'4px',padding:'16px',marginBottom:'16px'}}>
            {[{l:'Your GP',v:pct,c:gpColor(pct,tgt,C)},{l:'Target '+tgt+'%',v:tgt,c:C.greenLight}].map(b=>(
              <div key={b.l} style={{marginBottom:'10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:C.faint,marginBottom:'4px'}}><span>{b.l}</span><span style={{color:b.c}}>{b.v.toFixed(1)}%</span></div>
                <div style={{height:'4px',background:C.surface3,borderRadius:'2px',overflow:'hidden'}}><div style={{height:'4px',background:b.c,borderRadius:'2px',width:Math.min(Math.max(b.v,0),100)+'%',transition:'width 0.3s'}}></div></div>
              </div>
            ))}
          </div>
        )}
        <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:'4px',padding:'16px'}}>
          <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,marginBottom:'14px'}}>Ingredients &amp; Costs</p>
          {ings.length>0&&(
            <div style={{marginBottom:'14px',border:'1px solid '+C.border,borderRadius:'3px',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 32px',background:C.surface2,padding:'8px 12px',gap:'8px'}}>
                {['Ingredient','Qty','Cost/unit','Line',''].map((h,i)=><p key={i} style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint}}>{h}</p>)}
              </div>
              {ings.map(ing=>(
                <div key={ing.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 32px',padding:'10px 12px',borderTop:'1px solid '+C.border,gap:'8px',alignItems:'center'}}>
                  <p style={{fontSize:'13px',color:C.text}}>{ing.name}</p>
                  <p style={{fontSize:'13px',color:C.dim}}>{ing.qty}{ing.unit}</p>
                  <p style={{fontSize:'13px',color:C.dim}}>{sym}{ing.price.toFixed(2)}</p>
                  <p style={{fontSize:'13px',color:C.gold}}>{sym}{ing.line.toFixed(3)}</p>
                  <button onClick={()=>setIngs(prev=>prev.filter(i=>i.id!==ing.id))} style={{color:C.faint,background:'none',border:'none',cursor:'pointer',fontSize:'16px',padding:'0'}}>×</button>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',padding:'10px 12px',borderTop:'1px solid '+C.border,background:C.surface2}}>
                <span style={{fontSize:'12px',color:C.dim}}>Total ingredient cost</span>
                <span style={{fontSize:'12px',fontWeight:700,color:C.gold}}>{sym}{totalCost.toFixed(3)}</span>
              </div>
            </div>
          )}
          <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,marginBottom:'10px'}}>Add Ingredient</p>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:'8px',alignItems:'end'}}>
            <div style={{position:'relative'}}>
              <input value={ingName} onChange={e=>{setIngName(e.target.value);autofillPrice(e.target.value);}} placeholder="Search ingredients bank..." style={{...inp,width:'100%'}}/>
              {ingName.length>1&&state.ingredientsBank.filter((b:any)=>b.name.toLowerCase().includes(ingName.toLowerCase())&&b.name.toLowerCase()!==ingName.toLowerCase()).slice(0,6).length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:C.surface,border:'1px solid '+C.gold+'60',borderTop:'none',zIndex:50,maxHeight:'200px',overflow:'auto',borderRadius:'0 0 3px 3px',boxShadow:'0 4px 12px rgba(0,0,0,0.3)'}}>
                  {state.ingredientsBank.filter((b:any)=>b.name.toLowerCase().includes(ingName.toLowerCase())&&b.name.toLowerCase()!==ingName.toLowerCase()).slice(0,6).map((b:any)=>(
                    <button key={b.id} onMouseDown={e=>{e.preventDefault();setIngName(b.name);setIngUnit(b.unit||'kg');setIngPrice(String(b.unitPrice||''));}}
                      style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:'none',border:'none',borderBottom:'1px solid '+C.border,cursor:'pointer',textAlign:'left',transition:'background 0.1s'}}>
                      <span style={{fontSize:'13px',color:C.text}}>{b.name}</span>
                      <span style={{fontSize:'12px',color:C.gold,fontWeight:600}}>£{(b.unitPrice||0).toFixed(2)}/{b.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="number" value={ingQty} onChange={e=>setIngQty(e.target.value)} placeholder="Qty" style={inp}/>
            <select value={ingUnit} onChange={e=>setIngUnit(e.target.value)} style={{...inp,cursor:'pointer'}}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select>
            <input type="number" value={ingPrice} onChange={e=>setIngPrice(e.target.value)} placeholder={sym+'/'+ingUnit} style={inp}/>
            <button onClick={addIng} disabled={!ingName||!ingQty||!ingPrice} style={{background:C.gold,color:C.bg,border:'none',padding:'10px 16px',cursor:'pointer',fontSize:'12px',fontWeight:700,borderRadius:'2px',opacity:(!ingName||!ingQty||!ingPrice)?0.4:1,whiteSpace:'nowrap'}}>+ Add</button>
          </div>
          {ingName&&state.ingredientsBank.find((b:any)=>b.name.toLowerCase()===ingName.toLowerCase())&&(
            <p style={{fontSize:'11px',color:C.gold,marginTop:'4px'}}>Found in ingredients bank — price auto-filled</p>
          )}
        </div>
      </div>
      <div style={{width:historyOpen?'272px':'40px',borderLeft:'1px solid '+C.border,background:C.surface,display:'flex',flexDirection:'column',transition:'width 0.2s',overflow:'hidden',flexShrink:0}}>
        <button onClick={()=>setHistoryOpen(!historyOpen)} style={{display:'flex',alignItems:'center',gap:'8px',padding:'16px',borderBottom:'1px solid '+C.border,background:'none',border:'none',cursor:'pointer',color:C.dim,whiteSpace:'nowrap',width:'100%'}}>
          <span style={{fontSize:'16px',transform:historyOpen?'rotate(0deg)':'rotate(180deg)',transition:'transform 0.2s'}}>›</span>
          {historyOpen&&<span style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase'}}>History ({state.gpHistory.length})</span>}
        </button>
        {historyOpen&&(
          <div style={{overflow:'auto',flex:1}}>
            {state.gpHistory.length===0?<p style={{fontSize:'12px',color:C.faint,padding:'20px',textAlign:'center'}}>No saved costings yet</p>:
            state.gpHistory.map((h:any)=>{
              const col=gpColor(h.pct||0,h.target||72,C);
              const isEditing=editingId===h.id;
              return(
                <div key={h.id} style={{borderBottom:'1px solid '+C.border,background:isEditing?C.gold+'08':C.surface}}>
                  <button onClick={()=>loadHistory(h)} style={{width:'100%',padding:'14px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'4px'}}>
                      <p style={{fontSize:'13px',color:isEditing?C.gold:C.text,fontWeight:isEditing?700:400,flex:1,paddingRight:'8px'}}>{h.name}</p>
                      <p style={{fontSize:'16px',color:col,fontFamily:'Georgia,serif',fontWeight:300,flexShrink:0}}>{(h.pct||0).toFixed(1)}%</p>
                    </div>
                    <p style={{fontSize:'11px',color:C.faint}}>{'£'+(h.sell||0).toFixed(2)+' sell · '+'£'+(h.cost||0).toFixed(2)+' cost'}</p>
                    {isEditing&&<p style={{fontSize:'10px',color:C.gold,marginTop:'4px',fontWeight:700}}>Currently editing</p>}
                  </button>
                {/* Link to recipe */}
                <div style={{padding:'8px 16px',borderTop:'1px solid '+C.border,background:C.surface2+'80'}}>
                  <select
                    value={state.recipes.find((r:any)=>r.linkedCostingId===h.id)?.id||''}
                    onChange={e=>{
                      const recipeId=e.target.value;
                      state.recipes.forEach((r:any)=>{if(r.linkedCostingId===h.id)actions.updRecipe(r.id,{linkedCostingId:null});});
                      if(recipeId)actions.updRecipe(recipeId,{linkedCostingId:h.id});
                    }}
                    onClick={e=>e.stopPropagation()}
                    style={{width:'100%',background:C.surface,border:'1px solid '+C.border,color:C.text,fontSize:'11px',padding:'5px 8px',outline:'none',cursor:'pointer',borderRadius:'2px'}}
                  >
                    <option value=''>Link to recipe...</option>
                    {state.recipes.map((r:any)=>(
                      <option key={r.id} value={r.id}>
                        {r.title}{r.linkedCostingId===h.id?' ✓':''}
                      </option>
                    ))}
                  </select>
                </div>
                  {deleteId===h.id?(
                    <div style={{padding:'8px 16px',borderTop:'1px solid '+C.border,display:'flex',alignItems:'center',gap:'8px',background:C.red+'08'}}>
                      <p style={{fontSize:'11px',color:C.red,flex:1}}>Delete?</p>
                      <button onClick={()=>setDeleteId(null)} style={{fontSize:'11px',color:C.dim,background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
                      <button onClick={()=>{actions.delGP(h.id);setDeleteId(null);if(editingId===h.id)clearForm();}} style={{fontSize:'11px',fontWeight:700,color:'#fff',background:C.red,border:'none',padding:'4px 10px',cursor:'pointer',borderRadius:'2px'}}>Delete</button>
                    </div>
                  ):(
                    <button onClick={e=>{e.stopPropagation();setDeleteId(h.id);}} style={{width:'100%',padding:'6px 16px',background:'none',border:'none',borderTop:'1px solid '+C.border,cursor:'pointer',color:C.faint,fontSize:'11px',textAlign:'left'}}>Delete</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}