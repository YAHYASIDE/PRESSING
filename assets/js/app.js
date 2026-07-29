/* app.js — Render dispatcher, event wiring, modals, lock, boot sequence (extracted from index.html) */
/* ================= Render + events ================= */
function render(){
  renderNav();
  const map={dashboard:screenDashboard,cars:screenCars,carpets:screenCarpets,expenses:screenExpenses,reports:screenReports};
  document.getElementById("main").innerHTML=`<div class="screen">${(map[state.tab]||screenDashboard)()}</div>`;
  bindScreen();
}

function bindScreen(){
  // dashboard date filter
  const df=document.getElementById("dateFrom"), dtI=document.getElementById("dateTo");
  if(df){
    df.onchange=()=>{ state.dateFrom=df.value||state.dateFrom; if(state.dateTo<state.dateFrom) state.dateTo=state.dateFrom; render(); };
    dtI.onchange=()=>{ state.dateTo=dtI.value||state.dateTo; if(state.dateTo<state.dateFrom) state.dateFrom=state.dateTo; render(); };
    const srb=document.getElementById("sendReport"); if(srb) srb.onclick=sendReport;
    const srb2=document.getElementById("sendReport2"); if(srb2) srb2.onclick=sendReport2;
    document.querySelectorAll("[data-preset]").forEach(bp=>bp.onclick=()=>{
      const t=new Date(), todayS=ymd(t);
      if(bp.dataset.preset==="today"){ state.dateFrom=state.dateTo=todayS; }
      else if(bp.dataset.preset==="yesterday"){ const yd=new Date(t); yd.setDate(yd.getDate()-1); state.dateFrom=state.dateTo=ymd(yd); }
      else if(bp.dataset.preset==="month"){ state.dateFrom=ymd(new Date(t.getFullYear(),t.getMonth(),1)); state.dateTo=todayS; }
      else if(bp.dataset.preset==="all"){ state.dateFrom="1970-01-01"; state.dateTo=todayS; }
      render();
    });
  }
  // cars
  const cv=document.getElementById("carVehicle");
  if(cv){
    document.querySelectorAll("[data-vpick]").forEach(btn=>btn.onclick=()=>{
      document.querySelectorAll("[data-vpick]").forEach(x=>x.classList.remove("on"));
      btn.classList.add("on");
      cv.value=btn.dataset.vpick;
      document.getElementById("carPrice").value=state.vehiclePrices[cv.value]||0;
    });
    const plateInp=document.getElementById("carPlate");
    const lbox=document.getElementById("loyaltyBox");
    const ccoEl=document.getElementById("carCountry");
    if(ccoEl) ccoEl.onchange=()=>{ ccoEl.dataset.touched="1"; };
    const updLoyalty=()=>{const pl=plateInp.value.trim(); const cph=document.getElementById("carPhone"); const cco=document.getElementById("carCountry"); if(pl){lbox.style.display="block";lbox.innerHTML=loyaltyCardHTML(pl); const c=state.customers[pl]; if(c){ if(c.phone&&cph&&!cph.value) cph.value=c.phone; if(c.country&&cco&&!cco.dataset.touched) cco.value=c.country; }}else{lbox.style.display="none";}};
    plateInp.oninput=updLoyalty;
    bindPhotoStrip("carBeforeStrip",pendingCarBefore,"carB");
    bindPhotoStrip("carAfterStrip",pendingCarAfter,"carA");
    const doCarSave=()=>{
      // 1) collect form values into a plain DTO
      const input={
        vehicle: cv.value,
        plate: plateInp.value.trim(),
        phone: document.getElementById("carPhone").value.trim(),
        country: document.getElementById("carCountry").value,
        wash: document.getElementById("carWash").value,
        price: +document.getElementById("carPrice").value,
        dateStr: (document.getElementById("carDate")||{}).value||todayStr(),
        deferred: !!(document.getElementById("carDeferred")&&document.getElementById("carDeferred").checked),
        by: currentUser,
        photosBefore: [...pendingCarBefore],
        photosAfter: [...pendingCarAfter]
      };
      // 2) resolve the past-date authorization gate, then 3) call the service
      gateDate(input.dateStr, ()=>{
        const res=App.services.createCarWash(input);
        // 4) handle the returned result (UI concerns live here, not in the service)
        if(!res.ok){ toast(res.error==="invalid_phone"?"أدخل رقم هاتف صحيح":"أدخل سعرًا صحيحًا"); return; }
        pendingCarBefore.length=0; pendingCarAfter.length=0;
        if(res.free) toast("🎁 غسلة مجانية — اكتملت البطاقة");
        else if(res.deferred) toast("تم الحفظ — دفع مؤجّل (غير مدفوع)");
        else if(res.cardComplete) toast("تم الحفظ — الغسلة القادمة مجانية");
        else toast("تم حفظ العملية");
        // 5) trigger render
        render();
      });
    };
    bindHold(document.getElementById("carSave"), doCarSave, 1000);
  }
  document.querySelectorAll("[data-carwa]").forEach(b=>b.onclick=()=>{ const o=state.carOps.find(x=>x.id===b.dataset.carwa); if(o) openCarChat(o); });
  document.querySelectorAll("[data-carphotos]").forEach(b=>b.onclick=()=>{ const o=state.carOps.find(x=>x.id===b.dataset.carphotos); if(o) shareCarImages(o); });
  document.querySelectorAll("[data-edit-car]").forEach(b=>b.onclick=()=>{ const o=state.carOps.find(x=>x.id===b.dataset.editCar); if(!o)return; gateDay(o.date,()=>openEditCar(b.dataset.editCar)); });
  document.querySelectorAll("[data-carpay]").forEach(b=>b.onclick=()=>{ _payCtx={type:"car",id:b.dataset.carpay}; const pd=document.getElementById("payDate"); if(pd) pd.value=ymd(new Date()); document.getElementById("payModal").style.display="flex"; });
  document.querySelectorAll("[data-edit-order]").forEach(b=>b.onclick=()=>{ const o=state.carpetOrders.find(x=>x.id===b.dataset.editOrder); if(!o)return; gateDay(o.date,()=>openEditOrder(b.dataset.editOrder)); });
  document.querySelectorAll("[data-cancel-car]").forEach(b=>bindHold(b, ()=>{ const o=state.carOps.find(x=>x.id===b.dataset.cancelCar); if(!o)return; gateDay(o.date,()=>toggleCancelCar(b.dataset.cancelCar)); }, 1000));
  document.querySelectorAll("[data-cancel-order]").forEach(b=>bindHold(b, ()=>{ const o=state.carpetOrders.find(x=>x.id===b.dataset.cancelOrder); if(!o)return; gateDay(o.date,()=>toggleCancelOrder(b.dataset.cancelOrder)); }, 1000));
  document.querySelectorAll("[data-del-car]").forEach(b=>b.onclick=()=>{
    requireCode(()=>{ tomb(b.dataset.delCar); state.carOps=state.carOps.filter(o=>o.id!==b.dataset.delCar); toast("تم الحذف"); render(); }, SECRET_CODE, "كود الحذف", "أدخل كود الحذف لتأكيد العملية.");});
  document.querySelectorAll("[data-del-cust]").forEach(b=>b.onclick=()=>{
    requireCode(()=>{ tombCust(b.dataset.delCust); delete state.customers[b.dataset.delCust]; toast("تم حذف الزبون"); render(); }, SECRET_CODE, "كود الحذف", "أدخل كود الحذف لتأكيد العملية.");});

  // carpets
  document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{state.carpetFilter=b.dataset.filter;render();});
  const ct=document.getElementById("cpType"), cpP=document.getElementById("cpPrice"),
        cpC=document.getElementById("cpCount"), cpT=document.getElementById("cpTotal");
  const recalc=()=>{ if(cpT) cpT.textContent=fmt((+cpP.value||0)*(+cpC.value||0)); };
  if(ct){
    document.querySelectorAll("[data-ppick]").forEach(btn=>btn.onclick=()=>{
      document.querySelectorAll("[data-ppick]").forEach(x=>x.classList.remove("on"));
      btn.classList.add("on");
      ct.value=btn.dataset.ppick;
      cpP.value=state.piecePrices[ct.value]||0; recalc();
    });
    cpP.oninput=recalc; cpC.oninput=recalc;
    bindPhotoStrip("cpPhotoStrip",pendingCpPhotos,"cp");
    const doCpSave=()=>{
      const unit=+cpP.value, count=+cpC.value, type=ct.value;
      const cpph=document.getElementById("cpPhone").value.trim();
      const cpcountry=document.getElementById("cpCountry").value;
      const cpcust=document.getElementById("cpCust").value.trim();
      if(!cpcust && !cpph) return toast("أدخل اسم الزبون أو رقمه");
      if(!(unit>0)) return toast("أدخل سعرًا صحيحًا");
      if(!(count>0)) return toast("أدخل عددًا صحيحًا");
      if(!validPhone(cpph)) return toast("رقم الهاتف يجب أن يكون 8 أرقام");
      const cpDateV=(document.getElementById("cpDate")||{}).value||todayStr();
      const commit=()=>{
        state.piecePrices[type]=unit;
        state.orderSeq++;
        const d=chosenDateIso(cpDateV);
        state.carpetOrders.push({id:uid(),no:orderNo(state.orderSeq,d),
          customer:cpcust, phone:cpph, country:cpcountry, by:currentUser,
          type,count,unit,price:unit*count,status:"wash",paid:false,photos:[...pendingCpPhotos],date:d});
        pendingCpPhotos.length=0;
        toast("تمت إضافة الطلب"); render();
      };
      gateDate(cpDateV, commit);
    };
    bindHold(document.getElementById("cpSave"), doCpSave, 1000);
  }
  document.querySelectorAll("[data-status]").forEach(b=>b.onclick=()=>{
    const o=state.carpetOrders.find(x=>x.id===b.dataset.status);
    if(o&&NEXT[o.status]){
      const nextStatus=NEXT[o.status];
      if(nextStatus==="done" && !o.paid){
        requireCode(()=>{
          if(!(o.customer&&o.customer.trim()) || !(o.phone&&o.phone.trim())) openDeliverInfo(o);
          else completeUnpaidDelivery(o);
        }, SECRET_CODE, "كود تسليم غير مدفوع", "تسليم طلب غير مدفوع يتطلّب الكود.");
        return;
      }
      o.status=nextStatus;
      let notify=false;
      if(o.status==="done"){ o.deliveredDate=iso(new Date()); toast("تم التسليم"); }
      else if(o.status==="ready"){ toast("الطلب جاهز"); notify=!!o.phone; }
      else toast("تم تحديث حالة الطلب");
      render();
      if(notify){ try{ openWa(o); }catch(e){} }
    }});
  document.querySelectorAll("[data-pay]").forEach(b=>b.onclick=()=>{
    const o=state.carpetOrders.find(x=>x.id===b.dataset.pay);
    if(!o) return;
    if(o.paid){ gateDay(o.date,()=>requireCode(()=>{ o.paid=false; delete o.paidDate; toast("أُلغي الدفع"); render(); }, SECRET_CODE, "كود الحذف", "إلغاء الدفع يتطلب كود الحذف.")); }
    else { _payCtx={type:"order",id:o.id}; const pd=document.getElementById("payDate"); if(pd) pd.value=ymd(new Date()); document.getElementById("payModal").style.display="flex"; }
  });
  document.querySelectorAll("[data-del-order]").forEach(b=>b.onclick=()=>{
    const o=state.carpetOrders.find(x=>x.id===b.dataset.delOrder);
    const doDel=()=>{ tomb(b.dataset.delOrder); state.carpetOrders=state.carpetOrders.filter(x=>x.id!==b.dataset.delOrder); toast("تم الحذف"); render(); };
    requireCode(doDel, SECRET_CODE, "كود الحذف", "حذف الطلب يتطلب كود الحذف.");
  });

  // expenses
  const es=document.getElementById("expSave");
  if(es){
    es.onclick=()=>{
      const amount=+document.getElementById("expAmount").value;
      const reason=document.getElementById("expReason").value.trim();
      if(!reason) return toast("اكتب اسم المصروف");
      if(!(amount>0)) return toast("أدخل مبلغًا صحيحًا");
      const expDateV=(document.getElementById("expDate")||{}).value||todayStr();
      const doAdd=()=>{
        state.expenses.push({id:uid(),amount,category:document.getElementById("expCat").value,reason,date:chosenDateIso(expDateV)});
        toast("تمت إضافة المصروف"); render();
      };
      doAdd();
    };
  }
  document.querySelectorAll("[data-del-exp]").forEach(b=>b.onclick=()=>{
    tomb(b.dataset.delExp); state.expenses=state.expenses.filter(e=>e.id!==b.dataset.delExp); toast("تم الحذف"); render(); });

  // expenses sub-tabs
  document.querySelectorAll("[data-sub]").forEach(b=>b.onclick=()=>{state.expSub=b.dataset.sub;render();});

  // meters
  const ms=document.getElementById("meterSave");
  if(ms){
    ms.onclick=()=>{
      const eN=document.getElementById("elecNow").value, wN=document.getElementById("waterNow").value;
      const elec = eN===""?null:+eN, water = wN===""?null:+wN;
      if(elec===null && water===null) return toast("أدخل قراءة العدّاد");
      const list=sortedMeters();
      const recent=list[list.length-1]||null;
      const lockedNow = recent && recent.savedAt && (Date.now()-recent.savedAt<12*3600*1000);
      const baseline = lockedNow ? (list[list.length-2]||null) : recent;
      if(baseline){
        if(elec!==null && elec<mElec(baseline)) return toast("قراءة الكهرباء أقل من آخر قراءة");
        if(water!==null && water<mWater(baseline)) return toast("قراءة الماء أقل من آخر قراءة");
      }
      const nElec = elec!==null?elec:(recent?mElec(recent):0);
      const nWater = water!==null?water:(recent?mWater(recent):0);
      if(lockedNow){
        requireCode(()=>{ recent.elec=nElec; recent.water=nWater; delete recent.elecStart;delete recent.elecEnd;delete recent.waterStart;delete recent.waterEnd; toast("تم تعديل القراءة"); render(); }, meterCode(), "كود العدّادات", "تعديل العدّاد يتطلب كود العدّادات.");
      } else {
        state.meters.push({id:uid(),date:iso(new Date()),savedAt:Date.now(),elec:nElec,water:nWater});
        toast("تم حفظ قراءة اليوم"); render();
      }
    };
  }
  const ts=document.getElementById("tarSave");
  if(ts){
    ts.onclick=()=>{
      const e=+document.getElementById("tarElec").value||0, w=+document.getElementById("tarWater").value||0;
      requireCode(()=>{ state.tariff.elec=e; state.tariff.water=w; toast("تم حفظ الأسعار"); render(); }, meterCode(), "كود العدّادات", "تعديل العدّاد يتطلب كود العدّادات.");
    };
  }

  // workers
  const wa=document.getElementById("wAdd");
  if(wa){
    wa.onclick=()=>{
      const name=document.getElementById("wName").value.trim();
      const monthly=+document.getElementById("wMonthly").value;
      const role=document.getElementById("wRole").value.trim();
      const phone=document.getElementById("wPhone").value.trim();
      const startV=document.getElementById("wStart").value;
      if(!name) return toast("أدخل اسم الموظف");
      if(phone && !validPhone(phone)) return toast("رقم الهاتف يجب أن يكون 8 أرقام");
      if(!(monthly>0)) return toast("أدخل الراتب الشهري");
      state.workers.push({id:uid(),name,role,phone,start:startV?startV+"T00:00:00.000Z":iso(new Date()),monthly,absent:[],payments:[],credits:[]});
      toast("تمت إضافة الموظف");
      saveLocal();
      render();
    };
  }
  document.querySelectorAll("[data-abstoday]").forEach(b=>b.onclick=()=>{
    const w=state.workers.find(x=>x.id===b.dataset.abstoday); if(!w) return;
    const td=new Date().toDateString();
    const i=w.absent.findIndex(d=>new Date(d).toDateString()===td);
    if(i>=0){w.absent.splice(i,1);toast("أُلغي غياب اليوم");}
    else {w.absent.push(iso(new Date()));toast("سُجّل غياب اليوم");}
    saveLocal(); render();});
  document.querySelectorAll("[data-paybtn]").forEach(b=>b.onclick=()=>{
    const w=state.workers.find(x=>x.id===b.dataset.paybtn);
    const amt=+document.querySelector(`[data-payin="${b.dataset.paybtn}"]`).value;
    if(!(amt>0)) return toast("أدخل المبلغ");
    const nEl=document.querySelector(`[data-paynote="${b.dataset.paybtn}"]`);
    w.payments.push({id:uid(),amount:amt,note:(nEl&&nEl.value.trim())||"",date:iso(new Date())});
    toast("سُجّل عليه (دفعة/سلفة)"); saveLocal(); render();});
  document.querySelectorAll("[data-creditbtn]").forEach(b=>b.onclick=()=>{
    const w=state.workers.find(x=>x.id===b.dataset.creditbtn);
    if(!w.credits) w.credits=[];
    const amt=+document.querySelector(`[data-creditin="${b.dataset.creditbtn}"]`).value;
    if(!(amt>0)) return toast("أدخل المبلغ");
    const nEl2=document.querySelector(`[data-creditnote="${b.dataset.creditbtn}"]`);
    w.credits.push({id:uid(),amount:amt,note:(nEl2&&nEl2.value.trim())||"",date:iso(new Date())});
    toast("سُجّل له (مستحق/مكافأة)"); saveLocal(); render();});
  document.querySelectorAll("[data-wstate]").forEach(b=>b.onclick=()=>openWorkerStatement(b.dataset.wstate));
  document.querySelectorAll("[data-del-worker]").forEach(b=>b.onclick=()=>{
    requireCode(()=>{ tomb(b.dataset.delWorker);state.workers=state.workers.filter(w=>w.id!==b.dataset.delWorker);toast("تم الحذف");saveLocal(); render(); }, SECRET_CODE, "كود الحذف", "حذف الموظف يتطلب كود الحذف."); });
  document.querySelectorAll(".rec-thumb").forEach(t=>t.onclick=()=>openLightbox(t.src));
  document.querySelectorAll("[data-receipt]").forEach(b=>b.onclick=()=>{ const o=state.carpetOrders.find(x=>x.id===b.dataset.receipt); if(o) openReceipt(o); });
  document.querySelectorAll("[data-wa]").forEach(b=>b.onclick=()=>{ const o=state.carpetOrders.find(x=>x.id===b.dataset.wa); if(o) openWa(o); });
  document.querySelectorAll("[data-wacust]").forEach(b=>b.onclick=()=>{ const c=state.customers[b.dataset.wacust]; if(c) openWaCust(c); });
  document.querySelectorAll(".phone-inp").forEach(el=>el.addEventListener("input",()=>{ el.value=el.value.replace(/[^0-9]/g,"").slice(0,9); }));
  const cpS=document.getElementById("cpSearch"); if(cpS) cpS.oninput=()=>{ state.cpSearch=cpS.value; _refocus="cpSearch"; render(); };
  const cuS=document.getElementById("custSearch"); if(cuS) cuS.oninput=()=>{ state.custSearch=cuS.value; _refocus="custSearch"; render(); };
  const caS=document.getElementById("carSearch"); if(caS) caS.oninput=()=>{ state.carSearch=caS.value; _refocus="carSearch"; render(); };
  const exS=document.getElementById("expSearch"); if(exS) exS.oninput=()=>{ state.expSearch=exS.value; _refocus="expSearch"; render(); };
  const rp=document.getElementById("reportPrint"); if(rp) rp.onclick=printReport;
}

/* ============ code-protected actions ============ */
let _codeCb=null, _codeExpected=SECRET_CODE;
function gateDay(dateIso, cb){ if(isPastDay(dateIso)) requireCode(cb, SECRET_CODE, "كود تعديل يوم سابق", "تعديل بيانات يوم سابق يتطلب كود التحقق."); else cb(); }
function gateDate(dateStr, commit){ if(dateStr && dateStr!==todayStr()) requireCode(commit, SECRET_CODE, "كود التاريخ السابق", "التسجيل بتاريخ سابق يتطلّب كود التحقق."); else commit(); }
function bindHold(el, cb, ms){
  if(!el) return; ms=ms||1000; el.classList.add("hold-btn");
  let t=null;
  const clear=()=>{ if(t){clearTimeout(t);t=null;} el.classList.remove("holding"); };
  el.addEventListener("pointerdown",(e)=>{ el.classList.add("holding"); t=setTimeout(()=>{ el.classList.remove("holding"); t=null; cb(); },ms); });
  el.addEventListener("pointerup",clear);
  el.addEventListener("pointerleave",clear);
  el.addEventListener("pointercancel",clear);
  el.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); });
}
function toggleCancelCar(id){ const o=state.carOps.find(x=>x.id===id); if(o){ o.cancelled=!o.cancelled; toast(o.cancelled?"تم إلغاء العملية 🚫":"أُلغي الإلغاء"); render(); } }
function toggleCancelOrder(id){ const o=state.carpetOrders.find(x=>x.id===id); if(o){ o.cancelled=!o.cancelled; toast(o.cancelled?"تم إلغاء الطلب 🚫":"أُلغي الإلغاء"); render(); } }
function requireCode(cb, expected, title, desc){
  _codeCb=cb; _codeExpected=expected||SECRET_CODE;
  const t=document.getElementById("codeTitle"); if(t) t.textContent=title||"أدخل الكود";
  const d=document.getElementById("codeDesc"); if(d) d.textContent=desc||"هذا الإجراء يتطلب إدخال الكود.";
  const inp=document.getElementById("codeInput"); inp.value="";
  document.getElementById("codeModal").style.display="flex";
  setTimeout(()=>inp.focus(),50);
}
(function(){
  const submit=()=>{
    const v=document.getElementById("codeInput").value.trim();
    if(v===_codeExpected){ document.getElementById("codeModal").style.display="none"; const cb=_codeCb; _codeCb=null; if(cb) cb(); }
    else toast("الكود غير صحيح");
  };
  document.getElementById("codeOk").onclick=submit;
  document.getElementById("codeInput").addEventListener("keydown",e=>{ if(e.key==="Enter") submit(); });
  document.getElementById("codeCancel").onclick=()=>{ document.getElementById("codeModal").style.display="none"; _codeCb=null; };
})();

function openWorkerStatement(id){
  const w=state.workers.find(x=>x.id===id); if(!w) return;
  const tx=[]
    .concat((w.credits||[]).map(c=>({t:"credit",amount:c.amount,note:c.note||"",date:c.date})))
    .concat((w.payments||[]).map(pp=>({t:"pay",amount:pp.amount,note:pp.note||"",date:pp.date})))
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
  let run=0;
  const rows=tx.length?tx.map(x=>{
    run += (x.t==="credit"? x.amount : -x.amount);
    return `<tr>
      <td>${ymd(x.date)}</td>
      <td><span class="badge ${x.t==="credit"?"b-paid":"b-unpaid"}">${x.t==="credit"?"له":"عليه"}</span></td>
      <td>${x.note||"—"}</td>
      <td class="amt" style="color:${x.t==="credit"?"var(--ready)":"var(--unpaid)"}">${x.t==="credit"?"+":"−"}${fmt(x.amount)}</td>
      <td class="amt" style="font-weight:800">${fmt(run)}</td></tr>`;
  }).join("") : `<tr><td colspan="5"><div class="empty">${svg(I.empty)}لا توجد عمليات بعد.</div></td></tr>`;
  const due=accruedDue(w), bal=wBalance(w);
  const balLabel=bal>0?"له":bal<0?"عليه":"مسدّد";
  document.getElementById("wsTitle").textContent="كشف حساب — "+w.name;
  document.getElementById("wsBody").innerHTML=`
    <div class="winfo" style="margin-bottom:10px">
      <span>الراتب الشهري: <b>${fmt(w.monthly)}</b></span>
      <span>اليومية: <b>${fmt(dayRate(w))}</b></span>
      <span>المباشرة: <b>${w.start?ymd(w.start):"—"}</b></span>
    </div>
    <div class="wstats" style="margin-bottom:12px">
      <div class="wstat wdue"><b>${fmt(due)}</b><span>مستحق الراتب</span></div>
      <div class="wstat"><b>${fmt(wCredit(w))}</b><span>إضافات (له)</span></div>
      <div class="wstat"><b>${fmt(wPaid(w))}</b><span>المأخوذ (عليه)</span></div>
    </div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>النوع</th><th>الوصف</th><th>المبلغ</th><th>الجاري</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="sum-row"><span>الرصيد النهائي (${balLabel})</span><span class="big">${money(Math.abs(bal))}</span></div>`;
  document.getElementById("wsModal").style.display="flex";
}
document.getElementById("wsClose").onclick=()=>{ document.getElementById("wsModal").style.display="none"; };
const _render=render;
let _refocus=null;
render=function(){ _render(); save(); if(_refocus){ const el=document.getElementById(_refocus); if(el){ el.focus(); const v=el.value; el.value=""; el.value=v; } _refocus=null; } };
document.getElementById("brandLogo").src=LOGO;
document.getElementById("themeBtn").onclick=()=>{ state.dark=!state.dark; applyTheme(); save(); };

/* ---- icons for header buttons ---- */
function applyHeaderIcons(){
  const sb=document.getElementById("settingsBtn"); if(sb) sb.innerHTML=svg(I.gear);
}

/* ---- backup ---- */
let unlocked=false, currentUser="";
function applyLock(){
  const ls=document.getElementById("lockScreen");
  if(state.lock&&state.lock.enabled&&!unlocked){ document.getElementById("lockLogo").src=LOGO; ls.style.display="flex"; setTimeout(()=>{const i=document.getElementById("lockName"); if(i)i.focus();},60); }
  else ls.style.display="none";
}

/* ---- receipt + print + whatsapp ---- */
function openReceipt(o){
  document.getElementById("receiptContent").innerHTML=`
    <div class="rcpt">
      <div class="rcpt-head"><b>مغاسيل صداقة</b><div>إيصال طلب — سجاد وأفرشة</div></div>
      <div class="rcpt-row"><span>رقم الطلب</span><b>${o.no}</b></div>
      <div class="rcpt-row"><span>العميل</span><b>${o.customer||"-"}</b></div>
      ${o.phone?`<div class="rcpt-row"><span>الهاتف</span><b>${o.phone}</b></div>`:""}
      <div class="rcpt-row"><span>النوع</span><b>${o.type} × ${o.count}</b></div>
      <div class="rcpt-row"><span>الحالة</span><b>${STATUS[o.status].label}</b></div>
      <div class="rcpt-row"><span>الدفع</span><b>${o.paid?"مدفوع":"غير مدفوع"}</b></div>
      <div class="rcpt-total"><span>الإجمالي</span><b>${money(o.price)}</b></div>
      <div class="rcpt-foot">نظافة .. عناية .. ثقة</div>
    </div>`;
  document.getElementById("receiptModal").style.display="flex";
}
function printReceipt(){ document.body.classList.add("printing-receipt"); window.print(); setTimeout(()=>document.body.classList.remove("printing-receipt"),400); }
function printReport(){ document.body.classList.add("printing-report"); window.print(); setTimeout(()=>document.body.classList.remove("printing-report"),400); }
function openCarChat(o){
  const ph=waPhoneFull(o.phone,o.country);
  if(!ph){ toast("لا يوجد رقم هاتف لهذا الزبون"); return; }
  const text=`${waHead()}\nرقم الطلب: ${o.no||"-"}\n${waFoot()}`;
  window.open(`https://wa.me/${ph}?text=${encodeURIComponent(text)}`,"_blank");
}
async function shareCarImages(o){
  const list=[...(o.photosBefore||[]).map((d,i)=>({d,n:`before${i+1}.jpg`})), ...(o.photosAfter||[]).map((d,i)=>({d,n:`after${i+1}.jpg`}))];
  if(!list.length){ toast("لا توجد صور لهذه الغسلة"); return; }
  const text=`${waHead()}\nرقم الطلب: ${o.no||"-"}\nصور سيارتك قبل وبعد الغسيل\n${waFoot()}`;
  try{
    const files=[];
    for(const it of list){ const bl=await (await fetch(it.d)).blob(); files.push(new File([bl], it.n, {type:bl.type||"image/jpeg"})); }
    if(navigator.canShare && navigator.canShare({files})){ await navigator.share({files, text}); return; }
    if(navigator.share){ await navigator.share({text}); return; }
  }catch(e){}
  toast("متصفحك لا يدعم مشاركة الصور مباشرة");
}
function openWa(o){
  const ph=waPhone(o);
  if(!ph){ toast("لا يوجد رقم هاتف لهذا الزبون"); return; }
  window.open(`https://wa.me/${ph}?text=${encodeURIComponent(waStatusMsg(o))}`,"_blank");
}

/* ---- wire static controls (once) ---- */
document.getElementById("settingsBtn").onclick=()=>{ requireCode(openSettings, meterCode(), "كود الإعدادات", "أدخل كود الإعدادات للدخول."); };
function openSettings(){
  document.getElementById("lockPinSet").value=(state.lock&&state.lock.pin)||"0707";
  document.getElementById("meterPinSet").value=state.meterPin||"";
  {
    const lg=document.getElementById("loginLog");
    if(lg){ const L=(state.logins||[]).slice(-20).reverse();
      lg.innerHTML=L.length?L.map(x=>`👤 <b>${x.name}</b> — ${ymd(x.date)} ${timeStr(x.date)}`).join("<br>"):"لا يوجد سجلّ بعد."; }
  }
  document.getElementById("tarElecSet").value=state.tariff.elec||0;
  document.getElementById("tarWaterSet").value=state.tariff.water||0;
  document.getElementById("thanksSet").value=state.thanksMsg||"";
  document.getElementById("adMsgSet").value=state.adMsg||"";
  const palRow=document.getElementById("palRow");
  if(palRow){
    palRow.innerHTML=PALETTES.map(pl=>`<button class="pal-sw ${state.palette===pl.k?'on':''}" data-pal="${pl.k}" style="background:linear-gradient(135deg,${pl.b},${pl.b2})" title="${pl.name}"><span>${pl.name}</span></button>`).join("");
    palRow.querySelectorAll("[data-pal]").forEach(sw=>sw.onclick=()=>{ state.palette=sw.dataset.pal; applyPalette(); saveLocal(); palRow.querySelectorAll(".pal-sw").forEach(x=>x.classList.toggle("on",x.dataset.pal===state.palette)); });
  }
  document.getElementById("settingsModal").style.display="flex";
};
document.getElementById("setClose").onclick=()=>document.getElementById("settingsModal").style.display="none";
let _editCtx=null;
function openEditCar(id){
  const o=state.carOps.find(x=>x.id===id); if(!o) return; _editCtx={type:"car",id};
  const vehOpts=Object.keys(VEH_LETTER).map(v=>`<option value="${v}" ${v===o.vehicle?"selected":""}>${v}</option>`).join("");
  const washOpts=WASH_TYPES.map(w=>`<option value="${w}" ${w===o.wash?"selected":""}>${w}</option>`).join("");
  document.getElementById("editBody").innerHTML=`
    <div class="field"><label>نوع السيارة</label><select id="edVehicle">${vehOpts}</select></div>
    <div class="field"><label>نوع الغسيل</label><select id="edWash">${washOpts}</select></div>
    <div class="field"><label>اللوحة</label><input id="edPlate" type="text" value="${(o.plate||"").replace(/"/g,"&quot;")}"></div>
    <div class="field"><label>السعر</label><input id="edPrice" type="number" value="${o.price}"></div>`;
  document.getElementById("editModal").style.display="flex";
}
function openEditOrder(id){
  const o=state.carpetOrders.find(x=>x.id===id); if(!o) return; _editCtx={type:"order",id};
  const typeOpts=Object.keys(state.piecePrices).map(t=>`<option value="${t}" ${t===o.type?"selected":""}>${t}</option>`).join("");
  document.getElementById("editBody").innerHTML=`
    <div class="field"><label>النوع</label><select id="edType">${typeOpts}</select></div>
    <div class="field"><label>العدد</label><input id="edCount" type="number" min="1" value="${o.count}"></div>
    <div class="field"><label>سعر الوحدة</label><input id="edUnit" type="number" min="0" value="${o.unit}"></div>
    <div class="field"><label>اسم الزبون</label><input id="edCust" type="text" value="${(o.customer||"").replace(/"/g,"&quot;")}"></div>`;
  document.getElementById("editModal").style.display="flex";
}
document.getElementById("editClose").onclick=()=>{ document.getElementById("editModal").style.display="none"; _editCtx=null; };
document.getElementById("editSave").onclick=()=>{
  if(!_editCtx) return;
  if(_editCtx.type==="car"){
    const o=state.carOps.find(x=>x.id===_editCtx.id); if(!o) return;
    o.vehicle=document.getElementById("edVehicle").value;
    o.wash=document.getElementById("edWash").value;
    o.plate=document.getElementById("edPlate").value.trim();
    o.price=+document.getElementById("edPrice").value||0;
    o.editedAt=iso(new Date());
  } else {
    const o=state.carpetOrders.find(x=>x.id===_editCtx.id); if(!o) return;
    o.type=document.getElementById("edType").value;
    o.count=Math.max(1,+document.getElementById("edCount").value||1);
    o.unit=+document.getElementById("edUnit").value||0;
    o.price=o.unit*o.count;
    o.customer=document.getElementById("edCust").value.trim();
    o.editedAt=iso(new Date());
  }
  document.getElementById("editModal").style.display="none"; _editCtx=null;
  toast("تم حفظ التعديل"); render();
};
let _dvId=null;
function completeUnpaidDelivery(o){ o.status="done"; o.deliveredDate=iso(new Date()); toast("تم التسليم — غير مدفوع (دَين)"); render(); }
function openDeliverInfo(o){
  _dvId=o.id;
  document.getElementById("dvName").value=o.customer||"";
  document.getElementById("dvCountry").innerHTML=countryOpts(o.country);
  document.getElementById("dvPhone").value=o.phone||"";
  document.getElementById("deliverModal").style.display="flex";
}
document.getElementById("dvOk").onclick=()=>{
  const o=state.carpetOrders.find(x=>x.id===_dvId); if(!o) return;
  const name=document.getElementById("dvName").value.trim();
  const phone=document.getElementById("dvPhone").value.trim();
  if(!name) return toast("أدخل اسم الزبون");
  if(!phone) return toast("أدخل رقم الهاتف");
  if(!validPhone(phone)) return toast("رقم هاتف غير صحيح");
  o.customer=name; o.phone=phone; o.country=document.getElementById("dvCountry").value;
  document.getElementById("deliverModal").style.display="none"; _dvId=null;
  completeUnpaidDelivery(o);
};
document.getElementById("dvCancel").onclick=()=>{ document.getElementById("deliverModal").style.display="none"; _dvId=null; };
let _payCtx=null;
document.getElementById("payOk").onclick=()=>{
  if(_payCtx){ const list=_payCtx.type==="car"?state.carOps:state.carpetOrders; const o=list.find(x=>x.id===_payCtx.id);
    if(o){ const dv=document.getElementById("payDate").value||ymd(new Date()); o.paid=true; o.paidDate=chosenDateIso(dv); toast("تم تحصيل الدفع"); } }
  document.getElementById("payModal").style.display="none"; _payCtx=null; render();
};
document.getElementById("payCancel").onclick=()=>{ document.getElementById("payModal").style.display="none"; _payCtx=null; };
document.getElementById("btnExport").onclick=exportData;
document.getElementById("fileImport").onchange=(e)=>{ if(e.target.files[0]) importData(e.target.files[0]); };
document.getElementById("btnReset").onclick=()=>{ if(confirm("سيتم مسح كل البيانات (الطلبات، الزبائن، المصروفات، العمّال، العدّادات) من هذا الجهاز والسحابة نهائيًا. هل أنت متأكد؟")){ resetAllData(); document.getElementById("settingsModal").style.display="none"; } };
document.getElementById("setSave").onclick=()=>{
  const pin=document.getElementById("lockPinSet").value.trim()||"0707";
  state.lock={enabled:true,pin:pin};
  state.meterPin=document.getElementById("meterPinSet").value.trim();
  state.tariff.elec=+document.getElementById("tarElecSet").value||0;
  state.tariff.water=+document.getElementById("tarWaterSet").value||0;
  state.thanksMsg=document.getElementById("thanksSet").value.trim();
  state.adMsg=document.getElementById("adMsgSet").value.trim();
  unlocked=true; // owner just set it, stays unlocked this session
  save(); document.getElementById("settingsModal").style.display="none"; toast("تم حفظ الإعدادات");
};
document.getElementById("receiptClose").onclick=()=>document.getElementById("receiptModal").style.display="none";
document.getElementById("receiptPrint").onclick=printReceipt;
(function(){
  // نعرف متى فتح التطبيق نفسه واتساب/المشاركة، حتى لا يُقفل عند العودة القريبة منها
  const _open=window.open;
  window.open=function(){ window._extNav=Date.now(); return _open.apply(window,arguments); };
  const _share=navigator.share?navigator.share.bind(navigator):null;
  if(_share) navigator.share=function(){ window._extNav=Date.now(); return _share.apply(navigator,arguments); };
  window._hiddenAt=0;
  const relock=()=>{ unlocked=false; currentUser=""; applyLock(); };
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){ window._hiddenAt=Date.now(); return; }
    const away = window._hiddenAt ? (Date.now()-window._hiddenAt) : 0;
    const leftForApp = window._extNav && (window._hiddenAt - window._extNav < 5000);
    const limit = leftForApp ? 5*60*1000 : 30*1000;
    window._hiddenAt=0;
    if(away>limit) relock();
  });
  window.addEventListener("pageshow",(e)=>{ if(e.persisted) relock(); });
  const doEnter=()=>{
    const nm=document.getElementById("lockName").value.trim();
    const v=document.getElementById("lockInput").value.trim();
    if(nm.length<2) return toast("أدخل اسمك أولًا");
    if(v!==(state.lock&&state.lock.pin)) return toast("كود الدخول غير صحيح");
    currentUser=nm;
    if(!state.logins) state.logins=[];
    state.logins.push({id:uid(),name:nm,date:iso(new Date())});
    if(state.logins.length>200) state.logins=state.logins.slice(-200);
    unlocked=true;
    document.getElementById("lockInput").value=""; document.getElementById("lockName").value="إبراهيم";
    save(); applyLock(); render();
    toast("أهلًا "+nm);
  };
  document.getElementById("lockEnter").onclick=doEnter;
  document.getElementById("lockName").addEventListener("keydown",e=>{ if(e.key==="Enter") document.getElementById("lockInput").focus(); });
  document.getElementById("lockInput").addEventListener("keydown",e=>{ if(e.key==="Enter") doEnter(); });
})();


load();
runMigrations(); saveLocal();
{ const t=ymd(new Date()); state.dateFrom=t; state.dateTo=t; }
state.lock={enabled:true, pin:(state.lock&&state.lock.pin)||"0707"};
applyPalette();
applyTheme();
applyHeaderIcons();
applyLock();
render();

/* ---- Commit 4: namespace registration (aliases; globals retained) ---- */
Object.assign(App.ui,     { render, bindScreen, gateDay, gateDate, bindHold, requireCode, toggleCancelCar,
  toggleCancelOrder, openWorkerStatement, applyHeaderIcons, applyLock, openReceipt, printReceipt, printReport,
  openCarChat, shareCarImages, openWa, openSettings, openEditCar, openEditOrder, completeUnpaidDelivery,
  openDeliverInfo });
