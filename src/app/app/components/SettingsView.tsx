'use client';
import{useState,useEffect,useRef}from'react';
import{useSettings}from'@/context/SettingsContext';
import{useAuth}from'@/context/AuthContext';
import{useApp}from'@/context/AppContext';
import{dark,light}from'@/lib/theme';
import{usePerms}from'@/lib/perms';
import{useIsMobile}from'@/lib/useIsMobile';
import{exportRecipesCsv,exportCostingsCsv,exportStockCsv}from'@/lib/csv';

export default function SettingsView({onUpgrade}:{onUpgrade?:()=>void}={}){
  const{settings,update}=useSettings();
  const{user,tier,signOut}=useAuth();
  const{state,actions}=useApp();
  const perms=usePerms();
  const isMobile=useIsMobile();
  const C=settings.resolved==='light'?light:dark;
  const profile=state.profile||{};
  const[saved,setSaved]=useState(false);
  const[name,setName]=useState(profile.name||'');
  const[location,setLocation]=useState(profile.location||'');
  const[gpTarget,setGpTarget]=useState(String(profile.gpTarget||72));
  const[stockDay,setStockDay]=useState(String(profile.stockDay||1));
  const[stockFreq,setStockFreq]=useState(profile.stockFrequency||'weekly');
  const[deleteConfirm,setDeleteConfirm]=useState(false);
  const mountedRef=useRef(false);

  useEffect(()=>{
    if(!mountedRef.current){mountedRef.current=true;return;}
    if(!perms.canManageSettings)return;
    const t=setTimeout(()=>{
      actions.updProfile({name:name.trim(),location:location.trim(),gpTarget:parseFloat(gpTarget)||72,stockDay:parseInt(stockDay)||1,stockFrequency:stockFreq});
      setSaved(true);setTimeout(()=>setSaved(false),1500);
    },600);
    return()=>clearTimeout(t);
  },[name,location,gpTarget,stockDay,stockFreq]);

  const inp:any={width:'100%',background:C.surface2,border:'1px solid '+C.border,color:C.text,fontSize:'14px',padding:'10px 12px',outline:'none',fontFamily:'system-ui,sans-serif',boxSizing:'border-box',borderRadius:'3px'};
  const card:any={background:C.surface2,border:'1px solid '+C.border,borderRadius:'4px',padding:'20px',marginBottom:'12px'};
  const lbl:any={fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'8px'};
  const sec:any={fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,marginBottom:'16px'};

  return(
    <div style={{padding:isMobile?'20px 16px':'32px',maxWidth:'680px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'32px'}}>
        <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text}}>Settings</h1>
        <p style={{fontSize:'11px',letterSpacing:'0.8px',textTransform:'uppercase',color:saved?C.greenLight:C.faint,padding:'10px 0',transition:'color 0.2s'}}>
          {saved?'✓ Saved':'Auto-saves'}
        </p>
      </div>

      {/* Appearance */}
      <div style={card}>
        <p style={sec}>Appearance</p>
        <div style={{marginBottom:'20px'}}>
          <label style={lbl}>Theme</label>
          <div style={{display:'flex',gap:'8px'}}>
            {(['dark','light','system'] as const).map(t=>(
              <button key={t} onClick={()=>update({theme:t})}
                style={{flex:1,padding:'10px',border:'1px solid '+(settings.theme===t?C.gold:C.border),background:settings.theme===t?C.gold+'20':C.surface,color:settings.theme===t?C.gold:C.dim,fontSize:'13px',fontWeight:settings.theme===t?700:400,cursor:'pointer',borderRadius:'3px',textTransform:'capitalize',transition:'all 0.15s'}}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
          <p style={{fontSize:'11px',color:C.faint,marginTop:'8px'}}>
            Currently: <span style={{color:C.gold,fontWeight:700}}>{settings.resolved === 'dark' ? 'Dark mode' : 'Light mode'}</span>
          </p>
        </div>
        <div>
          <label style={lbl}>Text Size</label>
          <div style={{display:'flex',gap:'8px'}}>
            {[{k:'sm',l:'Small',size:'12px'},{k:'md',l:'Medium',size:'14px'},{k:'lg',l:'Large',size:'16px'}].map(({k,l,size})=>(
              <button key={k} onClick={()=>update({fontSize:k as any})}
                style={{flex:1,padding:'10px',border:'1px solid '+(settings.fontSize===k?C.gold:C.border),background:settings.fontSize===k?C.gold+'20':C.surface,color:settings.fontSize===k?C.gold:C.dim,fontSize:size,fontWeight:settings.fontSize===k?700:400,cursor:'pointer',borderRadius:'3px',transition:'all 0.15s'}}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Account */}
      <div style={card}>
        <p style={sec}>Account</p>
        <div style={{marginBottom:'14px'}}><label style={lbl}>Your Name</label><input value={name} onChange={e=>setName(e.target.value)} disabled={!perms.canManageSettings} placeholder="Jack Harrison" style={{...inp,opacity:perms.canManageSettings?1:0.5,cursor:perms.canManageSettings?'text':'not-allowed'}}/></div>
        <div style={{marginBottom:'14px'}}><label style={lbl}>Location</label><input value={location} onChange={e=>setLocation(e.target.value)} disabled={!perms.canManageSettings} placeholder="London, UK" style={{...inp,opacity:perms.canManageSettings?1:0.5,cursor:perms.canManageSettings?'text':'not-allowed'}}/></div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderTop:'1px solid '+C.border,marginTop:'8px'}}>
          <div>
            <p style={{fontSize:'13px',color:C.text,marginBottom:'4px'}}>{user?.email}</p>
            {(()=>{
              const isPaid=['pro','kitchen','group'].includes(tier);
              const label=tier?tier.charAt(0).toUpperCase()+tier.slice(1):'Free';
              return <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:isPaid?C.gold:C.faint,background:(isPaid?C.gold:C.faint)+'18',border:'0.5px solid '+(isPaid?C.gold:C.faint)+'40',padding:'2px 8px',borderRadius:'2px'}}>{label}</span>;
            })()}
          </div>
          {!['pro','kitchen','group'].includes(tier)&&perms.canManageBilling&&<button onClick={onUpgrade} style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',background:C.gold,color:C.bg,padding:'8px 16px',border:'none',cursor:'pointer',borderRadius:'2px'}}>Upgrade — from £25/mo</button>}
        </div>
      </div>

      {/* Defaults — manager+ only (account-wide settings) */}
      {perms.canManageSettings && (
        <div style={card}>
          <p style={sec}>Defaults</p>
          <div style={{marginBottom:'14px'}}><label style={lbl}>Default GP Target %</label><input type="number" value={gpTarget} onChange={e=>setGpTarget(e.target.value)} placeholder="72" style={inp}/><p style={{fontSize:'11px',color:C.faint,marginTop:'4px'}}>Industry benchmark: 65–75%</p></div>
          <div style={{marginBottom:'14px'}}>
            <label style={lbl}>Stock Take Frequency</label>
            <select value={stockFreq} onChange={e=>setStockFreq(e.target.value)} style={{...inp,cursor:'pointer'}}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div><label style={lbl}>Stock Take Day of Month (1–28)</label><input type="number" min={1} max={28} value={stockDay} onChange={e=>setStockDay(e.target.value)} placeholder="1" style={inp}/><p style={{fontSize:'11px',color:C.faint,marginTop:'4px'}}>e.g. 1 = 1st of each month</p></div>
        </div>
      )}

      {/* Data export */}
      <div style={card}>
        <p style={sec}>Export Data</p>
        <p style={{fontSize:'12px',color:C.faint,marginBottom:'14px'}}>Download a snapshot of your data as CSV files — one per type. Open in Excel, Google Sheets, or Numbers.</p>
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {[
            {label:'Recipes',count:state.recipes?.length||0,run:()=>exportRecipesCsv(state.recipes||[])},
            {label:'Costings',count:state.gpHistory?.length||0,run:()=>exportCostingsCsv(state.gpHistory||[])},
            {label:'Stock',count:state.stockItems?.length||0,run:()=>exportStockCsv(state.stockItems||[])},
          ].map(x=>(
            <button key={x.label} onClick={x.run} disabled={x.count===0}
              style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',border:'1px solid '+C.border,background:x.count===0?'transparent':C.surface,color:x.count===0?C.faint:C.text,cursor:x.count===0?'not-allowed':'pointer',borderRadius:'3px',fontSize:'13px',opacity:x.count===0?0.5:1}}>
              <span>Download {x.label.toLowerCase()} <span style={{color:C.faint,fontSize:'11px',marginLeft:'6px'}}>({x.count} row{x.count===1?'':'s'})</span></span>
              <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:x.count===0?C.faint:C.gold}}>↓ CSV</span>
            </button>
          ))}
        </div>
      </div>

      {/* Danger */}
      <div style={{...card,border:'1px solid '+C.red+'30'}}>
        <p style={{...sec,color:C.red}}>Account Actions</p>
        <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'center'}}>
          <button onClick={()=>signOut()} style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.dim,background:C.surface,border:'1px solid '+C.border,padding:'10px 20px',cursor:'pointer',borderRadius:'2px'}}>Sign Out</button>
          {perms.canManageBilling&&(!deleteConfirm?(
            <button onClick={()=>setDeleteConfirm(true)} style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.red,background:'transparent',border:'1px solid '+C.red,padding:'10px 20px',cursor:'pointer',borderRadius:'2px'}}>Delete Account</button>
          ):(
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <p style={{fontSize:'12px',color:C.red}}>Are you sure? This cannot be undone.</p>
              <button onClick={()=>setDeleteConfirm(false)} style={{fontSize:'11px',color:C.dim,background:'none',border:'none',cursor:'pointer',padding:'6px 10px'}}>Cancel</button>
              <button style={{fontSize:'12px',fontWeight:700,color:'#fff',background:C.red,border:'none',padding:'10px 20px',cursor:'pointer',borderRadius:'2px'}}>Confirm Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}