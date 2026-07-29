/* pages/orders.js — Operations screens: car washes + laundry orders (extracted from index.html) */
function screenCars(){
  const oq=(state.carSearch||"").trim();
  const _t=ymd(new Date());
  const periodTxt = (state.dateFrom===state.dateTo) ? (state.dateFrom===_t?"اليوم":state.dateFrom) : `${state.dateFrom} ← ${state.dateTo}`;
  const listSrc = oq ? state.carOps.filter(o=>((o.no||"").toLowerCase().includes(oq.toLowerCase()))||((o.plate||"").includes(oq))).slice().reverse() : state.carOps.filter(o=>inRange(o.date)).slice().reverse();
  const today=listSrc;
  const total=carIncome(inRange);
  const rows=today.length?today.map(o=>`
    <div class="car-card ${o.cancelled?'cancelled':''}">
      <div class="cc-top">
        <span class="cc-no">${o.no||"-"}</span>
        <span class="cc-time">${timeStr(o.date)}</span>
        <span class="cc-price">${money(o.price)}</span>
      </div>
      <div class="cc-main">
        ${VEH_IMG[o.vehicle]?`<img class="cc-img" src="${VEH_IMG[o.vehicle]}" alt="">`:`<span class="cc-ic">${svg(vehIcon(o.vehicle))}</span>`}
        <div class="cc-info">
          <div class="cc-veh"><b>${o.vehicle}</b>${o.cancelled?'<span class="badge badge-cancel">ملغى 🚫</span>':''}${o.free?'<span class="badge b-wash">مجاني 🎁</span>':''}${o.paid===false?'<span class="badge b-unpaid">غير مدفوع</span>':''}</div>
          <div class="cc-sub">${o.wash}${o.plate?` • ${o.plate}`:""}${o.by?` • بواسطة ${o.by}`:""}</div>
        </div>
      </div>
      ${(o.photosBefore&&o.photosBefore.length)?`<div class="ba-thumbs"><span class="ba-lbl">قبل:</span>${recThumbs(o.photosBefore)}</div>`:""}
      ${(o.photosAfter&&o.photosAfter.length)?`<div class="ba-thumbs"><span class="ba-lbl">بعد:</span>${recThumbs(o.photosAfter)}</div>`:""}
      <div class="cc-acts">
        ${o.paid===false?`<button class="mini" data-carpay="${o.id}" style="flex:none;background:var(--ready-bg);color:var(--ready);border-color:#bfe6c8;font-weight:800;padding:6px 12px">تحصيل الدفع</button>`:""}
        ${((o.photosBefore&&o.photosBefore.length)||(o.photosAfter&&o.photosAfter.length))?`<button class="wa-btn photo-btn" data-carphotos="${o.id}" title="إرسال صور قبل/بعد">${svg(I.camera)}</button>`:""}
        ${o.phone?`<button class="wa-btn" data-carwa="${o.id}" title="واتساب الزبون">${svg(I.whatsapp)}</button>`:""}
        <button class="icon-btn" data-edit-car="${o.id}" title="تعديل">✏️</button>
        <button class="icon-btn cancel-btn ${o.cancelled?'on':''}" data-cancel-car="${o.id}" title="${o.cancelled?'إلغاء الإلغاء (مطوّل)':'إلغاء (اضغط مطوّلًا)'}">🚫</button>
        <button class="icon-btn" data-del-car="${o.id}" title="حذف">${svg(I.trash)}</button>
      </div>
    </div>`).join("")
    :`<div class="empty">${svg(I.empty)}${oq?"لا توجد نتائج لهذا الرقم/اللوحة.":"لا توجد عمليات في هذه الفترة."}</div>`;
  const wOpts=WASH_TYPES.map(w=>`<option value="${w}">${w}</option>`).join("");
  const vehBtns=Object.keys(state.vehiclePrices).map((v,i)=>`<button type="button" class="pick ${i===0?'on':''}" data-vpick="${v}">${VEH_IMG[v]?`<img class="pick-img" src="${VEH_IMG[v]}" alt="">`:svg(vehIcon(v))}<span>${v}</span></button>`).join("");
  const firstV=Object.keys(state.vehiclePrices)[0];
  const cq=(state.custSearch||"").trim();
  let custList=Object.values(state.customers).sort((a,b)=>new Date(b.lastVisit||0)-new Date(a.lastVisit||0));
  if(cq) custList=custList.filter(c=>(c.plate||"").includes(cq));
  const custRows=custList.length?custList.map(c=>`
    <tr><td><b>${c.plate}</b></td>
      <td>${c.phone||"—"}</td>
      <td class="amt" style="text-align:center;font-weight:800;white-space:nowrap">${c.stamps}/5${c.stamps===4?" 🎁":""}</td>
      <td class="amt" style="text-align:center">${c.totalWashes}</td>
      <td class="amt" style="text-align:center;color:var(--wash)">${c.freeWashes}</td>
      <td style="text-align:left;white-space:nowrap">${c.phone?`<button class="wa-btn" data-wacust="${c.plate}" title="واتساب" style="width:28px;height:28px;display:inline-grid;vertical-align:middle">${svg(I.whatsapp)}</button> `:""}<button class="icon-btn" data-del-cust="${c.plate}" title="حذف">${svg(I.trash)}</button></td></tr>`).join("")
    :`<tr><td colspan="6"><div class="empty">${svg(I.empty)}لا يوجد زبائن محفوظون بعد — أضف لوحة عند حفظ عملية.</div></td></tr>`;
  return `
    <div class="screen-head"><h2>مغسلة السيارات</h2><span>اختر نوع السيارة فيظهر سعره تلقائيًا</span></div>
    <div class="cols">
      <div class="panel car-sky">
        <h3>عملية جديدة</h3>
        <div class="field"><label>لوحة الأرقام (الزبون)</label><input id="carPlate" type="text" placeholder="رقم اللوحة" autocomplete="off"></div>
        <div class="loyalty" id="loyaltyBox" style="display:none"></div>
        <div class="field"><label>هاتف الزبون</label><div class="phone-row"><select id="carCountry" class="cc-select">${countryOpts()}</select><input id="carPhone" class="phone-inp" type="tel" inputmode="numeric" maxlength="9" placeholder="رقم الهاتف"></div></div>
        <div class="field"><label>نوع السيارة</label>
          <div class="picker" id="vPicker">${vehBtns}</div>
          <input type="hidden" id="carVehicle" value="${firstV}">
        </div>
        <div class="field"><label>نوع الغسيل</label><select id="carWash">${wOpts}</select></div>
        <div class="field"><label>السعر</label><input id="carPrice" type="number" min="0" value="${state.vehiclePrices[firstV]}">
          <div class="hint">آخر سعر تُدخله يصبح السعر الافتراضي لهذا النوع.</div></div>
        <div class="field"><label>صور قبل الغسيل</label><div class="photos" id="carBeforeStrip"></div></div>
        <div class="field"><label>صور بعد الغسيل</label><div class="photos" id="carAfterStrip"></div></div>
        <div class="field"><label>التاريخ</label><input id="carDate" type="date" value="${ymd(new Date())}" max="${ymd(new Date())}"></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:.88rem;font-weight:600;margin:4px 0 12px;cursor:pointer"><input type="checkbox" id="carDeferred" style="width:18px;height:18px"> دفع مؤجّل (غير مدفوع — يُحصّل لاحقًا)</label>
        <button class="btn-primary" id="carSave">حفظ العملية</button>
      </div>
      <div class="panel car-sky">
        <h3>${oq?"نتائج البحث":`عمليات ${periodTxt}`}</h3>
        ${oq?"":`<div class="hint" style="margin-bottom:10px">العرض حسب التاريخ المختار في الرئيسية (${periodTxt}). غيّره من فلتر الرئيسية.</div>`}
        <input class="search-inp" id="carSearch" type="text" placeholder="بحث برقم الغسلة (S57…) أو اللوحة" value="${oq}">
        <div class="car-list">${rows}</div>
        ${oq?"":`<div class="sum-row"><span>إجمالي دخل السيارات (${periodTxt})</span><span class="big">${money(total)}</span></div>`}
      </div>
    </div>
    <div class="panel" style="margin-top:18px">
      <h3>بطاقات الولاء</h3>
      <input class="search-inp" id="custSearch" type="text" placeholder="بحث بلوحة الزبون" value="${cq}">
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>اللوحة</th><th>الهاتف</th><th>الأختام</th><th>الغسلات</th><th>مجانية</th><th></th></tr></thead>
      <tbody>${custRows}</tbody></table></div>
    </div>`;
}

function screenCarpets(){
  const f=state.carpetFilter;
  const q=(state.cpSearch||"").trim();
  const _t=ymd(new Date());
  const periodTxt = (state.dateFrom===state.dateTo) ? (state.dateFrom===_t?"اليوم":state.dateFrom) : `${state.dateFrom} ← ${state.dateTo}`;
  const pending=(o)=>!o.cancelled && ((o.status==="wash"||o.status==="ready") || !o.paid);
  let list=state.carpetOrders.filter(o=> (pending(o)||inRange(o.date)) && (f==="all"?true : f==="unpaid"? !o.paid : o.status===f));
  if(q) list=list.filter(o=>((o.customer||"").includes(q))||((o.no||"").includes(q))||((o.phone||"").includes(q)));
  const chips=[{k:"all",t:"الكل"},{k:"wash",t:"قيد الغسيل"},{k:"ready",t:"جاهز"},{k:"done",t:"تم التسليم"},{k:"unpaid",t:"غير مدفوع"}]
    .map(c=>`<button class="chip ${f===c.k?'on':''}" data-filter="${c.k}">${c.t}</button>`).join("");
  const cards=list.length?list.slice().reverse().map(o=>{ try{
    const st=STATUS[o.status]||STATUS.wash,next=NEXT[o.status],os=orderState(o);
    return `
    <div class="order s-${st.cls} ${os.cls==="st-red"?"alert-red":""} ${o.cancelled?"cancelled":""}">
      <div class="no">${o.no}</div>
      <div class="cust"><span class="state-dot ${os.cls}" title="${os.cls==="st-red"?"مكتمل وغير مدفوع":os.cls==="st-green"?"مدفوع":"قيد الانتظار"}"></span>${o.customer||"عميل"}</div>
      <div class="meta">${o.type} × ${o.count}</div>
      <div class="order-dates">🗓️ سُجّل: ${ymd(o.date)} ${timeStr(o.date)}${o.by?` — بواسطة ${o.by}`:""}${o.editedAt?`<br>✏️ آخر تعديل: ${ymd(o.editedAt)} ${timeStr(o.editedAt)}`:""}</div>
      <div class="badges">
        ${o.cancelled?'<span class="badge badge-cancel">ملغى 🚫</span>':''}
        <span class="badge b-${st.cls}">${st.label}</span>
        ${o.paid?'<span class="badge b-paid">مدفوع</span>':'<span class="badge b-unpaid">غير مدفوع</span>'}
      </div>
      <div class="price">${money(o.price)}</div>
      ${recThumbs(o.photos)}
      <div class="order-acts-main">
        <button class="mini act-status" data-status="${o.id}" ${next?"":"disabled"}>${next?`→ ${STATUS[next].label}`:"مكتمل ✓"}</button>
        <button class="mini act-pay ${o.paid?'paid':''}" data-pay="${o.id}">${o.paid?"إلغاء الدفع":"تحصيل الدفع"}</button>
      </div>
      <div class="order-acts-sub">
        <button class="wa-btn" data-wa="${o.id}" title="إرسال الحالة عبر واتساب">${svg(I.whatsapp)}</button>
        <button class="icon-btn" data-receipt="${o.id}" title="إيصال">🧾</button>
        <button class="icon-btn" data-edit-order="${o.id}" title="تعديل">✏️</button>
        <button class="icon-btn cancel-btn ${o.cancelled?'on':''}" data-cancel-order="${o.id}" title="${o.cancelled?'إلغاء الإلغاء (مطوّل)':'إلغاء الطلب (اضغط مطوّلًا)'}">🚫</button>
        <button class="icon-btn" data-del-order="${o.id}" title="حذف">${svg(I.trash)}</button>
      </div>
    </div>`;}catch(e){ return `<div class="order"><div class="no">${o.no||"?"}</div><div class="meta" style="color:var(--unpaid)">طلب ببيانات غير مكتملة</div></div>`; } }).join("")
    :`<div class="panel empty" style="grid-column:1/-1">${svg(I.empty)}لا توجد طلبات ضمن هذا التصنيف.</div>`;
  const pieceBtns=Object.keys(state.piecePrices).map((p,i)=>`<button type="button" class="pick ${i===0?'on':''}" data-ppick="${p}">${PIECE_IMG[p]?`<img class="pick-img" src="${PIECE_IMG[p]}" alt="">`:svg(pieceIcon(p))}<span>${p}</span></button>`).join("");
  const firstP=Object.keys(state.piecePrices)[0];
  const startUnit=state.piecePrices[firstP];
  return `
    <div class="screen-head"><h2>مغسلة السجاد والأفرشة</h2><span>رقم الطلب يُنشأ تلقائيًا</span></div>
    <div class="cols">
      <div class="panel">
        <h3>طلب جديد</h3>
        <div class="field"><label>اسم العميل <span style="color:var(--unpaid)">(الاسم أو الرقم مطلوب)</span></label><input id="cpCust" type="text" placeholder="اسم العميل"></div>
        <div class="field"><label>هاتف الزبون</label><div class="phone-row"><select id="cpCountry" class="cc-select">${countryOpts()}</select><input id="cpPhone" class="phone-inp" type="tel" inputmode="numeric" maxlength="9" placeholder="رقم الهاتف"></div></div>
        <div class="field"><label>نوع القطعة</label>
          <div class="picker" id="pPicker">${pieceBtns}</div>
          <input type="hidden" id="cpType" value="${firstP}">
        </div>
        <div class="row2">
          <div class="field"><label>سعر القطعة</label><input id="cpPrice" type="number" min="0" value="${startUnit}"></div>
          <div class="field"><label>العدد</label><input id="cpCount" type="number" min="1" value="1"></div>
        </div>
        <div class="total-line"><span>الإجمالي</span><b><span id="cpTotal">${startUnit}</span></b></div>
        <div class="hint" style="margin:-6px 0 12px">آخر سعر تُدخله لأي نوع يصبح سعره الافتراضي تلقائيًا.</div>
        <div class="field"><label>صور الفرشة (اختياري)</label><div class="photos" id="cpPhotoStrip"></div></div>
        <div class="field"><label>التاريخ</label><input id="cpDate" type="date" value="${ymd(new Date())}" max="${ymd(new Date())}"></div>
        <button class="btn-primary" id="cpSave">إضافة الطلب</button>
      </div>
      <div>
        <input class="search-inp" id="cpSearch" type="text" placeholder="بحث بالاسم أو رقم الطلب أو الهاتف" value="${q}">
        <div class="chips">${chips}</div>
        <div class="hint" style="margin:4px 0 10px">تُعرض المعلّقة وغير المدفوعة (ديون) دائمًا، والمكتملة المدفوعة حسب التاريخ المختار في الرئيسية (${periodTxt}).</div>
        <div class="grid orders">${cards}</div>
      </div>
    </div>`;
}

