// يشغّل سكربت التطبيق (index.html) داخل Node بواجهة DOM وهمية، لنستعمل نفس دوال الحساب والردود (tgHandleText…)
// بلا تكرار للمنطق. يُستخدم من bot/bot.js (GitHub Actions) ومن الاختبارات.
const fs=require("fs"), path=require("path"), vm=require("vm");
function makeProxy(){
  const fn=function(){ return P; };
  const P=new Proxy(fn,{
    get(t,prop){
      if(prop==="then"||prop===Symbol.toPrimitive||prop==="valueOf"||prop==="toString") return prop==="then"?undefined:()=>"";
      if(prop==="length") return 0;
      if(prop==="querySelectorAll"||prop==="getElementsByClassName"||prop==="children"||prop==="files") return ()=>[];
      if(prop==="getBoundingClientRect") return ()=>({left:0,top:0,width:0,height:0,right:0,bottom:0});
      if(prop==="classList") return {add(){},remove(){},toggle(){},contains(){return false;}};
      if(prop==="dataset") return new Proxy({},{get:()=>"",set:()=>true});
      if(prop==="style") return new Proxy({},{get:(t,k)=>(k==="setProperty"||k==="removeProperty"||k==="getPropertyValue")?()=>"":"",set:()=>true});
      if(prop==="value"||prop==="textContent"||prop==="innerHTML"||prop==="className") return "";
      if(prop==="checked"||prop==="disabled"||prop==="hidden") return false;
      return P;
    },
    set(){ return true; }, has(){ return true; }, apply(){ return P; }, construct(){ return {}; }
  });
  return P;
}
function createApp(html){
  html=html||fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  const main=scripts.reduce((a,b)=>a.length>=b.length?a:b); // أكبر سكربت = التطبيق
  const el=makeProxy();
  const store={}; const localStorage={ getItem:k=>(k in store?store[k]:null), setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  const doc=new Proxy({},{ get(t,prop){
    if(prop==="getElementById"||prop==="querySelector"||prop==="createElement"||prop==="createElementNS") return ()=>el;
    if(prop==="querySelectorAll"||prop==="getElementsByClassName") return ()=>[];
    if(prop==="body"||prop==="documentElement"||prop==="head") return el;
    if(prop==="addEventListener"||prop==="removeEventListener") return ()=>{};
    if(prop==="hidden") return true; if(prop==="visibilityState") return "hidden";
    return el; }, set(){ return true; } });
  const noop=()=>0;
  const ctx={ console:{log(){},warn(){},error(){}}, document:doc, localStorage, sessionStorage:localStorage,
    navigator:{ userAgent:"node-bot", language:"ar", onLine:true, serviceWorker:{register:()=>Promise.resolve()}, vibrate:noop, share:undefined },
    location:{ href:"https://bot.local/", origin:"https://bot.local", search:"", hash:"", pathname:"/" },
    setTimeout:noop, setInterval:noop, clearTimeout:noop, clearInterval:noop, requestAnimationFrame:noop,
    fetch:()=>Promise.reject(new Error("no network in vm")), alert:noop, confirm:()=>false, prompt:()=>null,
    matchMedia:()=>({matches:false,addEventListener:noop,addListener:noop}), getComputedStyle:()=>({display:"none"}),
    Image:function(){}, FileReader:function(){}, Audio:function(){}, URL:{createObjectURL:()=>"",revokeObjectURL:noop}, Blob:function(){}, File:function(){},
    indexedDB:undefined, crypto:{ getRandomValues:(a)=>{ for(let i=0;i<a.length;i++) a[i]=Math.floor(Math.random()*256); return a; } },
    Intl, Date, Math, JSON, Promise, Object, Array, String, Number, Boolean, RegExp, Map, Set, Error, TypeError, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, Symbol, Proxy, Reflect, structuredClone:(x)=>JSON.parse(JSON.stringify(x)), btoa:(s)=>Buffer.from(s,"binary").toString("base64"), atob:(s)=>Buffer.from(s,"base64").toString("binary"), TextEncoder, TextDecoder };
  ctx.window=ctx; ctx.self=ctx; ctx.globalThis=ctx; ctx.addEventListener=noop; ctx.removeEventListener=noop; ctx.dispatchEvent=noop;
  ctx.scrollTo=noop; ctx.open=noop; ctx.print=noop; ctx.innerWidth=400; ctx.innerHeight=800; ctx.devicePixelRatio=1;
  vm.createContext(ctx);
  // بعض الدوال العامة قد تُعرَّف بـ let/const فلا تظهر على ctx — نصدّرها صراحة في نهاية السكربت
  const exportsList=["state","tgHandleText","tgSummaryText","tgListText","closingText","closingRows","periodSummary","cashCountText","runMigrations","ymd","iso","money","TG_KB","normPM","PAY_METHODS","applyRemote","cloudCopy","shopInfo","mergeById"];
  const code=main+"\n;__exports={"+exportsList.map(k=>k+":(typeof "+k+"!=='undefined'?"+k+":undefined)").join(",")+"};";
  vm.runInContext(code, ctx, {filename:"index.html(app)"});
  const api=ctx.__exports;
  api.ctx=ctx;
  // تحميل حالة من السحابة (نفس منطق التطبيق: تعيين ثم ترحيل)
  api.loadState=(remote)=>{ Object.assign(api.state, remote||{}); api.runMigrations(); try{ ctx.unlocked=true; ctx.currentUser="البوت"; ctx.currentRole="owner"; }catch(e){} return api.state; };
  return api;
}
module.exports={ createApp };
if(require.main===module){ const app=createApp(); console.log("app vm ok; today:", app.ymd(new Date()), "fn:", typeof app.tgHandleText); }
