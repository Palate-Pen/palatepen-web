import{NextRequest,NextResponse}from'next/server';
export async function POST(req:NextRequest){
  try{
    const{base64,mediaType,apiKey}=await req.json();
    if(!base64||!apiKey)return NextResponse.json({error:'Missing data or API key'},{status:400});
    const contentBlock=mediaType==='application/pdf'
      ?{type:'document',source:{type:'base64',media_type:mediaType,data:base64}}
      :{type:'image',source:{type:'base64',media_type:mediaType,data:base64}};
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-opus-4-5',max_tokens:2000,
        messages:[{role:'user',content:[
          contentBlock,
          {type:'text',text:'Extract all food ingredients from this supplier invoice. Return ONLY a JSON array with no markdown. Each item must have these exact fields: {"name":"","qty":0,"unit":"","unitPrice":0,"totalPrice":0}. If nothing found return [].'}
        ]}]
      }),
    });
    const data=await res.json();
    const text=(data.content?.[0]?.text||'[]').replace(/```json|```/g,'').trim();
    try{const items=JSON.parse(text);return NextResponse.json({items});}
    catch{return NextResponse.json({items:[]});}
  }catch(e){return NextResponse.json({error:'Scan failed'},{status:500});}
}