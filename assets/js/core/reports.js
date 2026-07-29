/* core/reports.js — executive report aggregations (pure, derived from the single
   source of truth: ledger, invoices, carOps, carpetOrders, customers, inventory). */

function _monthsBack(n){ var a=[]; for(var i=n-1;i>=0;i--) a.push(new Date(now.getFullYear(), now.getMonth()-i, 1)); return a; }
/* revenue / profit / expenses per month for charts */
function repMonthlySeries(n){
  n=n||6;
  return _monthsBack(n).map(function(d){
    var y=d.getFullYear(), m=d.getMonth();
    var F=function(dt){ var x=new Date(dt); return x.getFullYear()===y && x.getMonth()===m; };
    var pl=App.core.plStatement(F);
    return { label:d.toLocaleDateString("ar",{month:"short"}), revenue:pl.revTotal, profit:pl.net, expenses:pl.expTotal };
  });
}
/* POS sales rollup for a period filter */
function repSales(F){
  var inv=App.core.invoicesIn(F);
  var gross=inv.reduce(function(s,i){return s+(+i.total||0);},0);
  var refunds=inv.reduce(function(s,i){return s+App.core.invoiceRefunded(i);},0);
  var tax=inv.reduce(function(s,i){return s+(+i.tax||0);},0);
  var byMethod={}, byCashier={};
  inv.forEach(function(i){ (i.payments||[]).forEach(function(p){ byMethod[p.method]=(byMethod[p.method]||0)+(+p.amount||0); });
    var k=i.by||"—"; byCashier[k]=byCashier[k]||{count:0,total:0}; byCashier[k].count++; byCashier[k].total+=(+i.total||0); });
  return { count:inv.length, gross:gross, refunds:refunds, tax:tax, net:gross-refunds, byMethod:byMethod, byCashier:byCashier };
}
function repTopProducts(F,n){
  var m={}; App.core.invoicesIn(F).forEach(function(i){ (i.items||[]).forEach(function(it){ if(it.kind==="product"){ var k=it.name; m[k]=m[k]||{name:k,qty:0,rev:0}; m[k].qty+=it.qty; m[k].rev+=it.price*it.qty; } }); });
  return Object.values(m).sort(function(a,b){return b.rev-a.rev;}).slice(0,n||8);
}
function repTopServices(F,n){
  var m={};
  App.core.invoicesIn(F).forEach(function(i){ (i.items||[]).forEach(function(it){ if(it.kind==="service"){ var k=it.name; m[k]=m[k]||{name:k,qty:0,rev:0}; m[k].qty+=it.qty; m[k].rev+=it.price*it.qty; } }); });
  (state.carOps||[]).filter(function(o){return !o.cancelled && F(o.date);}).forEach(function(o){ var k=o.wash||"غسيل"; m[k]=m[k]||{name:k,qty:0,rev:0}; m[k].qty+=1; m[k].rev+=(+o.price||0); });
  return Object.values(m).sort(function(a,b){return b.rev-a.rev;}).slice(0,n||8);
}
function repTopCustomers(n){
  return App.core.crmCustomers().map(function(c){ return { name:c.name||c.plate, rev:App.core.custRevenue(c), visits:App.core.custVisitCount(c) }; })
    .filter(function(x){return x.rev>0;}).sort(function(a,b){return b.rev-a.rev;}).slice(0,n||10);
}
function repCustomerSegments(){
  var out={total:0,repeat:0,inactive:0,lost:0,active:0}, t=Date.now();
  App.core.crmCustomers().forEach(function(c){ out.total++; if(App.core.custVisitCount(c)>1) out.repeat++;
    var lv=c.lastVisit?new Date(c.lastVisit).getTime():0; var days=(t-lv)/86400000;
    if(days>90) out.lost++; else if(days>30) out.inactive++; else out.active++; });
  return out;
}
function repInventory(){
  if(!App.core.featureEnabled("inventory")) return null;
  var prods=App.core.invProducts();
  return { count:prods.length, value:App.core.invValue(), retail:App.core.invRetailValue(), low:App.core.invLowStock().length,
    movements:(App.core.invMovements()||[]).length, expiring:App.core.invExpiring().length };
}

Object.assign(App.core, { repMonthlySeries, repSales, repTopProducts, repTopServices, repTopCustomers, repCustomerSegments, repInventory });
