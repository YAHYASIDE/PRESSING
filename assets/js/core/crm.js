/* core/crm.js — Customer CRM + Vehicle registry derivations.
   Profiles are enriched customer records (state.customers, plate-keyed = the single
   loyalty/contact source); all aggregates (balance, revenue, visits, timeline) are
   DERIVED from the transactional stores — no duplicated aggregate data. */

function crmCustomers(){ return Object.values(state.customers||{}); }
function crmCustomer(id){ return crmCustomers().find(c=>c.id===id || c.plate===id) || null; }
function custVehicles(c){ if(!c) return []; return (state.vehicles||[]).filter(v=>v.customerId===c.id); }
function custPlates(c){ if(!c) return []; var set={}; if(c.plate) set[c.plate]=1; custVehicles(c).forEach(v=>{ if(v.plate) set[v.plate]=1; }); return Object.keys(set); }
function vehicle(id){ return (state.vehicles||[]).find(v=>v.id===id)||null; }
/* resolve the OWNER customer for a plate: check the vehicle registry first (a plate
   may be a secondary vehicle of an existing customer), then the direct plate key. */
function customerOfPlate(plate){
  plate=(plate||"").trim(); if(!plate) return null;
  var v=(state.vehicles||[]).find(function(x){ return x.plate===plate; });
  if(v){ var c=crmCustomers().find(function(cc){ return cc.id===v.customerId; }); if(c) return c; }
  return state.customers[plate]||null;
}

/* transactions belonging to a customer (matched by their plates / phone / name) */
function custCarOps(c){ var pl=custPlates(c); return (state.carOps||[]).filter(o=>!o.cancelled && o.plate && pl.indexOf(o.plate)>=0); }
function custInvoices(c){ var pl=custPlates(c); var nm=(c.name||"").trim(); return (state.invoices||[]).filter(i=>i.status!=="held").filter(i=>{ var ip=(i.customer&&i.customer.plate)||""; var inm=(i.customer&&i.customer.name)||""; return (ip&&pl.indexOf(ip)>=0)||(nm&&inm&&inm===nm); }); }
function custCarpet(c){ var nm=(c.name||"").trim(); return (state.carpetOrders||[]).filter(o=>!o.cancelled).filter(o=>(c.phone&&o.phone===c.phone)||(nm&&o.customer&&o.customer===nm)); }

function custRevenue(c){
  var r=0;
  custCarOps(c).forEach(o=>{ if(o.paid!==false) r+=+o.price||0; });
  custCarpet(c).forEach(o=>{ if(o.paid) r+=+o.price||0; });
  custInvoices(c).forEach(i=>{ r+=(+i.total||0)-App.core.invoiceRefunded(i)-(+i.credit||0); });
  return Math.round(r*100)/100;
}
function custBalance(c){ // outstanding (owed to the shop)
  var b=0;
  custCarOps(c).forEach(o=>{ if(o.paid===false) b+=+o.price||0; });
  custCarpet(c).forEach(o=>{ if(!o.paid) b+=+o.price||0; });
  custInvoices(c).forEach(i=>{ b+=+i.credit||0; });
  return Math.round(b*100)/100;
}
function custVisitCount(c){ return custCarOps(c).length + custInvoices(c).length + custCarpet(c).length; }
function custAvgTicket(c){ var inv=custInvoices(c); if(!inv.length) return 0; return Math.round(inv.reduce((s,i)=>s+(+i.total||0),0)/inv.length*100)/100; }
function custPreferredServices(c){ var m={}; custCarOps(c).forEach(o=>{ if(o.wash) m[o.wash]=(m[o.wash]||0)+1; }); custInvoices(c).forEach(i=>i.items.forEach(it=>{ if(it.kind==="service") m[it.name]=(m[it.name]||0)+1; })); return Object.keys(m).sort((a,b)=>m[b]-m[a]).slice(0,3); }

/* unified chronological timeline of everything the customer did */
function custTimeline(c){
  var ev=[];
  custCarOps(c).forEach(o=>ev.push({ t:"car", date:o.date, title:"غسيل "+(o.vehicle||""), sub:(o.plate||"")+" · "+(o.wash||""), amount:o.price, paid:o.paid!==false, ref:o.no }));
  custCarpet(c).forEach(o=>ev.push({ t:"carpet", date:o.date, title:"سجاد — "+(o.type||""), sub:"×"+(o.count||1), amount:o.price, paid:!!o.paid, ref:o.no }));
  custInvoices(c).forEach(i=>{ var oil=i.meta&&i.meta.oil; ev.push({ t:oil?"oil":"invoice", date:i.date, title:oil?("تغيير زيت"+(oil.oilBrand?" — "+oil.oilBrand:"")):("فاتورة · "+i.items.length+" صنف"), sub:oil?("عداد: "+(oil.mileageAfter||"—")):(i.customer&&i.customer.name||""), amount:i.total, paid:(i.status==="paid"), ref:i.no });
    (i.refunds||[]).forEach(r=>ev.push({ t:"refund", date:r.date, title:"مرتجع فاتورة", sub:i.no, amount:-r.amount, paid:true, ref:i.no })); });
  ev.sort((a,b)=>new Date(b.date)-new Date(a.date));
  return ev;
}

/* vehicle next-oil status */
function vehOilDue(v){ if(!v||!v.nextOilMileage) return null; var cur=+v.mileage||0, next=+v.nextOilMileage||0; return { due: cur>=next, remaining: next-cur, next:next }; }

Object.assign(App.core, { crmCustomers, crmCustomer, customerOfPlate, custVehicles, custPlates, vehicle, custCarOps, custInvoices, custCarpet, custRevenue, custBalance, custVisitCount, custAvgTicket, custPreferredServices, custTimeline, vehOilDue });
