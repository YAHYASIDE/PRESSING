/* core/domain.js — pure domain: formatting, dates, math, financial calcs (+ icons/toast, to move to ui/ later) */
/* ================= Helpers ================= */
const fmt=(n)=>(Math.round(n*100)/100).toLocaleString("en-US");
/* money() appends the configured business currency (Release 5); fmt() stays a bare number. */
const money=(n)=>{ const s=fmt(n); try{ const b=App.store&&App.store.state&&App.store.state.business; const c=b&&b.currency; return c?(s+" "+c):s; }catch(e){ return s; } };
const isToday=(d)=>{const x=new Date(d);return x.toDateString()===now.toDateString();};
const isMonth=(d)=>{const x=new Date(d);return x.getMonth()===now.getMonth()&&x.getFullYear()===now.getFullYear();};
const ymd=(d)=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");};
const inRange=(iso)=>{const d=ymd(iso);return d>=state.dateFrom && d<=state.dateTo;};
const timeStr=(d)=>new Date(d).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"});
function sum(arr,f){return arr.reduce((a,x)=>a+f(x),0);}

function vehIcon(v){
  if(v==="دراجة نارية")return I.motorcycle;
  if(v==="شاحنة")return I.truck;
  if(v==="انيل")return I.anil;
  if(v==="سيارة كبيرة")return I.carBig;
  if(v==="أخرى")return I.other;
  return I.car;
}
function pieceIcon(t){
  return t==="أخرى"?I.other:I.rug;
}
function vehicleCounts(f){
  const c={"سيارات":0,"دراجة نارية":0,"انيل":0,"شاحنة":0,"أخرى":0};
  state.carOps.filter(o=>!o.cancelled&&f(o.date)).forEach(o=>{
    if(o.vehicle==="سيارة صغيرة"||o.vehicle==="سيارة كبيرة")c["سيارات"]++;
    else if(c[o.vehicle]!==undefined)c[o.vehicle]++;
  });
  return c;
}
function carpetCounts(f){
  const c={};
  Object.keys(state.piecePrices).forEach(t=>c[t]=0);
  state.carpetOrders.filter(o=>!o.cancelled&&f(o.date)).forEach(o=>{ if(c[o.type]!==undefined)c[o.type]++; });
  return c;
}
function carIncome(f){return sum(state.carOps.filter(o=>!o.cancelled&&o.paid!==false&&f(o.paidDate||o.date)),o=>o.price);}
function carpetIncome(f){return sum(state.carpetOrders.filter(o=>!o.cancelled&&o.paid&&f(o.paidDate||o.deliveredDate||o.date)),o=>o.price);}
function manualExp(f){return sum(state.expenses.filter(e=>f(e.date)),e=>e.amount);}
function mElec(m){ return (m.elec!==undefined&&m.elec!=="")?(+m.elec||0):(+m.elecEnd||+m.elecStart||0); }
function mWater(m){ return (m.water!==undefined&&m.water!=="")?(+m.water||0):(+m.waterEnd||+m.waterStart||0); }
function sortedMeters(){ return state.meters.slice().sort((a,b)=>(a.savedAt||new Date(a.date).getTime())-(b.savedAt||new Date(b.date).getTime())); }
function meterConsAt(i,list){ if(i<=0) return {elec:0,water:0}; return {elec:Math.max(0,mElec(list[i])-mElec(list[i-1])), water:Math.max(0,mWater(list[i])-mWater(list[i-1]))}; }
function meterUse(m){return {elec:Math.max(0,(+m.elecEnd||0)-(+m.elecStart||0)), water:Math.max(0,(+m.waterEnd||0)-(+m.waterStart||0))};}
function utilityCost(f){ const list=sortedMeters(); let t=0; for(let i=0;i<list.length;i++){ if(!f(list[i].date))continue; const u=meterConsAt(i,list); t+=u.elec*state.tariff.elec+u.water*state.tariff.water; } return t; }
function wagesFor(f){return f===isToday?wagesToday() : f===isMonth?wagesMonth() : 0;}
function totalExp(f){return manualExp(f)+utilityCost(f)+wagesFor(f);}
/* kept name for backward calls -> now returns combined total */
function expenseSum(f){return totalExp(f);}
function meterToday(){return state.meters.find(m=>isToday(m.date));}
/* worker derived amounts (monthly salary, daily accrual) */
function dayRate(w){return w.monthly/daysInMonth;}
function monthAbsences(w){return w.absent.filter(isMonth).length;}
function absentToday(w){return w.absent.some(isToday);}
function netSalary(w){return w.monthly - monthAbsences(w)*dayRate(w);}
function accruedDue(w){
  const today=new Date(); today.setHours(0,0,0,0);
  const mStart=new Date(today.getFullYear(),today.getMonth(),1);
  let start = w.start ? new Date(w.start) : mStart; start.setHours(0,0,0,0);
  if(start<mStart) start=mStart;
  if(start>today) return 0;
  let cnt=0;
  for(let d=new Date(start); d<=today; d.setDate(d.getDate()+1)){ const ds=ymd(d); if(!w.absent.some(a=>ymd(a)===ds)) cnt++; }
  return cnt*dayRate(w);
}
function wPaid(w){return sum(w.payments,p=>p.amount);}
function wCredit(w){return sum(w.credits||[],c=>c.amount);}   /* له إضافي (مكافآت/مستحقات) */
function wBalance(w){return accruedDue(w)+wCredit(w)-wPaid(w);}   /* +له  /  -عليه (حتى اليوم) */
function wagesToday(){return sum(state.workers.filter(w=>!absentToday(w)),w=>dayRate(w));}
function wagesMonth(){return sum(state.workers,netSalary);}
function wagesRange(){
  const today=new Date(); today.setHours(0,0,0,0);
  const mStart=new Date(today.getFullYear(),today.getMonth(),1);
  let start=new Date(state.dateFrom+"T00:00:00"); if(start<mStart)start=new Date(mStart);
  let end=new Date(state.dateTo+"T00:00:00"); if(end>today)end=new Date(today);
  const days=[]; for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) days.push(ymd(d));
  return sum(state.workers, w=>{ let cnt=0; for(const ds of days){ if(!w.absent.some(a=>ymd(a)===ds)) cnt++; } return cnt*dayRate(w); });
}
function todayIncome(){return carIncome(isToday)+carpetIncome(isToday);}
function monthIncome(){return carIncome(isMonth)+carpetIncome(isMonth);}

const STATUS={wash:{label:"قيد الغسيل",cls:"wash"},ready:{label:"جاهز",cls:"ready"},done:{label:"تم التسليم",cls:"done"}};
const NEXT={wash:"ready",ready:"done",done:null};

function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),1800);}

/* ================= Icons ================= */
const I={
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  car:'<path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13"/><path d="M4 13h16v5H4z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="16.5" cy="18" r="1.5"/>',
  motorcycle:'<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l3-6h6l3 6"/><path d="M9 11l1.4-3H14"/><path d="M15 8h2.4"/>',
  truck:'<rect x="2" y="6" width="12" height="9" rx="1"/><path d="M14 9h4l3 3v3h-7z"/><circle cx="6.5" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/>',
  anil:'<circle cx="5" cy="17.5" r="2.2"/><circle cx="12" cy="17.5" r="2.2"/><circle cx="19" cy="17.5" r="2.2"/><path d="M5 15.3l2.6-6.3H16l3 6.3"/><path d="M7.6 9l1-2.5H12"/>',
  bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  drop:'<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>',
  worker:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  carBig:'<rect x="3" y="8" width="14" height="8" rx="1.5"/><path d="M17 11h2.6l1.4 2v3H17z"/><circle cx="7" cy="17.3" r="1.6"/><circle cx="16" cy="17.3" r="1.6"/>',
  rugRoll:'<ellipse cx="7" cy="12" rx="3" ry="8"/><path d="M7 4h10M7 20h10"/><path d="M17 4a3 8 0 0 1 0 16"/><path d="M10 12h7"/>',
  carpet2:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h.01M11 9h.01M15 9h.01M17.5 9h.01M7 13h.01M11 13h.01M15 13h.01M17.5 13h.01"/>',
  fabric:'<path d="M4 7c4-3 12-3 16 0v10c-4 3-12 3-16 0z"/><path d="M4 12c4-3 12-3 16 0"/>',
  fabric2:'<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 16l9 4 9-4"/>',
  rug:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18M3 16h18M8 4v16"/>',
  wallet:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14" r="1.2"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  income:'<path d="M12 3v13"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
  expense:'<path d="M12 21V8"/><path d="m7 13 5-5 5 5"/><path d="M5 3h14"/>',
  profit:'<path d="M3 17 9 11l4 4 8-8"/><path d="M21 7v5h-5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  trash:'<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13h10l1-13"/>',
  empty:'<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  gift:'<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13.5h18M12 9v12"/><path d="M12 9C10.5 5.5 6.5 5.5 6.5 8s3 1 5.5 1M12 9c1.5-3.5 5.5-3.5 5.5-1s-3 1-5.5 1"/>',
  other:'<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  camera:'<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
  whatsapp:'<path d="M20.5 3.5A11 11 0 0 0 3 17l-1.2 4.7 4.8-1.2A11 11 0 1 0 20.5 3.5z"/><path d="M8.6 7.8c-.3 0-.6 0-.8.5-.3.5-.9 1.3-.9 2.4s.9 2.6 1 2.8c.1.2 1.7 2.9 4.4 3.9 2.2.8 2.7.7 3.2.6.5 0 1.4-.6 1.6-1.2.2-.6.2-1 .1-1.2l-1.7-.8c-.2-.1-.4-.1-.6.1l-.6.8c-.1.2-.3.2-.5.1a6 6 0 0 1-2.8-2.5c-.1-.2 0-.4.1-.5l.5-.6c.1-.2.1-.3 0-.5l-.7-1.9c-.2-.4-.4-.4-.6-.4z"/>'
};
const svg=(p,color="currentColor")=>`<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;


/* ---- Commit 4: namespace registration (aliases; globals retained) ---- */
Object.assign(App.core, { fmt, money, isToday, isMonth, ymd, inRange, timeStr, sum, vehIcon, pieceIcon,
  vehicleCounts, carpetCounts, carIncome, carpetIncome, manualExp, mElec, mWater, sortedMeters, meterConsAt,
  meterUse, utilityCost, wagesFor, totalExp, expenseSum, meterToday, dayRate, monthAbsences, absentToday,
  netSalary, accruedDue, wPaid, wCredit, wBalance, wagesToday, wagesMonth, wagesRange, todayIncome, monthIncome,
  STATUS, NEXT });
Object.assign(App.ui, { toast, svg, I });

/* ---- Release 3: operation timeline & durations (pure) ---- */
function opTimeline(o){ return (o && Array.isArray(o.timeline)) ? o.timeline : []; }
function opSpans(o){                 // [{stage, start, end|null, dur|null}] in order
  const tl=opTimeline(o), out=[];
  for(let i=0;i<tl.length;i++){ const end=(i+1<tl.length)?tl[i+1].at:null; out.push({stage:tl[i].stage, start:tl[i].at, end:end, dur:(end!=null?end-tl[i].at:null)}); }
  return out;
}
function opActive(o){ const tl=opTimeline(o); if(!tl.length) return null; const l=tl[tl.length-1]; return {stage:l.stage, since:l.at}; }
function opStageDur(o, stage){ return opSpans(o).filter(s=>s.stage===stage && s.dur!=null).reduce((a,s)=>a+s.dur,0); }
function avgStageMin(ops, stage){
  const ds=(ops||[]).map(o=>opStageDur(o,stage)).filter(d=>d>0);
  if(!ds.length) return 0;
  return Math.round((ds.reduce((a,d)=>a+d,0)/ds.length)/60000);
}
function fmtDur(ms){ if(ms==null) return ""; const m=Math.max(0,Math.floor(ms/60000)); return m<60 ? (m+" د") : (Math.floor(m/60)+"س "+(m%60)+"د"); }
/* Release 4 — guided workflow: the ONE next action, computed from the current stage.
   Workers never pick stages; they press this. Returns { kind, label, to? }. */
function nextAction(o){
  const cur=(o&&o.stage)||"received";
  if(o&&o.cancelled) return {kind:"done", label:"عملية ملغاة"};
  switch(cur){
    case "received":
    case "waiting":   return {kind:"stage",  to:"washing", label:"بدء الغسيل"};
    case "washing":   return {kind:"stage",  to:"drying",  label:"إنهاء الغسيل ▸ التلميع"};
    case "drying":    return {kind:"stage",  to:"ready",   label:"جاهزة للتسليم"};
    case "ready":     return {kind:"deliver",             label:"تحصيل الدفع وإتمام التسليم"};
    case "delivered": return (o&&o.paid===false)?{kind:"collect", label:"تحصيل الدفع"}:{kind:"done", label:"عملية مكتملة ✓"};
    default:          return {kind:"done", label:"عملية مكتملة ✓"};
  }
}
Object.assign(App.core, { opTimeline, opSpans, opActive, opStageDur, avgStageMin, fmtDur, nextAction });

/* ---- moved from app.js (dependency cleanup): pure domain / message helpers ---- */
function todayStr(){ return ymd(new Date()); }
function isPastDay(dateIso){ return ymd(dateIso)<todayStr(); }
function chosenDateIso(dateStr){ const t=todayStr(); if(!dateStr||dateStr===t) return iso(new Date()); return new Date(dateStr+"T12:00:00").toISOString(); }
function meterCode(){ return (state.meterPin&&state.meterPin.trim())?state.meterPin.trim():SECRET_CODE; }
function orderState(o){
  if(!o.paid && o.status==="done") return {cls:"st-red"};
  if(o.paid) return {cls:"st-green"};
  return {cls:"st-orange"};
}
function carNo(vehicle){ const L=VEH_LETTER[vehicle]||"X"; if(!state.carSeq) state.carSeq={}; state.carSeq[L]=(state.carSeq[L]||0)+1; return L+state.carSeq[L]; }
function waHead(){ return `*${bizName()}*\nالتاريخ: ${ymd(new Date())}\nالهاتف: ${bizPhone()}\n━━━━━━━━━━`; }
function waFoot(){ const th=(state.thanksMsg||"شكرًا لغسلتك عندنا 🌟").trim(); const ad=(state.adMsg||"").trim(); return `━━━━━━━━━━${th?`\n${th}`:""}${ad?`\n\n${ad}`:""}`; }
function countryOpts(sel){ return COUNTRIES.map(x=>`<option value="${x.c}" ${x.c===(sel||"222")?"selected":""}>${x.n} +${x.c}</option>`).join(""); }
function validPhone(ph){ return ph==="" || /^[0-9]{8,9}$/.test(ph); }
function waPhoneFull(phone,country){ let ph=(phone||"").replace(/[^0-9]/g,""); if(!ph) return null; const cc=country||"222"; if(ph.startsWith(cc)) return ph; ph=ph.replace(/^0+/,""); return cc+ph; }
function waPhoneStr(phone){ return waPhoneFull(phone,"222"); }
function waPhone(o){ return waPhoneFull(o.phone,o.country); }
function waStatusMsg(o){
  const st=o.status==="ready"?"جاهز للاستلام":o.status==="done"?"تم التسليم":"قيد الغسيل";
  const pay=o.paid?"مدفوع":`المبلغ المستحق: ${money(o.price)}`;
  return `${waHead()}\n${o.type} × ${o.count}\nرقم الطلب: ${o.no}\nالحالة: ${st}\n${pay}\n${waFoot()}`;
}
function waLink(o){
  const phone=(o.phone||"").replace(/[^0-9]/g,"");
  const msg=`مغاسيل صداقة%0Aطلبك رقم ${o.no} (${o.type} × ${o.count})%0Aالحالة: ${STATUS[o.status].label}%0Aالإجمالي: ${money(o.price)}${o.paid?" (مدفوع)":""}`;
  return `https://wa.me/${phone}?text=${msg}`;
}
function ensureCarNos(){ if(!state.carSeq) state.carSeq={}; (state.carOps||[]).forEach(o=>{ if(!o.no) o.no=carNo(o.vehicle); }); }

/* ================= Business Configuration layer (Release 5) ================= */
/* Every module reads its behavior from state.business — never from hardcoded values. */
function biz(){ return state.business||{}; }
function businessConfigured(){ return !!biz().configured; }
function bizName(){ return (biz().name||"").trim()||SHOP_NAME; }
function bizPhone(){ return (biz().phone||"").trim()||SHOP_PHONE; }
function bizCurrency(){ return biz().currency||CUR; }
function bizTypeOn(k){ return !!(biz().types&&biz().types[k]); }
/* the enabled service catalog, as label strings for the wash <select> (falls back to WASH_TYPES) */
function bizServices(){
  const s=biz().services; if(!s) return WASH_TYPES.slice();
  const on=SERVICE_CATALOG.filter(x=>s[x.k]).map(x=>x.label);
  return on.length?on:WASH_TYPES.slice();
}
/* the enabled payment methods (falls back to the built-in PAY_METHODS) */
function bizPayMethods(){ const p=biz().paymentMethods; return (p&&p.length)?p:PAY_METHODS; }
/* ---- trial + subscription (Release 5.1) ---- */
function subscribed(){ return !!(state.subscription && state.subscription.active); }
function trialInfo(){
  const s=state.subscription||{};
  if(subscribed()) return { onTrial:false, subscribed:true, daysLeft:0, ended:false };
  if(!s.trialStart) return { onTrial:false, subscribed:false, daysLeft:TRIAL_DAYS, ended:false };
  const start=new Date(s.trialStart).getTime();
  const msLeft=(start + TRIAL_DAYS*86400000) - Date.now();
  const daysLeft=Math.max(0, Math.ceil(msLeft/86400000));
  return { onTrial:daysLeft>0, subscribed:false, daysLeft:daysLeft, ended:daysLeft<=0 };
}

/* whether a nav tab is allowed by business type / feature config (role is applied separately) */
function tabVisible(id){
  if(!businessConfigured()) return true;                 // before setup, show everything
  if(id==="cars")    return bizTypeOn("carwash");
  if(id==="carpets") return bizTypeOn("carpet")||bizTypeOn("laundry");
  if(id==="reports") return featureEnabled("accounting");
  return true;
}

/* ================= Feature Modules (optional business features) ================= */
/* Generic toggle API — every optional module (loyalty, inventory, …) is gated by these. */
function featureEnabled(key){ const f=state.features&&state.features[key]; return !!(f&&f.enabled); }
function featureCfg(key){ return (state.features&&state.features[key])||{}; }

/* ---- loyalty module ---- */
function loyaltyEnabled(){ return featureEnabled("loyalty"); }
function loyaltyStrategy(){ return featureCfg("loyalty").strategy||"stamp"; }
function loyaltyThreshold(){ return +featureCfg("loyalty").threshold||5; }

/* Pure: given the customer record BEFORE this wash and the entered price, decide the
   loyalty outcome for the current strategy. Returns {free, price, kind, ...}. When the
   module is disabled it is a no-op (never free, price unchanged). */
function loyaltyReward(c, price){
  if(!loyaltyEnabled()) return { free:false, price:price, kind:"off", applied:false };
  const cfg=featureCfg("loyalty"), strat=cfg.strategy||"stamp";
  if(strat==="points"){
    const redeem=+cfg.redeemPoints||100, pts=(c&&c.points)||0;
    const free = pts>=redeem;
    return { free, price:free?0:price, kind:"points", applied:free, redeem };
  }
  if(strat==="discount"){
    const after=+cfg.discountAfter||5, pct=+cfg.discountPct||0, done=(c&&c.totalWashes)||0;
    const on = pct>0 && done>=after;
    return { free:false, price:on?Math.max(0,Math.round(price*(1-pct/100))):price, kind:"discount", applied:on, pct };
  }
  if(strat==="coupon"){
    const every=+cfg.couponEvery||5, prog=((c&&c.couponProgress)||0)+1;
    const earn = prog>=every;
    return { free:false, price:price, kind:"coupon", applied:earn, earn, code:cfg.couponCode||"", value:+cfg.couponValue||0 };
  }
  // default: stamp card — free on the Nth wash
  const N=+cfg.threshold||5, s=(c&&c.stamps)||0;
  const free = s>=N-1;
  return { free, price:free?0:price, kind:"stamp", applied:free, threshold:N };
}
/* Mutates the customer record to record this wash's loyalty progress (called by the service
   AFTER the operation is created). Keeps counters per strategy; safe no-op when disabled. */
function loyaltyOnWash(c, loy){
  if(!c) return;
  c.totalWashes=(c.totalWashes||0)+1; c.lastVisit=iso(new Date());
  if(!loyaltyEnabled()) return;
  if(loy.kind==="stamp"){
    if(loy.free){ c.stamps=0; c.freeWashes=(c.freeWashes||0)+1; } else c.stamps=(c.stamps||0)+1;
  } else if(loy.kind==="points"){
    if(loy.free){ c.points=Math.max(0,((c.points||0)-loy.redeem)); c.freeWashes=(c.freeWashes||0)+1; }
    else c.points=(c.points||0)+(+featureCfg("loyalty").pointsPerWash||10);
  } else if(loy.kind==="coupon"){
    if(loy.earn){ c.couponProgress=0; c.coupons=(c.coupons||0)+1; }
    else c.couponProgress=((c.couponProgress||0)+1);
  }
  /* discount strategy needs no extra counter — it derives from totalWashes */
}
/* Short human label of a customer's loyalty standing for the current strategy (UI only). */
function loyaltyStatus(c){
  if(!loyaltyEnabled()||!c) return "";
  const cfg=featureCfg("loyalty"), strat=cfg.strategy||"stamp";
  if(strat==="points")   return `${c.points||0} نقطة`;
  if(strat==="discount"){ const on=(c.totalWashes||0)>=(+cfg.discountAfter||5); return on?`خصم ${+cfg.discountPct||0}%`:`بعد ${Math.max(0,(+cfg.discountAfter||5)-(c.totalWashes||0))} غسلات`; }
  if(strat==="coupon")   return `${c.coupons||0} كوبون`;
  const N=+cfg.threshold||5; return `${(c.stamps||0)}/${N}`;
}
function runMigrations(){
  let changed=false;
  if(state.adMsg==="🎁 اجمع 5 غسلات واحصل على غسلة مجانية!\nنغسل السجاد والموكيت والأفرشة أيضًا 🧼\nشاركنا مع أصدقائك 🙌"){ state.adMsg=""; changed=true; }
  if(state.codesV!==3){ state.lock={enabled:true,pin:"0707"}; if(!state.meterPin) state.meterPin="070752"; state.codesV=3; changed=true; }
  if(!state.deleted) state.deleted={};
  if(!state.logins) state.logins=[];
  // Feature Modules — ensure the registry exists and every declared module has a flag.
  if(!state.features){ state.features=defaultFeatures(); changed=true; }
  else {
    const dflt=defaultFeatures();
    Object.keys(dflt).forEach(k=>{ if(!state.features[k]) { state.features[k]=dflt[k]; changed=true; } });
    // backfill any newly-added loyalty rule fields
    const L=state.features.loyalty, dl=dflt.loyalty;
    if(L){ Object.keys(dl).forEach(k=>{ if(L[k]===undefined){ L[k]=dl[k]; changed=true; } }); }
  }
  // Business Configuration — state seeds a fresh (unconfigured) default. A returning
  // install that already has OPERATIONAL data is marked configured with sensible
  // values so its owner is NOT sent through onboarding again and loses nothing; a
  // truly fresh install stays unconfigured so first launch opens the Setup Wizard.
  if(!state.business){ state.business=defaultBusiness(); changed=true; }
  const hasOpsData = (state.carOps&&state.carOps.length) || (state.carpetOrders&&state.carpetOrders.length) ||
    (state.customers&&Object.keys(state.customers).length) || (state.expenses&&state.expenses.length) || (state.workers&&state.workers.length);
  if(hasOpsData && state.business && !state.business.configured){
    state.business.configured=true;
    if(!state.business.name)  state.business.name=SHOP_NAME;
    if(!state.business.phone) state.business.phone=SHOP_PHONE;
    state.business.types.carpet=true;   // existing app had both the cars and carpets boards
    Object.keys(state.business.features).forEach(k=>{ state.business.features[k]=!!(state.features&&state.features[k]&&state.features[k].enabled); });
    state.business.features.accounting=true; state.business.features.employees=true;
    changed=true;
  }
  // backfill the two new business types on already-configured installs
  if(state.business && state.business.types){
    if(state.business.types["oil-change"]===undefined){ state.business.types["oil-change"]=false; changed=true; }
    if(state.business.types.shop===undefined){ state.business.types.shop=false; changed=true; }
  }
  // subscription / trial — start a trial for configured installs that don't have one yet
  if(!state.subscription){
    state.subscription = { trialStart: (state.business&&state.business.configured)?iso(new Date()):null, plan:null, active:false };
    changed=true;
  }
  ensureCarNos();
  return changed;
}
Object.assign(App.core, { todayStr, isPastDay, chosenDateIso, meterCode, orderState, carNo, waHead, waFoot, countryOpts, validPhone, waPhoneFull, waPhoneStr, waPhone, waStatusMsg, waLink, ensureCarNos, runMigrations,
  featureEnabled, featureCfg, loyaltyEnabled, loyaltyStrategy, loyaltyThreshold, loyaltyReward, loyaltyOnWash, loyaltyStatus,
  biz, businessConfigured, bizName, bizPhone, bizCurrency, bizTypeOn, bizServices, bizPayMethods, tabVisible, subscribed, trialInfo });
