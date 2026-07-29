/* core/membership.js — membership + package derivations (pure). */
function membershipPlan(k){ return MEMBERSHIP_PLANS.find(function(p){ return p.k===k; })||null; }
function customerMembership(c){ return (c&&c.memberPlan)||null; }
function membershipActive(c){ var m=customerMembership(c); return !!(m && new Date(m.expires).getTime()>Date.now()); }
function membershipDaysLeft(c){ var m=customerMembership(c); if(!m) return 0; return Math.max(0, Math.ceil((new Date(m.expires).getTime()-Date.now())/86400000)); }
function customerPackages(c){ return (c&&c.packages)||[]; }
function activePackages(c){ return customerPackages(c).filter(function(p){ return new Date(p.expires).getTime()>Date.now() && p.remaining>0; }); }
function packageRemaining(c){ return activePackages(c).reduce(function(s,p){ return s+p.remaining; },0); }
/* whether the customer can redeem a free service now (membership or package) */
function redeemAvailable(c){
  if(membershipActive(c)){ var m=c.memberPlan; if(m.unlimited || (m.remaining>0)) return true; }
  return activePackages(c).length>0;
}
/* dashboard membership KPIs (derived) */
function membershipStats(){
  var custs=App.core.crmCustomers(), active=0, expiring=0, mrr=0, autoRenew=0, packages=0;
  custs.forEach(function(c){
    if(membershipActive(c)){ active++; mrr+=(membershipPlan(c.memberPlan.plan)||{}).price||0; if(membershipDaysLeft(c)<=7) expiring++; if(c.memberPlan.autoRenew) autoRenew++; }
    packages+=packageRemaining(c);
  });
  var redemptions=(state.audit||[]).filter(function(a){ return a.action==="استخدام عضوية"||a.action==="استخدام باقة"; }).length;
  return { active:active, expiring:expiring, mrr:mrr, autoRenew:autoRenew, packages:packages, redemptions:redemptions, avgValue:App.core.perfKpis().clv };
}
Object.assign(App.core, { membershipPlan, customerMembership, membershipActive, membershipDaysLeft, customerPackages, activePackages, packageRemaining, redeemAvailable, membershipStats });
