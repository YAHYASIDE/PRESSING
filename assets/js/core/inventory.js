/* core/inventory.js — pure inventory queries over state.inventory. No DOM/services. */
function invStore(){ return state.inventory || {products:[],categories:[],suppliers:[],movements:[]}; }
function invProducts(){ return invStore().products || []; }
function invSuppliers(){ return invStore().suppliers || []; }
function invMovements(){ return invStore().movements || []; }
/* seed categories + any custom ones, de-duplicated */
function invCategories(){
  const out = INV_DEFAULT_CATEGORIES.slice();
  (invStore().categories||[]).forEach(c=>{ if(out.indexOf(c)<0) out.push(c); });
  return out;
}
function invProduct(id){ return invProducts().find(p=>p.id===id) || null; }
/* stock status of one product against its reorder point */
function invStatus(p){
  const q=+p.qty||0, m=+p.min||0;
  if(q<=0) return { k:"out", label:"نفد" };
  if(q<=m) return { k:"low", label:"منخفض" };
  return { k:"ok", label:"متوفر" };
}
function invLowStock(){ return invProducts().filter(p=>(+p.qty||0)<=(+p.min||0)); }
function invExpiring(days){
  days = days || INV_EXPIRY_WARN_DAYS; const now=Date.now();
  return invProducts().filter(p=>p.expiry).filter(p=>{ const t=new Date(p.expiry).getTime(); return !isNaN(t) && (t-now) < days*86400000; });
}
function invValue(){ return invProducts().reduce((s,p)=>s+(+p.qty||0)*(+p.cost||0),0); }
function invRetailValue(){ return invProducts().reduce((s,p)=>s+(+p.qty||0)*(+p.price||0),0); }
function invMovementsFor(productId){ return invMovements().filter(m=>m.productId===productId).slice().reverse(); }

Object.assign(App.core, { invStore, invProducts, invSuppliers, invMovements, invCategories, invProduct, invStatus, invLowStock, invExpiring, invValue, invRetailValue, invMovementsFor });
