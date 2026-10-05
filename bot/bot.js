#!/usr/bin/env node
/* بوت Telegram لمغاسيل صداقة — يعمل من GitHub Actions كل 5 دقائق حتى لو كان التطبيق مغلقًا.
   - يقرأ حالة التطبيق من Firestore (appState/main) عبر REST (بتسجيل دخول مجهول إن كان مفعّلًا).
   - يشغّل نفس كود التطبيق (bot/app-vm.js) فيحسب الردود بنفس المنطق تمامًا (tgHandleText).
   - يرد فقط على Chat ID المالك، ويترك الرسائل الأحدث من 90 ثانية لجهاز مفتوح (رد فوري) ثم يلتقطها إن لم تُرَد.
   - يحفظ تقدّمه في مستند Firestore منفصل bot/state (lastUpdate + closingSent) ولا يكتب أبدًا في appState/main.
   - يرسل تقفيل اليوم التلقائي إن كان مفعّلًا ولم يُرسل من أي جهاز. */
const fs=require("fs"), path=require("path");
const { createApp } = require("./app-vm.js");
const GRACE_SEC=90;
function readConfig(html){
  const pid=(html.match(/projectId:\s*"([^"]+)"/)||[])[1], key=(html.match(/apiKey:\s*"([^"]+)"/)||[])[1];
  if(!pid||!key) throw new Error("firebase config not found in index.html");
  return {projectId:pid, apiKey:key};
}
function fsVal(v){ // تحويل قيمة Firestore REST إلى JS
  if(!v||typeof v!=="object") return v;
  if("stringValue" in v) return v.stringValue; if("integerValue" in v) return +v.integerValue; if("doubleValue" in v) return +v.doubleValue;
  if("booleanValue" in v) return v.booleanValue; if("nullValue" in v) return null;
  if("mapValue" in v){ const o={}; Object.entries((v.mapValue&&v.mapValue.fields)||{}).forEach(([k,x])=>o[k]=fsVal(x)); return o; }
  if("arrayValue" in v) return ((v.arrayValue&&v.arrayValue.values)||[]).map(fsVal);
  return null;
}
async function run(opts){
  opts=opts||{};
  const fetchFn=opts.fetch||globalThis.fetch, log=opts.log||console.log, now=opts.now||(()=>new Date());
  const html=opts.html||fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
  const cfg=readConfig(html), base=`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents`;
  // --- auth (اختياري) ---
  let headers={"Content-Type":"application/json"};
  try{ const r=await fetchFn(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}`,{method:"POST",headers,body:JSON.stringify({returnSecureToken:true})});
    const j=await r.json(); if(j&&j.idToken){ headers=Object.assign({},headers,{Authorization:"Bearer "+j.idToken}); log("auth: anonymous ok"); } else log("auth: anonymous unavailable ("+((j&&j.error&&j.error.message)||"?")+") — continuing without"); }
  catch(e){ log("auth: skipped ("+e.message+")"); }
  // --- app state ---
  const r1=await fetchFn(`${base}/appState/main`,{headers}); const d1=await r1.json();
  if(!d1||!d1.fields||!d1.fields.data){ log("appState/main not readable: "+JSON.stringify(d1).slice(0,200)); return {status:"no-state"}; }
  const remote=JSON.parse(d1.fields.data.stringValue);
  const app=createApp(html); const state=app.loadState(remote);
  const tg=(state.notify&&state.notify.telegram)||{};
  if(!tg.enabled||!tg.token||!tg.chatId){ log("telegram disabled"); return {status:"disabled"}; }
  // --- bot/state ---
  let bot={lastUpdate:0,closingSent:{}};
  try{ const r2=await fetchFn(`${base}/bot/state`,{headers}); const d2=await r2.json(); if(d2&&d2.fields){ bot.lastUpdate=+fsVal(d2.fields.lastUpdate)||0; bot.closingSent=fsVal(d2.fields.closingSent)||{}; } }catch(e){}
  const since=Math.max(+state.tgLastUpdate||0, bot.lastUpdate);
  const tgApi=(m,body)=>fetchFn(`https://api.telegram.org/bot${encodeURIComponent(tg.token)}/${m}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})}).then(r=>r.json());
  const send=async(text,kb)=>{ for(let i=0;i<text.length;i+=3800) await tgApi("sendMessage",Object.assign({chat_id:tg.chatId,text:text.slice(i,i+3800),disable_web_page_preview:true},kb?{reply_markup:kb}:{})); };
  // --- updates ---
  const out={status:"ok",replied:0,skippedFresh:0,ignored:0,closing:false};
  const ups=await tgApi("getUpdates",{offset:since+1,timeout:0,limit:30});
  let last=since; const nowSec=Math.floor(now().getTime()/1000);
  for(const u of ((ups&&ups.result)||[]).sort((a,b)=>a.update_id-b.update_id)){
    if(u.update_id<=since) continue;
    const m=u.message;
    if(!m||!m.text||!m.chat||String(m.chat.id)!==String(tg.chatId)){ last=u.update_id; out.ignored++; continue; }
    if(nowSec-(m.date||0)<GRACE_SEC){ out.skippedFresh++; break; } // اترك فرصة لجهاز مفتوح يرد فورًا
    const reply=app.tgHandleText(m.text); if(reply){ await send(reply,app.TG_KB); out.replied++; }
    last=u.update_id;
  }
  // --- تقفيل تلقائي ---
  const ac=state.autoClosing||{};
  if(ac.enabled){
    const n=now(), hm=String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");
    let target=app.ymd(n); if(hm<(ac.time||"22:00")){ const y=new Date(n); y.setDate(y.getDate()-1); target=app.ymd(y); }
    const sent=Object.assign({},state.autoClosingSent||{},bot.closingSent||{});
    if(!(ac.since&&target<ac.since) && !sent[target]){
      const text=("🤖 تقفيل تلقائي\n"+app.closingText(target,app.closingRows(app.periodSummary(target,target)))+app.cashCountText(target)).replace(/\*/g,"");
      await send(text); bot.closingSent[target]=new Date().toISOString(); out.closing=true;
    }
  }
  // --- حفظ التقدّم ---
  if(last>bot.lastUpdate||out.closing){
    bot.lastUpdate=Math.max(bot.lastUpdate,last);
    const fields={ lastUpdate:{integerValue:String(bot.lastUpdate)}, closingSent:{mapValue:{fields:Object.fromEntries(Object.entries(bot.closingSent).map(([k,v])=>[k,{stringValue:String(v)}]))}} };
    const r3=await fetchFn(`${base}/bot/state?updateMask.fieldPaths=lastUpdate&updateMask.fieldPaths=closingSent`,{method:"PATCH",headers,body:JSON.stringify({fields})});
    if(r3&&r3.status&&r3.status>=400) log("bot/state write failed: "+r3.status);
  }
  out.lastUpdate=bot.lastUpdate; log(JSON.stringify(out)); return out;
}
module.exports={ run, fsVal, readConfig };
if(require.main===module){ run().catch(e=>{ console.error("bot failed:", e.message); process.exit(1); }); }
