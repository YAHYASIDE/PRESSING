/* pages/pos.js — Point of Sale: catalog (products + services), cart, checkout,
   invoice history, and a printable receipt with QR. Mobile-first. Mutations go
   through App.services.*; every sale/refund posts to accounting automatically. */

function posCatalog(){
  const q=(state.posSearch||"").trim();
  const cat=state.posCat||"all";
  const cats=["all"].concat(App.core.invCategories()).concat(["__svc"]);
  const catBtn=(k)=>{ const lbl=k==="all"?"الكل":k==="__svc"?"خدمات":k; return `<button class="queue q-${k===cat?'on':''} ${k===cat?'on':''}" data-pos-cat="${k}"><span class="q-l">${lbl}</span></button>`; };
  const chips=cats.map(catBtn).join("");
  let prods=App.core.invProducts();
  if(q) prods=prods.filter(p=>(p.name||"").includes(q)||(p.barcode||"").includes(q)||(p.sku||"").includes(q));
  if(cat!=="all"&&cat!=="__svc") prods=prods.filter(p=>p.category===cat);
  const showProds=(cat!=="__svc");
  const showSvcs=(cat==="all"||cat==="__svc");
  const prodCards=showProds?prods.map(p=>`
    <button type="button" class="pos-item ${((+p.qty||0)<=0)?'oos':''}" data-pos-prod="${p.id}" ${((+p.qty||0)<=0)?'disabled':''}>
      <span class="pos-item-ic">${svg(I.wallet)}</span>
      <span class="pos-item-name">${p.name}</span>
      <span class="pos-item-price">${money(p.price)}</span>
      <span class="pos-item-stock ${((+p.qty||0)<=(+p.min||0))?'low':''}">${p.qty} ${p.unit}</span>
    </button>`).join(""):"";
  let svcs=bizServices();
  if(q&&showSvcs) svcs=svcs.filter(s=>s.includes(q));
  const svcCards=showSvcs?svcs.map(s=>{ const pr=(state.posServicePrices&&state.posServicePrices[s])||0;
    return `<button type="button" class="pos-item pos-svc" data-pos-svc="${encodeURIComponent(s)}">
      <span class="pos-item-ic">${svg(I.car)}</span>
      <span class="pos-item-name">${s}</span>
      <span class="pos-item-price">${pr?money(pr):"سعر حر"}</span>
      <span class="pos-item-stock">خدمة</span>
    </button>`; }).join(""):"";
  const grid=(prodCards+svcCards)||emptyState({icon:I.wallet, title:"لا توجد أصناف", sub:"أضف منتجات من شاشة المخزون أو خدمات من إعدادات النشاط."});
  return `
    <input class="search-inp" id="posSearch" type="text" placeholder="🔍 بحث بالاسم أو الباركود" value="${q}">
    <div class="queues scroll-x pos-cats">${chips}</div>
    <div class="pos-grid">${grid}</div>`;
}
function posCartBar(){
  const n=App.core.cartCount(); if(!n) return "";
  return `<button type="button" class="pos-cartbar" data-pos-opencart><span class="pcb-n">🛒 ${n}</span><span class="pcb-lbl">عرض السلة والدفع</span><b class="pcb-total">${money(App.core.cartTotal())}</b></button>`;
}
function posCartSheet(){
  const c=App.core.posCart();
  const items=c.length?c.map(i=>`
    <div class="pc-line">
      <div class="pc-info"><b>${i.name}</b><span>${i.kind==="service"?'<i class="pc-tag">خدمة</i>':''}${money(i.price)}</span></div>
      ${i.kind==="service"?`<input class="pc-price" type="number" min="0" value="${i.price}" data-pc-price="${i.lid}">`:""}
      <div class="pc-qty"><button data-pc-dec="${i.lid}">−</button><b>${i.qty}</b><button data-pc-inc="${i.lid}">＋</button></div>
      <div class="pc-total">${money(i.price*i.qty)}</div>
      <button class="pc-rm" data-pc-rm="${i.lid}">✕</button>
    </div>`).join(""):`<div class="acc-empty">السلة فارغة</div>`;
  const p=App.core.posState();
  const taxOn=App.core.cartTaxRate()>0;
  const pm=bizPayMethods();
  const due=App.core.paymentsDue();
  const pays=(p.payments||[]).map((x,idx)=>`<div class="pc-pay"><span>${(pm.find(m=>m.k===x.method)||{}).label||x.method}</span><b>${money(x.amount)}</b><button data-pc-payrm="${idx}">✕</button></div>`).join("");
  return `<div id="cartSheet" class="sheet">
    <div class="sheet-backdrop" data-pos-closecart></div>
    <div class="sheet-card pos-sheet">
      <div class="sheet-handle"></div>
      <h3>السلة</h3>
      <div class="pc-lines">${items}</div>
      <div class="pc-controls">
        <div class="pc-disc-row">
          <input class="pc-disc" type="number" min="0" placeholder="خصم" value="${p.discount||''}" id="pcDisc">
          <button class="mini ${p.discType==='amount'?'on':''}" data-pc-disctype="amount">مبلغ</button>
          <button class="mini ${p.discType==='percent'?'on':''}" data-pc-disctype="percent">%</button>
        </div>
        <div class="pc-coupon-row"><input class="pc-coupon" type="text" placeholder="كوبون خصم" value="${p.coupon||''}" id="pcCoupon"><button class="mini" id="pcCouponApply">تطبيق</button></div>
        <div class="row2"><input class="pc-cust" type="text" placeholder="اسم الزبون" value="${(p.customer&&p.customer.name)||''}" id="pcCustName"><input class="pc-cust" type="text" placeholder="لوحة/مركبة" value="${(p.customer&&p.customer.plate)||''}" id="pcCustPlate"></div>
        <input class="pc-note" type="text" placeholder="ملاحظة على الفاتورة" value="${p.note||''}" id="pcNote">
      </div>
      <div class="pc-totals">
        <div class="pc-trow"><span>المجموع</span><b>${money(App.core.cartSubtotal())}</b></div>
        <div class="pc-trow"><span>الخصم</span><b>-${money(App.core.cartDiscountAmt())}</b></div>
        ${taxOn?`<div class="pc-trow"><span>${(biz().tax||{}).label||'ضريبة'} (${App.core.cartTaxRate()}%)</span><b>${money(App.core.cartTaxAmt())}</b></div>`:""}
        <div class="pc-trow grand"><span>الإجمالي</span><b>${money(App.core.cartTotal())}</b></div>
      </div>
      <div class="pc-pays">${pays}</div>
      <div class="pc-due ${due>0.009?'owed':'ok'}">${due>0.009?`المتبقّي: ${money(due)}`:`مدفوع بالكامل ✓`}</div>
      <div class="pc-methods">${pm.map(m=>`<button type="button" class="pay-method pm-${m.k}" data-pc-pay="${m.k}">${m.label}</button>`).join("")}</div>
      <div class="pc-actions">
        <button type="button" class="mini" data-pos-hold>تعليق</button>
        <button type="button" class="btn-primary" data-pos-checkout>إتمام البيع${due>0.009?' (آجل)':''}</button>
      </div>
    </div>
  </div>`;
}
function posSell(){
  return `${posCatalog()}${posCartBar()}${posCartSheet()}`;
}
function posInvoices(){
  const list=(state.invoices||[]).slice().reverse();
  if(!list.length) return emptyState({icon:I.income, title:"لا توجد فواتير بعد", sub:"أنشئ أول فاتورة من تبويب البيع."});
  const stLbl={paid:"مدفوعة",credit:"آجلة",held:"معلّقة",refunded:"مُرتجعة","partial-refund":"مرتجع جزئي"};
  return `<div class="pos-invlist">${list.map(inv=>`
    <div class="inv-row st-${inv.status}">
      <div class="inv-row-main" data-pos-receipt="${inv.id}">
        <div class="inv-row-no">${inv.no} <span class="inv-status s-${inv.status}">${stLbl[inv.status]||inv.status}</span></div>
        <div class="inv-row-sub">${ymd(inv.date)} · ${inv.items.length} صنف${inv.customer&&inv.customer.name?` · ${inv.customer.name}`:""}</div>
      </div>
      <div class="inv-row-amt">${money(inv.total)}</div>
      <div class="inv-row-acts">
        ${inv.status==="held"
          ? `<button class="mini" data-pos-resume="${inv.id}">استئناف</button><button class="icon-btn" data-pos-cancelheld="${inv.id}">${svg(I.trash)}</button>`
          : `<button class="icon-btn" data-pos-receipt="${inv.id}" title="إيصال">🧾</button><button class="icon-btn" data-pos-dup="${inv.id}" title="نسخ">⧉</button>${(inv.status!=="refunded")?`<button class="icon-btn" data-pos-refund="${inv.id}" title="مرتجع">↩</button>`:""}`}
      </div>
    </div>`).join("")}</div>`;
}
function screenPos(){
  const cur=state.posTab||"sell";
  const heldN=(state.invoices||[]).filter(i=>i.status==="held").length;
  const seg=[{k:"sell",t:"البيع"},{k:"invoices",t:`الفواتير${heldN?` (${heldN} معلّقة)`:""}`}]
    .map(x=>`<button data-pos-tab="${x.k}" class="${cur===x.k?'on':''}">${x.t}</button>`).join("");
  return `
    <div class="screen-head"><h2>نقطة البيع</h2><span>منتجات وخدمات · فاتورة · محاسبة تلقائية</span></div>
    <div class="seg acc-seg">${seg}</div>
    ${cur==="invoices"?posInvoices():posSell()}
    <div id="receiptModal" class="modal"><div class="modal-box receipt-box"><div id="receiptBody"></div>
      <div class="modal-actions"><button class="btn-primary" id="rcptPrint" style="flex:1">🖨️ طباعة</button><button class="mini" id="rcptClose">إغلاق</button></div></div></div>`;
}

/* build the printable receipt for an invoice (logo, items, tax, total, QR) */
function posReceiptHTML(inv){
  const pm=bizPayMethods();
  const b=state.business||{};
  const rows=inv.items.map(i=>`<div class="rc-item"><span>${i.name}${i.qty>1?` ×${i.qty}`:""}</span><b>${money(i.price*i.qty)}</b></div>`).join("");
  const pays=inv.payments.map(p=>`<div class="rc-row"><span>${(pm.find(m=>m.k===p.method)||{}).label||p.method}</span><b>${money(p.amount)}</b></div>`).join("");
  const refunded=App.core.invoiceRefunded(inv);
  const payload=`WASHLY|${inv.no}|TOTAL ${Math.round(inv.total)}|${ymd(inv.date)}`;
  const qr=(App.ui&&App.ui.qrSVG)?App.ui.qrSVG(payload,{size:120}):"";
  return `<div class="receipt">
    <div class="rc-head">${b.logo?`<img class="rc-logo" src="${b.logo}" alt="">`:""}<div class="rc-name">${bizName()}</div>${bizPhone()?`<div class="rc-phone">${bizPhone()}</div>`:""}</div>
    <div class="rc-meta"><span>فاتورة: ${inv.no}</span><span>${ymd(inv.date)} ${timeStr(inv.date)}</span></div>
    ${(inv.customer&&(inv.customer.name||inv.customer.plate))?`<div class="rc-meta"><span>${inv.customer.name||"زبون"}</span><span>${inv.customer.plate||""}</span></div>`:""}
    <div class="rc-sep"></div>
    <div class="rc-items">${rows}</div>
    <div class="rc-sep"></div>
    <div class="rc-row"><span>المجموع</span><b>${money(inv.subtotal)}</b></div>
    ${inv.discount>0?`<div class="rc-row"><span>الخصم</span><b>-${money(inv.discount)}</b></div>`:""}
    ${inv.tax>0?`<div class="rc-row"><span>${inv.taxLabel||"ضريبة"}${inv.taxRate?` (${inv.taxRate}%)`:""}</span><b>${money(inv.tax)}</b></div>`:""}
    <div class="rc-row grand"><span>الإجمالي</span><b>${money(inv.total)}</b></div>
    ${pays?`<div class="rc-sep"></div>${pays}`:""}
    ${inv.credit>0?`<div class="rc-row owed"><span>آجل (دَين)</span><b>${money(inv.credit)}</b></div>`:""}
    ${refunded>0?`<div class="rc-row owed"><span>مُرتجع</span><b>-${money(refunded)}</b></div>`:""}
    ${inv.note?`<div class="rc-note">${inv.note}</div>`:""}
    <div class="rc-qr">${qr}</div>
    <div class="rc-foot">${(state.thanksMsg||"شكرًا لزيارتكم 🌟")}</div>
  </div>`;
}

Object.assign(App.pages, { screenPos, posReceiptHTML });
