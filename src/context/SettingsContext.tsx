'use client';
import React,{createContext,useContext,useState,useEffect} from 'react';
interface Settings{theme:'dark'|'light'|'system';fontSize:'sm'|'md'|'lg';resolved:'dark'|'light';}
const defaults:Settings={theme:'dark',fontSize:'md',resolved:'dark'};
const Ctx=createContext<{settings:Settings;update:(s:Partial<Settings>)=>void}>({settings:defaults,update:()=>{}});
export function SettingsProvider({children}:{children:React.ReactNode}){
  const[settings,setSettings]=useState<Settings>(defaults);
  useEffect(()=>{const saved=localStorage.getItem('mise_settings');if(saved)setSettings(JSON.parse(saved));},[]);
  function update(s:Partial<Settings>){
    setSettings(prev=>{
      const next={...prev,...s};
      if(next.theme==='system'){next.resolved=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
      else{next.resolved=next.theme as 'dark'|'light';}
      localStorage.setItem('mise_settings',JSON.stringify(next));
      return next;
    });
  }
  return <Ctx.Provider value={{settings,update}}>{children}</Ctx.Provider>;
}
export const useSettings=()=>useContext(Ctx);