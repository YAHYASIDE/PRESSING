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
function opTimelineHtml(o){
  const sp=opSpans(o); if(!sp.length) return "";
  return `<div class="op-timeline"><div class="tl-title">الخط الزمني</div>${sp.map(s=>{
    const lbl=(CAR_STAGES.find(x=>x.k===s.stage)||{}).label||s.stage;
    const t=new Date(s.start).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"});
    const d=(s.dur!=null)?`<span class="tl-dur">${fmtDur(s.dur)}</span>`:`<span class="tl-dur live">جارٍ</span>`;
    return `<div class="tl-row"><span class="tl-time">${t}</span><span class="tl-dot"></span><span class="tl-stage">${lbl}</span>${d}</div>`;
  }).join("")}</div>`;
}
/* Release 4 — the card is now a compact navigation summary; tapping opens the Details screen. */
function carOpCard(o){
  const cur=carStageKey(o);
  const st=CAR_STAGES.find(s=>s.k===cur)||CAR_STAGES[0];
  const active=opActive(o);
  const isActive=active && cur!=="delivered" && !o.cancelled;
  const timer=isActive?`<span class="op-timer" data-op-since="${active.since}" data-op-exp="${st.exp||0}"></span>`:"";
  return `
    <button type="button" class="op-card st-${cur} ${o.cancelled?'cancelled':''} ${isActive?'live':''}" data-op-open="${o.id}">
      <span class="op-veh-ic-sm">${VEH_IMG[o.vehicle]?`<img src="${VEH_IMG[o.vehicle]}" alt="">`:svg(vehIcon(o.vehicle))}</span>
      <span class="op-sum-main">
        <span class="op-sum-l1">${o.no||"-"} · ${o.vehicle}${o.plate?` · ${o.plate}`:""}</span>
        <span class="op-sum-l2"><span class="op-badge b-${cur}">${st.label}</span>${timer}${o.paid===false?' <span class="op-unpaid">دَين</span>':""}${o.free?' <span class="op-unpaid" style="color:var(--ready)">مجاني</span>':""}${o.cancelled?' <span class="op-unpaid" style="color:var(--muted)">ملغى</span>':""}</span>
      </span>
      <span class="op-sum-price">${money(o.price)}<i class="op-chev">›</i></span>
    </button>`;
}
/* Release 4 — dedicated Operation Details screen (summary, customer, vehicle, photos,
   timeline, payment, notes) with ONE guided primary action. */
function screenOpDetail(){
  const o=state.carOps.find(x=>x.id===state.opDetail);
  if(!o){ state.opDetail=null; return screenCars(); }
  const cur=carStageKey(o);
  const st=CAR_STAGES.find(s=>s.k===cur)||CAR_STAGES[0];
  const na=nextAction(o);
  const ph=o.phone?waPhoneFull(o.phone,o.country):null;
  const active=opActive(o);
  const isActive=active && cur!=="delivered" && !o.cancelled;
  const timer=isActive?`<span class="op-timer big" data-op-since="${active.since}" data-op-exp="${st.exp||0}"></span>`:"";
  const cust=o.plate?state.customers[o.plate]:null;
  const pm=o.paymentMethod?((bizPayMethods().find(m=>m.k===o.paymentMethod)||{}).label||""):"";
  const hasPhotos=(o.photosBefore&&o.photosBefore.length)||(o.photosAfter&&o.photosAfter.length);
  const sec=(t,body)=>`<div class="od-sec"><div class="od-sec-t">${t}</div>${body}</div>`;
  const row=(k,v)=>`<div class="od-row"><span>${k}</span><b>${v}</b></div>`;
  return `
    <div class="od-head">
      <button type="button" class="od-back" data-op-back aria-label="رجوع">→</button>
      <div class="od-htitle">${o.no||"-"} · ${o.vehicle}</div>
      <span class="op-badge b-${cur}">${st.label}</span>
    </div>
    <div class="od-scroll">
      <div class="od-hero">
        <span class="od-veh">${VEH_IMG[o.vehicle]?`<img src="${VEH_IMG[o.vehicle]}" alt="">`:svg(vehIcon(o.vehicle))}</span>
        <div class="od-hero-main">
          <div class="od-vehname">${o.vehicle}${o.plate?` · ${o.plate}`:""}</div>
          <div class="od-price">${money(o.price)} <span class="${o.paid?'paid':'unpaid'}">${o.paid?"مدفوع":"غير مدفوع"}</span></div>
          ${timer?`<div class="od-timer-row">${st.label} · ${timer}</div>`:""}
        </div>
      </div>
      ${sec("معلومات الزبون", row("اللوحة", o.plate||"—")+row("الهاتف", o.phone?`+${o.country||"222"} ${o.phone}`:"—")+((loyaltyEnabled()&&cust)?row("الولاء", `${loyaltyStatus(cust)} · ${cust.totalWashes} غسلة`):"")+(ph?`<div class="od-contact"><a class="wa-btn call-btn" href="tel:${ph}">📞 اتصال</a><button type="button" class="wa-btn" data-carwa="${o.id}">${svg(I.whatsapp)} واتساب</button></div>`:""))}
      ${sec("معلومات المركبة", row("النوع", o.vehicle)+row("الخدمة", o.wash||"—")+row("استلمها", o.by||"—")+(o.assignedTo?row("المُنفِّذ", o.assignedTo):""))}
      ${sec("الفحص المبدئي", (function(){
        const ins=App.core.inspectionSummary(o);
        if(!ins) return `<div class="od-note">لم يُجرَ فحص بعد</div>`+(can('operate')?`<button type="button" class="mini" data-inspect="${o.id}">🔍 فحص المركبة</button>`:"");
        const chips=INSPECTION_SECTIONS.map(s=>{ const v=(o.inspection.items||{})[s.k]; const c=INSPECTION_CONDITIONS.find(x=>x.k===v); return `<span class="insp-chip ${c?c.cls:''}">${s.label}${c?" · "+c.label:""}</span>`; }).join("");
        return `<div class="insp-sum">${chips}</div>${ins.fuel?row("الوقود",(FUEL_LEVELS.find(f=>f.k===ins.fuel)||{}).label||ins.fuel):""}${ins.damaged?row("مناطق تالفة",ins.damaged):""}${o.inspection.notes?`<div class="od-note">${o.inspection.notes}</div>`:""}<div class="od-manage">${can('operate')?`<button type="button" class="mini" data-inspect="${o.id}">✏️ تعديل الفحص</button>`:""}<button type="button" class="mini" data-inspect-report="${o.id}">🧾 تقرير الفحص</button></div>`;
      })())}
      ${hasPhotos?sec("صور قبل / بعد", `<div class="op-photos">${(o.photosBefore&&o.photosBefore.length)?`<div class="ba"><span class="ba-lbl">قبل</span>${recThumbs(o.photosBefore)}</div>`:""}${(o.photosAfter&&o.photosAfter.length)?`<div class="ba"><span class="ba-lbl">بعد</span>${recThumbs(o.photosAfter)}</div>`:""}</div>${o.phone?`<button type="button" class="mini" data-carphotos="${o.id}">مشاركة الصور عبر واتساب</button>`:""}`):sec("صور قبل / بعد","<div class=\"od-note\">لا توجد صور</div>")}
      ${sec("الخط الزمني", carStepper(o)+opTimelineHtml(o))}
      ${sec("الدفع", row("السعر", money(o.price))+row("الحالة", o.paid?"مدفوع":"غير مدفوع")+(pm?row("الطريقة", pm):"")+((o.paid===false&&can('collect'))?`<button type="button" class="mini op-pay" data-carpay="${o.id}">تحصيل الدفع</button>`:""))}
      ${(cur==="ready"||cur==="delivered"||o.pickupCode)?sec("الاستلام", (function(){
        if(!o.pickupCode && App.services.generatePickup) App.services.generatePickup(o.id);
        if(o.pickedUp) return `<div class="pickup-done">✓ تم تسليم المركبة${o.pickedUpAt?` · ${ymd(o.pickedUpAt)} ${timeStr(o.pickedUpAt)}`:""}</div>`;
        const qr=(App.ui&&App.ui.qrSVG)?App.ui.qrSVG("PICKUP|"+(o.no||"")+"|"+(o.pickupCode||""),{size:104}):"";
        return `<div class="pickup-box"><div class="pickup-code"><span>رمز الاستلام</span><b>${o.pickupCode||"—"}</b></div><div class="pickup-qr">${qr}</div></div><div class="od-note">أعطِ الزبون هذا الرمز أو رمز QR لاستلام مركبته.</div>${can('collect')?`<button type="button" class="mini" data-pickup-verify="${o.id}">تأكيد الاستلام بالرمز</button>`:""}`;
      })()):""}
      ${sec("ملاحظات", `<div class="od-note">${o.note||"—"}</div>`+(can('operate')?`<div class="od-manage"><button type="button" class="icon-btn" data-edit-car="${o.id}">✏️ تعديل</button><button type="button" class="icon-btn cancel-btn ${o.cancelled?'on':''}" data-cancel-car="${o.id}">🚫 ${o.cancelled?'إلغاء الإلغاء':'إلغاء العملية'}</button>${can('delete')?`<button type="button" class="icon-btn" data-del-car="${o.id}">${svg(I.trash)} حذف</button>`:""}</div>`:""))}
      <div class="od-spacer"></div>
    </div>
    <div class="od-action-bar">
      ${na.kind!=="done"
        ? `<button type="button" class="od-primary k-${na.kind}" data-op-primary="${o.id}" data-kind="${na.kind}" data-to="${na.to||""}">${na.label}</button>`
        : `<div class="od-done">${na.label}</div>`}
    </div>

    <div id="deliverSheet" class="sheet">
      <div class="sheet-backdrop" data-close-deliver></div>
      <div class="sheet-card">
        <div class="sheet-handle"></div>
        <h3>تسليم العملية</h3>
        <p class="sheet-sub">اختر طريقة الدفع لإغلاق العملية</p>
        <div class="pay-methods">${bizPayMethods().map(m=>`<button type="button" class="pay-method pm-${m.k}" data-paymethod="${m.k}">${m.label}</button>`).join("")}</div>
        <button type="button" class="mini sheet-cancel" data-close-deliver>إلغاء</button>
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
  // operational queues (with live counts) double as the filter control
  const queues=[{k:"all",label:"الكل"}].concat(CAR_STAGES)
    .map(q=>`<button class="queue q-${q.k} ${sf===q.k?'on':''}" data-carfilter="${q.k}"><span class="q-n">${counts[q.k]||0}</span><span class="q-l">${q.label}</span></button>`).join("");
  const list=(sf==="all"?base:base.filter(o=>carStageKey(o)===sf)).slice().reverse();
  const cards=list.length?list.map(carOpCard).join("")
    : (state.carOps.length===0
        ? emptyState({icon:I.car, title:"لا توجد عمليات بعد", sub:"ابدأ بإنشاء أول عملية استقبال لسيارة — سيستغرق الأمر ثوانٍ.", btn: can('receive')?"➕ إنشاء أول عملية":"", btnAttr:'data-open-reception', btnClass:'big'})
        : emptyState({icon:I.empty, title: oq?"لا توجد نتائج":"لا توجد عمليات ضمن هذا التصنيف", sub: oq?"جرّب رقمًا أو لوحة مختلفة.":""}));
  const total=carIncome(inRange);
  const wOpts=bizServices().map(w=>`<option value="${w}">${w}</option>`).join("");
  const vehBtns=Object.keys(state.vehiclePrices).map((v,i)=>`<button type="button" class="pick ${i===0?'on':''}" data-vpick="${v}">${VEH_IMG[v]?`<img class="pick-img" src="${VEH_IMG[v]}" alt="">`:svg(vehIcon(v))}<span>${v}</span></button>`).join("");
  const firstV=Object.keys(state.vehiclePrices)[0];
  const cq=(state.custSearch||"").trim();
  let custList=Object.values(state.customers).sort((a,b)=>new Date(b.lastVisit||0)-new Date(a.lastVisit||0));
  if(cq) custList=custList.filter(c=>(c.plate||"").includes(cq));
  // Release 4 — Worker current-task banner: the single most-urgent active op with its guided next action.
  let taskBanner="";
  if(!oq && !can('finance')){
    const mine=state.carOps.filter(o=>!o.cancelled && carStageKey(o)!=="delivered" && opActive(o));
    mine.sort((a,b)=>(opActive(a).since||0)-(opActive(b).since||0));
    const cur1=mine[0];
    if(cur1){
      const na=nextAction(cur1);
      const st1=CAR_STAGES.find(s=>s.k===carStageKey(cur1))||CAR_STAGES[0];
      taskBanner=`
        <button type="button" class="task-banner" data-op-open="${cur1.id}">
          <span class="tb-lbl">مهمتك الحالية</span>
          <span class="tb-op">${cur1.no||"-"} · ${cur1.vehicle}${cur1.plate?` · ${cur1.plate}`:""}</span>
          <span class="tb-stage"><span class="op-badge b-${carStageKey(cur1)}">${st1.label}</span></span>
          <span class="tb-next">${na.kind!=="done"?na.label:"—"} ›</span>
        </button>`;
    } else {
      taskBanner=`<div class="task-banner tb-empty">لا توجد مهمة نشطة الآن — كل العمليات مكتملة أو بالانتظار.</div>`;
    }
  }
  const loyOn=loyaltyEnabled();
  const custCols=loyOn?5:4;
  const custRows=custList.length?custList.map(c=>`
    <tr><td><b>${c.plate}</b></td>
      <td>${c.phone||"—"}</td>
      ${loyOn?`<td class="amt" style="text-align:center;font-weight:800;white-space:nowrap">${loyaltyStatus(c)}${(c.stamps||0)>=loyaltyThreshold()-1&&loyaltyStrategy()==="stamp"?" 🎁":""}</td>`:""}
      <td class="amt" style="text-align:center">${c.totalWashes||0}</td>
      <td style="text-align:left;white-space:nowrap">${c.phone?`<button class="wa-btn" data-wacust="${c.plate}" title="واتساب" style="width:28px;height:28px;display:inline-grid;vertical-align:middle">${svg(I.whatsapp)}</button> `:""}<button class="icon-btn" data-del-cust="${c.plate}" title="حذف">${svg(I.trash)}</button></td></tr>`).join("")
    :`<tr><td colspan="${custCols}">${emptyState({icon:I.profit, title:"لا يوجد زبائن بعد", sub:"يُضاف الزبون تلقائيًا عند حفظ عملية بلوحة سيارة."})}</td></tr>`;
  return `
    <div class="screen-head cars-head"><h2>مركز العمليات</h2><span>${counts.all} عملية · ${periodTxt}</span></div>
    ${taskBanner}
    <input class="search-inp ops-search" id="carSearch" type="text" placeholder="بحث برقم العملية أو اللوحة" value="${oq}">
    <div class="queues scroll-x">${queues}</div>
    <div class="ops-list">${cards}</div>
    ${(oq||!can('finance'))?"":`<div class="ops-foot" style="text-align:center;color:var(--muted);font-size:.82rem;margin-top:14px">دخل السيارات (${periodTxt}): <b style="color:var(--brand)">${money(total)}</b></div>`}
    ${can('finance')?`<details class="loyalty-collapse" ${state.loyaltyOpen?"open":""}>
      <summary>${loyOn?"بطاقات الولاء":"الزبائن"} (${Object.keys(state.customers).length})</summary>
      <div class="lc-body">
        <input class="search-inp" id="custSearch" type="text" placeholder="بحث بلوحة الزبون" value="${cq}">
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>اللوحة</th><th>الهاتف</th>${loyOn?"<th>الولاء</th>":""}<th>الغسلات</th><th></th></tr></thead>
        <tbody>${custRows}</tbody></table></div>
      </div>
    </details>`:""}

    ${can('receive')?`<button class="fab" data-open-reception aria-label="استقبال سيارة جديدة">＋</button>`:""}

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
    </div>

    <div id="deliverSheet" class="sheet">
      <div class="sheet-backdrop" data-close-deliver></div>
      <div class="sheet-card">
        <div class="sheet-handle"></div>
        <h3>تسليم العملية</h3>
        <p class="sheet-sub">اختر طريقة الدفع لإغلاق العملية</p>
        <div class="pay-methods">${bizPayMethods().map(m=>`<button type="button" class="pay-method pm-${m.k}" data-paymethod="${m.k}">${m.label}</button>`).join("")}</div>
        <button type="button" class="mini sheet-cancel" data-close-deliver>إلغاء</button>
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
    :`<div style="grid-column:1/-1">${emptyState({icon:I.rug, title: q?"لا توجد نتائج":"لا توجد طلبات بعد", sub: q?"جرّب اسمًا أو رقمًا مختلفًا.":"أضف أول طلب سجاد من النموذج على اليمين."})}</div>`;
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
/* printable digital-inspection report (rendered into the receipt modal) */
function inspectionReportHTML(o){
  const ins=o.inspection; if(!ins) return "";
  const b=state.business||{};
  const rows=INSPECTION_SECTIONS.map(s=>{ const c=INSPECTION_CONDITIONS.find(x=>x.k===(ins.items||{})[s.k]); return `<div class="rc-row"><span>${s.label}</span><b class="insp-r-${c?c.cls:''}">${c?c.label:"—"}</b></div>`; }).join("");
  const fuel=(FUEL_LEVELS.find(f=>f.k===ins.fuel)||{}).label||ins.fuel||"—";
  return `<div class="receipt">
    <div class="rc-head">${b.logo?`<img class="rc-logo" src="${b.logo}" alt="">`:""}<div class="rc-name">${bizName()}</div><div class="rc-phone">تقرير فحص المركبة</div></div>
    <div class="rc-meta"><span>${o.no||""}</span><span>${ymd(ins.date)} ${timeStr(ins.date)}</span></div>
    <div class="rc-meta"><span>${o.vehicle} · ${o.plate||""}</span><span>${o.phone||""}</span></div>
    <div class="rc-sep"></div>${rows}
    <div class="rc-row"><span>مستوى الوقود</span><b>${fuel}</b></div>
    ${ins.notes?`<div class="rc-note">${ins.notes}</div>`:""}
    <div class="rc-sep"></div>
    <div class="insp-r-sigs">
      <div><span>توقيع الزبون</span>${ins.custSig?`<img class="insp-r-sig" src="${ins.custSig}" alt="">`:`<div class="insp-r-sigblank"></div>`}</div>
      <div><span>توقيع الموظف</span>${ins.empSig?`<img class="insp-r-sig" src="${ins.empSig}" alt="">`:`<div class="insp-r-sigblank"></div>`}</div>
    </div>
    <div class="rc-foot">${bizName()} · ${ymd(ins.date)}</div>
  </div>`;
}
Object.assign(App.pages, { screenCars, screenCarpets, screenOpDetail, carStageKey, carStepper, carOpCard, opTimelineHtml, inspectionReportHTML });
