'use client';
import{useState}from'react';
import{useAuth}from'@/context/AuthContext';
import{useApp}from'@/context/AppContext';
import{useSettings}from'@/context/SettingsContext';
import{dark,light}from'@/lib/theme';
export default function ProfileView(){
  const{user,tier}=useAuth();
  const{state,actions}=useApp();
  const{settings}=useSettings();
  const C=settings.resolved==='light'?light:dark;
  const profile=state.profile||{};
  const[saved,setSaved]=useState(false);
  const avgGP=state.gpHistory.length>0?(state.gpHistory.reduce((a:number,b:any)=>a+(b.pct||0),0)/state.gpHistory.length).toFixed(1):null;
  const stats=[{label:'Recipes',val:state.recipes.length},{label:'Notes',val:state.notes.length},{label:'GP Calcs',val:state.gpHistory.length},{label:'Stock Items',val:(state.stockItems||[]).length}];
  return(
    <div style={{padding:'32px',maxWidth:'720px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text,marginBottom:'24px'}}>Profile</h1>
      {tier!=='pro'&&(
        <div style={{background:C.gold,padding:'16px 20px',marginBottom:'16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderRadius:'4px'}}>
          <div><p style={{fontSize:'11px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:C.bg,marginBottom:'2px'}}>Upgrade to Pro</p><p style={{fontSize:'13px',color:C.bg+'99'}}>£9.99/month or £99/year — unlock all features</p></div>
          <button style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',background:C.bg,color:C.gold,padding:'10px 18px',border:'none',cursor:'pointer',borderRadius:'2px'}}>Upgrade</button>
        </div>
      )}
      <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:'4px',padding:'20px',display:'flex',alignItems:'center',gap:'20px',marginBottom:'16px'}}>
        <div style={{width:'56px',height:'56px',borderRadius:'50%',background:C.gold+'18',border:'2px solid '+C.gold,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{fontSize:'22px',fontWeight:700,color:C.gold}}>{(profile.name||user?.email||'?')[0].toUpperCase()}</span>
        </div>
        <div>
          <p style={{fontSize:'18px',color:C.text,fontWeight:500,marginBottom:'4px'}}>{profile.name||'Your Name'}</p>
          <p style={{fontSize:'13px',color:C.faint,marginBottom:'6px'}}>{user?.email}</p>
          <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:tier==='pro'?C.gold:C.faint,background:(tier==='pro'?C.gold:C.faint)+'18',border:'0.5px solid '+(tier==='pro'?C.gold:C.faint)+'40',padding:'2px 8px',borderRadius:'2px'}}>{tier==='pro'?'Pro':'Free'}</span>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'16px'}}>
        {stats.map(s=>(
          <div key={s.label} style={{background:C.surface,border:'1px solid '+C.border,borderRadius:'4px',padding:'14px',textAlign:'center'}}>
            <p style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.gold,marginBottom:'4px'}}>{s.val}</p>
            <p style={{fontSize:'11px',color:C.faint}}>{s.label}</p>
          </div>
        ))}
      </div>
      {avgGP&&(
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:C.surface,border:'1px solid '+C.border,borderRadius:'4px',padding:'16px',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:C.dim}}>Average GP across saved costings</span>
          <span style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'24px',color:C.gold}}>{avgGP}%</span>
        </div>
      )}
      <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:'4px',padding:'16px'}}>
        <p style={{fontSize:'11px',color:C.faint,lineHeight:1.6,marginBottom:'0'}}>All data stored securely on EU servers. Your data syncs across all devices when signed in.</p>
      </div>
    </div>
  );
}