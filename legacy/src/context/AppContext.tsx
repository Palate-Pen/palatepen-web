'use client';
import React,{createContext,useContext,useEffect,useReducer,useState,useRef}from 'react';
import{supabase}from'@/lib/supabase';
import{useAuth}from'./AuthContext';
import{migrateCategory}from'@/lib/categorize';
type SaveStatus='idle'|'saving'|'saved'|'error';
const DEFAULT_PROFILE={businessName:'',name:'',location:'',currency:'GBP',currencySymbol:'£',units:'metric',gpTarget:72,tier:'free',stockDay:1,stockFrequency:'weekly',tutorialDismissed:false};
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const init={recipes:[],notes:[],gpHistory:[],ingredientsBank:[],invoices:[],priceAlerts:[],stockItems:[],menus:[],wasteLog:[],profile:DEFAULT_PROFILE,ready:false};
function reducer(state:any,action:any):any{
  switch(action.type){
    case 'LOAD':return{...state,...action.data,ready:true};
    case 'ADD_RECIPE':return{...state,recipes:[action.item,...state.recipes]};
    case 'UPD_RECIPE':return{...state,recipes:state.recipes.map((r:any)=>r.id===action.id?{...r,...action.data}:r)};
    case 'DEL_RECIPE':{
      const menus=(state.menus||[]).map((m:any)=>{
        const recipeIds=(m.recipeIds||[]).filter((id:string)=>id!==action.id);
        const salesData={...(m.salesData||{})};delete salesData[action.id];
        return{...m,recipeIds,salesData};
      });
      return{...state,recipes:state.recipes.filter((r:any)=>r.id!==action.id),menus};
    }
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
    case 'ADD_MENU':return{...state,menus:[action.item,...(state.menus||[])]};
    case 'UPD_MENU':return{...state,menus:(state.menus||[]).map((m:any)=>m.id===action.id?{...m,...action.data,updatedAt:Date.now()}:m)};
    case 'DEL_MENU':return{...state,menus:(state.menus||[]).filter((m:any)=>m.id!==action.id)};
    case 'ADD_WASTE':return{...state,wasteLog:[action.item,...(state.wasteLog||[])]};
    case 'DEL_WASTE':return{...state,wasteLog:(state.wasteLog||[]).filter((w:any)=>w.id!==action.id)};
    case 'RESET':return init;
    default:return state;
  }
}
const Ctx=createContext<any>(null);
export function AppProvider({children}:{children:React.ReactNode}){
  const{user,currentAccount}=useAuth();
  const accountId=currentAccount?.id||null;
  const ownerUserId=currentAccount?.owner_user_id||null;
  const editorUserId=user?.id||null;
  const editorRef=useRef<string|null>(editorUserId);
  editorRef.current=editorUserId;
  const[state,dispatch]=useReducer(reducer,init);
  const[saveStatus,setSaveStatus]=useState<SaveStatus>('idle');
  const stateRef=useRef(state);
  stateRef.current=state;

  // Load user_data once per account_id. The legacy load was keyed by user.id;
  // multi-user means data lives at the account, so a Chef on their employer's
  // account reads/writes the owner's row. We deliberately depend on the id,
  // not the object reference — token refresh changes user/currentAccount
  // references but not their ids.
  useEffect(()=>{
    if(!accountId){dispatch({type:'RESET'});return;}
    let cancelled=false;
    dispatch({type:'RESET'});
    supabase.from('user_data').select('*').eq('account_id',accountId).maybeSingle().then(({data,error})=>{
      if(cancelled)return;
      if(error){console.error('[user_data load]',error.message,error.code);return;}
      if(data){
        const migrate=(arr:any[])=>arr.map(i=>i?.category?{...i,category:migrateCategory(i.category)}:i);
        dispatch({type:'LOAD',data:{recipes:data.recipes||[],notes:data.notes||[],gpHistory:data.gp_history||[],ingredientsBank:migrate(data.ingredients_bank||[]),invoices:data.invoices||[],priceAlerts:data.price_alerts||[],stockItems:migrate(data.stock_items||[]),menus:data.menus||[],wasteLog:data.waste_log||[],profile:{...DEFAULT_PROFILE,...(data.profile||{})}}});
      }else{
        // Trigger normally creates a row, but belt-and-braces in case it didn't fire.
        // user_id on the row is always the account owner, NOT necessarily the editor.
        const profile={...DEFAULT_PROFILE,name:currentAccount?.name||''};
        if(ownerUserId){
          supabase.from('user_data').insert({user_id:ownerUserId,account_id:accountId,recipes:[],notes:[],gp_history:[],ingredients_bank:[],invoices:[],price_alerts:[],stock_items:[],profile}).then(({error})=>{
            if(error)console.error('[user_data init]',error.message);
          });
        }
        dispatch({type:'LOAD',data:{profile}});
      }
    });
    return()=>{cancelled=true;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[accountId]);

  // Persist async with error handling. Always writes user_id = account owner so
  // the unique key resolves to the same physical row regardless of editor.
  async function persist(){
    if(!stateRef.current.ready||!accountId||!ownerUserId)return;
    setSaveStatus('saving');
    const s=stateRef.current;
    const{error}=await supabase.from('user_data').upsert({
      user_id:ownerUserId,
      account_id:accountId,
      recipes:s.recipes,notes:s.notes,gp_history:s.gpHistory,
      ingredients_bank:s.ingredientsBank,invoices:s.invoices,
      price_alerts:s.priceAlerts,stock_items:s.stockItems,
      menus:s.menus||[],waste_log:s.wasteLog||[],
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
    if(!state.ready||!accountId)return;
    const t=window.setTimeout(persist,500);
    return()=>window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[state,accountId]);

  // Flush pending writes when the tab becomes hidden (most common path before
  // a refresh / tab close). Best-effort — sendBeacon would be sync but doesn't
  // support the Supabase auth header, so a regular fetch is the next-best.
  useEffect(()=>{
    if(!accountId)return;
    const onHide=()=>{ if(document.visibilityState==='hidden'&&stateRef.current.ready) persist(); };
    document.addEventListener('visibilitychange',onHide);
    return()=>document.removeEventListener('visibilitychange',onHide);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[accountId]);

  // Re-read PROFILE on tab focus so admin edits to tier/comp/featureOverrides/
  // name surface without a sign-out. We deliberately do NOT re-read the
  // content arrays (recipes/notes/etc) on focus — those have a 500ms
  // debounced autosave running locally and a remote re-read would clobber
  // any unsaved edits. Admin can only change profile fields anyway.
  useEffect(()=>{
    if(!accountId)return;
    const onShow=async()=>{
      if(document.visibilityState!=='visible')return;
      if(!stateRef.current.ready)return;
      const{data,error}=await supabase.from('user_data').select('profile').eq('account_id',accountId).maybeSingle();
      if(error){console.error('[profile refresh]',error.message);return;}
      if(data?.profile&&typeof data.profile==='object')dispatch({type:'UPD_PROFILE',data:data.profile});
    };
    document.addEventListener('visibilitychange',onShow);
    return()=>document.removeEventListener('visibilitychange',onShow);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[accountId]);
  // editor() reads via ref so token-refresh user-object swaps don't tear
  // the addedBy stamp. Stored on every newly-created item to power the
  // owner-only My Team contributions view.
  const editor=()=>editorRef.current;
  const actions={
    addRecipe:(d:any)=>dispatch({type:'ADD_RECIPE',item:{id:uid(),tags:[],linkedNoteIds:[],notes:'',url:'',createdAt:Date.now(),addedBy:editor(),...d}}),
    updRecipe:(id:string,data:any)=>dispatch({type:'UPD_RECIPE',id,data}),
    delRecipe:(id:string)=>dispatch({type:'DEL_RECIPE',id}),
    addNote:(d:any)=>{const item={id:uid(),title:'New Idea',content:'',linkedRecipeIds:[],createdAt:Date.now(),addedBy:editor(),...d};dispatch({type:'ADD_NOTE',item});return item;},
    updNote:(id:string,data:any)=>dispatch({type:'UPD_NOTE',id,data}),
    delNote:(id:string)=>dispatch({type:'DEL_NOTE',id}),
    addGP:(d:any)=>dispatch({type:'ADD_GP',item:{id:uid(),savedAt:Date.now(),addedBy:editor(),...d}}),
    updGP:(id:string,data:any)=>dispatch({type:'UPD_GP',id,data}),
    delGP:(id:string)=>dispatch({type:'DEL_GP',id}),
    updProfile:(data:any)=>dispatch({type:'UPD_PROFILE',data}),
    addStock:(d:any)=>dispatch({type:'ADD_STOCK',item:{id:uid(),createdAt:Date.now(),currentQty:null,addedBy:editor(),...d}}),
    updStock:(id:string,data:any)=>dispatch({type:'UPD_STOCK',id,data}),
    delStock:(id:string)=>dispatch({type:'DEL_STOCK',id}),
    upsertBank:(items:any[])=>dispatch({type:'UPSERT_BANK',items:items.map((it:any)=>({addedBy:editor(),...it}))}),
    updBank:(id:string,data:any)=>dispatch({type:'UPD_BANK',id,data}),
    delBank:(id:string)=>dispatch({type:'DEL_BANK',id}),
    addBank:(d:any)=>dispatch({type:'UPSERT_BANK',items:[{name:d.name,unit:d.unit||'kg',category:d.category||'Other',unitPrice:d.unitPrice??null,allergens:d.allergens||{contains:[],nutTypes:[],glutenTypes:[]},nutrition:d.nutrition||{},addedBy:editor()}]}),
    addInvoice:(d:any)=>dispatch({type:'ADD_INVOICE',item:{id:uid(),addedBy:editor(),...d}}),
    delInvoice:(id:string)=>dispatch({type:'DEL_INVOICE',id}),
    addAlerts:(items:any[])=>dispatch({type:'ADD_ALERTS',items}),
    addMenu:(d:any)=>dispatch({type:'ADD_MENU',item:{id:uid(),name:d.name||'Untitled menu',description:d.description||'',recipeIds:d.recipeIds||[],createdAt:Date.now(),updatedAt:Date.now(),addedBy:editor()}}),
    updMenu:(id:string,data:any)=>dispatch({type:'UPD_MENU',id,data}),
    delMenu:(id:string)=>dispatch({type:'DEL_MENU',id}),
    addWaste:(d:any)=>dispatch({type:'ADD_WASTE',item:{id:uid(),createdAt:Date.now(),addedBy:editor(),...d}}),
    delWaste:(id:string)=>dispatch({type:'DEL_WASTE',id}),
  };
  return <Ctx.Provider value={{state,actions,saveStatus}}>{children}</Ctx.Provider>;
}
export const useApp=()=>useContext(Ctx);