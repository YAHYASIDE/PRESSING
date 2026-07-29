/* pages/inventory.js — Inventory screen (products, suppliers, movements, alerts).
   Sub-tabs render from App.core.inv*; mutations go through App.services.*.
   Every stock movement posts to accounting automatically. Mobile-first. */

function invStatusBadge(p){ const s=App.core.invStatus(p); return `<span class="inv-badge b-${s.k}">${s.label}</span>`; }
function invExpiryTag(p){
  if(!p.expiry) return "";
  const t=new Date(p.expiry).getTime(), soon=(t-Date.now())<INV_EXPIRY_WARN_DAYS*86400000;
  return `<span class="inv-exp ${soon?'warn':''}">⏳ ${ymd(p.expiry)}</span>`;
}
function invProductCard(p){
  const s=App.core.invStatus(p);
  return `<div class="inv-card st-${s.k}">
    <div class="inv-main">
      <div class="inv-name">${p.name} ${invStatusBadge(p)}</div>
      <div class="inv-meta"><span class="acc-code">${p.sku}</span> ${p.category}${p.barcode?` · ⌗ ${p.barcode}`:""} ${invExpiryTag(p)}</div>
    </div>
    <div class="inv-nums">
      <div class="inv-qty ${s.k}"><b>${p.qty}</b><span>${p.unit}</span></div>
      <div class="inv-price">${money(p.price)}</div>
    </div>
    <div class="inv-acts">
      <button class="mini" data-inv-receive="${p.id}">＋ استلام</button>
      <button class="mini" data-inv-adjust="${p.id}">جرد</button>
      <button class="mini" data-inv-edit="${p.id}">تعديل</button>
      <button class="icon-btn" data-inv-del="${p.id}" title="حذف">${svg(I.trash)}</button>
    </div>
  </div>`;
}

function invProductsTab(){
  const prods=App.core.invProducts();
  const low=App.core.invLowStock().length;
  const q=(state.invSearch||"").trim();
  let list=prods; if(q) list=prods.filter(p=>(p.name||"").includes(q)||(p.barcode||"").includes(q)||(p.sku||"").includes(q));
  const cats=App.core.invCategories();
  const catOpts=cats.map(c=>`<option value="${c}">${c}</option>`).join("");
  const supOpts=`<option value="">— بدون —</option>`+App.core.invSuppliers().map(s=>`<option value="${s.name}">${s.name}</option>`).join("");
  const unitOpts=INV_UNITS.map(u=>`<option value="${u}">${u}</option>`).join("");
  const kpis=`<div class="acc-kpis">
    ${acctKpi(prods.length,"منتجات","k-cash")}
    ${acctKpi(money(App.core.invValue()),"قيمة المخزون","k-net")}
    ${acctKpi(low,"منخفض المخزون",low?"k-loss":"k-rev")}
  </div>`;
  const cards=list.length?list.map(invProductCard).join("")
    : emptyState({icon:I.wallet, title:q?"لا توجد نتائج":"لا توجد منتجات بعد", sub:q?"جرّب اسمًا أو باركود آخر.":"أضف أول منتج للبدء بإدارة المخزون."});
  return `${kpis}
    <input class="search-inp" id="invSearch" type="text" placeholder="بحث بالاسم أو الباركود" value="${q}">
    <div class="ops-list inv-list">${cards}</div>
    <details class="loyalty-collapse inv-add" ${state.invAddOpen?"open":""}>
      <summary>➕ إضافة منتج</summary>
      <div class="lc-body">
        <div class="field"><label>اسم المنتج</label><input id="ipName" type="text" placeholder="مثال: زيت محرك 5L"></div>
        <div class="row2">
          <div class="field"><label>الفئة</label><select id="ipCat">${catOpts}</select></div>
          <div class="field"><label>الوحدة</label><select id="ipUnit">${unitOpts}</select></div>
        </div>
        <div class="row2">
          <div class="field"><label>التكلفة</label><input id="ipCost" type="number" min="0" value="0"></div>
          <div class="field"><label>سعر البيع</label><input id="ipPrice" type="number" min="0" value="0"></div>
        </div>
        <div class="row2">
          <div class="field"><label>الكمية الحالية</label><input id="ipQty" type="number" min="0" value="0"></div>
          <div class="field"><label>حد التنبيه</label><input id="ipMin" type="number" min="0" value="${INV_LOW_STOCK_DEFAULT}"></div>
        </div>
        <div class="row2">
          <div class="field"><label>الباركود</label><input id="ipBarcode" type="text" placeholder="اختياري"></div>
          <div class="field"><label>تاريخ الانتهاء</label><input id="ipExpiry" type="date"></div>
        </div>
        <div class="field"><label>المورد</label><select id="ipSupplier">${supOpts}</select></div>
        <button class="btn-primary" id="ipSave">حفظ المنتج</button>
      </div>
    </details>`;
}
function invLowTab(){
  const low=App.core.invLowStock(), exp=App.core.invExpiring();
  const lowList=low.length?low.map(invProductCard).join(""):emptyState({icon:I.profit, title:"لا يوجد نقص", sub:"كل المنتجات ضمن حدود المخزون الآمنة."});
  const expList=exp.length?`<div class="acc-card"><div class="acc-card-t">قرب انتهاء الصلاحية</div>${exp.map(p=>`<div class="acc-row"><span>${p.name}</span><b>${ymd(p.expiry)}</b></div>`).join("")}</div>`:"";
  return `${low.length?`<div class="inv-alert">⚠ ${low.length} منتج بحاجة إعادة طلب</div>`:""}
    <div class="ops-list inv-list">${lowList}</div>${expList}`;
}
function invSuppliersTab(){
  const sup=App.core.invSuppliers();
  const rows=sup.length?sup.map(s=>`<div class="acc-row"><span>${s.name}${s.phone?` · ${s.phone}`:""}</span><button class="icon-btn" data-inv-supdel="${s.id}">${svg(I.trash)}</button></div>`).join("")
    :emptyState({icon:I.profit, title:"لا يوجد موردون", sub:"أضف موردًا لربطه بعمليات الاستلام."});
  return `<div class="acc-card"><div class="acc-card-t">إضافة مورد</div>
      <div class="row2"><div class="field"><label>الاسم</label><input id="isName" type="text" placeholder="اسم المورد"></div>
      <div class="field"><label>الهاتف</label><input id="isPhone" type="tel" inputmode="numeric" placeholder="اختياري"></div></div>
      <button class="btn-primary" id="isSave">إضافة المورد</button></div>
    <div class="acc-card"><div class="acc-card-t">الموردون (${sup.length})</div>${rows}</div>`;
}
function invMovementsTab(){
  const mv=App.core.invMovements().slice().reverse().slice(0,80);
  const tLbl={in:"استلام",out:"صرف",adjust:"جرد"};
  const rows=mv.length?mv.map(m=>{ const p=App.core.invProduct(m.productId)||{name:"—"};
    return `<tr><td>${ymd(m.date)}</td><td>${p.name}</td><td><span class="inv-mv t-${m.type}">${tLbl[m.type]||m.type}</span></td><td class="amt ${m.qty<0?'neg':'pos'}">${m.qty>0?"+":""}${m.qty}</td><td>${m.ref||""}</td></tr>`;
  }).join(""):`<tr><td colspan="5">${emptyState({icon:I.chart, title:"لا توجد حركات بعد"})}</td></tr>`;
  return `<div class="acc-card"><div class="acc-card-t">سجل الحركات</div>
    <div class="tbl-wrap"><table class="tbl acc-tbl"><thead><tr><th>التاريخ</th><th>المنتج</th><th>النوع</th><th>الكمية</th><th>مرجع</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function screenInventory(){
  const tabs=[
    {k:"products",  t:"المنتجات"},
    {k:"low",       t:"تنبيهات"},
    {k:"suppliers", t:"الموردون"},
    {k:"movements", t:"الحركات"}
  ];
  const cur=state.invTab||"products";
  const lowN=App.core.invLowStock().length;
  const seg=tabs.map(x=>`<button data-inv-tab="${x.k}" class="${cur===x.k?'on':''}">${x.t}${x.k==="low"&&lowN?` <i class="seg-n">${lowN}</i>`:""}</button>`).join("");
  const body = cur==="low"?invLowTab() : cur==="suppliers"?invSuppliersTab() : cur==="movements"?invMovementsTab() : invProductsTab();
  return `
    <div class="screen-head"><h2>المخزون</h2><span>منتجات · موردون · حركات مرتبطة بالمحاسبة</span></div>
    <div class="seg acc-seg scroll-x">${seg}</div>
    ${body}
    <div id="invSheet" class="sheet">
      <div class="sheet-backdrop" data-inv-close></div>
      <div class="sheet-card"><div class="sheet-handle"></div>
        <h3 id="invSheetTitle">—</h3>
        <div id="invSheetBody"></div>
        <button type="button" class="mini sheet-cancel" data-inv-close>إلغاء</button>
      </div>
    </div>`;
}

Object.assign(App.pages, { screenInventory, invProductCard });
