/* pages/ops.js — Operations Center block (on the dashboard), global-search results,
   and the audit-log viewer. Pure render from App.core.* — no new data. */

function opsTile(v,l,cls){ return `<div class="ops-tile ${cls||''}"><div class="ops-tile-v">${v}</div><div class="ops-tile-l">${l}</div></div>`; }

function opsCenterHTML(){
  const s=App.core.opsStats();
  const rem=App.core.opsReminders();
  const carpet=bizTypeOn("carpet")||bizTypeOn("laundry");
  const oil=bizTypeOn("oil-change");
  const inv=App.core.featureEnabled("inventory");
  const remRow=(r)=>`<div class="ops-rem-row sev-${r.sev}"><b>${r.title}</b><span>${r.sub}</span></div>`;
  const audit=(state.audit||[]).slice(-20).reverse();
  return `<div class="ops-center">
    <div class="ops-sec-h">مركز العمليات المباشر <span>اليوم · ${new Date().toLocaleDateString("ar",{weekday:"long"})}</span></div>
    <div class="ops-grid money">
      ${opsTile(money(s.revenueToday),"إيرادات اليوم","t-rev")}
      ${opsTile(money(s.profitToday),"ربح اليوم",s.profitToday>=0?"t-net":"t-loss")}
      ${opsTile(money(s.expensesToday),"مصروفات اليوم","t-exp")}
      ${opsTile(s.ordersToday,"طلبات اليوم","t-ord")}
    </div>
    <div class="ops-grid">
      ${opsTile(s.carsWaiting,"سيارات منتظرة")}
      ${opsTile(s.carsWashing,"قيد الغسيل")}
      ${opsTile(s.carsReady,"جاهزة")}
      ${carpet?opsTile(s.carpetQueue,"طابور السجاد"):""}
      ${oil?opsTile(s.oilToday,"خدمات زيت اليوم"):""}
      ${opsTile(s.readyPickup,"جاهز للتسليم","t-ready")}
    </div>
    <div class="ops-grid balances">
      ${opsTile(money(s.cashBalance),"الصندوق","t-cash")}
      ${opsTile(money(s.bankBalance),"البنك","t-bank")}
      ${opsTile(money(s.receivable),"ذمم العملاء","t-ar")}
      ${inv?opsTile(s.lowStock,"تنبيهات مخزون",s.lowStock?"t-alert":""):opsTile(s.employees,"الموظفون")}
    </div>
    ${rem.length?`<details class="ops-rem" open><summary>🔔 التذكيرات (${rem.length})</summary><div class="ops-rem-list">${rem.slice(0,12).map(remRow).join("")}</div></details>`:""}
    ${audit.length?`<details class="ops-rem"><summary>📋 سجل التدقيق (${(state.audit||[]).length})</summary><div class="audit-list">${audit.map(a=>`<div class="audit-row"><span class="audit-act">${a.action}</span><span class="audit-det">${a.detail||""}</span><span class="audit-meta">${a.user||"—"} · ${ymd(a.date)} ${timeStr(a.date)}</span></div>`).join("")}</div></details>`:""}
  </div>`;
}

/* global-search results markup (results click carries a JSON "go" target) */
function searchResultsHTML(q){
  q=(q||"").trim();
  if(q.length<1) return `<div class="gs-hint">ابحث عن زبون، مركبة، فاتورة، منتج، أو قيد محاسبي…</div>`;
  const r=App.core.globalSearch(q);
  if(!r.total) return `<div class="gs-hint">لا توجد نتائج لـ «${q}»</div>`;
  return r.groups.map(g=>`<div class="gs-group">
    <div class="gs-g-h">${svg(I[g.icon]||I.chart)} ${g.label} <span>${g.items.length}${g.more?"+":""}</span></div>
    ${g.items.map(it=>`<button type="button" class="gs-item" data-gs="${encodeURIComponent(JSON.stringify(it.go))}"><b>${it.title}</b><span>${it.sub||""}</span></button>`).join("")}
    ${g.more?`<div class="gs-more">+${g.more} أخرى — حدّد البحث</div>`:""}
  </div>`).join("");
}

Object.assign(App.pages, { opsCenterHTML, searchResultsHTML });
