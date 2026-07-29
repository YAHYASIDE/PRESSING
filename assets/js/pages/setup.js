/* pages/setup.js — Business Setup Wizard step views (Release 5.2 commercial polish).
   Flow: welcome (landing) → activities → manager → info → success. The three middle
   steps are the "form" steps counted in the progress bar; welcome & success are
   full-bleed screens with their own buttons. Everything not asked uses the sensible
   defaults in defaultBusiness(), editable later in Settings. */

function setupSteps(){ return ["welcome","activities","manager","info","success"]; }
function setupFormSteps(){ return ["activities","manager","info"]; }

function setupStepView(key,d){
  if(key==="welcome"){
    return `<div class="su-landing">
      <div class="su-landing-top">
        <div class="su-landing-logo-wrap"><img class="su-landing-logo" src="${LOGO}" alt=""></div>
        <div class="su-landing-name">${APP_NAME}</div>
        <div class="su-landing-name-ar">${APP_NAME_AR}</div>
        <p class="su-landing-tag">${APP_TAGLINE}</p>
        <div class="su-landing-chips">
          ${BUSINESS_TYPES.map((t,i)=>`<span class="su-lc" style="animation-delay:${0.05*i+0.1}s">${svg(I[t.icon]||I.car)}<span>${t.label}</span></span>`).join("")}
        </div>
      </div>
      <div class="su-landing-foot">
        <button type="button" class="btn-primary su-cta" data-su-go>ابدأ الآن</button>
        <div class="su-landing-cr">${APP_COPYRIGHT} · v${APP_VERSION}</div>
      </div>
    </div>`;
  }
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
      <div class="su-success-illus">
        <svg viewBox="0 0 120 120" class="su-check-svg" aria-hidden="true">
          <circle class="su-check-ring" cx="60" cy="60" r="52"></circle>
          <path class="su-check-mark" d="M37 61 L53 77 L84 43"></path>
        </svg>
        <span class="su-spark s1">✦</span><span class="su-spark s2">✦</span><span class="su-spark s3">✦</span>
      </div>
      <h2>🎉 تهانينا!</h2>
      <p class="su-lead">نشاطك جاهز للعمل.</p>
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
        <button type="button" class="btn-primary su-start" data-su-finish="dashboard">ابدأ العمل</button>
        <button type="button" class="mini su-plans-btn" data-su-finish="plans">خطط الاشتراك</button>
      </div>
    </div>`;
  }
  return "";
}

Object.assign(App.pages, { setupSteps, setupFormSteps, setupStepView });
