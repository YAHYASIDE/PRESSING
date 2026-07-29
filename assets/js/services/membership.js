/* services/membership.js — buy/track memberships & packages. Reuses
   finalizeInvoice for the sale (accounting + revenue). No duplicated posting. */
(function (App) {
  "use strict";
  App.services.buyMembership = function (customerId, planKey, payments) {
    var c=App.core.crmCustomer(customerId); if(!c) return { ok:false, error:"no_customer" };
    var plan=App.core.membershipPlan(planKey); if(!plan) return { ok:false, error:"no_plan" };
    var res=App.services.finalizeInvoice({ items:[{ kind:"service", name:"عضوية "+plan.label, price:plan.price, qty:1 }],
      payments:payments||[{ method:"cash", amount:plan.price*(1+((biz().tax||{}).enabled?((+(biz().tax||{}).rate||0)/100):0)) }],
      taxOn:true, customer:{ name:c.name||"", plate:c.plate }, source:"membership", memo:"عضوية "+plan.label, meta:{ membership:plan.k } });
    if(!res.ok) return res;
    var now=new Date(), expires=new Date(now.getTime()+plan.days*86400000);
    c.memberPlan={ plan:plan.k, label:plan.label, start:iso(now), expires:iso(expires),
      remaining:plan.unlimited?null:plan.services, unlimited:!!plan.unlimited, discount:plan.discount, priority:!!plan.priority, autoRenew:false };
    state.reminders=state.reminders||[]; state.reminders.push({ id:uid(), type:"membership", customerId:c.id, date:iso(expires), done:false, msg:"تنتهي عضوية "+(c.name||c.plate)+" ("+plan.label+")" });
    if(App.services.audit) App.services.audit("بيع عضوية", (c.name||c.plate)+" · "+plan.label);
    return { ok:true, invoice:res.invoice, customer:c };
  };
  App.services.buyPackage = function (customerId, pkgKey, payments) {
    var c=App.core.crmCustomer(customerId); if(!c) return { ok:false, error:"no_customer" };
    var pkg=SERVICE_PACKAGES.find(function(p){ return p.k===pkgKey; }); if(!pkg) return { ok:false, error:"no_pkg" };
    var res=App.services.finalizeInvoice({ items:[{ kind:"service", name:"باقة "+pkg.label, price:pkg.price, qty:1 }],
      payments:payments||[{ method:"cash", amount:pkg.price*(1+((biz().tax||{}).enabled?((+(biz().tax||{}).rate||0)/100):0)) }],
      taxOn:true, customer:{ name:c.name||"", plate:c.plate }, source:"package", memo:"باقة "+pkg.label, meta:{ package:pkg.k } });
    if(!res.ok) return res;
    var now=new Date();
    c.packages=c.packages||[]; c.packages.push({ id:uid(), k:pkg.k, label:pkg.label, start:iso(now), expires:iso(new Date(now.getTime()+pkg.days*86400000)), total:pkg.services, remaining:pkg.services });
    if(App.services.audit) App.services.audit("بيع باقة", (c.name||c.plate)+" · "+pkg.label);
    return { ok:true, invoice:res.invoice, customer:c };
  };
  /* redeem one free service — from membership first, then a package */
  App.services.redeemService = function (customerId) {
    var c=App.core.crmCustomer(customerId); if(!c) return { ok:false, error:"no_customer" };
    var m=c.memberPlan;
    if(m && new Date(m.expires).getTime()>Date.now()){
      if(m.unlimited){ if(App.services.audit) App.services.audit("استخدام عضوية", (c.name||c.plate)+" · غير محدود"); return { ok:true, type:"unlimited" }; }
      if(m.remaining>0){ m.remaining--; if(App.services.audit) App.services.audit("استخدام عضوية", (c.name||c.plate)+" · متبقٍ "+m.remaining); return { ok:true, type:"membership", remaining:m.remaining }; }
    }
    var pkgs=App.core.activePackages(c);
    if(pkgs.length){ pkgs[0].remaining--; if(App.services.audit) App.services.audit("استخدام باقة", (c.name||c.plate)+" · متبقٍ "+pkgs[0].remaining); return { ok:true, type:"package", remaining:pkgs[0].remaining }; }
    return { ok:false, error:"none" };
  };
  App.services.toggleAutoRenew = function (customerId) {
    var c=App.core.crmCustomer(customerId); if(!c||!c.memberPlan) return { ok:false };
    c.memberPlan.autoRenew=!c.memberPlan.autoRenew; return { ok:true, on:c.memberPlan.autoRenew };
  };
})(window.App);
