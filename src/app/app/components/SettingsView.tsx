'use client';
import{useState}from'react';
import{useSettings}from'@/context/SettingsContext';
import{useAuth}from'@/context/AuthContext';
import{useApp}from'@/context/AppContext';
import{dark,light}from'@/lib/theme';
export default function SettingsView(){
  const{settings,update}=useSettings();
  const{user,tier,signOut}=useAuth();
  const{state,actions}=useApp();
  const C=settings.resolved==='light'?light:dark;
  const profile=state.profile||{};
  const[saved,setSaved]=useState(false);
  const[name,setName]=useState(profile.name||'');
  const[location,setLocation]=useState(profile.location||'');
  const[gpTarget,setGpTarget]=useState(String(profile.gpTarget||72));
  const[stockDay,setStockDay]=useState(String(profile.stockDay||1));
  const[stockFreq,setStockFreq]=useState(profile.stockFrequency||'weekly');
  const[deleteConfirm,setDeleteConfirm]=useState(false);
  function save(){
    actions.updProfile({name:name.trim(),location:location.trim(),gpTarget:parseFloat(gpTarget)||72,stockDay:parseInt(stockDay)||1,stockFrequency:stockFreq});
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  }
  const inp={width:'100%',background:C.surface2,border:'1px solid '+C.border,color:C.text,fontSize:'14px',padding:'10px 12px',outline:'none',fontFamily:'system-ui,sans-serif',boxSizing:'border-box' as const};
  const card={background:C.surface2,border:'1px solid '+C.border,borderRadius:'4px',padding:'20px',marginBottom:'12px'};
  const lbl={fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase' as const,color:C.faint,display:'block' as const,marginBottom:'6px'};
  const sec={fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase' as const,color:C.faint,marginBottom:'16px'};
  return(
    <div style={{padding:'32px',maxWidth:'680px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'32px'}}>
        <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text}}>Settings</h1>
        <button onClick={save} style={{fontSize:'11px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',background:saved?C.green:C.gold,color:saved?'#fff':C.bg,padding:'10px 20px',border:'none',cursor:'pointer',transition:'all 0.2s',borderRadius:'2px'}}>
          {saved?'✓ Saved':'Save Changes'}
        </button>
      </div>
      <div style={card}>
        <p style={sec}>Appearance</p>
        <div style={{marginBottom:'20px'}}>
          <label style={lbl}>Theme</label>
          <div style={{display:'flex',gap:'8px'}}>
            {(['dark','light','system'] as const).map(t=>(
              <button key={t} onClick={()=>update({theme:t})} style={{flex:1,padding:'10px',border:'1px solid '+(settings.theme===t?C.gold:C.border),background:settings.theme===t?C.gold+'15':C.surface,color:settings.theme===t?C.gold:C.dim,fontSize:'12px',fontWeight:settings.theme===t?700:400,cursor:'pointer',borderRadius:'2px',textTransform:'capitalize'}}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={lbl}>Text Size</label>
          <div style={{display:'flex',gap:'8px'}}>
            {[{k:'sm',l:'Small'},{k:'md',l:'Medium'},{k:'lg',l:'Large'}].map(({k,l})=>(
              <button key={k} onClick={()=>update({fontSize:k as any})} style={{flex:1,padding:'10px',border:'1px solid '+(settings.fontSize===k?C.gold:C.border),background:settings.fontSize===k?C.gold+'15':C.surface,color:settings.fontSize===k?C.gold:C.dim,fontSize:k==='sm'?'11px':k==='lg'?'15px':'13px',fontWeight:settings.fontSize===k?700:400,cursor:'pointer',borderRadius:'2px'}}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={card}>
        <p style={sec}>Account</p>
        <div style={{marginBottom:'14px'}}><label style={lbl}>Your Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Jack Harrison" style={inp}/></div>
        <div style={{marginBottom:'14px'}}><label style={lbl}>Location</label><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="London, UK" style={inp}/></div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderTop:'1px solid '+C.border,marginTop:'8px'}}>
          <div>
            <p style={{fontSize:'13px',color:C.text,marginBottom:'4px'}}>{user?.email}</p>
            <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:tier==='pro'?C.gold:C.faint,background:(tier==='pro'?C.gold:C.faint)+'18',border:'0.5px solid '+(tier==='pro'?C.gold:C.faint)+'40',padding:'2px 8px',borderRadius:'2px'}}>{tier==='pro'?'Pro':'Free'}</span>
          </div>
          {tier!=='pro'&&<button style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',background:C.gold,color:C.bg,padding:'8px 16px',border:'none',cursor:'pointer',borderRadius:'2px'}}>Upgrade to Pro</button>}
        </div>
      </div>
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
      <div style={{...card,border:'1px solid '+C.red+'30'}}>
        <p style={{...sec,color:C.red}}>Account Actions</p>
        <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'center'}}>
          <button onClick={()=>signOut()} style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.dim,background:C.surface,border:'1px solid '+C.border,padding:'10px 20px',cursor:'pointer',borderRadius:'2px'}}>Sign Out</button>
          {!deleteConfirm?(
            <button onClick={()=>setDeleteConfirm(true)} style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.red,background:'transparent',border:'1px solid '+C.red,padding:'10px 20px',cursor:'pointer',borderRadius:'2px'}}>Delete Account</button>
          ):(
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <p style={{fontSize:'12px',color:C.red}}>Are you sure? This cannot be undone.</p>
              <button onClick={()=>setDeleteConfirm(false)} style={{fontSize:'11px',color:C.dim,background:'none',border:'none',cursor:'pointer',padding:'6px 10px'}}>Cancel</button>
              <button style={{fontSize:'12px',fontWeight:700,color:'#fff',background:C.red,border:'none',padding:'10px 20px',cursor:'pointer',borderRadius:'2px'}}>Confirm Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}