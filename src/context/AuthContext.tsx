'use client';
import React,{createContext,useContext,useEffect,useState}from 'react';
import{supabase}from'@/lib/supabase';
import type{User}from'@supabase/supabase-js';
interface AuthCtxType{user:User|null;loading:boolean;tier:string;signIn:(e:string,p:string)=>Promise<void>;signUp:(e:string,p:string,n:string)=>Promise<void>;signOut:()=>Promise<void>;}
const AuthCtx=createContext<AuthCtxType|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){
  const[user,setUser]=useState<User|null>(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setUser(session?.user??null);setLoading(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{setUser(session?.user??null);});
    return()=>subscription.unsubscribe();
  },[]);
  async function signIn(email:string,password:string){const{error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
  async function signUp(email:string,password:string,name:string){const{error}=await supabase.auth.signUp({email,password,options:{data:{name,tier:'free'}}});if(error)throw error;}
  async function signOut(){await supabase.auth.signOut();}
  const tier=user?.user_metadata?.tier||'free';
  return <AuthCtx.Provider value={{user,loading,tier,signIn,signUp,signOut}}>{children}</AuthCtx.Provider>;
}
export const useAuth=()=>{const ctx=useContext(AuthCtx);if(!ctx)throw new Error('useAuth outside AuthProvider');return ctx;};