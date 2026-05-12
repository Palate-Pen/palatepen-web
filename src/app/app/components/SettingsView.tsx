'use client';
import{useState,useEffect,useRef}from'react';
import{useSettings}from'@/context/SettingsContext';
import{useAuth}from'@/context/AuthContext';
import{useApp}from'@/context/AppContext';
import{dark,light}from'@/lib/theme';
import{usePerms}from'@/lib/perms';
import{useIsMobile}from'@/lib/useIsMobile';
import{exportRecipesCsv,exportCostingsCsv,exportStockCsv,downloadRecipesTemplate,downloadCostingsTemplate,downloadStockTemplate,parseCsv,rowsToObjects,readFileAsText,rowsToRecipes,rowsToCostings,rowsToStock}from'@/lib/csv';
import{supabase}from'@/lib/supabase';

export default function SettingsView({onUpgrade}:{onUpgrade?:()=>void}={}){
  const{settings,update}=useSettings();
  const{user,tier,signOut}=useAuth();
  const{state,actions}=useApp();
  const perms=usePerms();
  const isMobile=useIsMobile();
  const C=settings.resolved==='light'?light:dark;
  const profile=state.profile||{};
  const[saved,setSaved]=useState(false);
  const[businessName,setBusinessName]=useState(profile.businessName||'');
  const[name,setName]=useState(profile.name||'');
  const[location,setLocation]=useState(profile.location||'');
  const[gpTarget,setGpTarget]=useState(String(profile.gpTarget||72));
  const[stockDay,setStockDay]=useState(String(profile.stockDay||1));
  const[stockFreq,setStockFreq]=useState(profile.stockFrequency||'weekly');
  const[deleteConfirm,setDeleteConfirm]=useState(false);
  const[uploadingLogo,setUploadingLogo]=useState(false);
  const[logoError,setLogoError]=useState('');
  const[importPreview,setImportPreview]=useState<null|{kind:'recipes'|'costings'|'stock';rows:any[];fileName:string}>(null);
  const[importError,setImportError]=useState('');
  const mountedRef=useRef(false);

  async function pickImport(kind: 'recipes' | 'costings' | 'stock', file: File) {
    setImportError('');
    try {
      const text = await readFileAsText(file);
      const raw = parseCsv(text);
      if (raw.length < 2) {
        setImportError('That CSV looks empty — make sure it has a header row plus at least one data row.');
        return;
      }
      const objs = rowsToObjects(raw);
      const rows = kind === 'recipes' ? rowsToRecipes(objs)
                  : kind === 'costings' ? rowsToCostings(objs)
                  : rowsToStock(objs);
      if (rows.length === 0) {
        setImportError('No importable rows found. Check the headers match the template.');
        return;
      }
      setImportPreview({ kind, rows, fileName: file.name });
    } catch (e: any) {
      setImportError(e?.message || 'Could not read that file.');
    }
  }

  function confirmImport() {
    if (!importPreview) return;
    const { kind, rows } = importPreview;
    if (kind === 'recipes') rows.forEach(r => actions.addRecipe(r));
    if (kind === 'costings') rows.forEach(r => actions.addGP(r));
    if (kind === 'stock') rows.forEach(r => actions.addStock(r));
    setImportPreview(null);
  }

  // Resize the logo client-side to ~600px wide before upload. Keeps storage
  // light and avoids huge PNGs slowing every print/page that embeds the logo.
  async function resizeLogo(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxW = 600;
        const ratio = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not encode')), file.type.includes('png') ? 'image/png' : 'image/jpeg', 0.9);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      img.src = url;
    });
  }

  async function uploadLogo(file: File) {
    if (!user?.id) return;
    setLogoError('');
    setUploadingLogo(true);
    try {
      const blob = await resizeLogo(file);
      const ext = file.type.includes('png') ? 'png' : 'jpg';
      const ts = Date.now();
      // Reusing recipe-photos bucket — RLS allows owner writes under {user.id}/...
      const path = `${user.id}/business-logo-${ts}.${ext}`;
      const { error: upErr } = await supabase.storage.from('recipe-photos').upload(path, blob, {
        contentType: blob.type, upsert: true, cacheControl: '3600',
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('recipe-photos').getPublicUrl(path);
      if (profile.logoPath && profile.logoPath !== path) {
        await supabase.storage.from('recipe-photos').remove([profile.logoPath]).catch(() => {});
      }
      actions.updProfile({ logoUrl: pub.publicUrl, logoPath: path });
    } catch (e: any) {
      setLogoError(e?.message || 'Upload failed');
    }
    setUploadingLogo(false);
  }

  async function removeLogo() {
    if (profile.logoPath) {
      await supabase.storage.from('recipe-photos').remove([profile.logoPath]).catch(() => {});
    }
    actions.updProfile({ logoUrl: null, logoPath: null });
  }

  useEffect(()=>{
    if(!mountedRef.current){mountedRef.current=true;return;}
    if(!perms.canManageSettings)return;
    const t=setTimeout(()=>{
      actions.updProfile({businessName:businessName.trim(),name:name.trim(),location:location.trim(),gpTarget:parseFloat(gpTarget)||72,stockDay:parseInt(stockDay)||1,stockFrequency:stockFreq});
      setSaved(true);setTimeout(()=>setSaved(false),1500);
    },600);
    return()=>clearTimeout(t);
  },[businessName,name,location,gpTarget,stockDay,stockFreq]);

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
        <div style={{marginBottom:'14px'}}>
          <label style={lbl}>Restaurant / Business Name</label>
          <input value={businessName} onChange={e=>setBusinessName(e.target.value)} disabled={!perms.canManageSettings} placeholder="e.g. The Heron, Catford Tavern" style={{...inp,opacity:perms.canManageSettings?1:0.5,cursor:perms.canManageSettings?'text':'not-allowed'}}/>
          <p style={{fontSize:'11px',color:C.faint,marginTop:'4px'}}>Shown across the app, on printed recipes, recipe books and menus.</p>
        </div>
        <div style={{marginBottom:'14px'}}>
          <label style={lbl}>Business Logo (optional)</label>
          {profile.logoUrl ? (
            <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px',background:C.surface,border:'1px solid '+C.border,borderRadius:'3px'}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.logoUrl} alt="Business logo" style={{height:'52px',maxWidth:'140px',objectFit:'contain',background:'#fff',padding:'4px',borderRadius:'2px',flexShrink:0}}/>
              <div style={{flex:1,display:'flex',gap:'8px',flexWrap:'wrap'}}>
                <label style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.gold,background:C.gold+'12',border:'1px solid '+C.gold+'30',padding:'7px 12px',cursor:(uploadingLogo||!perms.canManageSettings)?'not-allowed':'pointer',borderRadius:'2px',opacity:(uploadingLogo||!perms.canManageSettings)?0.5:1}}>
                  {uploadingLogo?'Uploading…':'Replace'}
                  <input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)uploadLogo(f);e.target.value='';}} style={{display:'none'}} disabled={uploadingLogo||!perms.canManageSettings}/>
                </label>
                <button onClick={removeLogo} disabled={uploadingLogo||!perms.canManageSettings}
                  style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.red,background:'transparent',border:'1px solid '+C.red+'40',padding:'7px 12px',cursor:(uploadingLogo||!perms.canManageSettings)?'not-allowed':'pointer',borderRadius:'2px',opacity:(uploadingLogo||!perms.canManageSettings)?0.5:1}}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'4px',padding:'20px',background:C.surface2,border:'1px dashed '+C.border,borderRadius:'3px',cursor:perms.canManageSettings?'pointer':'not-allowed',opacity:perms.canManageSettings?1:0.5}}>
              <span style={{fontSize:'13px',color:C.dim}}>{uploadingLogo?'Uploading…':'📷 Upload logo'}</span>
              <span style={{fontSize:'11px',color:C.faint}}>PNG or JPG · auto-resized to 600px wide</span>
              <input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)uploadLogo(f);e.target.value='';}} style={{display:'none'}} disabled={uploadingLogo||!perms.canManageSettings}/>
            </label>
          )}
          {logoError && <p style={{fontSize:'11px',color:C.red,marginTop:'4px'}}>⚠ {logoError}</p>}
          <p style={{fontSize:'11px',color:C.faint,marginTop:'4px'}}>Appears in the sidebar, on the dashboard, and across printed recipes, books and menus.</p>
        </div>
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

      {/* Data import */}
      <div style={card}>
        <p style={sec}>Import Data</p>
        <p style={{fontSize:'12px',color:C.faint,marginBottom:'14px'}}>Bring data in from a CSV. Download a template to see the exact headers, fill it out in Excel or Google Sheets, then upload. Imported rows are added alongside existing data — they don&apos;t overwrite or replace.</p>
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {[
            {key:'recipes' as const,label:'Recipes',template:downloadRecipesTemplate},
            {key:'costings' as const,label:'Costings',template:downloadCostingsTemplate},
            {key:'stock' as const,label:'Stock',template:downloadStockTemplate},
          ].map(row=>(
            <div key={row.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px',padding:'10px 14px',border:'1px solid '+C.border,background:C.surface,borderRadius:'3px',fontSize:'13px',flexWrap:'wrap'}}>
              <span style={{color:C.text}}>{row.label}</span>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <button onClick={row.template}
                  style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.faint,background:'transparent',border:'1px solid '+C.border,padding:'6px 10px',cursor:'pointer',borderRadius:'2px'}}>
                  ↓ Template
                </button>
                <label style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.gold,background:C.gold+'12',border:'1px solid '+C.gold+'30',padding:'6px 10px',cursor:'pointer',borderRadius:'2px'}}>
                  ↑ Upload CSV
                  <input type="file" accept=".csv,text/csv" onChange={e=>{const f=e.target.files?.[0];if(f)pickImport(row.key,f);e.target.value='';}} style={{display:'none'}}/>
                </label>
              </div>
            </div>
          ))}
        </div>
        {importError && (
          <p style={{fontSize:'11px',color:C.red,marginTop:'10px'}}>⚠ {importError}</p>
        )}
      </div>

      {/* Import preview modal */}
      {importPreview && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:'16px'}}>
          <div style={{background:C.surface,border:'1px solid '+C.border,width:'100%',maxWidth:'480px',maxHeight:'80vh',overflow:'auto',borderRadius:'4px'}}>
            <div style={{padding:'18px 20px',borderBottom:'1px solid '+C.border}}>
              <h3 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'20px',color:C.text,marginBottom:'4px'}}>Confirm import</h3>
              <p style={{fontSize:'12px',color:C.faint}}>{importPreview.fileName}</p>
            </div>
            <div style={{padding:'16px 20px'}}>
              <p style={{fontSize:'13px',color:C.text,marginBottom:'8px'}}>
                About to import <strong style={{color:C.gold}}>{importPreview.rows.length}</strong> {importPreview.kind === 'costings' ? 'costing' : importPreview.kind.replace(/s$/, '')}{importPreview.rows.length === 1 ? '' : 's'}.
              </p>
              <p style={{fontSize:'12px',color:C.faint,marginBottom:'10px'}}>Preview (first 5):</p>
              <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:'4px'}}>
                {importPreview.rows.slice(0,5).map((r,i)=>(
                  <li key={i} style={{fontSize:'12px',color:C.dim,padding:'5px 8px',background:C.surface2,borderRadius:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {importPreview.kind === 'recipes' ? r.title : importPreview.kind === 'costings' ? `${r.name} · ${(state.profile?.currencySymbol||'£')}${(r.sell||0).toFixed(2)}` : `${r.name} · ${r.unit}`}
                  </li>
                ))}
                {importPreview.rows.length > 5 && (
                  <li style={{fontSize:'11px',color:C.faint,padding:'4px 8px'}}>… and {importPreview.rows.length - 5} more</li>
                )}
              </ul>
            </div>
            <div style={{padding:'14px 20px',borderTop:'1px solid '+C.border,display:'flex',gap:'10px',justifyContent:'flex-end'}}>
              <button onClick={()=>setImportPreview(null)}
                style={{fontSize:'12px',color:C.dim,background:C.surface2,border:'1px solid '+C.border,padding:'9px 16px',cursor:'pointer',borderRadius:'2px'}}>
                Cancel
              </button>
              <button onClick={confirmImport}
                style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:C.bg,background:C.gold,border:'none',padding:'9px 18px',cursor:'pointer',borderRadius:'2px'}}>
                Import {importPreview.rows.length}
              </button>
            </div>
          </div>
        </div>
      )}

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