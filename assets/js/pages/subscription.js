/* pages/subscription.js — trial card + subscription pricing (Release 5.2 polish).
   No payment gateway yet: subscribe buttons show "Coming Soon". */

/* dashboard card: FREE TRIAL with a day-progress bar, or the active-plan state */
function trialCardHTML(){
  if(subscribed()){
    const s=state.subscription||{};
    const exp=s.expires?ymd(s.expires):"—";
    return `<div class="trial-card premium">
      <span class="trial-ic">👑</span>
      <span class="trial-body"><b>الخطة المدفوعة فعّالة</b><span>تنتهي في ${exp}</span></span>
      <button type="button" class="trial-cta" data-go-sub>إدارة</button>
    </div>`;
  }
  const ti=trialInfo();
  const total=TRIAL_DAYS, day=Math.min(total, total-ti.daysLeft+1);
  const pct=Math.max(6, Math.round((day/total)*100));
  return `<button type="button" class="trial-card ${ti.ended?'ended':''}" data-go-sub>
    <div class="trial-row">
      <span class="trial-ic">🎁</span>
      <span class="trial-body"><b>التجربة المجانية</b><span>${ti.ended?"انتهت الفترة التجريبية":`متبقٍ ${ti.daysLeft} ${ti.daysLeft===1?"يوم":"أيام"}`}</span></span>
      <span class="trial-cta">${ti.ended?"اشترك":"ترقية"}</span>
    </div>
    <div class="trial-prog"><div class="trial-prog-bar" style="width:${ti.ended?100:pct}%"></div></div>
    <div class="trial-day">اليوم ${ti.ended?total:day} من ${total}</div>
  </button>`;
}

function screenSubscription(){
  const ti=trialInfo();
  const banner = subscribed()
    ? `<div class="sub-status active">👑 الخطة المدفوعة فعّالة</div>`
    : `<div class="sub-status"><span>🎁 الفترة التجريبية</span><b>${ti.ended?"انتهت":`متبقٍ ${ti.daysLeft} ${ti.daysLeft===1?"يوم":"أيام"}`}</b></div>`;
  const cards = SUB_PLANS.map(p=>{
    const rec=p.badge==="الأفضل قيمة"||p.k==="yearly";
    return `
    <div class="plan-card ${rec?'recommended':''}">
      ${p.badge?`<div class="plan-badge ${rec?'rec':''}">${rec?'موصى به':p.badge}</div>`:""}
      <div class="plan-name">${p.name}</div>
      <div class="plan-price">${p.price}<span class="plan-per">${p.per}</span></div>
      <ul class="plan-feats">${p.features.map(f=>`<li>${f}</li>`).join("")}</ul>
      <button type="button" class="btn-primary plan-sub ${rec?'rec':''}" data-plan="${p.k}">اشترك الآن</button>
    </div>`;
  }).join("");
  return `
    <div class="screen-head sub-head"><button type="button" class="od-back" data-sub-back aria-label="رجوع">→</button><h2>خطط الاشتراك</h2></div>
    ${banner}
    <p class="sub-intro">اختر الخطة المناسبة لعملك — جميع الخطط تشمل كل الميزات المدفوعة.</p>
    <div class="plans-grid">${cards}</div>
    <div class="sub-foot">لا حاجة لإدخال بطاقة الآن — بوّابة الدفع قيد التفعيل قريبًا.</div>`;
}

Object.assign(App.pages, { trialCardHTML, screenSubscription });
