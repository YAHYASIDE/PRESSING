/* pages/setup.js — Business Setup Wizard step views (pure render from the draft).
   Release 5.1: reduced to FOUR fast steps. Everything not asked here uses the
   sensible defaults in defaultBusiness() and is editable later in Settings.
   Navigation / commit live in app.js (startSetup / renderSetupStep / finishSetup). */

function setupSteps(){ return ["activities","manager","info","success"]; }

function suSwitch(attr,val,on){ return `<span class="switch"><input type="checkbox" data-su-${attr}="${val}" ${on?"checked":""}><span class="slider"></span></span>`; }

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
  if(key==="manager"){
    return `<h2 class="su-h">معلومات المدير</h2><p class="su-sub">سيتم إنشاء حسابك كمدير للنظام وتسجيل دخولك تلقائيًا.</p>
      <div class="field"><label>اسم المدير</label><input id="suMgrName" type="text" value="${(d._mgrName||'').replace(/"/g,'&quot;')}" placeholder="اسمك الكامل" autocomplete="off"></div>
      <div class="field"><label>رقم الهاتف</label><div class="phone-row"><select id="suMgrCountry" class="cc-select">${countryOpts()}</select><input id="suMgrPhone" class="phone-inp" type="tel" inputmode="numeric" maxlength="9" value="${d._mgrPhone||''}" placeholder="رقم الهاتف"></div></div>
      <div class="field"><label>كلمة المرور</label><input id="suMgrPass" type="password" inputmode="numeric" value="${d._mgrPass||''}" placeholder="اختر كلمة مرور للدخول"><div class="hint">تُستخدم للدخول إلى النظام لاحقًا. يمكن تغييرها من الإعدادات.</div></div>`;
  }
  if(key==="info"){
    return `<h2 class="su-h">معلومات النشاط</h2><p class="su-sub">اسم نشاطك وشعارك فقط — كل شيء آخر مضبوط تلقائيًا ويمكن تعديله لاحقًا.</p>
      <div class="field"><label>اسم النشاط</label><input id="suName" type="text" value="${(d.name||'').replace(/"/g,'&quot;')}" placeholder="مثال: مغسلة النور"></div>
      <div class="field"><label>الشعار <span class="su-opt">(اختياري)</span></label>
        <div class="su-logo-row"><img id="suLogoPrev" class="su-logo-prev" src="${d.logo||LOGO}" alt="">
        <label class="mini su-logo-btn">اختيار صورة<input type="file" id="suLogo" accept="image/*" hidden></label></div></div>
      <div class="su-defaults">
        <div class="su-def-h">مضبوط تلقائيًا</div>
        <div class="su-def-tags"><span>العملة</span><span>الدولة</span><span>اللغة</span><span>ساعات العمل</span><span>طرق الدفع</span><span>الخدمات</span><span>الميزات</span></div>
        <div class="hint">يمكنك تعديل كل ذلك لاحقًا من الإعدادات ▸ إعدادات النشاط.</div>
      </div>`;
  }
  if(key==="success"){
    return `<div class="su-success">
      <div class="su-congrats">🎉</div>
      <h2>تهانينا!</h2>
      <p class="su-lead">تم إنشاء نشاطك بنجاح.</p>
      <div class="su-trial-box">
        <div class="su-gift">🎁</div>
        <div class="su-trial-t">حصلت على تجربة مجانية لمدة 3 أيام</div>
        <div class="su-trial-s">استخدم كل الميزات المدفوعة خلال فترة التجربة.</div>
        <div class="su-trial-count"><span class="su-trial-days">${TRIAL_DAYS}</span><span>أيام متبقية</span></div>
      </div>
      <div class="su-success-actions">
        <button type="button" class="btn-primary su-start" data-su-finish="dashboard">ابدأ استخدام النظام</button>
        <button type="button" class="mini su-plans-btn" data-su-finish="plans">عرض خطط الاشتراك</button>
      </div>
    </div>`;
  }
  return "";
}

Object.assign(App.pages, { setupSteps, setupStepView });
