'use client';
import{useAuth}from'@/context/AuthContext';
import{useSettings}from'@/context/SettingsContext';
import{dark,light}from'@/lib/theme';
const NAV=[{id:'recipes',label:'Recipes'},{id:'notebook',label:'Notebook'},{id:'costing',label:'Costing'},{id:'invoices',label:'Invoices'},{id:'stock',label:'Stock'},{id:'profile',label:'Profile'},{id:'settings',label:'Settings'}];
export default function Sidebar({tab,setTab}:{tab:string;setTab:(t:string)=>void}){
  const{tier}=useAuth();
  const{settings}=useSettings();
  const C=settings.resolved==='light'?light:dark;
  const PRO=['invoices','stock'];
  return(
    <aside style={{position:'fixed',left:0,top:0,bottom:0,width:'224px',background:C.surface,borderRight:'1px solid '+C.border,display:'flex',flexDirection:'column',zIndex:40}}>
      <div style={{padding:'20px 16px 16px',borderBottom:'1px solid '+C.border}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',marginBottom:'4px'}}>
          <span style={{fontFamily:'Georgia,serif',fontWeight:700,fontStyle:'italic',color:C.text,fontSize:'22px',letterSpacing:'-1px'}}>M</span>
          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:C.gold,marginBottom:'7px'}}></div>
          <span style={{fontFamily:'Georgia,serif',fontWeight:300,color:C.text,fontSize:'22px',letterSpacing:'5px'}}>ISE</span>
        </div>
        <p style={{fontSize:'10px',color:C.faint,letterSpacing:'1px',textTransform:'uppercase'}}>By Palate &amp; Pen</p>
      </div>
      <nav style={{flex:1,padding:'12px 8px',display:'flex',flexDirection:'column',gap:'2px'}}>
        {NAV.map(item=>{
          const isPro=PRO.includes(item.id)&&tier!=='pro';
          const active=tab===item.id;
          return(
            <button key={item.id} onClick={()=>setTab(item.id)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'4px',textAlign:'left',background:active?C.gold+'18':'transparent',border:active?'0.5px solid '+C.gold+'30':'0.5px solid transparent',color:active?C.gold:C.dim,fontSize:'13px',cursor:'pointer',width:'100%'}}>
              <div style={{width:'5px',height:'5px',borderRadius:'50%',background:active?C.gold:C.border,flexShrink:0}}></div>
              <span style={{flex:1}}>{item.label}</span>
              {isPro&&<span style={{fontSize:'9px',fontWeight:700,color:C.gold,background:C.gold+'18',border:'0.5px solid '+C.gold+'30',padding:'1px 5px',borderRadius:'2px'}}>Pro</span>}
            </button>
          );
        })}
      </nav>
      <div style={{padding:'12px 8px 16px'}}>
        {tier==='pro'?(
          <div style={{background:C.gold+'12',border:'0.5px solid '+C.gold+'30',borderRadius:'4px',padding:'10px 12px'}}>
            <p style={{fontSize:'10px',fontWeight:700,color:C.gold,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'2px'}}>Pro</p>
            <p style={{fontSize:'11px',color:C.faint}}>All features active</p>
          </div>
        ):(
          <div style={{background:C.surface2,border:'0.5px solid '+C.border,borderRadius:'4px',padding:'10px 12px'}}>
            <p style={{fontSize:'10px',fontWeight:700,color:C.faint,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'4px'}}>Free</p>
            <button style={{width:'100%',background:C.gold,color:C.bg,fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',padding:'6px',border:'none',cursor:'pointer',borderRadius:'2px'}}>Upgrade — £9.99/mo</button>
          </div>
        )}
      </div>
    </aside>
  );
}