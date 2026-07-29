/* pages/queue.js — fullscreen TV queue display board (customer-facing). */
function queueDisplayHTML(){
  const cars=(state.carOps||[]).filter(o=>!o.cancelled);
  const waiting=cars.filter(o=>["received","waiting"].indexOf(carStageKey(o))>=0);
  const inprog=cars.filter(o=>["washing","drying"].indexOf(carStageKey(o))>=0);
  const ready=cars.filter(o=>carStageKey(o)==="ready");
  const doneToday=cars.filter(o=>carStageKey(o)==="delivered" && o.deliveredDate && isToday(o.deliveredDate)).length;
  const card=(o,big)=>{ const a=opActive(o); const wait=a?Math.floor((Date.now()-a.since)/60000):0;
    return `<div class="q-card ${big?'ready':''}"><div class="q-no">${o.no||"-"}</div>
      <div class="q-info"><b>${o.plate||o.vehicle}</b><span>${o.wash||""}${(o.plate&&o.vehicle)?" · "+o.vehicle:""}</span></div>
      <div class="q-wait">${big?"جاهزة ✓":wait+" د"}</div></div>`; };
  const col=(title,list,cls)=>`<div class="q-col ${cls}"><div class="q-col-h">${title} <span>${list.length}</span></div>
      <div class="q-col-b">${list.length?list.map(o=>card(o,cls==="q-ready-col")).join(""):`<div class="q-empty">—</div>`}</div></div>`;
  return `
    <div class="q-top"><div class="q-brand">${state.business&&state.business.logo?`<img src="${state.business.logo}" alt="">`:""}${bizName()}</div>
      <div class="q-clock">${new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})}</div></div>
    <div class="q-board">
      ${col("في الانتظار",waiting,"q-wait-col")}
      ${col("قيد التنفيذ",inprog,"q-prog-col")}
      ${col("جاهزة للتسليم",ready,"q-ready-col")}
    </div>
    <div class="q-foot"><span>اكتمل اليوم: <b>${doneToday}</b></span><span class="q-hint">تحديث تلقائي</span><button type="button" class="q-exit" data-queue-close>✕ خروج</button></div>`;
}
Object.assign(App.pages, { queueDisplayHTML });
