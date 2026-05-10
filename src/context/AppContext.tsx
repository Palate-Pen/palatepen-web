'use client';
import React,{createContext,useContext,useEffect,useReducer}from 'react';
import{supabase}from'@/lib/supabase';
import{useAuth}from'./AuthContext';
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
  const[state,dispatch]=useReducer(reducer,init);
  useEffect(()=>{
    if(!user){dispatch({type:'LOAD',data:{}});return;}
    supabase.from('user_data').select('*').eq('user_id',user.id).single().then(({data})=>{
      if(data){dispatch({type:'LOAD',data:{recipes:data.recipes||[],notes:data.notes||[],gpHistory:data.gp_history||[],ingredientsBank:data.ingredients_bank||[],invoices:data.invoices||[],priceAlerts:data.price_alerts||[],stockItems:data.stock_items||[],profile:{...DEFAULT_PROFILE,...(data.profile||{})}}});}
      else{const profile={...DEFAULT_PROFILE,name:user.user_metadata?.name||''};supabase.from('user_data').insert({user_id:user.id,recipes:[],notes:[],gp_history:[],ingredients_bank:[],invoices:[],price_alerts:[],stock_items:[],profile});dispatch({type:'LOAD',data:{profile}});}
    });
  },[user]);
  useEffect(()=>{
    if(!state.ready||!user)return;
    const t=setTimeout(()=>{supabase.from('user_data').upsert({user_id:user.id,recipes:state.recipes,notes:state.notes,gp_history:state.gpHistory,ingredients_bank:state.ingredientsBank,invoices:state.invoices,price_alerts:state.priceAlerts,stock_items:state.stockItems,profile:state.profile,updated_at:new Date().toISOString()},{onConflict:'user_id'});},2000);
    return()=>clearTimeout(t);
  },[state,user]);
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
    delBank:(id:string)=>dispatch({type:'DEL_BANK',id}),
    addInvoice:(d:any)=>dispatch({type:'ADD_INVOICE',item:{id:uid(),...d}}),
    delInvoice:(id:string)=>dispatch({type:'DEL_INVOICE',id}),
    addAlerts:(items:any[])=>dispatch({type:'ADD_ALERTS',items}),
  };
  return <Ctx.Provider value={{state,actions}}>{children}</Ctx.Provider>;
}
export const useApp=()=>useContext(Ctx);