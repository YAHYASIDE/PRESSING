/* pages/orders.js — Operations screens: car washes + laundry orders (extracted from index.html) */
function carStageKey(o){ return o.stage || "delivered"; }   /* legacy ops (no stage) treated as completed */
function carStepper(o){
  const cur=carStageKey(o);
  const idx=CAR_STAGES.findIndex(s=>s.k===cur);
  return `<div class="op-steps">${CAR_STAGES.map((s,i)=>`
    <button type="button" class="op-step ${i<idx?'done':i===idx?'active':''}" data-car-setstage="${o.id}" data-stage="${s.k}" title="${s.label}">
      <span class="op-step-dot">${i<idx?'✓':i+1}</span><span class="op-step-lbl">${s.label}</span>
    </button>`).join("")}</div>`;
}
function carOpCard(o){
  const cur=carStageKey(o);
  const st=CAR_STAGES.find(s=>s.k===cur)||CAR_STAGES[0];
  const idx=CAR_STAGES.findIndex(s=>s.k===cur);
  const next=(idx<CAR_STAGES.length-1)?CAR_STAGES[idx+1]:null;
  const hasPhotos=(o.photosBefore&&o.photosBefore.length)||(o.photosAfter&&o.photosAfter.length);
  return `
    <div class="op-card st-${cur} ${o.cancelled?'cancelled':''}">
      <button type="button" class="op-summary" data-op-toggle>
        <span class="op-veh-ic-sm">${VEH_IMG[o.vehicle]?`<img src="${VEH_IMG[o.vehicle]}" alt="">`:svg(vehIcon(o.vehicle))}</span>
        <span class="op-sum-main">
          <span class="op-sum-l1">${o.no||"-"} · ${o.vehicle}${o.plate?` · ${o.plate}`:""}</span>
          <span class="op-sum-l2"><span class="op-badge b-${cur}">${st.label}</span>${o.paid===false?' <span class="op-unpaid">دَين</span>':""}${o.free?' <span class="op-unpaid" style="color:var(--ready)">مجاني</span>':""}${o.cancelled?' <span class="op-unpaid" style="color:var(--muted)">ملغى</span>':""}</span>
        </span>
        <span class="op-sum-price">${money(o.price)}<i class="op-chev">▾</i></span>
      </button>
      <div class="op-detail">
        <div class="op-sub">${o.wash}${o.phone?` • ${o.phone}`:""}${o.by?` • ${o.by}`:""} • ${timeStr(o.date)}</div>
        ${o.note?`<div class="op-note">📝 ${o.note}</div>`:""}
        ${hasPhotos?`<div class="op-photos">${(o.photosBefore&&o.photosBefore.length)?`<div class="ba"><span class="ba-lbl">قبل</span>${recThumbs(o.photosBefore)}</div>`:""}${(o.photosAfter&&o.photosAfter.length)?`<div class="ba"><span class="ba-lbl">بعد</span>${recThumbs(o.photosAfter)}</div>`:""}</div>`:""}
        ${carStepper(o)}
        <div class="op-acts">
          ${(next&&!o.cancelled)?`<button class="btn-advance" data-car-advance="${o.id}">${next.label} →</button>`:""}
          ${o.paid===false?`<button class="mini op-pay" data-carpay="${o.id}">تحصيل الدفع</button>`:""}
          ${hasPhotos?`<button class="wa-btn" data-carphotos="${o.id}" title="إرسال صور قبل/بعد">${svg(I.camera)}</button>`:""}
          ${o.phone?`<button class="wa-btn" data-carwa="${o.id}" title="واتساب الزبون">${svg(I.whatsapp)}</button>`:""}
          <button class="icon-btn" data-edit-car="${o.id}" title="تعديل">✏️</button>
          <button class="icon-btn cancel-btn ${o.cancelled?'on':''}" data-cancel-car="${o.id}" title="${o.cancelled?'إلغاء الإلغاء (مطوّل)':'إلغاء (اضغط مطوّلًا)'}">🚫</button>
          <button class="icon-btn" data-del-car="${o.id}" title="حذف">${svg(I.trash)}</button>
        </div>
      </div>
    </div>`;
}
function screenCars(){
  const oq=(state.carSearch||"").trim();
  const sf=state.carStageFilter||"all";
  const _t=ymd(new Date());
  const periodTxt = (state.dateFrom===state.dateTo) ? (state.dateFrom===_t?"اليوم":state.dateFrom) : `${state.dateFrom} ← ${state.dateTo}`;
  const base = oq
    ? state.carOps.filter(o=>((o.no||"").toLowerCase().includes(oq.toLowerCase()))||((o.plate||"").includes(oq)))
    : state.carOps.filter(o=>inRange(o.date));
  const counts={all:base.length}; CAR_STAGES.forEach(s=>counts[s.k]=base.filter(o=>carStageKey(o)===s.k).length);
  const chips=[{k:"all",t:"الكل"}].concat(CAR_STAGES.map(s=>({k:s.k,t:s.label})))
    .map(c=>`<button class="chip ${sf===c.k?'on':''}" data-carfilter="${c.k}">${c.t}${counts[c.k]?`<span class="chip-n">${counts[c.k]}</span>`:""}</button>`).join("");
  const list=(sf==="all"?base:base.filter(o=>carStageKey(o)===sf)).slice().reverse();
  const cards=list.length?list.map(carOpCard).join("")
    :`<div class="empty" style="grid-column:1/-1">${svg(I.empty)}${oq?"لا توجد نتائج لهذا الرقم/اللوحة.":"لا توجد عمليات ضمن هذا التصنيف."}</div>`;
  const total=carIncome(inRange);
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
    <div class="screen-head cars-head"><h2>السيارات</h2><span>${counts.all} عملية · ${periodTxt}</span></div>
    <input class="search-inp ops-search" id="carSearch" type="text" placeholder="بحث برقم العملية أو اللوحة" value="${oq}">
    <div class="ops-filters scroll-x">${chips}</div>
    <div class="ops-list">${cards}</div>
    ${oq?"":`<div class="ops-foot" style="text-align:center;color:var(--muted);font-size:.82rem;margin-top:14px">دخل السيارات (${periodTxt}): <b style="color:var(--brand)">${money(total)}</b></div>`}
    <details class="loyalty-collapse" ${state.loyaltyOpen?"open":""}>
      <summary>بطاقات الولاء (${Object.keys(state.customers).length})</summary>
      <div class="lc-body">
        <input class="search-inp" id="custSearch" type="text" placeholder="بحث بلوحة الزبون" value="${cq}">
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>اللوحة</th><th>الهاتف</th><th>الأختام</th><th>الغسلات</th><th>مجانية</th><th></th></tr></thead>
        <tbody>${custRows}</tbody></table></div>
      </div>
    </details>

    <button class="fab" data-open-reception aria-label="استقبال سيارة جديدة">＋</button>

    <div id="receptionWizard" class="wizard" data-step="0">
      <div class="wiz-sheet">
        <div class="wiz-head"><button type="button" class="wiz-x" data-close-reception aria-label="إغلاق">✕</button><h3>استقبال سيارة</h3><span class="wiz-progress-lbl"></span></div>
        <div class="wiz-dots">${[0,1,2,3].map(()=>`<span class="wiz-dot"></span>`).join("")}</div>
        <div class="wiz-body">
          <div class="wiz-panel" data-panel="0">
            <h4>نوع المركبة</h4>
            <div class="picker wiz-veh-grid" id="vPicker">${vehBtns}</div>
            <input type="hidden" id="carVehicle" value="${firstV}">
          </div>
          <div class="wiz-panel" data-panel="1">
            <h4>معلومات الزبون</h4>
            <div class="field"><label>لوحة الأرقام</label><input id="carPlate" type="text" placeholder="رقم اللوحة" autocomplete="off"></div>
            <div class="loyalty wiz-loyalty" id="loyaltyBox" style="display:none"></div>
            <div class="field"><label>هاتف الزبون</label><div class="phone-row"><select id="carCountry" class="cc-select">${countryOpts()}</select><input id="carPhone" class="phone-inp" type="tel" inputmode="numeric" maxlength="9" placeholder="رقم الهاتف"></div></div>
          </div>
          <div class="wiz-panel" data-panel="2">
            <h4>الخدمة والدفع</h4>
            <div class="field"><label>نوع الغسيل</label><select id="carWash">${wOpts}</select></div>
            <div class="field"><label>السعر</label><input id="carPrice" type="number" min="0" value="${state.vehiclePrices[firstV]}"><div class="hint">آخر سعر تُدخله يصبح الافتراضي لهذا النوع.</div></div>
            <label class="pay-toggle"><input type="checkbox" id="carDeferred"> <span>دفع مؤجّل (دَين — يُحصّل لاحقًا)</span></label>
          </div>
          <div class="wiz-panel" data-panel="3">
            <h4>الصور والملاحظات</h4>
            <div class="ba-strips">
              <div class="field"><label>قبل الغسيل</label><div class="photos" id="carBeforeStrip"></div></div>
              <div class="field"><label>بعد الغسيل</label><div class="photos" id="carAfterStrip"></div></div>
            </div>
            <div class="field"><label>ملاحظات</label><textarea id="carNote" rows="2" placeholder="ملاحظات إضافية (اختياري)"></textarea></div>
            <div class="field"><label>التاريخ</label><input id="carDate" type="date" value="${ymd(new Date())}" max="${ymd(new Date())}"></div>
          </div>
        </div>
        <div class="wiz-nav">
          <button type="button" class="mini" data-wiz-back>رجوع</button>
          <button type="button" class="btn-primary" data-wiz-next>التالي</button>
          <button class="btn-primary btn-receive" id="carSave">استلام السيارة</button>
        </div>
      </div>
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


/* ---- Commit 4: namespace registration ---- */
Object.assign(App.pages, { screenCars, screenCarpets, carStageKey, carStepper, carOpCard });
