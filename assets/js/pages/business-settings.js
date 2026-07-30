/* pages/business-settings.js — Settings ▸ Business Settings editor (Release 5.1).
   Lets the manager edit everything the streamlined onboarding no longer asks:
   business types, currency/country/language/timezone, working hours, services,
   and payment methods. Reads/writes state.business (the single source of truth).
   (Business Features + Loyalty stay in their own Feature Modules section.) */

function bsSwitch(attr,val,on){ return `<span class="switch"><input type="checkbox" data-bs-${attr}="${val}" ${on?"checked":""}><span class="slider"></span></span>`; }

function businessSettingsHTML(){
  const b=state.business||{};
  const wh=b.workingHours||{open:"08:00",close:"22:00",days:[]};
  const typeChips=BUSINESS_TYPES.map(t=>`<button type="button" class="bs-chip ${b.types&&b.types[t.k]?'on':''}" data-bs-type="${t.k}">${t.label}</button>`).join("");
  const svcToggles=SERVICE_CATALOG.map(s=>`<label class="su-toggle"><span>${s.label}</span>${bsSwitch('svc',s.k,b.services&&b.services[s.k])}</label>`).join("");
  const payToggles=PAYMENT_CATALOG.map(p=>{ const on=(b.paymentMethods||[]).some(x=>x.k===p.k); return `<label class="su-toggle"><span>${p.label}</span>${bsSwitch('pay',p.k,on)}</label>`; }).join("");
  const customs=(b.paymentMethods||[]).filter(p=>p.custom).map(p=>`<label class="su-toggle"><span>${p.label} <em class="su-tag">مخصّص</em></span><button type="button" class="su-del" data-bs-pay-del="${p.k}">✕</button></label>`).join("");
  const days=WEEK_DAYS.map(dd=>`<button type="button" class="su-day ${wh.days.indexOf(dd.k)>=0?'on':''}" data-bs-day="${dd.k}">${dd.label}</button>`).join("");
  return `
    <div class="bs-sub bs-identity">
      <div class="bs-logo-wrap"><img id="bsLogoPrev" class="bs-logo-prev" src="${b.logo||LOGO}" alt=""><label class="bs-logo-btn">تغيير<input type="file" id="bsLogo" accept="image/*" hidden></label></div>
      <div class="bs-id-fields"><div class="field"><label>اسم النشاط</label><input id="bsName" type="text" value="${(b.name||'').replace(/"/g,'&quot;')}" placeholder="اسم النشاط"></div>
        <div class="field"><label>اسم الفرع <span class="su-opt">(اختياري)</span></label><input id="bsBranch" type="text" value="${(b.branch||'').replace(/"/g,'&quot;')}" placeholder="مثال: الفرع الرئيسي"></div></div>
    </div>
    <div class="bs-sub"><div class="bs-sub-t">أنشطة العمل</div><div class="bs-chips">${typeChips}</div></div>
    <div class="bs-sub"><div class="bs-sub-t">العملة والموقع</div>
      <div class="row2">
        <div class="field"><label>العملة</label><select id="bsCurrency">${CURRENCIES.map(c=>`<option ${c===b.currency?'selected':''}>${c}</option>`).join("")}</select></div>
        <div class="field"><label>الدولة</label><select id="bsCountry">${COUNTRIES.map(c=>`<option ${c.n===b.country?'selected':''}>${c.n}</option>`).join("")}</select></div>
      </div>
      <div class="row2">
        <div class="field"><label>اللغة</label><select id="bsLang">${LANGUAGES.map(l=>`<option value="${l.k}" ${l.k===b.language?'selected':''}>${l.label}</option>`).join("")}</select></div>
        <div class="field"><label>المنطقة الزمنية</label><select id="bsTz">${TIMEZONES.map(t=>`<option ${t===b.timezone?'selected':''}>${t}</option>`).join("")}</select></div>
      </div>
    </div>
    <div class="bs-sub"><div class="bs-sub-t">ساعات العمل</div>
      <div class="row2">
        <div class="field"><label>الفتح</label><input id="bsOpen" type="time" value="${wh.open}"></div>
        <div class="field"><label>الإغلاق</label><input id="bsClose" type="time" value="${wh.close}"></div>
      </div>
      <div class="su-days">${days}</div>
    </div>
    <div class="bs-sub"><div class="bs-sub-t">الخدمات</div><div class="su-toggles">${svcToggles}</div></div>
    <div class="bs-sub"><div class="bs-sub-t">طرق الدفع</div><div class="su-toggles">${payToggles}${customs}</div>
      <div class="su-add"><input id="bsPayCustom" type="text" placeholder="طريقة دفع مخصّصة"><button type="button" class="mini" data-bs-pay-add>إضافة</button></div>
    </div>`;
}

Object.assign(App.pages, { businessSettingsHTML });
