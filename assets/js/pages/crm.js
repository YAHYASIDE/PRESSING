/* pages/crm.js — Customer CRM + Vehicle registry screen. List → profile with
   stats, timeline, vehicles and contact info. Oil-change launched from a vehicle. */

function crmStat(v,l,cls){ return `<div class="acc-kpi ${cls||''}"><div class="acc-kpi-v">${v}</div><div class="acc-kpi-l">${l}</div></div>`; }

function crmList(){
  const q=(state.crmSearch||"").trim();
  let list=App.core.crmCustomers();
  if(q) list=list.filter(c=>((c.name||"").includes(q))||((c.plate||"").includes(q))||((c.phone||"").includes(q)));
  list=list.sort((a,b)=>new Date(b.lastVisit||0)-new Date(a.lastVisit||0));
  const cards=list.length?list.map(c=>{
    const bal=App.core.custBalance(c), visits=App.core.custVisitCount(c);
    return `<button type="button" class="crm-card" data-crm-open="${c.id}">
      <span class="crm-av">${(c.name||c.plate||'?').slice(0,1)}</span>
      <span class="crm-c-main"><b>${c.name||"زبون"} ${App.core.tierBadge(c)}</b><span>${c.plate||""}${c.phone?` · ${c.phone}`:""}</span></span>
      <span class="crm-c-side">${bal>0?`<span class="crm-owe">${money(bal)}</span>`:`<span class="crm-visits">${visits} زيارة</span>`}<i class="op-chev">›</i></span>
    </button>`; }).join("")
    : emptyState({icon:I.profit, title:q?"لا توجد نتائج":"لا يوجد زبائن بعد", sub:q?"جرّب اسمًا أو لوحة أخرى.":"يُضاف الزبائن تلقائيًا مع كل عملية أو فاتورة.", btn:"➕ إضافة زبون", btnAttr:'data-crm-new', btnClass:'big'});
  return `<input class="search-inp" id="crmSearch" type="text" placeholder="🔍 بحث بالاسم أو اللوحة أو الهاتف" value="${q}">
    <div class="crm-cards">${cards}</div>
    <button class="fab" data-crm-new aria-label="زبون جديد">＋</button>`;
}

function crmTimeline(c){
  const ev=App.core.custTimeline(c);
  if(!ev.length) return emptyState({icon:I.chart, title:"لا يوجد نشاط بعد", sub:"تظهر هنا كل الفواتير والعمليات والمرتجعات."});
  const ic={car:"🚗",carpet:"🧺",invoice:"🧾",oil:"🛢️",refund:"↩️"};
  return `<div class="crm-tl">${ev.map(e=>`
    <div class="tl-ev">
      <span class="tl-ev-ic">${ic[e.t]||"•"}</span>
      <span class="tl-ev-body"><b>${e.title}</b><span>${ymd(e.date)}${e.sub?` · ${e.sub}`:""}${e.ref?` · ${e.ref}`:""}</span></span>
      <span class="tl-ev-amt ${e.amount<0?'neg':''} ${e.paid?'':'owe'}">${money(e.amount)}${e.paid?"":" · آجل"}</span>
    </div>`).join("")}</div>`;
}
function crmVehicles(c){
  const vs=App.core.custVehicles(c);
  const oil=bizTypeOn("oil-change");
  const cards=vs.length?vs.map(v=>{
    const due=App.core.vehOilDue(v);
    return `<div class="veh-card">
      <div class="veh-head"><b>${v.plate}</b>${v.brand||v.model?`<span>${v.brand} ${v.model}</span>`:""}${due&&due.due?`<span class="veh-due">صيانة زيت</span>`:""}</div>
      <div class="veh-grid">
        ${v.year?`<div><span>السنة</span><b>${v.year}</b></div>`:""}
        ${v.color?`<div><span>اللون</span><b>${v.color}</b></div>`:""}
        ${v.fuelType?`<div><span>الوقود</span><b>${v.fuelType}</b></div>`:""}
        ${v.mileage?`<div><span>العداد</span><b>${v.mileage} كم</b></div>`:""}
        ${v.oilType?`<div><span>الزيت</span><b>${v.oilType}</b></div>`:""}
        ${v.nextOilMileage?`<div><span>الزيت القادم</span><b>${v.nextOilMileage} كم</b></div>`:""}
      </div>
      ${(v.history&&v.history.length)?`<div class="veh-hist">آخر خدمة: ${ymd(v.history[v.history.length-1].date)} · ${v.history[v.history.length-1].ref||""}</div>`:""}
      <div class="veh-acts">
        ${oil?`<button class="mini" data-crm-oil="${v.id}">🛢️ تغيير زيت</button>`:""}
        <button class="mini" data-crm-veh-edit="${v.id}">تعديل</button>
        <button class="icon-btn" data-crm-veh-del="${v.id}" title="حذف المركبة" aria-label="حذف المركبة">${svg(I.trash)}</button>
      </div>
    </div>`; }).join("")
    : emptyState({icon:I.car, title:"لا توجد مركبات", sub:"أضف مركبة لهذا الزبون لتتبّع الصيانة."});
  return `${cards}<button class="btn-primary crm-addveh" data-crm-veh-new="${c.id}">➕ إضافة مركبة</button>`;
}
function crmInfo(c){
  const row=(k,v)=>`<div class="acc-row"><span>${k}</span><b>${v||"—"}</b></div>`;
  const loy=loyaltyEnabled()?`<div class="acc-card"><div class="acc-card-t">الولاء</div>${row("الحالة",loyaltyStatus(c))}${row("إجمالي الغسلات",c.totalWashes||0)}${row("المجانية",c.freeWashes||0)}</div>`:"";
  return `<div class="acc-card"><div class="acc-card-t">بيانات الاتصال</div>
      ${row("الاسم",c.name)}${row("الهاتف",c.phone)}${row("هاتف إضافي",c.phone2)}${row("واتساب",c.whatsapp||c.phone)}${row("البريد",c.email)}${row("العنوان",c.address)}${row("النوع",c.type)}${row("الوسوم",(c.tags||[]).join("، "))}
    </div>
    <div class="acc-card"><div class="acc-card-t">الحساب</div>
      ${row("حد الائتمان",c.creditLimit?money(c.creditLimit):"—")}${row("الرصيد المستحق",money(App.core.custBalance(c)))}${row("العضوية",c.membership)}${row("مدير الحساب",c.accountManager)}${row("تاريخ التسجيل",c.registeredAt?ymd(c.registeredAt):"—")}${row("آخر زيارة",c.lastVisit?ymd(c.lastVisit):"—")}
    </div>
    ${c.notes?`<div class="acc-card"><div class="acc-card-t">ملاحظات</div><div class="od-note">${c.notes}</div></div>`:""}
    ${loy}
    <button class="btn-primary" data-crm-edit="${c.id}">✏️ تعديل البيانات</button>`;
}
function crmMembership(c){
  const m=App.core.customerMembership(c), active=App.core.membershipActive(c);
  const cur = m?`<div class="mem-current ${active?'active':'expired'}">
      <div class="mem-cur-plan">${m.label}${m.unlimited?" · غير محدود":""}</div>
      <div class="mem-cur-meta">${active?`${App.core.membershipDaysLeft(c)} يوم متبقٍ`:"منتهية"}${m.unlimited?"":` · ${m.remaining} خدمة متبقية`}${m.discount?` · خصم ${m.discount}%`:""}</div>
      <label class="mem-auto"><input type="checkbox" ${m.autoRenew?"checked":""} data-mem-autorenew="${c.id}"> تجديد تلقائي</label>
      ${active&&App.core.redeemAvailable(c)?`<button type="button" class="mini" data-mem-redeem="${c.id}">استخدام خدمة</button>`:""}
    </div>`:`<div class="acc-empty">لا توجد عضوية نشطة</div>`;
  const plans=MEMBERSHIP_PLANS.map(pl=>`<button type="button" class="mem-plan tier-${pl.k}" data-mem-buy="${c.id}|${pl.k}">
      <span class="mem-plan-n">${pl.label}</span><span class="mem-plan-p">${money(pl.price)}</span>
      <span class="mem-plan-d">${pl.unlimited?"غسيل غير محدود":pl.services+" خدمة"} · ${pl.days} يوم${pl.discount?` · خصم ${pl.discount}%`:""}${pl.priority?" · أولوية":""}</span></button>`).join("");
  const pkgs=App.core.activePackages(c);
  const pkgList=pkgs.length?pkgs.map(p=>`<div class="acc-row"><span>${p.label}</span><b>${p.remaining}/${p.total} متبقٍ</b></div>`).join(""):`<div class="acc-empty">لا توجد باقات نشطة</div>`;
  const buyPkgs=SERVICE_PACKAGES.map(pk=>`<button type="button" class="mini" data-pkg-buy="${c.id}|${pk.k}">${pk.label} · ${money(pk.price)}</button>`).join("");
  return `
    <div class="acc-card"><div class="acc-card-t">العضوية الحالية</div>${cur}</div>
    <div class="acc-card"><div class="acc-card-t">اشترك في خطة</div><div class="mem-plans">${plans}</div></div>
    <div class="acc-card"><div class="acc-card-t">باقات الخدمات (${App.core.packageRemaining(c)} متبقٍ)</div>${pkgList}<div class="mem-buy-pkgs">${buyPkgs}</div></div>`;
}
function crmProfile(c){
  const cur=state.crmTab||"timeline";
  const pref=App.core.custPreferredServices(c);
  const seg=[{k:"timeline",t:"الجدول الزمني"},{k:"vehicles",t:`المركبات (${App.core.custVehicles(c).length})`},{k:"membership",t:"العضوية"},{k:"info",t:"المعلومات"}]
    .map(x=>`<button data-crm-tab="${x.k}" class="${cur===x.k?'on':''}">${x.t}</button>`).join("");
  const body = cur==="vehicles"?crmVehicles(c) : cur==="membership"?crmMembership(c) : cur==="info"?crmInfo(c) : crmTimeline(c);
  return `
    <div class="od-head"><button type="button" class="od-back" data-crm-back aria-label="رجوع">→</button><div class="od-htitle">${c.name||c.plate||"زبون"}</div><button class="icon-btn" data-crm-edit="${c.id}">✏️</button></div>
    <div class="crm-profile">
      <div class="crm-hero"><span class="crm-av big">${(c.name||c.plate||'?').slice(0,1)}</span>
        <div class="crm-hero-main"><div class="crm-hero-name">${c.name||"زبون"} ${App.core.tierBadge(c)}</div><div class="crm-hero-sub">${c.plate||""}${c.phone?` · ${c.phone}`:""}</div>${pref.length?`<div class="crm-pref">${pref.map(s=>`<span>${s}</span>`).join("")}</div>`:""}</div>
        ${c.phone?`<a class="wa-btn call-btn" href="tel:${c.phone}">📞</a>`:""}
      </div>
      <div class="acc-kpis crm-kpis">
        ${crmStat(money(App.core.custRevenue(c)),"إجمالي الإنفاق","k-rev")}
        ${crmStat(App.core.custVisitCount(c),"الزيارات","k-cash")}
        ${crmStat(money(App.core.custAvgTicket(c)),"متوسط الفاتورة","k-net")}
        ${crmStat(money(App.core.custBalance(c)),"مستحق",App.core.custBalance(c)>0?"k-loss":"k-rev")}
      </div>
      <div class="seg acc-seg">${seg}</div>
      ${body}
    </div>`;
}
function screenCrm(){
  const c=state.crmSel?App.core.crmCustomer(state.crmSel):null;
  return `
    ${c?"":`<div class="screen-head"><h2>الزبائن</h2><span>ملفات · مركبات · سجل كامل</span></div>`}
    ${c?crmProfile(c):crmList()}
    <div id="crmSheet" class="sheet"><div class="sheet-backdrop" data-crm-sheet-close></div>
      <div class="sheet-card"><div class="sheet-handle"></div><h3 id="crmSheetTitle">—</h3><div id="crmSheetBody"></div>
      <button type="button" class="mini sheet-cancel" data-crm-sheet-close>إلغاء</button></div></div>`;
}

Object.assign(App.pages, { screenCrm });
