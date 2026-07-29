/* core/industry.js — pure helpers for tiers, inspection and performance KPIs. */

/* automatic loyalty tier from a customer's lifetime spend */
function custTier(c){
  var rev=App.core.custRevenue(c);
  for(var i=0;i<LOYALTY_TIERS.length;i++){ if(rev>=LOYALTY_TIERS[i].min) return LOYALTY_TIERS[i]; }
  return LOYALTY_TIERS[LOYALTY_TIERS.length-1];
}
function tierBadge(c){ var t=custTier(c); if(t.k==="basic") return ""; return `<span class="tier-badge tier-${t.k}">${t.icon} ${t.label}</span>`; }

/* inspection completeness summary for an operation */
function inspectionSummary(o){
  var ins=o&&o.inspection; if(!ins) return null;
  var items=ins.items||{}; var dmg=0, done=0;
  INSPECTION_SECTIONS.forEach(function(s){ if(items[s.k]){ done++; if(items[s.k]==="damaged") dmg++; } });
  return { done:done, total:INSPECTION_SECTIONS.length, damaged:dmg, hasSig:!!(ins.custSig||ins.empSig), fuel:ins.fuel||"" };
}

/* business performance KPIs (derived) */
function perfKpis(){
  var custs=App.core.crmCustomers();
  var revenues=custs.map(function(c){ return App.core.custRevenue(c); }).filter(function(r){ return r>0; });
  var withRev=revenues.length;
  var totalRev=revenues.reduce(function(s,r){ return s+r; },0);
  var inv=(state.invoices||[]).filter(function(i){ return i.status!=="held"; });
  var invTotal=inv.reduce(function(s,i){ return s+(+i.total||0); },0);
  var seg=App.core.repCustomerSegments();
  return {
    avgTicket: inv.length? Math.round(invTotal/inv.length*100)/100 : 0,
    clv: withRev? Math.round(totalRev/withRev*100)/100 : 0,      // avg lifetime spend
    repeatRate: seg.total? Math.round(seg.repeat/seg.total*100) : 0,
    activeRate: seg.total? Math.round(seg.active/seg.total*100) : 0
  };
}

Object.assign(App.core, { custTier, tierBadge, inspectionSummary, perfKpis });
