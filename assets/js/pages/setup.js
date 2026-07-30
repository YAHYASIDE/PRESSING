/* pages/setup.js — Business Setup Wizard step views.
   Flow (exactly as designed): activities → business → admin → success.
     Step 1  Choose business activities (multi-select).
     Step 2  Business Information (name*, logo, manager name, phone, address).
     Step 3  Create Admin Account (full name, username, password, confirm).
     Step 4  Success (selected activities + business name → enter dashboard).
   activities/business/admin are the "form" steps counted in the progress bar;
   success is the full-bleed completion screen. Anything not asked here uses the
   sensible defaults in defaultBusiness(), editable later in Settings. */

function setupSteps(){ return ["activities","business","admin","success"]; }
function setupFormSteps(){ return ["activities","business","admin"]; }

function setupStepView(key,d){
  if(key==="activities"){
    return `<h2 class="su-h">اختر أنشطة عملك</h2><p class="su-sub">يمكنك اختيار واحد أو أكثر — تُحدِّد الشاشات التي تظهر لك. يمكنك تغييرها لاحقًا.</p>
      <div class="su-cards">${BUSINESS_TYPES.map(t=>`
        <button type="button" class="su-card ${d.types[t.k]?'on':''}" data-su-type="${t.k}">
          <span class="su-card-ic">${svg(I[t.icon]||I.car)}</span>
          <span class="su-card-body"><b>${t.label}</b><small>${t.desc}</small></span>
          <i class="su-check">✓</i>
        </button>`).join("")}</div>`;
  }
  if(key==="business"){
    return `<h2 class="su-h">معلومات النشاط</h2><p class="su-sub">اسم نشاطك ومعلومات التواصل. الحقول المميّزة بـ * مطلوبة.</p>
      <div class="field"><label>اسم النشاط *</label><input id="suName" type="text" value="${(d.name||'').replace(/"/g,'&quot;')}" placeholder="مثال: مغسلة النور" autocomplete="off"></div>
      <div class="field"><label>الشعار <span class="su-opt">(اختياري)</span></label>
        <div class="su-logo-row"><img id="suLogoPrev" class="su-logo-prev" src="${d.logo||LOGO}" alt="">
        <label class="mini su-logo-btn">اختيار صورة<input type="file" id="suLogo" accept="image/*" hidden></label></div></div>
      <div class="field"><label>اسم المدير</label><input id="suMgrName" type="text" value="${(d._mgrName||'').replace(/"/g,'&quot;')}" placeholder="اسم مدير النشاط" autocomplete="off"></div>
      <div class="field"><label>رقم الهاتف</label><div class="phone-row"><select id="suMgrCountry" class="cc-select">${countryOpts(d._mgrCountry)}</select><input id="suMgrPhone" class="phone-inp" type="tel" inputmode="numeric" maxlength="9" value="${d._mgrPhone||''}" placeholder="رقم الهاتف"></div></div>
      <div class="field"><label>العنوان</label><input id="suAddress" type="text" value="${(d._address||'').replace(/"/g,'&quot;')}" placeholder="عنوان النشاط" autocomplete="off"></div>`;
  }
  if(key==="admin"){
    return `<h2 class="su-h">إنشاء حساب المدير</h2><p class="su-sub">سيتم إنشاء حسابك كمدير للنظام وتسجيل دخولك تلقائيًا.</p>
      <div class="field"><label>الاسم الكامل *</label><input id="suAdminName" type="text" value="${(d._adminName||'').replace(/"/g,'&quot;')}" placeholder="اسمك الكامل" autocomplete="off"></div>
      <div class="field"><label>اسم المستخدم *</label><input id="suUsername" type="text" value="${(d._username||'').replace(/"/g,'&quot;')}" placeholder="اسم المستخدم للدخول" autocomplete="off"></div>
      <div class="field"><label>كلمة المرور *</label><input id="suPass" type="password" inputmode="numeric" value="${d._pass||''}" placeholder="اختر كلمة مرور للدخول"></div>
      <div class="field"><label>تأكيد كلمة المرور *</label><input id="suConfirm" type="password" inputmode="numeric" value="${d._confirm||''}" placeholder="أعد إدخال كلمة المرور"><div class="hint">تُستخدم للدخول إلى النظام لاحقًا. يمكن تغييرها من الإعدادات.</div></div>`;
  }
  if(key==="success"){
    const chosen=BUSINESS_TYPES.filter(t=>d.types[t.k]);
    return `<div class="su-success">
      <div class="su-success-illus">
        <svg viewBox="0 0 120 120" class="su-check-svg" aria-hidden="true">
          <circle class="su-check-ring" cx="60" cy="60" r="52"></circle>
          <path class="su-check-mark" d="M37 61 L53 77 L84 43"></path>
        </svg>
        <span class="su-spark s1">✦</span><span class="su-spark s2">✦</span><span class="su-spark s3">✦</span>
      </div>
      <h2>🎉 تهانينا!</h2>
      <p class="su-lead">نشاط <b>${(d.name||'').replace(/</g,'&lt;')||'—'}</b> جاهز للعمل.</p>
      <div class="su-success-types">${chosen.length?chosen.map(t=>`<span class="su-lc">${svg(I[t.icon]||I.car)}<span>${t.label}</span></span>`).join(""):`<span class="su-lc"><span>—</span></span>`}</div>
      <div class="su-trial-box">
        <div class="su-trial-badge">🎁 تم تفعيل التجربة المجانية</div>
        <div class="su-trial-count"><span class="su-trial-days">${TRIAL_DAYS}</span><span>أيام متبقية</span></div>
        <ul class="su-trial-list">
          <li>كل الميزات المدفوعة مفعّلة</li>
          <li>بدون بطاقة دفع</li>
          <li>يمكنك الترقية في أي وقت</li>
        </ul>
      </div>
      <div class="su-success-actions">
        <button type="button" class="btn-primary su-start" data-su-finish="dashboard">الدخول إلى لوحة التحكم</button>
        <button type="button" class="mini su-plans-btn" data-su-finish="plans">خطط الاشتراك</button>
      </div>
    </div>`;
  }
  return "";
}

Object.assign(App.pages, { setupSteps, setupFormSteps, setupStepView });
