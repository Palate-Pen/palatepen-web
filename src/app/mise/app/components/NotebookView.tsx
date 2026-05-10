'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function NotebookView() {
  const { state, actions } = useApp();
  const [sel, setSel] = useState<any>(null);
  const [search, setSearch] = useState('');

  const filtered = state.notes.filter((n:any) =>
    (n.title||'').toLowerCase().includes(search.toLowerCase()) ||
    (n.content||'').toLowerCase().includes(search.toLowerCase())
  );

  function createNote() {
    const note = actions.addNote({});
    setSel(note);
  }

  if (sel) return (
    <div className="p-8 font-epilogue max-w-3xl">
      <button onClick={()=>setSel(null)} className="flex items-center gap-2 text-mise-gold text-sm mb-6 hover:text-yellow-400 transition-colors">
        ← Notebook
      </button>
      <input value={sel.title} onChange={e=>{ actions.updNote(sel.id,{title:e.target.value}); setSel({...sel,title:e.target.value}); }}
        placeholder="Idea title..."
        className="w-full bg-transparent font-fraunces font-light text-4xl text-mise-text border-b border-mise-border pb-3 mb-8 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
      <textarea value={sel.content} onChange={e=>{ actions.updNote(sel.id,{content:e.target.value}); setSel({...sel,content:e.target.value}); }}
        placeholder={"Write freely...\n\nFlavour pairings, techniques, menu concepts."}
        className="w-full bg-transparent text-mise-text text-base leading-8 focus:outline-none resize-none placeholder-mise-faint min-h-[400px]" />
      {state.recipes.length>0&&(
        <div className="mt-8 border-t border-mise-border pt-6">
          <p className="text-xs font-bold tracking-widest uppercase text-mise-faint mb-3">Link to Recipes</p>
          <div className="flex flex-wrap gap-2">
            {state.recipes.map((r:any)=>{
              const linked=(sel.linkedRecipeIds||[]).includes(r.id);
              return (
                <button key={r.id} onClick={()=>{
                  const ids=linked?(sel.linkedRecipeIds||[]).filter((id:string)=>id!==r.id):[...(sel.linkedRecipeIds||[]),r.id];
                  actions.updNote(sel.id,{linkedRecipeIds:ids});
                  setSel({...sel,linkedRecipeIds:ids});
                }} className={`text-xs px-3 py-1.5 border transition-colors ${linked?'border-mise-gold text-mise-gold bg-mise-gold/10':'border-mise-border text-mise-dim hover:border-mise-border-light'}`}>
                  {linked?'✓ ':''}{r.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <button onClick={()=>{ if(confirm('Delete this note?')) { actions.delNote(sel.id); setSel(null); } }}
        className="mt-8 text-xs font-bold tracking-widest uppercase text-mise-red border border-mise-red px-4 py-2 hover:bg-red-900/20 transition-colors">
        Delete Note
      </button>
    </div>
  );

  return (
    <div className="p-8 font-epilogue">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-fraunces font-light text-3xl text-mise-text mb-1">Idea Notebook</h1>
          <p className="text-sm text-mise-faint">{state.notes.length} idea{state.notes.length!==1?'s':''} saved</p>
        </div>
        <button onClick={createNote} className="text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg px-5 py-2.5 hover:bg-yellow-400 transition-colors">
          + New Note
        </button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search notes..."
        className="w-full bg-mise-surface border border-mise-border text-mise-text text-sm px-4 py-3 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint mb-6" />
      {filtered.length===0?(
        <div className="text-center py-20">
          <p className="text-4xl mb-4">📓</p>
          <p className="text-mise-faint">No ideas yet. Tap + New Note to start.</p>
        </div>
      ):(
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((n:any)=>(
            <button key={n.id} onClick={()=>setSel(n)} className="text-left bg-mise-surface border border-mise-border p-5 hover:border-mise-gold hover:bg-mise-surface2 transition-colors group">
              <h3 className="font-fraunces font-light text-lg text-mise-text mb-2 group-hover:text-mise-gold transition-colors">{n.title||'Untitled'}</h3>
              {n.content&&<p className="text-xs text-mise-faint line-clamp-3 leading-relaxed">{n.content}</p>}
              {(n.linkedRecipeIds||[]).length>0&&<p className="text-xs text-mise-faint mt-3">Linked to {n.linkedRecipeIds.length} recipe{n.linkedRecipeIds.length>1?'s':''}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}