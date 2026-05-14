'use client';
import{useState}from'react';
import{useApp}from'@/context/AppContext';
import{useSettings}from'@/context/SettingsContext';
import{dark,light}from'@/lib/theme';
import{useIsMobile}from'@/lib/useIsMobile';
import{useOutlet}from'@/context/OutletContext';
import{scopeByOutlet}from'@/lib/outlets';
export default function NotebookView(){
  const{state,actions}=useApp();
  const{settings}=useSettings();
  const{activeOutletId,isMultiOutlet}=useOutlet();
  const C=settings.resolved==='light'?light:dark;
  const isMobile=useIsMobile();
  const[sel,setSel]=useState<any>(null);
  const[search,setSearch]=useState('');
  const[deleteId,setDeleteId]=useState<string|null>(null);
  const visibleNotes=scopeByOutlet(state.notes,activeOutletId,isMultiOutlet);
  const filtered=visibleNotes.filter((n:any)=>(n.title||'').toLowerCase().includes(search.toLowerCase())||(n.content||'').toLowerCase().includes(search.toLowerCase()));
  function createNote(){const note=actions.addNote({...(isMultiOutlet&&activeOutletId?{outletId:activeOutletId}:{})});setSel(note);}
  if(sel)return(
    <div style={{padding:isMobile?'20px 16px':'32px',maxWidth:'760px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <button onClick={()=>setSel(null)} style={{fontSize:'13px',color:C.gold,background:'none',border:'none',cursor:'pointer',marginBottom:'20px',display:'flex',alignItems:'center',gap:'6px'}}>← Notebook</button>
      <input value={sel.title} onChange={e=>{actions.updNote(sel.id,{title:e.target.value});setSel({...sel,title:e.target.value});}} placeholder="Idea title..."
        style={{width:'100%',background:'transparent',fontFamily:'Georgia,serif',fontWeight:300,fontSize:'32px',color:C.text,border:'none',borderBottom:'1px solid '+C.border,paddingBottom:'12px',marginBottom:'28px',outline:'none',boxSizing:'border-box'}}/>
      <textarea value={sel.content} onChange={e=>{actions.updNote(sel.id,{content:e.target.value});setSel({...sel,content:e.target.value});}}
        placeholder="Write freely..."
        style={{width:'100%',background:'transparent',color:C.text,fontSize:'15px',lineHeight:'1.9',border:'none',outline:'none',resize:'none',minHeight:'400px',fontFamily:'system-ui,sans-serif',boxSizing:'border-box'}}/>
      {state.recipes.length>0&&(
        <div style={{marginTop:'32px',borderTop:'1px solid '+C.border,paddingTop:'20px'}}>
          <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,marginBottom:'12px'}}>Link to Recipes</p>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {state.recipes.map((r:any)=>{
              const linked=(sel.linkedRecipeIds||[]).includes(r.id);
              return(
                <button key={r.id} onClick={()=>{const ids=linked?(sel.linkedRecipeIds||[]).filter((id:string)=>id!==r.id):[...(sel.linkedRecipeIds||[]),r.id];actions.updNote(sel.id,{linkedRecipeIds:ids});setSel({...sel,linkedRecipeIds:ids});}}
                  style={{fontSize:'12px',padding:'6px 14px',border:'1px solid '+(linked?C.gold:C.border),color:linked?C.gold:C.dim,background:linked?C.gold+'10':'transparent',cursor:'pointer',borderRadius:'2px'}}>
                  {linked?'✓ ':''}{r.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div style={{marginTop:'24px',paddingTop:'20px',borderTop:'1px solid '+C.border}}>
        {deleteId===sel.id?(
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <p style={{fontSize:'13px',color:C.red}}>Delete this note?</p>
            <button onClick={()=>setDeleteId(null)} style={{fontSize:'12px',color:C.dim,background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
            <button onClick={()=>{actions.delNote(sel.id);setSel(null);setDeleteId(null);}} style={{fontSize:'12px',fontWeight:700,color:'#fff',background:C.red,border:'none',padding:'8px 16px',cursor:'pointer',borderRadius:'2px'}}>Confirm Delete</button>
          </div>
        ):(
          <button onClick={()=>setDeleteId(sel.id)} style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.red,border:'1px solid '+C.red,background:'transparent',padding:'8px 16px',cursor:'pointer',borderRadius:'2px'}}>Delete Note</button>
        )}
      </div>
    </div>
  );
  return(
    <div style={{padding:isMobile?'20px 16px':'32px',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:'24px'}}>
        <div>
          <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'28px',color:C.text,marginBottom:'4px'}}>Idea Notebook</h1>
          <p style={{fontSize:'12px',color:C.faint}}>{state.notes.length} idea{state.notes.length!==1?'s':''} saved</p>
        </div>
        <button onClick={createNote} style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',background:C.gold,color:C.bg,border:'none',padding:'10px 18px',cursor:'pointer',borderRadius:'2px'}}>+ New Note</button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search notes..."
        style={{width:'100%',background:C.surface,border:'1px solid '+C.border,color:C.text,fontSize:'14px',padding:'12px 14px',outline:'none',fontFamily:'system-ui,sans-serif',marginBottom:'16px',boxSizing:'border-box'}}/>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'60px 0'}}><p style={{fontSize:'13px',color:C.faint}}>No ideas yet. Tap + New Note to start.</p></div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(280px,1fr))',gap:'8px'}}>
          {filtered.map((n:any)=>(
            <button key={n.id} onClick={()=>setSel(n)} style={{textAlign:'left',background:C.surface,border:'1px solid '+C.border,borderRadius:'4px',padding:'20px',cursor:'pointer',transition:'border-color 0.15s'}}>
              <h3 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'18px',color:C.text,marginBottom:'8px'}}>{n.title||'Untitled'}</h3>
              {n.content&&<p style={{fontSize:'12px',color:C.faint,lineHeight:1.6,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{n.content}</p>}
              {(n.linkedRecipeIds||[]).length>0&&<p style={{fontSize:'11px',color:C.faint,marginTop:'10px'}}>Linked to {n.linkedRecipeIds.length} recipe{n.linkedRecipeIds.length>1?'s':''}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}