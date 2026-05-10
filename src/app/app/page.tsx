'use client';
import{useAuth}from'@/context/AuthContext';
import{useApp}from'@/context/AppContext';
import{useSettings}from'@/context/SettingsContext';
import{useState,useEffect}from'react';
import{dark,light,fontSizes}from'@/lib/theme';
import AuthPage from'./components/AuthPage';
import Sidebar from'./components/Sidebar';
import RecipesView from'./components/RecipesView';
import NotebookView from'./components/NotebookView';
import CostingView from'./components/CostingView';
import InvoicesView from'./components/InvoicesView';
import StockView from'./components/StockView';
import ProfileView from'./components/ProfileView';
import SettingsView from'./components/SettingsView';

export default function App(){
  const{user,loading}=useAuth();
  const{state}=useApp();
  const{settings}=useSettings();
  const[tab,setTab]=useState('recipes');
  const C=settings.resolved==='light'?light:dark;
  const F=fontSizes[settings.fontSize];

  useEffect(()=>{
    const vars:Record<string,string>={
      '--mise-bg':C.bg,'--mise-surface':C.surface,'--mise-surface2':C.surface2,'--mise-surface3':C.surface3,
      '--mise-text':C.text,'--mise-dim':C.dim,'--mise-faint':C.faint,'--mise-gold':C.gold,
      '--mise-border':C.border,'--mise-border-light':C.borderLight,'--mise-red':C.red,
      '--mise-green':C.green,'--mise-green-light':C.greenLight,'--mise-gold-dim':C.goldDim,
      '--f-xs':F.xs,'--f-sm':F.sm,'--f-base':F.base,'--f-lg':F.lg,'--f-xl':F.xl,'--f-2xl':F['2xl'],'--f-3xl':F['3xl'],
    };
    Object.entries(vars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
  },[C,F]);

  if(loading||!state.ready)return(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
          <span style={{fontFamily:'Georgia,serif',fontWeight:700,fontStyle:'italic',color:C.text,fontSize:'36px',letterSpacing:'-2px'}}>M</span>
          <div style={{width:'10px',height:'10px',borderRadius:'50%',background:C.gold,marginBottom:'12px'}}></div>
          <span style={{fontFamily:'Georgia,serif',fontWeight:300,color:C.text,fontSize:'36px',letterSpacing:'8px'}}>ISE</span>
        </div>
      </div>
    </div>
  );

  if(!user)return<AuthPage/>;

  const views:Record<string,React.ReactNode>={
    recipes:<RecipesView/>,notebook:<NotebookView/>,costing:<CostingView/>,
    invoices:<InvoicesView/>,stock:<StockView/>,profile:<ProfileView/>,settings:<SettingsView/>,
  };

  return(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',fontFamily:'system-ui,sans-serif'}}>
      <Sidebar tab={tab} setTab={setTab}/>
      <main style={{flex:1,marginLeft:'224px',minHeight:'100vh',overflow:'auto',color:C.text}}>
        {views[tab]||<RecipesView/>}
      </main>
    </div>
  );
}