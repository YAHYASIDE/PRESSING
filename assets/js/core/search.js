/* core/search.js — one fast global search across every entity (pure, derived). */
function globalSearch(q){
  q=(q||"").trim().toLowerCase(); if(q.length<1) return { total:0, groups:[] };
  var has=function(s){ return (""+(s||"")).toLowerCase().indexOf(q)>=0; };
  var groups=[], total=0;
  var add=function(label,icon,items){ if(items.length){ groups.push({label:label,icon:icon,items:items.slice(0,6),more:Math.max(0,items.length-6)}); total+=items.length; } };

  // customers
  add("الزبائن","profile", App.core.crmCustomers().filter(function(c){ return has(c.name)||has(c.plate)||has(c.phone); })
    .map(function(c){ return { title:c.name||c.plate, sub:(c.plate||"")+(c.phone?" · "+c.phone:""), go:{tab:"crm",crmSel:c.id} }; }));
  // vehicles
  add("المركبات","car", (state.vehicles||[]).filter(function(v){ return has(v.plate)||has(v.brand)||has(v.model)||has(v.vin); })
    .map(function(v){ var c=App.core.crmCustomer(v.customerId)||{}; return { title:v.plate, sub:(v.brand||"")+" "+(v.model||"")+(c.name?" · "+c.name:""), go:{tab:"crm",crmSel:v.customerId} }; }));
  // invoices
  add("الفواتير","income", (state.invoices||[]).filter(function(i){ return has(i.no)||has(i.customer&&i.customer.name); })
    .map(function(i){ return { title:i.no, sub:money(i.total)+(i.customer&&i.customer.name?" · "+i.customer.name:""), go:{receipt:i.id} }; }));
  // car operations
  add("عمليات الغسيل","car", (state.carOps||[]).filter(function(o){ return has(o.no)||has(o.plate); })
    .map(function(o){ return { title:o.no+" · "+o.vehicle, sub:(o.plate||"")+" · "+money(o.price), go:{tab:"cars",opDetail:o.id} }; }));
  // carpet orders
  add("طلبات السجاد","rug", (state.carpetOrders||[]).filter(function(o){ return has(o.no)||has(o.customer)||has(o.phone); })
    .map(function(o){ return { title:o.no+" · "+o.type, sub:(o.customer||"")+" · "+money(o.price), go:{tab:"carpets"} }; }));
  // products
  if(App.core.featureEnabled("inventory")) add("المنتجات","wallet", App.core.invProducts().filter(function(p){ return has(p.name)||has(p.sku)||has(p.barcode); })
    .map(function(p){ return { title:p.name, sub:p.qty+" "+p.unit+" · "+money(p.price), go:{tab:"inventory",invSearch:p.name} }; }));
  // suppliers
  if(App.core.featureEnabled("inventory")) add("الموردون","profile", App.core.invSuppliers().filter(function(s){ return has(s.name)||has(s.phone); })
    .map(function(s){ return { title:s.name, sub:s.phone||"", go:{tab:"inventory",invTab:"suppliers"} }; }));
  // journal entries
  if(App.core.featureEnabled("accounting")) add("القيود المحاسبية","chart", (state.journal||[]).filter(function(e){ return has(e.ref)||has(e.memo); })
    .map(function(e){ return { title:e.memo||e.ref, sub:e.ref+" · "+ymd(e.date), go:{tab:"accounting",acctTab:"journal"} }; }));

  return { total:total, groups:groups };
}
Object.assign(App.core, { globalSearch });
