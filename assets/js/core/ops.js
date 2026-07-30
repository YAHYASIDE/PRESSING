/* core/ops.js — Operations Center + reminders aggregations (pure, derived).
   Reads the existing single-source stores; stores nothing of its own. */

/* live "today" operational statistics for the Operations Center */
function opsStats(){
  var T=isToday;
  var cars=(state.carOps||[]).filter(function(o){ return !o.cancelled; });
  var byStage=function(k){ return cars.filter(function(o){ return carStageKey(o)===k; }).length; };
  var carpet=(state.carpetOrders||[]).filter(function(o){ return !o.cancelled; });
  var pl=App.core.plStatement(T);
  var invToday=(state.invoices||[]).filter(function(i){ return i.status!=="held" && T(i.date); });
  var oilToday=invToday.filter(function(i){ return i.meta&&i.meta.oil; }).length;
  var ordersToday=cars.filter(function(o){ return T(o.date); }).length + carpet.filter(function(o){ return T(o.date); }).length + invToday.length;
  var carpetReady=carpet.filter(function(o){ return o.status==="ready"; }).length;
  var ti=App.core.trialInfo();
  return {
    revenueToday: pl.revTotal, expensesToday: pl.expTotal, profitToday: pl.net,
    ordersToday: ordersToday,
    carsWaiting: byStage("received")+byStage("waiting"), carsWashing: byStage("washing"),
    carsDrying: byStage("drying"), carsReady: byStage("ready"),
    carpetQueue: carpet.filter(function(o){ return o.status==="wash"; }).length,
    carpetReady: carpetReady,
    oilToday: oilToday,
    readyPickup: byStage("ready")+carpetReady,
    employees: (state.workers||[]).length,
    lowStock: App.core.featureEnabled("inventory") ? App.core.invLowStock().length : 0,
    inventoryValue: App.core.featureEnabled("inventory") ? App.core.invValue() : 0,
    cashBalance: App.core.accountBalance("1000"),
    bankBalance: App.core.accountBalance("1010"),
    receivable: App.core.accountBalance("1100"),
    trial: ti, subscribed: App.core.subscribed()
  };
}

/* actionable reminders derived from live state (oil due, low stock, debts, trial) */
function opsReminders(){
  var out=[];
  // oil-change due (vehicle mileage reached its next-oil target)
  (state.vehicles||[]).forEach(function(v){ var d=App.core.vehOilDue(v); if(d&&d.due){ var c=App.core.crmCustomer(v.customerId)||{}; out.push({ type:"oil", sev:"warn", title:"موعد تغيير زيت", sub:(c.name||v.plate)+" · "+v.plate }); } });
  // low stock
  if(App.core.featureEnabled("inventory")) App.core.invLowStock().slice(0,8).forEach(function(p){ out.push({ type:"stock", sev:(+p.qty<=0?"danger":"warn"), title:"مخزون منخفض", sub:p.name+" · "+p.qty+" "+p.unit }); });
  // outstanding balances
  App.core.crmCustomers().forEach(function(c){ var b=App.core.custBalance(c); if(b>0) out.push({ type:"debt", sev:"info", title:"رصيد مستحق", sub:(c.name||c.plate)+" · "+money(b) }); });
  // trial expiry
  var ti=App.core.trialInfo(); if(!ti.subscribed && ti.daysLeft<=1) out.push({ type:"trial", sev:"danger", title:ti.ended?"انتهت الفترة التجريبية":"تنتهي التجربة قريبًا", sub:ti.ended?"جدّد اشتراكك للمتابعة":ti.daysLeft+" يوم متبقٍ" });
  return out;
}

/* customer-submitted service requests still awaiting staff action (newest first) */
function customerRequests(){ return (state.serviceRequests||[]).filter(function(r){ return r.status!=="done"; }).slice().reverse(); }

Object.assign(App.core, { opsStats, opsReminders, customerRequests });
