/* pages/welcome.js — premium customer-facing welcome screen (the first view on
   open). Shows the business identity + its enabled services as large glass cards.
   The only path forward for staff is the "Employee Login" button. Pure render
   from state.business — no data written. */

function welcomeServiceCards(b){
  const types=BUSINESS_TYPES.filter(function(t){ return b.types && b.types[t.k]; });
  if(!types.length) return `<div class="wc-empty">لا توجد خدمات مُفعّلة بعد.</div>`;
  return types.map(function(t,i){
    return `<button type="button" class="wc-card" data-wc-svc="${t.k}" style="--i:${i}">
      <span class="wc-card-ic">${svg(I[t.icon]||I.car)}</span>
      <span class="wc-card-t">${t.label}</span>
      <span class="wc-card-d">${t.desc||""}</span>
    </button>`;
  }).join("");
}

function welcomeHTML(){
  const b=state.business||{};
  const hrs=b.workingHours||{};
  const hoursLine = (hrs.open&&hrs.close) ? `مفتوح ${hrs.open} — ${hrs.close}` : "";
  const contact = [hoursLine, b.phone||""].filter(Boolean).join("  ·  ");
  return `
    <div class="wc-bg" aria-hidden="true">
      <span class="wc-blob wc-b1"></span><span class="wc-blob wc-b2"></span><span class="wc-blob wc-b3"></span>
    </div>
    <div class="wc-shell">
      <header class="wc-hero">
        <div class="wc-logo-ring"><img src="${b.logo||LOGO}" alt=""></div>
        <h1 class="wc-name">${(b.name||APP_NAME_AR).replace(/</g,"&lt;")}</h1>
        ${b.branch?`<div class="wc-branch">${b.branch.replace(/</g,"&lt;")}</div>`:``}
        <p class="wc-welcome">أهلاً بك 👋 اختر الخدمة التي تريدها</p>
      </header>

      <section class="wc-panel">
        <div class="wc-panel-h">خدماتنا</div>
        <div class="wc-cards">${welcomeServiceCards(b)}</div>
        <div class="wc-detail" id="welcomeDetail"></div>
      </section>

      <button type="button" class="wc-login" id="welcomeLoginBtn">
        <span class="wc-login-ic">🔐</span> دخول الموظفين
      </button>
      ${contact?`<div class="wc-foot">${contact}</div>`:``}
    </div>`;
}

/* the expanded panel shown when a customer taps a service: booking form + subscriptions */
function welcomeServiceDetail(k){
  const t=BUSINESS_TYPES.find(function(x){ return x.k===k; })||{};
  const b=state.business||{}, hrs=b.workingHours||{};
  const plans=(typeof MEMBERSHIP_PLANS!=="undefined"?MEMBERSHIP_PLANS:[]).map(function(pl){
    return `<button type="button" class="wc-sub tier-${pl.k}" data-wc-plan="${pl.k}">
      <span class="wc-sub-n">${pl.label}</span>
      <span class="wc-sub-p">${money(pl.price)}</span>
      <span class="wc-sub-d">${pl.unlimited?"غير محدود":pl.services+" خدمة"} · ${pl.days} يوم${pl.discount?` · خصم ${pl.discount}%`:""}</span>
    </button>`;
  }).join("");
  return `<div class="wc-det-card">
    <div class="wc-det-top"><b>${t.label}</b>${(hrs.open&&hrs.close)?`<span class="wc-det-hours">🕐 ${hrs.open}–${hrs.close}</span>`:``}</div>
    ${t.desc?`<p class="wc-det-desc">${t.desc}</p>`:``}
    <div class="wc-form">
      <div class="wc-form-h">سجّل بياناتك ليخدمك فريقنا 👇</div>
      <input id="wcName" class="wc-inp" type="text" placeholder="الاسم" autocomplete="off">
      <input id="wcPhone" class="wc-inp" type="tel" inputmode="numeric" maxlength="9" placeholder="رقم الهاتف">
    </div>
    ${plans?`<div class="wc-subs-wrap"><div class="wc-subs-h">اشتراكاتنا <span>(اختياري)</span></div><div class="wc-subs">${plans}</div></div>`:``}
    <button type="button" class="wc-submit" id="wcSubmit">📩 إرسال الطلب</button>
  </div>`;
}

Object.assign(App.pages, { welcomeHTML, welcomeServiceCards, welcomeServiceDetail });
