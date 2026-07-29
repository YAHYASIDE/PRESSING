/* pages/setup.js — Business Setup Wizard step views (pure render from the draft).
   Navigation, capture and commit live in app.js (startSetup / renderSetupStep / finishSetup).
   The wizard writes state.business; every module then reads its behavior from there. */

/* ordered step keys; the loyalty step is skipped when the loyalty feature is off */
function setupSteps(draft){
  const all=["welcome","types","services","payments","features","loyalty","info","hours","finish"];
  return all.filter(k=> k!=="loyalty" || (draft.features&&draft.features.loyalty));
}

function suSwitch(attr,val,on){ return `<span class="switch"><input type="checkbox" data-su-${attr}="${val}" ${on?"checked":""}><span class="slider"></span></span>`; }
function suRow(label,control){ return `<label class="su-toggle">${label}${control}</label>`; }

function setupStepView(key,d){
  if(key==="welcome"){
    return `<div class="su-welcome">
      <img class="su-logo" src="${LOGO}" alt="">
      <h2>مرحبًا بك 👋</h2>
      <p class="su-lead">لنُجهّز نظام إدارة نشاطك خطوة بخطوة. تستغرق العملية أقل من دقيقة، ويمكنك تعديل كل شيء لاحقًا من الإعدادات.</p>
      <ul class="su-points">
        <li>حدّد نوع نشاطك وخدماتك</li>
        <li>اختر طرق الدفع والميزات التي تحتاجها</li>
        <li>أدخل معلومات النشاط وساعات العمل</li>
      </ul></div>`;
  }
  if(key==="types"){
    return `<h2 class="su-h">نوع النشاط</h2><p class="su-sub">اختر واحدًا أو أكثر — يحدّد الشاشات والوحدات التي تظهر في التطبيق.</p>
      <div class="su-cards">${BUSINESS_TYPES.map(t=>`
        <button type="button" class="su-card ${d.types[t.k]?'on':''}" data-su-type="${t.k}">
          <span class="su-card-ic">${svg(I[t.icon]||I.car)}</span>
          <span class="su-card-body"><b>${t.label}</b><small>${t.desc}</small></span>
          <i class="su-check">✓</i>
        </button>`).join("")}</div>`;
  }
  if(key==="services"){
    return `<h2 class="su-h">الخدمات</h2><p class="su-sub">فعّل الخدمات التي تقدّمها. تظهر عند استقبال عملية جديدة، ويمكن تعديلها لاحقًا.</p>
      <div class="su-toggles">${SERVICE_CATALOG.map(s=>suRow(`<span>${s.label}</span>`, suSwitch("svc",s.k,d.services[s.k]))).join("")}</div>`;
  }
  if(key==="payments"){
    const customs=(d.paymentMethods||[]).filter(p=>p.custom);
    return `<h2 class="su-h">طرق الدفع</h2><p class="su-sub">تظهر هذه الطرق في كل شاشات التحصيل والتسليم.</p>
      <div class="su-toggles">${PAYMENT_CATALOG.map(p=>{
        const on=(d.paymentMethods||[]).some(x=>x.k===p.k);
        return suRow(`<span>${p.label}</span>`, suSwitch("pay",p.k,on));
      }).join("")}
      ${customs.map(p=>suRow(`<span>${p.label} <em class="su-tag">مخصّص</em></span>`, `<button type="button" class="su-del" data-su-pay-del="${p.k}">✕</button>`)).join("")}</div>
      <div class="su-add"><input id="suPayCustom" type="text" placeholder="طريقة دفع مخصّصة (مثال: شيك)"><button type="button" class="mini" data-su-pay-add>إضافة</button></div>`;
  }
  if(key==="features"){
    return `<h2 class="su-h">ميزات العمل</h2><p class="su-sub">فعّل ما يحتاجه عملك فقط. الميزات المُطفأة تختفي تمامًا من التطبيق.</p>
      <div class="su-toggles">${FEATURE_MODULES.map(m=>suRow(
        `<span class="su-feat"><i class="su-feat-ic">${svg(I[m.icon]||I.gear)}</i><span><b>${m.label}</b><small>${m.desc}</small></span></span>`,
        suSwitch("feat",m.key,d.features[m.key]))).join("")}</div>`;
  }
  if(key==="loyalty"){
    return `<h2 class="su-h">إعداد الولاء</h2><p class="su-sub">اختر نظام المكافأة واضبط قواعده — يمكنك تغييره لاحقًا.</p>
      ${loyaltyConfigHTML(d.loyalty)}`;
  }
  if(key==="info"){
    return `<h2 class="su-h">معلومات النشاط</h2>
      <div class="field"><label>اسم النشاط</label><input id="suName" type="text" value="${(d.name||'').replace(/"/g,'&quot;')}" placeholder="مثال: مغسلة النور"></div>
      <div class="field"><label>الشعار</label>
        <div class="su-logo-row"><img id="suLogoPrev" class="su-logo-prev" src="${d.logo||LOGO}" alt="">
        <label class="mini su-logo-btn">اختيار صورة<input type="file" id="suLogo" accept="image/*" hidden></label></div></div>
      <div class="row2">
        <div class="field"><label>الدولة</label><select id="suCountry">${COUNTRIES.map(c=>`<option ${c.n===d.country?'selected':''}>${c.n}</option>`).join("")}</select></div>
        <div class="field"><label>العملة</label><select id="suCurrency">${CURRENCIES.map(c=>`<option ${c===d.currency?'selected':''}>${c}</option>`).join("")}</select></div>
      </div>
      <div class="row2">
        <div class="field"><label>اللغة</label><select id="suLang">${LANGUAGES.map(l=>`<option value="${l.k}" ${l.k===d.language?'selected':''}>${l.label}</option>`).join("")}</select></div>
        <div class="field"><label>المنطقة الزمنية</label><select id="suTz">${TIMEZONES.map(t=>`<option ${t===d.timezone?'selected':''}>${t}</option>`).join("")}</select></div>
      </div>`;
  }
  if(key==="hours"){
    return `<h2 class="su-h">ساعات العمل</h2><p class="su-sub">ساعات وأيام العمل الاعتيادية.</p>
      <div class="row2">
        <div class="field"><label>وقت الفتح</label><input id="suOpen" type="time" value="${d.workingHours.open}"></div>
        <div class="field"><label>وقت الإغلاق</label><input id="suClose" type="time" value="${d.workingHours.close}"></div>
      </div>
      <div class="field"><label>أيام العمل</label>
        <div class="su-days">${WEEK_DAYS.map(dd=>`<button type="button" class="su-day ${d.workingHours.days.indexOf(dd.k)>=0?'on':''}" data-su-day="${dd.k}">${dd.label}</button>`).join("")}</div></div>`;
  }
  if(key==="finish"){
    const types=BUSINESS_TYPES.filter(t=>d.types[t.k]).map(t=>t.label).join("، ")||"—";
    const feats=FEATURE_MODULES.filter(m=>d.features[m.key]).map(m=>m.label).join("، ")||"—";
    const pays=(d.paymentMethods||[]).map(p=>p.label).join("، ")||"—";
    const svcs=SERVICE_CATALOG.filter(s=>d.services[s.k]).map(s=>s.label).join("، ")||"—";
    const row=(k,v)=>`<div class="su-sum-row"><span>${k}</span><b>${v}</b></div>`;
    return `<div class="su-done">
      <div class="su-done-ic">✓</div>
      <h2>نشاطك جاهز.</h2>
      <p class="su-lead">تم حفظ الإعدادات. يمكنك تعديل أي شيء لاحقًا من الإعدادات.</p>
      <div class="su-summary">
        ${row("الاسم", d.name||"—")}
        ${row("النشاط", types)}
        ${row("الخدمات", svcs)}
        ${row("طرق الدفع", pays)}
        ${row("الميزات", feats)}
        ${row("العملة", d.currency||"—")}
      </div></div>`;
  }
  return "";
}

Object.assign(App.pages, { setupSteps, setupStepView });
