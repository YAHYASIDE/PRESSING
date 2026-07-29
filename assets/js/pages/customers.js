/* pages/customers.js — Customer loyalty cards + customer WhatsApp (extracted from index.html)
   Loyalty is an OPTIONAL module: every function here is a no-op / hidden when it is disabled,
   and the visible content adapts to the active strategy (stamp / points / discount / coupon). */
function loyaltyStamps(s,N){
  N=N||loyaltyThreshold();
  let h='';
  for(let i=1;i<N;i++) h+=`<span class="stamp ${i<=s?'filled':''}">${i<=s?'✓':i}</span>`;
  h+=`<span class="stamp free ${s>=N-1?'ready':''}">${svg(I.gift)}</span>`;
  return h;
}
function loyaltyCardHTML(plate){
  if(!loyaltyEnabled()) return "";
  const c=state.customers[plate];
  const cfg=featureCfg("loyalty"), strat=cfg.strategy||"stamp";
  if(strat==="points"){
    const pts=c?(c.points||0):0, redeem=+cfg.redeemPoints||100;
    const due=pts>=redeem;
    const note=due?'يمكن استبدال النقاط بغسلة مجانية 🎁':`اجمع ${redeem-pts} نقطة أخرى لغسلة مجانية`;
    return `<div class="lc-title">نقاط الولاء${c?` — ${c.totalWashes} غسلة`:' (جديد)'}</div>
      <div class="lc-points ${due?'free':''}">${pts} <span>نقطة</span></div>
      <div class="lc-note ${due?'free':''}">${note}</div>`;
  }
  if(strat==="discount"){
    const after=+cfg.discountAfter||5, pct=+cfg.discountPct||0, done=c?(c.totalWashes||0):0;
    const on=done>=after;
    const note=on?`خصم دائم ${pct}% على كل غسلة 🎉`:`بعد ${after-done} غسلات يبدأ خصم ${pct}%`;
    return `<div class="lc-title">خصم الولاء${c?` — ${done} غسلة`:' (جديد)'}</div>
      <div class="lc-note ${on?'free':''}">${note}</div>`;
  }
  if(strat==="coupon"){
    const every=+cfg.couponEvery||5, prog=c?(c.couponProgress||0):0, coupons=c?(c.coupons||0):0;
    const note=`بعد ${every-prog} غسلات كوبون جديد${coupons?` · لديه ${coupons} كوبون`:''}`;
    return `<div class="lc-title">كوبونات الولاء${c?` — ${c.totalWashes} غسلة`:' (جديد)'}</div>
      <div class="lc-note">${note}</div>`;
  }
  const N=+cfg.threshold||5, s=c?(c.stamps||0):0, due=s>=N-1;
  const note=!c?`زبون جديد — بعد ${N-1} غسلات تكون التالية مجانية`
    : due?'اكتملت البطاقة — هذه الغسلة مجانية 🎁'
    : `متبقٍ ${N-1-s} ${N-1-s===1?'غسلة':'غسلات'} ثم غسلة مجانية`;
  return `<div class="lc-title">بطاقة الولاء${c?` — ${c.totalWashes} غسلة، ${c.freeWashes} مجانية`:' (جديدة)'}</div>
    <div class="stamps">${loyaltyStamps(s,N)}</div>
    <div class="lc-note ${due?'free':''}">${note}</div>`;
}

function openWaCust(c){
  const ph=waPhoneFull(c.phone,c.country); if(!ph){ toast("لا يوجد رقم هاتف لهذا الزبون"); return; }
  let body="";
  if(loyaltyEnabled()){
    const status=loyaltyStatus(c);
    body=`\n${featureCfg("loyalty").strategy==="points"?"نقاط الولاء":featureCfg("loyalty").strategy==="coupon"?"كوبونات الولاء":featureCfg("loyalty").strategy==="discount"?"خصم الولاء":"بطاقة الولاء"}${c.plate?` — لوحة ${c.plate}`:""}\nرصيدك: ${status}`;
  }
  const msg=`${waHead()}${body}\n${waFoot()}`;
  window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`,"_blank");
}

/* ---- Commit 4: namespace registration ---- */
Object.assign(App.pages, { loyaltyStamps, loyaltyCardHTML, openWaCust });
