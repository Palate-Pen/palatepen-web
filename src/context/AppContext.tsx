'use client';
import React,{createContext,useContext,useEffect,useReducer,useState,useRef}from 'react';
import{supabase}from'@/lib/supabase';
import{useAuth}from'./AuthContext';
import{migrateCategory}from'@/lib/categorize';
type SaveStatus='idle'|'saving'|'saved'|'error';
const DEFAULT_PROFILE={name:'',location:'',currency:'GBP',currencySymbol:'£',units:'metric',gpTarget:72,tier:'free',stockDay:1,stockFrequency:'weekly'};
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const init={recipes:[],notes:[],gpHistory:[],ingredientsBank:[],invoices:[],priceAlerts:[],stockItems:[],profile:DEFAULT_PROFILE,ready:false};
function reducer(state:any,action:any):any{
  switch(action.type){
    case 'LOAD':return{...state,...action.data,ready:true};
    case 'ADD_RECIPE':return{...state,recipes:[action.item,...state.recipes]};
    case 'UPD_RECIPE':return{...state,recipes:state.recipes.map((r:any)=>r.id===action.id?{...r,...action.data}:r)};
    case 'DEL_RECIPE':return{...state,recipes:state.recipes.filter((r:any)=>r.id!==action.id)};
    case 'ADD_NOTE':return{...state,notes:[action.item,...state.notes]};
    case 'UPD_NOTE':return{...state,notes:state.notes.map((n:any)=>n.id===action.id?{...n,...action.data}:n)};
    case 'DEL_NOTE':return{...state,notes:state.notes.filter((n:any)=>n.id!==action.id)};
    case 'ADD_GP':return{...state,gpHistory:[action.item,...state.gpHistory].slice(0,50)};
    case 'UPD_GP':return{...state,gpHistory:state.gpHistory.map((g:any)=>g.id===action.id?{...g,...action.data}:g)};
    case 'DEL_GP':return{...state,gpHistory:state.gpHistory.filter((g:any)=>g.id!==action.id)};
    case 'UPD_PROFILE':return{...state,profile:{...state.profile,...action.data}};
    case 'ADD_STOCK':return{...state,stockItems:[action.item,...state.stockItems]};
    case 'UPD_STOCK':return{...state,stockItems:state.stockItems.map((i:any)=>i.id===action.id?{...i,...action.data}:i)};
    case 'DEL_STOCK':return{...state,stockItems:state.stockItems.filter((i:any)=>i.id!==action.id)};
    case 'UPSERT_BANK':{
      const bank=[...state.ingredientsBank];
      action.items.forEach((item:any)=>{const idx=bank.findIndex((e:any)=>e.name.toLowerCase()===item.name.toLowerCase());if(idx>=0)bank[idx]={...bank[idx],...item};else bank.push({id:uid(),...item});});
      return{...state,ingredientsBank:bank};
    }
    case 'UPD_BANK':return{...state,ingredientsBank:state.ingredientsBank.map((i:any)=>i.id===action.id?{...i,...action.data}:i)};
    case 'DEL_BANK':return{...state,ingredientsBank:state.ingredientsBank.filter((i:any)=>i.id!==action.id)};
    case 'ADD_INVOICE':return{...state,invoices:[action.item,...state.invoices]};
    case 'DEL_INVOICE':return{...state,invoices:state.invoices.filter((i:any)=>i.id!==action.id)};
    case 'ADD_ALERTS':return{...state,priceAlerts:[...action.items,...state.priceAlerts].slice(0,50)};
    default:return state;
  }
}
const Ctx=createContext<any>(null);
export function AppProvider({children}:{children:React.ReactNode}){
  const{user}=useAuth();
  const userId=user?.id;
  const[state,dispatch]=useReducer(reducer,init);
  const[saveStatus,setSaveStatus]=useState<SaveStatus>('idle');
  const stateRef=useRef(state);
  stateRef.current=state;

  // Load user_data once per user_id (NOT on every auth event — token refresh
  // changes the user object reference, which previously re-loaded and
  // overwrote unsaved local edits).
  useEffect(()=>{
    if(!userId){dispatch({type:'LOAD',data:{}});return;}
    let cancelled=false;
    supabase.from('user_data').select('*').eq('user_id',userId).maybeSingle().then(({data,error})=>{
      if(cancelled)return;
      if(error){console.error('[user_data load]',error.message,error.code);return;}
      if(data){
        const migrate=(arr:any[])=>arr.map(i=>i?.category?{...i,category:migrateCategory(i.category)}:i);
        dispatch({type:'LOAD',data:{recipes:data.recipes||[],notes:data.notes||[],gpHistory:data.gp_history||[],ingredientsBank:migrate(data.ingredients_bank||[]),invoices:data.invoices||[],priceAlerts:data.price_alerts||[],stockItems:migrate(data.stock_items||[]),profile:{...DEFAULT_PROFILE,...(data.profile||{})}}});
      }else{
        // Trigger normally creates a row, but belt-and-braces in case it didn't fire
        const profile={...DEFAULT_PROFILE,name:user?.user_metadata?.name||''};
        supabase.from('user_data').insert({user_id:userId,recipes:[],notes:[],gp_history:[],ingredients_bank:[],invoices:[],price_alerts:[],stock_items:[],profile}).then(({error})=>{
          if(error)console.error('[user_data init]',error.message);
        });
        dispatch({type:'LOAD',data:{profile}});
      }
    });
    return()=>{cancelled=true;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[userId]);

  // Persist async with error handling. Shorter debounce so refresh-after-edit
  // is much less likely to lose changes.
  async function persist(){
    if(!stateRef.current.ready||!userId)return;
    setSaveStatus('saving');
    const s=stateRef.current;
    const{error}=await supabase.from('user_data').upsert({
      user_id:userId,
      recipes:s.recipes,notes:s.notes,gp_history:s.gpHistory,
      ingredients_bank:s.ingredientsBank,invoices:s.invoices,
      price_alerts:s.priceAlerts,stock_items:s.stockItems,
      profile:s.profile,updated_at:new Date().toISOString(),
    },{onConflict:'user_id'});
    if(error){
      console.error('[user_data save]',error.code,error.message);
      setSaveStatus('error');
    }else{
      setSaveStatus('saved');
      window.setTimeout(()=>setSaveStatus(s2=>s2==='saved'?'idle':s2),1500);
    }
  }

  useEffect(()=>{
    if(!state.ready||!userId)return;
    const t=window.setTimeout(persist,500);
    return()=>window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[state,userId]);

  // Flush pending writes when the tab becomes hidden (most common path before
  // a refresh / tab close). Best-effort — sendBeacon would be sync but doesn't
  // support the Supabase auth header, so a regular fetch is the next-best.
  useEffect(()=>{
    if(!userId)return;
    const onHide=()=>{ if(document.visibilityState==='hidden'&&stateRef.current.ready) persist(); };
    document.addEventListener('visibilitychange',onHide);
    return()=>document.removeEventListener('visibilitychange',onHide);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[userId]);
  const actions={
    addRecipe:(d:any)=>dispatch({type:'ADD_RECIPE',item:{id:uid(),tags:[],linkedNoteIds:[],notes:'',url:'',createdAt:Date.now(),...d}}),
    updRecipe:(id:string,data:any)=>dispatch({type:'UPD_RECIPE',id,data}),
    delRecipe:(id:string)=>dispatch({type:'DEL_RECIPE',id}),
    addNote:(d:any)=>{const item={id:uid(),title:'New Idea',content:'',linkedRecipeIds:[],createdAt:Date.now(),...d};dispatch({type:'ADD_NOTE',item});return item;},
    updNote:(id:string,data:any)=>dispatch({type:'UPD_NOTE',id,data}),
    delNote:(id:string)=>dispatch({type:'DEL_NOTE',id}),
    addGP:(d:any)=>dispatch({type:'ADD_GP',item:{id:uid(),savedAt:Date.now(),...d}}),
    updGP:(id:string,data:any)=>dispatch({type:'UPD_GP',id,data}),
    delGP:(id:string)=>dispatch({type:'DEL_GP',id}),
    updProfile:(data:any)=>dispatch({type:'UPD_PROFILE',data}),
    addStock:(d:any)=>dispatch({type:'ADD_STOCK',item:{id:uid(),createdAt:Date.now(),currentQty:null,...d}}),
    updStock:(id:string,data:any)=>dispatch({type:'UPD_STOCK',id,data}),
    delStock:(id:string)=>dispatch({type:'DEL_STOCK',id}),
    upsertBank:(items:any[])=>dispatch({type:'UPSERT_BANK',items}),
    updBank:(id:string,data:any)=>dispatch({type:'UPD_BANK',id,data}),
    delBank:(id:string)=>dispatch({type:'DEL_BANK',id}),
    addBank:(d:any)=>dispatch({type:'UPSERT_BANK',items:[{name:d.name,unit:d.unit||'kg',category:d.category||'Other',unitPrice:d.unitPrice??null,allergens:d.allergens||{contains:[],nutTypes:[],glutenTypes:[]},nutrition:d.nutrition||{}}]}),
    addInvoice:(d:any)=>dispatch({type:'ADD_INVOICE',item:{id:uid(),...d}}),
    delInvoice:(id:string)=>dispatch({type:'DEL_INVOICE',id}),
    addAlerts:(items:any[])=>dispatch({type:'ADD_ALERTS',items}),
  };
  return <Ctx.Provider value={{state,actions,saveStatus}}>{children}</Ctx.Provider>;
}
export const useApp=()=>useContext(Ctx);