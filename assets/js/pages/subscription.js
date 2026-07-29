/* pages/subscription.js — Subscription plans + dashboard trial card (Release 5.1).
   No payment gateway yet: subscribe buttons show "Coming Soon". */

/* dashboard banner card shown while on the free trial (hidden once subscribed) */
function trialCardHTML(){
  if(subscribed()) return "";
  const ti=trialInfo();
  const daysTxt = ti.daysLeft===1 ? "يوم واحد" : `${ti.daysLeft} أيام`;
  const line = ti.ended ? "انتهت الفترة التجريبية" : `${daysTxt} متبقية`;
  return `<button type="button" class="trial-card ${ti.ended?'ended':''}" data-go-sub>
    <span class="trial-ic">🎁</span>
    <span class="trial-body"><b>تجربة مجانية</b><span>${line}</span></span>
    <span class="trial-cta">اشترك الآن</span>
  </button>`;
}

function screenSubscription(){
  const ti=trialInfo();
  const banner = subscribed()
    ? `<div class="sub-status active">اشتراكك فعّال ✓</div>`
    : `<div class="sub-status"><span>🎁 الفترة التجريبية</span><b>${ti.ended?"انتهت":`${ti.daysLeft} ${ti.daysLeft===1?"يوم":"أيام"} متبقية`}</b></div>`;
  const cards = SUB_PLANS.map(p=>`
    <div class="plan-card ${p.badge?'featured':''}">
      ${p.badge?`<div class="plan-badge">${p.badge}</div>`:""}
      <div class="plan-name">${p.name}</div>
      <div class="plan-price">${p.price}<span class="plan-per">${p.per}</span></div>
      <ul class="plan-feats">${p.features.map(f=>`<li>${f}</li>`).join("")}</ul>
      <button type="button" class="btn-primary plan-sub" data-plan="${p.k}">اشترك الآن</button>
    </div>`).join("");
  return `
    <div class="screen-head sub-head"><button type="button" class="od-back" data-sub-back aria-label="رجوع">→</button><h2>خطط الاشتراك</h2></div>
    ${banner}
    <p class="sub-intro">اختر الخطة المناسبة لعملك — جميع الخطط تشمل كل الميزات المدفوعة.</p>
    <div class="plans-grid">${cards}</div>
    <div class="sub-foot">لا حاجة لإدخال بطاقة الآن — بوّابة الدفع قيد التفعيل قريبًا.</div>`;
}

Object.assign(App.pages, { trialCardHTML, screenSubscription });
