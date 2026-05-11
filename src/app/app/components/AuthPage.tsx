'use client';
import{useState}from'react';
import{useAuth}from'@/context/AuthContext';
import{dark}from'@/lib/theme';
const C=dark;
export default function AuthPage(){
  const{signIn,signUp}=useAuth();
  const[mode,setMode]=useState<'landing'|'signin'|'signup'>('landing');
  const[name,setName]=useState('');
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[showPw,setShowPw]=useState(false);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  const[success,setSuccess]=useState('');
  const inp={width:'100%',background:C.surface,border:'1px solid '+C.border,color:C.text,fontSize:'14px',padding:'12px 14px',outline:'none',fontFamily:'system-ui,sans-serif',boxSizing:'border-box' as const};

  async function handleSignIn(){
    if(!email||!password){setError('Please fill in all fields');return;}
    setLoading(true);setError('');
    try{await signIn(email,password);}catch(e:any){setError(e.message||'Sign in failed');}
    setLoading(false);
  }
  async function handleSignUp(){
    if(!name||!email||!password){setError('Please fill in all fields');return;}
    if(password.length<6){setError('Password must be at least 6 characters');return;}
    setLoading(true);setError('');
    try{await signUp(email,password,name);setSuccess('Check your email to confirm, then sign in.');setMode('signin');}
    catch(e:any){setError(e.message||'Sign up failed');}
    setLoading(false);
  }

  if(mode==='landing')return(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',flexDirection:'column',fontFamily:'system-ui,sans-serif',color:C.text}}>
      <nav style={{padding:'20px 40px',borderBottom:'1px solid '+C.border,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <Logo/>
        <button onClick={()=>setMode('signin')} style={{fontSize:'11px',color:C.dim,background:'none',border:'none',cursor:'pointer',letterSpacing:'1px',textTransform:'uppercase'}}>Sign In</button>
      </nav>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 24px',gap:'40px',maxWidth:'860px',margin:'0 auto',width:'100%'}}>
        <div style={{textAlign:'center'}}>
          <p style={{fontSize:'11px',color:C.gold,letterSpacing:'2px',textTransform:'uppercase',marginBottom:'16px'}}>By Palate &amp; Pen</p>
          <h1 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'clamp(32px,5vw,56px)',color:C.text,lineHeight:1.1,marginBottom:'16px'}}>The professional<br/><i style={{color:C.gold}}>chef&apos;s toolkit</i></h1>
          <p style={{fontSize:'15px',color:C.dim,maxWidth:'400px',lineHeight:1.7,margin:'0 auto 32px'}}>Recipe library, costing calculator, invoice scanning, and stock management.</p>
          <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>setMode('signup')} style={{fontSize:'12px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',background:C.gold,color:C.bg,padding:'14px 28px',border:'none',cursor:'pointer'}}>Get Started Free</button>
            <button onClick={()=>setMode('signin')} style={{fontSize:'12px',letterSpacing:'1px',textTransform:'uppercase',background:'transparent',color:C.dim,padding:'14px 28px',border:'1px solid '+C.border,cursor:'pointer'}}>Sign In</button>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',width:'100%',maxWidth:'480px'}}>
          {[{tier:'Free',price:'£0',desc:'5 recipes, basic costing, 10 notebook ideas',hl:false},{tier:'Pro',price:'£25/mo',desc:'Unlimited recipes, AI invoice scanning, stock & menu builder — or £249/yr',hl:true}].map(t=>(
            <div key={t.tier} style={{border:t.hl?'1px solid '+C.gold+'50':'1px solid '+C.border,background:t.hl?C.gold+'08':C.surface,padding:'20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:t.hl?C.gold:C.faint}}>{t.tier}</span>
                <span style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'20px',color:t.hl?C.gold:C.text}}>{t.price}</span>
              </div>
              <p style={{fontSize:'11px',color:C.faint,lineHeight:1.5}}>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',fontFamily:'system-ui,sans-serif'}}>
      <div style={{width:'100%',maxWidth:'380px'}}>
        <div style={{marginBottom:'40px'}}><Logo/></div>
        <h2 style={{fontFamily:'Georgia,serif',fontWeight:300,fontSize:'26px',color:C.text,marginBottom:'6px'}}>{mode==='signin'?'Welcome back':'Create account'}</h2>
        <p style={{fontSize:'13px',color:C.faint,marginBottom:'32px'}}>{mode==='signin'?'Sign in to Palatable':'Start free — upgrade anytime'}</p>
        {error&&<div style={{background:'rgba(200,64,64,0.1)',border:'1px solid rgba(200,64,64,0.3)',color:C.red,fontSize:'13px',padding:'10px 14px',marginBottom:'16px',borderRadius:'2px'}}>{error}</div>}
        {success&&<div style={{background:'rgba(74,138,90,0.1)',border:'1px solid rgba(74,138,90,0.3)',color:C.greenLight,fontSize:'13px',padding:'10px 14px',marginBottom:'16px',borderRadius:'2px'}}>{success}</div>}
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          {mode==='signup'&&<Field label="Your Name" value={name} onChange={setName} placeholder="Jack Harrison"/>}
          <Field label="Email" value={email} onChange={setEmail} placeholder="hello@example.com" type="email"/>
          <div>
            <label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:C.faint,display:'block',marginBottom:'6px'}}>Password</label>
            <div style={{display:'flex',border:'1px solid '+C.border,background:C.surface}}>
              <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" style={{...inp,flex:1,border:'none'}}/>
              <button onClick={()=>setShowPw(v=>!v)} style={{padding:'0 14px',background:'none',border:'none',color:C.faint,fontSize:'11px',cursor:'pointer'}}>{showPw?'Hide':'Show'}</button>
            </div>
          </div>
        </div>
        <button onClick={mode==='signin'?handleSignIn:handleSignUp} disabled={loading}
          style={{width:'100%',marginTop:'20px',background:C.gold,color:C.bg,fontSize:'12px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',padding:'14px',border:'none',cursor:'pointer',opacity:loading?0.6:1}}>
          {loading?'...':(mode==='signin'?'Sign In':'Create Account')}
        </button>
        <button onClick={()=>setMode(mode==='signin'?'signup':'signin')} style={{width:'100%',marginTop:'12px',background:'none',border:'none',color:C.faint,fontSize:'13px',cursor:'pointer',padding:'8px'}}>
          {mode==='signin'?'No account? Sign up free':'Already have an account? Sign in'}
        </button>
        <button onClick={()=>setMode('landing')} style={{width:'100%',background:'none',border:'none',color:C.faint,fontSize:'12px',cursor:'pointer',padding:'4px'}}>← Back</button>
      </div>
    </div>
  );
}
function Logo(){
  return(
    <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
      <span style={{fontFamily:'Georgia,serif',fontWeight:700,fontStyle:'italic',color:dark.text,fontSize:'26px',letterSpacing:'-1px'}}>P</span>
      <div style={{width:'7px',height:'7px',borderRadius:'50%',background:dark.gold,marginBottom:'9px'}}></div>
      <span style={{fontFamily:'Georgia,serif',fontWeight:300,color:dark.text,fontSize:'26px',letterSpacing:'5px'}}>ALATABLE</span>
    </div>
  );
}
function Field({label,value,onChange,placeholder,type='text'}:any){
  return(
    <div>
      <label style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:dark.faint,display:'block',marginBottom:'6px'}}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:'100%',background:dark.surface,border:'1px solid '+dark.border,color:dark.text,fontSize:'14px',padding:'12px 14px',outline:'none',fontFamily:'system-ui,sans-serif',boxSizing:'border-box'}}/>
    </div>
  );
}