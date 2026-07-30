/* repositories/state-facade.js — persistence facade + multi-business workspaces.
 *
 * ── Multi-business / multi-branch data isolation ──────────────────────────────
 * Each business (or branch) is a FULL, independent snapshot of `state` — its own
 * business config, customers, invoices, workers, inventory, journal, reports data,
 * everything. The value persisted under LS_KEY is a CONTAINER holding every
 * workspace; the live `state` object is whichever workspace is currently active.
 * Switching businesses swaps the entire dataset in `state`, so no business can
 * ever read or write another's data — isolation is structural, not filtered.
 *
 *   container = { __v:2, activeId, lastActiveId, workspaces: { <id>: <stateSnapshot> } }
 *
 * Invariant: after load()/saveLocal()/switchBusiness(), `_workspaces[_activeBiz] === state`.
 */
const LS_KEY="sadaqa_laundry_v1";

/* pristine default workspace, captured before any load mutates `state` */
const _SEED = JSON.parse(JSON.stringify(state));
let _workspaces = {};      // id -> snapshot
let _activeBiz  = null;
let _lastActiveBiz = null;
var _saveFailed = false;

function _clone(o){ return JSON.parse(JSON.stringify(o)); }
function _clearState(){ Object.keys(state).forEach(function(k){ delete state[k]; }); }
function _loadInto(snap){ _clearState(); Object.assign(state, _clone(snap)); }

function activeBusinessId(){ return _activeBiz; }
function lastBusinessId(){ return _lastActiveBiz; }

/* configured businesses, for the selector (reads each workspace's business config) */
function businessList(){
  return Object.keys(_workspaces).map(function(id){
    var ws = (id===_activeBiz) ? state : _workspaces[id];
    var b  = (ws && ws.business) || {};
    return { id:id, name:b.name||"", branch:b.branch||"", logo:b.logo||"",
             types:b.types||{}, role:(ws && ws.role)||"manager",
             configured:!!b.configured, active:(id===_activeBiz) };
  }).filter(function(x){ return x.configured; });
}
function businessCount(){ return businessList().length; }

function saveLocal(){
  state._savedAt=Date.now();
  if(_activeBiz){ _workspaces[_activeBiz]=state; }            // keep the invariant
  var container={ __v:2, activeId:_activeBiz, lastActiveId:_lastActiveBiz, workspaces:_workspaces };
  var ok=App.repositories.stateStore.write(LS_KEY, container);
  if(!ok && !_saveFailed){ _saveFailed=true; if(typeof toast==="function") toast("⚠️ تعذّر الحفظ — مساحة التخزين ممتلئة. صدّر نسخة احتياطية وامسح بيانات قديمة."); }
  else if(ok) _saveFailed=false;
  return ok;
}
function save(){ saveLocal(); }

function load(){
  var d=App.repositories.stateStore.read(LS_KEY);
  if(d && d.__v>=2 && d.workspaces && Object.keys(d.workspaces).length){
    _workspaces=d.workspaces;
    _lastActiveBiz = (d.lastActiveId && _workspaces[d.lastActiveId]) ? d.lastActiveId : null;
    _activeBiz = (d.activeId && _workspaces[d.activeId]) ? d.activeId
               : (_lastActiveBiz || Object.keys(_workspaces)[0]);
    _loadInto(_workspaces[_activeBiz]); _workspaces[_activeBiz]=state;
    if(!_lastActiveBiz) _lastActiveBiz=_activeBiz;
  } else if(d && !d.__v){
    // legacy single-business install -> wrap the old state as one workspace
    var lid=uid(); _clearState(); Object.assign(state, d);
    _workspaces={}; _workspaces[lid]=state; _activeBiz=lid; _lastActiveBiz=lid;
  } else {
    // fresh install -> register the seeded default as workspace #1
    var fid=uid(); _workspaces={}; _workspaces[fid]=state; _activeBiz=fid; _lastActiveBiz=fid;
  }
}

/* switch the active business: persist the current one, load the target into `state` */
function switchBusiness(id){
  if(!_workspaces[id]) return false;
  if(id===_activeBiz){ _lastActiveBiz=id; return true; }
  _workspaces[_activeBiz]=_clone(state);      // detach the outgoing workspace
  _activeBiz=id; _lastActiveBiz=id;
  _loadInto(_workspaces[id]); _workspaces[id]=state;
  saveLocal();
  return true;
}

/* create a fresh, unconfigured business/branch and make it active (the wizard then
   configures it). Carries the app login + theme so it feels like one account. */
function addBusiness(){
  if(_activeBiz){ _workspaces[_activeBiz]=_clone(state); }
  var carry={ lock:_clone(state.lock||{enabled:false,pin:""}), palette:state.palette, dark:state.dark, meterPin:state.meterPin };
  var id=uid(); var fresh=_clone(_SEED);
  fresh.lock=carry.lock; fresh.palette=carry.palette; fresh.dark=carry.dark; fresh.meterPin=carry.meterPin;
  _workspaces[id]=fresh; _activeBiz=id; _lastActiveBiz=id;
  _loadInto(fresh); _workspaces[id]=state;
  saveLocal();
  return id;
}

/* remove a business/branch (never the last one). Falls back to another workspace. */
function deleteBusiness(id){
  if(!_workspaces[id] || Object.keys(_workspaces).length<=1) return false;
  delete _workspaces[id];
  if(_activeBiz===id){
    _activeBiz=Object.keys(_workspaces)[0]; _lastActiveBiz=_activeBiz;
    _loadInto(_workspaces[_activeBiz]); _workspaces[_activeBiz]=state;
  }
  saveLocal(); return true;
}

function tomb(id){ if(!state.deleted) state.deleted={}; state.deleted["rec:"+id]=Date.now(); }
function tombCust(k){ if(!state.deleted) state.deleted={}; state.deleted["cust:"+k]=Date.now(); }

/* backup = the WHOLE container (every business), so restore is complete */
function exportData(){
  try{
    if(_activeBiz){ _workspaces[_activeBiz]=state; }
    const container={ __v:2, activeId:_activeBiz, lastActiveId:_lastActiveBiz, workspaces:_workspaces };
    const blob=new Blob([JSON.stringify(container,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download="washly-backup-"+ymd(new Date())+".json"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500); toast("تم تصدير نسخة احتياطية");
  }catch(e){ toast("تعذّر التصدير"); }
}
function importData(file){
  const r=new FileReader();
  r.onload=()=>{ try{
    const d=JSON.parse(r.result);
    if(d && d.__v>=2 && d.workspaces && Object.keys(d.workspaces).length){
      _workspaces=d.workspaces;
      _activeBiz=(d.activeId && _workspaces[d.activeId])?d.activeId:Object.keys(_workspaces)[0];
      _lastActiveBiz=(d.lastActiveId && _workspaces[d.lastActiveId])?d.lastActiveId:_activeBiz;
      _loadInto(_workspaces[_activeBiz]); _workspaces[_activeBiz]=state;
    } else {
      // legacy single-state backup -> one workspace
      const id=uid(); _clearState(); Object.assign(state,d);
      _workspaces={}; _workspaces[id]=state; _activeBiz=id; _lastActiveBiz=id;
    }
    save();
    toast("تم استيراد البيانات");
    document.getElementById("settingsModal").style.display="none";
    if(typeof bizEntered!=="undefined") bizEntered=false;
    applyTheme(); render();
  }catch(e){ toast("ملف غير صالح"); } };
  r.readAsText(file);
}

/* factory reset — wipe every business back to a single fresh, unconfigured one
   (keeps only the theme). The Setup Wizard then runs again. */
function resetAllData(){
  const keepDark=state.dark, keepPalette=state.palette;
  const id=uid(); const fresh=_clone(_SEED);
  fresh.dark=keepDark; fresh.palette=keepPalette;
  _workspaces={}; _workspaces[id]=fresh; _activeBiz=id; _lastActiveBiz=id;
  _loadInto(fresh); _workspaces[id]=state;
  saveLocal();
  if(typeof unlocked!=="undefined") unlocked=false;
  if(typeof bizEntered!=="undefined") bizEntered=false;
  if(typeof currentUser!=="undefined") currentUser="";
  toast("تم مسح كل البيانات");
  render();
}

/* ---- namespace registration (aliases; globals retained) ---- */
Object.assign(App.repositories, { LS_KEY, save, saveLocal, load, tomb, tombCust,
  exportData, importData, resetAllData,
  businessList, businessCount, activeBusinessId, lastBusinessId, switchBusiness, addBusiness, deleteBusiness });
