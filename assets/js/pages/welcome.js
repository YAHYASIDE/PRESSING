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

Object.assign(App.pages, { welcomeHTML, welcomeServiceCards });
