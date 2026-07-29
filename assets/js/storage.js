/* storage.js — localStorage persistence + backup import/export/reset (extracted from index.html) */
/* ============ persistence (localStorage) ============ */
const LS_KEY="sadaqa_laundry_v1";
/* Persistence now goes through the repositories layer (App.repositories.stateStore),
   which is the Firebase-ready seam. Behaviour is identical to direct localStorage. */
function saveLocal(){ state._savedAt=Date.now(); App.repositories.stateStore.write(LS_KEY, state); }
function save(){ saveLocal(); }
function load(){ const d=App.repositories.stateStore.read(LS_KEY); if(d) Object.assign(state, d); }
function tomb(id){ if(!state.deleted) state.deleted={}; state.deleted["rec:"+id]=Date.now(); }
function tombCust(k){ if(!state.deleted) state.deleted={}; state.deleted["cust:"+k]=Date.now(); }
function exportData(){
  try{
    const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download="sadaqa-backup-"+ymd(new Date())+".json"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500); toast("تم تصدير نسخة احتياطية");
  }catch(e){ toast("تعذّر التصدير"); }
}
function importData(file){
  const r=new FileReader();
  r.onload=()=>{ try{ const d=JSON.parse(r.result); Object.assign(state,d); save(); toast("تم استيراد البيانات"); document.getElementById("settingsModal").style.display="none"; applyTheme(); render(); }catch(e){ toast("ملف غير صالح"); } };
  r.readAsText(file);
}
function resetAllData(){
  const keepDark=state.dark, keepLock=state.lock, keepMeterPin=state.meterPin;
  Object.keys(state).forEach(k=>{ delete state[k]; });
  Object.assign(state, {
    tab:"dashboard", expSub:"general", carpetFilter:"all", cpSearch:"", custSearch:"",
    dateFrom:ymd(new Date()), dateTo:ymd(new Date()), dark:keepDark, lock:keepLock||{enabled:false,pin:""}, meterPin:keepMeterPin||"",
    orderSeq:0, customers:{}, meters:[], workers:[], carOps:[], carpetOrders:[], expenses:[],
    vehiclePrices:{...VEHICLE_PRICES}, piecePrices:{...PIECE_PRICES}, tariff:{elec:0,water:0}
  });
  saveLocal();
  toast("تم مسح كل البيانات");
  render();
}

/* ---- lock ---- */
