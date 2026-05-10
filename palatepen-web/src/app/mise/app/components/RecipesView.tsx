'use client';
import { useState } from 'react';
import { useApp, uid } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

const CATS = ['Starter','Main','Dessert','Sauce','Bread','Pastry','Stock','Snack','Other'];

export default function RecipesView() {
  const { state, actions } = useApp();
  const { tier } = useAuth();
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('Main');
  const [newUrl, setNewUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<any>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string|null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockIngs, setStockIngs] = useState<any[]>([]);

  const filtered = state.recipes.filter((r:any) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.category||'').toLowerCase().includes(search.toLowerCase())
  );

  const linkedNotes = sel ? (sel.linkedNoteIds||[]).map((id:string)=>state.notes.find((n:any)=>n.id===id)).filter(Boolean) : [];

  async function importUrl() {
    if (!newUrl||tier!=='pro') return;
    setImporting(true);
    try {
      const pageRes = await fetch(newUrl);
      const html = await pageRes.text();
      const text = html.replace(/<script[sS]*?</script>/gi,'').replace(/<style[sS]*?</style>/gi,'').replace(/<[^>]+>/g,' ').replace(/s+/g,' ').slice(0,12000);
      const res = await fetch('/api/mise/import-recipe', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ text }) });
      const data = await res.json();
      if (data.title) { setImported(data); setNewTitle(data.title); if(data.category) setNewCat(data.category); }
    } catch(e) { console.error(e); }
    setImporting(false);
  }

  function save() {
    if (!newTitle.trim()) return;
    actions.addRecipe({ title:newTitle.trim(), url:newUrl, category:newCat, notes:newNotes, imported:imported||null });
    setShowAdd(false); setNewTitle(''); setNewUrl(''); setNewNotes(''); setNewCat('Main'); setImported(null);
  }

  function openStock() {
    if (!sel?.imported?.ingredients?.length) return;
    const existing = (state.stockItems||[]).map((i:any)=>i.name.toLowerCase());
    setStockIngs(sel.imported.ingredients.map((ing:string,i:number)=>({ id:String(i), name:ing, exists:existing.includes(ing.toLowerCase()), selected:!existing.includes(ing.toLowerCase()) })));
    setShowStockModal(true);
  }

  function addToStock() {
    stockIngs.filter(i=>i.selected).forEach(ing=>actions.addStock({ name:ing.name, unit:'kg', parLevel:null, minLevel:null, currentQty:null }));
    setShowStockModal(false);
  }

  if (sel) return (
    <div className="flex h-screen font-epilogue">
      <div className="flex-1 overflow-auto p-8">
        <button onClick={()=>setSel(null)} className="flex items-center gap-2 text-mise-gold text-sm mb-6 hover:text-yellow-400 transition-colors">
          ← Recipe Library
        </button>
        <input value={sel.title} onChange={e=>actions.updRecipe(sel.id,{title:e.target.value})}
          className="w-full bg-transparent font-fraunces font-light text-4xl text-mise-text border-b border-mise-border pb-3 mb-6 focus:outline-none focus:border-mise-gold transition-colors" />

        <div className="flex flex-wrap gap-2 mb-6">
          {[sel.category, sel.imported?.servings?'Serves '+sel.imported.servings:null, sel.imported?.prepTime?'Prep: '+sel.imported.prepTime:null].filter(Boolean).map((t:string)=>(
            <span key={t} className="text-xs font-bold tracking-widest uppercase text-mise-gold bg-mise-gold/10 border border-mise-gold/20 px-3 py-1">{t}</span>
          ))}
        </div>

        {/* Linked notes */}
        {linkedNotes.length>0&&(
          <div className="mb-6">
            <p className="text-xs font-bold tracking-widest uppercase text-mise-faint mb-3">Linked Notes</p>
            {linkedNotes.map((note:any)=>(
              <div key={note.id} className="border border-mise-border mb-2">
                <button onClick={()=>setExpandedNoteId(expandedNoteId===note.id?null:note.id)}
                  className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-mise-surface2 transition-colors">
                  <span className="text-sm text-mise-text">{note.title||'Untitled'}</span>
                  <span className="text-mise-gold text-sm">{expandedNoteId===note.id?'∧':'∨'}</span>
                </button>
                {expandedNoteId===note.id&&(
                  <div className="px-4 pb-4 border-t border-mise-border pt-3">
                    <p className="text-sm text-mise-dim leading-relaxed whitespace-pre-wrap">{note.content||'No content yet.'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Ingredients */}
        {sel.imported?.ingredients?.length>0&&(
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-bold tracking-widest uppercase text-mise-faint">Ingredients</p>
              <button onClick={openStock} className="text-xs font-bold tracking-widest uppercase text-mise-gold bg-mise-gold/10 border border-mise-gold/20 px-3 py-1 hover:bg-mise-gold/20 transition-colors">
                + Add All to Stock
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {sel.imported.ingredients.map((ing:string,i:number)=>(
                <div key={i} className="flex items-start gap-3 px-3 py-2 bg-mise-surface2 border border-mise-border">
                  <div className="w-1.5 h-1.5 rounded-full bg-mise-gold mt-1.5 flex-shrink-0"></div>
                  <span className="text-sm text-mise-text">{ing}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Method */}
        {sel.imported?.method?.length>0&&(
          <div className="mb-6">
            <p className="text-xs font-bold tracking-widest uppercase text-mise-faint mb-3">Method</p>
            <div className="space-y-3">
              {sel.imported.method.map((step:string,i:number)=>(
                <div key={i} className="flex gap-4 p-4 bg-mise-surface2 border border-mise-border">
                  <div className="w-6 h-6 rounded-full bg-mise-gold/10 border border-mise-gold/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-mise-gold font-bold">{i+1}</span>
                  </div>
                  <p className="text-sm text-mise-text leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chef's notes */}
        <div className="mb-6">
          <p className="text-xs font-bold tracking-widest uppercase text-mise-faint mb-3">Chef's Notes</p>
          <textarea value={sel.notes} onChange={e=>actions.updRecipe(sel.id,{notes:e.target.value})}
            placeholder="Techniques, adaptations, ideas..."
            rows={5} className="w-full bg-mise-surface2 border border-mise-border text-mise-text text-sm p-4 focus:outline-none focus:border-mise-gold transition-colors resize-none placeholder-mise-faint" />
        </div>

        <button onClick={()=>{ if(confirm('Delete this recipe?')) { actions.delRecipe(sel.id); setSel(null); } }}
          className="text-xs font-bold tracking-widest uppercase text-mise-red border border-mise-red px-4 py-2 hover:bg-red-900/20 transition-colors">
          Delete Recipe
        </button>
      </div>

      {/* Stock Modal */}
      {showStockModal&&(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-mise-surface border border-mise-border w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-start p-6 border-b border-mise-border">
              <div>
                <h3 className="font-fraunces font-light text-xl text-mise-text">Add to Stock</h3>
                <p className="text-xs text-mise-faint mt-1">Items already in stock are pre-deselected</p>
              </div>
              <button onClick={()=>setShowStockModal(false)} className="text-mise-faint hover:text-mise-dim text-xl">×</button>
            </div>
            <div className="overflow-auto flex-1 p-4 space-y-2">
              {stockIngs.map(ing=>(
                <button key={ing.id} onClick={()=>setStockIngs(prev=>prev.map(i=>i.id===ing.id?{...i,selected:!i.selected}:i))}
                  className={`w-full flex items-center gap-3 p-3 border text-left transition-colors ${ing.selected?'border-mise-gold bg-mise-gold/5':'border-mise-border opacity-50'}`}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${ing.selected?'bg-mise-gold border-mise-gold':'border-mise-border-light'}`}>
                    {ing.selected&&<span className="text-mise-bg text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-mise-text">{ing.name}</p>
                    {ing.exists&&<p className="text-xs text-mise-faint">Already in stock</p>}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-mise-border">
              <button onClick={addToStock} className="w-full bg-mise-gold text-mise-bg text-xs font-semibold tracking-widest uppercase py-3 hover:bg-yellow-400 transition-colors">
                Add {stockIngs.filter(i=>i.selected).length} to Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8 font-epilogue">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-fraunces font-light text-3xl text-mise-text mb-1">Recipe Library</h1>
          <p className="text-sm text-mise-faint">{state.recipes.length} recipe{state.recipes.length!==1?'s':''} saved</p>
        </div>
        <button onClick={()=>setShowAdd(true)} className="text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg px-5 py-2.5 hover:bg-yellow-400 transition-colors">
          + Add Recipe
        </button>
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search recipes..."
        className="w-full bg-mise-surface border border-mise-border text-mise-text text-sm px-4 py-3 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint mb-6" />

      {filtered.length===0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-mise-faint">No recipes yet. Add your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r:any)=>(
            <button key={r.id} onClick={()=>setSel(r)} className="text-left bg-mise-surface border border-mise-border p-5 hover:border-mise-gold hover:bg-mise-surface2 transition-colors group">
              <h3 className="font-fraunces font-light text-lg text-mise-text mb-2 group-hover:text-mise-gold transition-colors">{r.title}</h3>
              {r.imported?.description&&<p className="text-xs text-mise-faint mb-3 line-clamp-2">{r.imported.description}</p>}
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs font-bold tracking-widest uppercase text-mise-gold bg-mise-gold/10 border border-mise-gold/20 px-2 py-0.5">{r.category||'Other'}</span>
                {r.imported&&<span className="text-xs font-bold tracking-widest uppercase text-mise-faint bg-mise-surface3 border border-mise-border px-2 py-0.5">Imported</span>}
                {(r.linkedNoteIds||[]).length>0&&<span className="text-xs font-bold tracking-widest uppercase text-mise-faint bg-mise-surface3 border border-mise-border px-2 py-0.5">{r.linkedNoteIds.length} note{r.linkedNoteIds.length>1?'s':''}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd&&(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-mise-surface border border-mise-border w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-mise-border">
              <h3 className="font-fraunces font-light text-xl text-mise-text">Add Recipe</h3>
              <button onClick={()=>setShowAdd(false)} className="text-mise-faint hover:text-mise-dim text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              {tier==='pro'?(
                <div>
                  <label className="text-xs font-bold tracking-widest uppercase text-mise-faint block mb-2">Import from URL</label>
                  <div className="flex gap-2">
                    <input value={newUrl} onChange={e=>setNewUrl(e.target.value)} placeholder="https://..."
                      className="flex-1 bg-mise-surface2 border border-mise-border text-mise-text text-sm px-3 py-2 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
                    <button onClick={importUrl} disabled={!newUrl||importing}
                      className="text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg px-4 py-2 hover:bg-yellow-400 transition-colors disabled:opacity-40">
                      {importing?'...':'Import'}
                    </button>
                  </div>
                  {imported&&<p className="text-xs text-mise-green mt-2">✓ Recipe imported — {imported.ingredients?.length||0} ingredients</p>}
                </div>
              ):(
                <div className="bg-mise-gold/10 border border-mise-gold/20 p-3">
                  <p className="text-xs text-mise-gold">🔒 URL import is a Pro feature — upgrade to import recipes automatically</p>
                </div>
              )}
              <div>
                <label className="text-xs font-bold tracking-widest uppercase text-mise-faint block mb-2">Title</label>
                <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="e.g. Beef Bourguignon"
                  className="w-full bg-mise-surface2 border border-mise-border text-mise-text text-sm px-3 py-2 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
              </div>
              <div>
                <label className="text-xs font-bold tracking-widest uppercase text-mise-faint block mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATS.map(c=>(
                    <button key={c} onClick={()=>setNewCat(c)} className={`text-xs px-3 py-1.5 border transition-colors ${newCat===c?'border-mise-gold text-mise-gold bg-mise-gold/10':'border-mise-border text-mise-dim hover:border-mise-border-light'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold tracking-widest uppercase text-mise-faint block mb-2">Chef's Notes</label>
                <textarea value={newNotes} onChange={e=>setNewNotes(e.target.value)} placeholder="Your thoughts, variations..."
                  rows={3} className="w-full bg-mise-surface2 border border-mise-border text-mise-text text-sm px-3 py-2 focus:outline-none focus:border-mise-gold transition-colors resize-none placeholder-mise-faint" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-mise-border">
              <button onClick={()=>setShowAdd(false)} className="flex-1 text-xs font-medium tracking-widest uppercase border border-mise-border text-mise-dim py-2.5 hover:border-mise-border-light transition-colors">Cancel</button>
              <button onClick={save} disabled={!newTitle.trim()} className="flex-1 text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg py-2.5 hover:bg-yellow-400 transition-colors disabled:opacity-40">Save Recipe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}