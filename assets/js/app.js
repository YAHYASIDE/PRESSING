/* app.js — Render dispatcher, event wiring, modals, lock, boot sequence (extracted from index.html) */
/* ================= Roles & capabilities (Release 4) ================= */
function roleDef(){ return (App.config.ROLES[state.role]) || App.config.ROLES.manager; }
function can(cap){ return !!(roleDef().caps && roleDef().caps[cap]); }
function roleTabs(){ return roleDef().tabs || ["dashboard","cars","carpets","expenses","reports"]; }
Object.assign(App.core, { roleDef, can, roleTabs });

/* ================= Render + events ================= */
function render(){
  // role + business guard: fall back to the first tab allowed by BOTH role and business config
  const allowed=roleTabs().filter(t=>tabVisible(t));
  if(!state.opDetail && state.tab!=="subscription" && allowed.indexOf(state.tab)<0) state.tab=allowed[0]||"cars";
  // Release 4 — hide admin-only chrome (settings) from roles without the capability
  const sb=document.getElementById("settingsBtn"); if(sb) sb.style.display=can('settings')?"":"none";
  const rb=document.getElementById("roleBadge"); if(rb){ rb.textContent=roleDef().label; rb.style.display=unlocked?"":"none"; }
  const lob=document.getElementById("logoutBtn"); if(lob) lob.style.display=unlocked?"":"none";
  applySetup();   // Release 5 — first launch (unconfigured business) opens the Setup Wizard
  renderNav();
  // Release 4 — the Operation Details screen replaces the main screen when an op is open
  if(state.opDetail){
    document.getElementById("main").innerHTML=`<div class="screen op-detail-screen">${screenOpDetail()}</div>`;
    bindScreen(); return;
  }
  // Release 5.1 — the Subscription page (reachable from the trial card / onboarding)
  if(state.tab==="subscription"){
    document.getElementById("main").innerHTML=`<div class="screen">${screenSubscription()}</div>`;
    bindScreen(); return;
  }
  const map={dashboard:screenDashboard,cars:screenCars,carpets:screenCarpets,expenses:screenExpenses,reports:screenReports};
  const fn = (allowed.indexOf(state.tab)>=0 ? map[state.tab] : null) || map[allowed[0]] || screenCars;
  document.getElementById("main").innerHTML=`<div class="screen">${fn()}</div>`;
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
    const updLoyalty=()=>{const pl=plateInp.value.trim(); const cph=document.getElementById("carPhone"); const cco=document.getElementById("carCountry");
      const c=pl?state.customers[pl]:null;
      if(c){ if(c.phone&&cph&&!cph.value) cph.value=c.phone; if(c.country&&cco&&!cco.dataset.touched) cco.value=c.country; }
      // loyalty card preview only when the module is enabled
      if(pl && loyaltyEnabled()){ lbox.style.display="block"; lbox.innerHTML=loyaltyCardHTML(pl); }
      else { lbox.style.display="none"; lbox.innerHTML=""; }};
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
        note: (document.getElementById("carNote")||{}).value ? document.getElementById("carNote").value.trim() : "",
        photosBefore: [...pendingCarBefore],
        photosAfter: [...pendingCarAfter]
      };
      // 2) resolve the past-date authorization gate, then 3) call the service
      gateDate(input.dateStr, ()=>{
        const res=App.services.createCarWash(input);
        // 4) handle the returned result (UI concerns live here, not in the service)
        if(!res.ok){ toast(res.error==="invalid_phone"?"أدخل رقم هاتف صحيح":"أدخل سعرًا صحيحًا"); return; }
        pendingCarBefore.length=0; pendingCarAfter.length=0;
        if(res.free) toast("🎁 غسلة مجانية — مكافأة الولاء");
        else if(res.deferred) toast("تم الحفظ — دفع مؤجّل (غير مدفوع)");
        else if(res.discounted) toast("تم الحفظ — طُبِّق خصم الولاء 🎉");
        else if(res.couponEarned) toast("تم الحفظ — حصل الزبون على كوبون 🎟️");
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

  // Release 5.1 — subscription page navigation + plan buttons (no gateway yet)
  document.querySelectorAll("[data-go-sub]").forEach(b=>b.onclick=()=>{ state.tab="subscription"; state.opDetail=null; render(); window.scrollTo(0,0); });
  document.querySelectorAll("[data-sub-back]").forEach(b=>b.onclick=()=>{ state.tab="dashboard"; render(); });
  document.querySelectorAll("[data-plan]").forEach(b=>b.onclick=()=>{ toast("قريبًا — بوّابة الدفع قيد التفعيل"); });

  // Release 4 — navigation to / from the Operation Details screen
  document.querySelectorAll("[data-op-open]").forEach(b=>b.onclick=()=>{ state.opDetail=b.dataset.opOpen; render(); window.scrollTo(0,0); });
  document.querySelectorAll("[data-op-back]").forEach(b=>b.onclick=()=>{ state.opDetail=null; render(); });
  // Release 4 — the ONE guided primary action: workers never pick a stage, the workflow decides the next step
  document.querySelectorAll("[data-op-primary]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.opPrimary, kind=b.dataset.kind;
    if(kind==="stage"){
      const res=App.services.setCarStage({id, stage:b.dataset.to});
      if(res.ok){ const st=(CAR_STAGES.find(s=>s.k===res.stage)||{}).label||""; toast("المرحلة: "+st); render(); }
    } else if(kind==="deliver" || kind==="collect"){
      _deliverId=id; const ds=document.getElementById("deliverSheet"); if(ds) ds.classList.add("open");
    }
  });

  // car workflow (Release 2): stage filter, advance to next stage, jump to a stage
  document.querySelectorAll("[data-carfilter]").forEach(b=>b.onclick=()=>{ state.carStageFilter=b.dataset.carfilter; render(); });
  document.querySelectorAll("[data-car-advance]").forEach(b=>b.onclick=()=>{
    // advancing INTO delivered goes through the payment sheet
    const o=state.carOps.find(x=>x.id===b.dataset.carAdvance);
    const keys=CAR_STAGES.map(s=>s.k); const ni=keys.indexOf((o&&o.stage)||"received")+1;
    if(keys[ni]==="delivered"){ _deliverId=b.dataset.carAdvance; const ds=document.getElementById("deliverSheet"); if(ds) ds.classList.add("open"); return; }
    const res=App.services.setCarStage({id:b.dataset.carAdvance, stage:"__next__"});
    if(res.ok){ const st=(CAR_STAGES.find(s=>s.k===res.stage)||{}).label||""; toast("المرحلة: "+st); render(); }
  });
  document.querySelectorAll("[data-car-setstage]").forEach(b=>b.onclick=()=>{
    if(b.dataset.stage==="delivered"){ _deliverId=b.dataset.carSetstage; const ds=document.getElementById("deliverSheet"); if(ds) ds.classList.add("open"); return; }
    const res=App.services.setCarStage({id:b.dataset.carSetstage, stage:b.dataset.stage});
    if(res.ok){ const st=(CAR_STAGES.find(s=>s.k===res.stage)||{}).label||""; toast("المرحلة: "+st); render(); }
  });
  // delivery payment sheet (Release 3): open on "تسليم", pick method -> deliverOperation -> close
  document.querySelectorAll("[data-open-deliver]").forEach(b=>b.onclick=()=>{ _deliverId=b.dataset.openDeliver; const ds=document.getElementById("deliverSheet"); if(ds) ds.classList.add("open"); });
  document.querySelectorAll("[data-close-deliver]").forEach(b=>b.onclick=()=>{ const ds=document.getElementById("deliverSheet"); if(ds) ds.classList.remove("open"); _deliverId=null; });
  document.querySelectorAll("[data-paymethod]").forEach(b=>b.onclick=()=>{
    const ds=document.getElementById("deliverSheet"); if(ds) ds.classList.remove("open");
    if(_deliverId){ const res=App.services.deliverOperation({id:_deliverId, method:b.dataset.paymethod});
      if(res.ok){ const m=(bizPayMethods().find(x=>x.k===res.method)||{}).label||""; toast("تم التسليم — "+m); } }
    _deliverId=null; render();
  });

  // mobile-first: expandable cards (details open on tap) — no re-render, preserves the list
  document.querySelectorAll("[data-op-toggle]").forEach(h=>h.onclick=()=>{ const c=h.closest(".op-card"); if(c) c.classList.toggle("open"); });
  // loyalty collapsible — persist open state across re-renders (so search stays usable)
  const lc=document.querySelector(".loyalty-collapse");
  if(lc) lc.addEventListener("toggle",()=>{ state.loyaltyOpen=lc.open; });
  // reception wizard (step-by-step) — pure DOM step navigation, no re-render
  const wiz=document.getElementById("receptionWizard");
  if(wiz){
    const panels=[...wiz.querySelectorAll(".wiz-panel")];
    const dots=[...wiz.querySelectorAll(".wiz-dot")];
    const total=panels.length;
    const backB=wiz.querySelector("[data-wiz-back]"), nextB=wiz.querySelector("[data-wiz-next]");
    const saveB=document.getElementById("carSave"), lbl=wiz.querySelector(".wiz-progress-lbl");
    const show=(n)=>{ n=Math.max(0,Math.min(total-1,n)); wiz.dataset.step=n;
      panels.forEach((p,i)=>p.classList.toggle("active",i===n));
      dots.forEach((d,i)=>d.classList.toggle("on",i<=n));
      if(backB) backB.style.visibility=(n===0)?"hidden":"visible";
      if(nextB) nextB.style.display=(n===total-1)?"none":"";
      if(saveB) saveB.style.display=(n===total-1)?"":"none";
      if(lbl) lbl.textContent=`الخطوة ${n+1} من ${total}`;
    };
    if(nextB) nextB.onclick=()=>show((+wiz.dataset.step||0)+1);
    if(backB) backB.onclick=()=>show((+wiz.dataset.step||0)-1);
    document.querySelectorAll("[data-open-reception]").forEach(b=>b.onclick=()=>{ wiz.classList.add("open"); show(0); });
    document.querySelectorAll("[data-close-reception]").forEach(b=>b.onclick=()=>{ wiz.classList.remove("open"); });
    show(0);
  }

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
  tickOpTimers();   // fill live timers immediately after each render
}
/* Release 3 — live operation timers: update elapsed text + red-when-over, without re-render */
function tickOpTimers(){
  const now=Date.now();
  document.querySelectorAll(".op-timer[data-op-since]").forEach(el=>{
    const since=+el.dataset.opSince, exp=+el.dataset.opExp||0;
    const min=Math.floor((now-since)/60000);
    el.textContent=(min<60?min+" د":Math.floor(min/60)+"س "+(min%60)+"د");
    el.classList.toggle("over", exp>0 && min>exp);
  });
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
  // Release 5.1 — a fresh (unconfigured) business goes straight to the Setup Wizard,
  // which creates the first user; the lock screen only applies once configured.
  if(businessConfigured() && state.lock&&state.lock.enabled&&!unlocked){ document.getElementById("lockLogo").src=LOGO; ls.style.display="flex"; setTimeout(()=>{const i=document.getElementById("lockName"); if(i)i.focus();},60); }
  else ls.style.display="none";
}

/* ---- receipt + print + whatsapp ---- */
function openReceipt(o){
  document.getElementById("receiptContent").innerHTML=`
    <div class="rcpt">
      <div class="rcpt-head"><b>${bizName()}</b><div>إيصال طلب — سجاد وأفرشة</div></div>
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
  bindFeatureModules();
  bindBusinessSettings();
  document.getElementById("settingsModal").style.display="flex";
};
/* Business Settings — edit state.business (types, currency/location, hours, services, payments) live. */
function bindBusinessSettings(){
  const host=document.getElementById("businessSettings"); if(!host) return;
  const b=state.business; if(!b) return;
  const paint=()=>{
    host.innerHTML=businessSettingsHTML();
    host.querySelectorAll("[data-bs-type]").forEach(x=>x.onclick=()=>{ b.types[x.dataset.bsType]=!b.types[x.dataset.bsType]; saveLocal(); paint(); render(); });
    host.querySelectorAll("[data-bs-svc]").forEach(cb=>cb.onchange=()=>{ b.services[cb.dataset.bsSvc]=cb.checked; saveLocal(); render(); });
    host.querySelectorAll("[data-bs-pay]").forEach(cb=>cb.onchange=()=>{
      const k=cb.dataset.bsPay, base=PAYMENT_CATALOG.find(p=>p.k===k);
      if(cb.checked){ if(!b.paymentMethods.some(x=>x.k===k)) b.paymentMethods.push({k:k,label:(base||{}).label||k}); }
      else b.paymentMethods=b.paymentMethods.filter(x=>x.k!==k);
      saveLocal();
    });
    const addB=host.querySelector("[data-bs-pay-add]");
    if(addB) addB.onclick=()=>{ const inp=document.getElementById("bsPayCustom"); const v=(inp.value||"").trim(); if(!v) return; b.paymentMethods.push({k:"custom_"+uid(),label:v,custom:true}); saveLocal(); paint(); };
    host.querySelectorAll("[data-bs-pay-del]").forEach(x=>x.onclick=()=>{ b.paymentMethods=b.paymentMethods.filter(y=>y.k!==x.dataset.bsPayDel); saveLocal(); paint(); });
    host.querySelectorAll("[data-bs-day]").forEach(x=>x.onclick=()=>{ const k=+x.dataset.bsDay; const i=b.workingHours.days.indexOf(k); if(i>=0) b.workingHours.days.splice(i,1); else b.workingHours.days.push(k); saveLocal(); paint(); });
    const sel=(id,fn)=>{ const el=document.getElementById(id); if(el) el.onchange=()=>{ fn(el.value); saveLocal(); render(); }; };
    sel("bsCurrency",v=>b.currency=v); sel("bsCountry",v=>b.country=v); sel("bsLang",v=>b.language=v); sel("bsTz",v=>b.timezone=v);
    const tm=(id,fn)=>{ const el=document.getElementById(id); if(el) el.onchange=()=>{ fn(el.value); saveLocal(); }; };
    tm("bsOpen",v=>b.workingHours.open=v); tm("bsClose",v=>b.workingHours.close=v);
  };
  paint();
}
/* Feature Modules — render the registry, wire toggles + loyalty config; changes apply live. */
function bindFeatureModules(){
  const host=document.getElementById("featureModules");
  if(!host) return;
  const paint=()=>{
    host.innerHTML=featureModulesHTML();
    // module on/off toggles
    host.querySelectorAll("[data-feat]").forEach(cb=>cb.onchange=()=>{
      const k=cb.dataset.feat;
      if(!state.features[k]) state.features[k]={};
      state.features[k].enabled=cb.checked;
      if(state.business&&state.business.features) state.business.features[k]=cb.checked;  // keep business config in sync
      saveLocal(); paint(); render();     // re-render main so gated UI appears/disappears immediately
      toast(cb.checked?"تم تفعيل الميزة":"تم إيقاف الميزة");
    });
    // loyalty strategy pills
    host.querySelectorAll("[data-loy-strat]").forEach(b=>b.onclick=()=>{
      state.features.loyalty.strategy=b.dataset.loyStrat;
      saveLocal(); paint(); render();
    });
    // loyalty rule fields
    host.querySelectorAll("[data-loy-field]").forEach(inp=>inp.onchange=()=>{
      const key=inp.dataset.loyField;
      state.features.loyalty[key]=(inp.type==="number")?(+inp.value||0):inp.value.trim();
      saveLocal(); render();
    });
  };
  paint();
}
document.getElementById("setClose").onclick=()=>document.getElementById("settingsModal").style.display="none";
let _editCtx=null;
function openEditCar(id){
  const o=state.carOps.find(x=>x.id===id); if(!o) return; _editCtx={type:"car",id};
  const vehOpts=Object.keys(VEH_LETTER).map(v=>`<option value="${v}" ${v===o.vehicle?"selected":""}>${v}</option>`).join("");
  const washList=bizServices().slice(); if(o.wash && washList.indexOf(o.wash)<0) washList.unshift(o.wash);
  const washOpts=washList.map(w=>`<option value="${w}" ${w===o.wash?"selected":""}>${w}</option>`).join("");
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
let _payCtx=null, _deliverId=null;
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
  // Release 4 — role picker on the lock screen (defaults to manager)
  let _pickRole=(state.role)||"manager";
  document.querySelectorAll("#lockRoles [data-role]").forEach(b=>b.onclick=()=>{
    _pickRole=b.dataset.role;
    document.querySelectorAll("#lockRoles .role-chip").forEach(x=>x.classList.toggle("on",x.dataset.role===_pickRole));
  });
  const doEnter=()=>{
    const nm=document.getElementById("lockName").value.trim();
    const v=document.getElementById("lockInput").value.trim();
    if(nm.length<2) return toast("أدخل اسمك أولًا");
    if(v!==(state.lock&&state.lock.pin)) return toast("كود الدخول غير صحيح");
    currentUser=nm;
    state.role=_pickRole||"manager";
    state.opDetail=null;
    { const allowed=App.core.roleTabs(); if(allowed.indexOf(state.tab)<0) state.tab=allowed[0]||"cars"; }
    if(!state.logins) state.logins=[];
    state.logins.push({id:uid(),name:nm,role:state.role,date:iso(new Date())});
    if(state.logins.length>200) state.logins=state.logins.slice(-200);
    unlocked=true;
    document.getElementById("lockInput").value=""; document.getElementById("lockName").value="إبراهيم";
    save(); applyLock(); render();
    toast("أهلًا "+nm);
  };
  document.getElementById("lockEnter").onclick=doEnter;
  document.getElementById("lockName").addEventListener("keydown",e=>{ if(e.key==="Enter") document.getElementById("lockInput").focus(); });
  document.getElementById("lockInput").addEventListener("keydown",e=>{ if(e.key==="Enter") doEnter(); });
  const lob=document.getElementById("logoutBtn");
  if(lob) lob.onclick=()=>{ unlocked=false; currentUser=""; state.opDetail=null; applyLock(); toast("تم تسجيل الخروج"); };
})();

/* ================= Business Setup Wizard (Release 5) ================= */
let _setup=null;
function applyBusiness(){
  const b=state.business||{};
  const h=document.querySelector(".brand h1"); if(h && b.name) h.textContent=b.name;
  const lg=document.getElementById("brandLogo"); if(lg && b.logo) lg.src=b.logo;
}
/* Release 5.1 — the wizard now runs BEFORE login (it creates the first user).
   Show it whenever the business is not yet configured. */
function applySetup(){
  const el=document.getElementById("setupScreen"); if(!el) return;
  if(!businessConfigured()){ if(!_setup) startSetup(); el.style.display="flex"; }
  else el.style.display="none";
}
function startSetup(){
  const draft=JSON.parse(JSON.stringify(defaultBusiness()));   // everything defaulted here
  draft.loyalty=Object.assign(defaultLoyaltyCfg(), (state.features&&state.features.loyalty)||{});
  draft.loyalty.enabled=true;
  draft._mgrName=""; draft._mgrPhone=""; draft._mgrPass=""; draft._mgrCountry="222";
  _setup={ i:0, draft };
  renderSetupStep();
}
function renderSetupStep(){
  if(!_setup) return;
  const steps=setupSteps();
  if(_setup.i>steps.length-1) _setup.i=steps.length-1;
  const key=steps[_setup.i];
  document.getElementById("setupBody").innerHTML=setupStepView(key,_setup.draft);
  const total=steps.length, pct=Math.round((_setup.i/(total-1))*100);
  document.getElementById("suBar").style.width=pct+"%";
  document.getElementById("suStepLbl").textContent=`الخطوة ${_setup.i+1} من ${total}`;
  const nav=document.getElementById("suNav"), back=document.getElementById("suBack"), next=document.getElementById("suNext");
  if(nav) nav.style.display = key==="success" ? "none" : "flex";   // success has its own buttons
  if(back) back.style.visibility=_setup.i===0?"hidden":"visible";
  if(next) next.textContent = key==="info" ? "إنشاء النشاط" : "التالي";
  const body=document.getElementById("setupBody"); if(body) body.scrollTop=0;
  wireSetupStep(key);
}
/* wire the interactive controls of the current step */
function wireSetupStep(key){
  const d=_setup.draft, host=document.getElementById("setupBody");
  // Step 1 — business activities (multi-select)
  host.querySelectorAll("[data-su-type]").forEach(b=>b.onclick=()=>{ const k=b.dataset.suType; d.types[k]=!d.types[k]; renderSetupStep(); });
  // Step 2 — manager info (live-bind to draft)
  const bind=(id,fn)=>{ const el=document.getElementById(id); if(el) el.oninput=()=>fn(el); };
  bind("suMgrName",el=>d._mgrName=el.value);
  bind("suMgrPhone",el=>{ el.value=el.value.replace(/[^0-9]/g,"").slice(0,9); d._mgrPhone=el.value; });
  bind("suMgrPass",el=>d._mgrPass=el.value);
  const mc=document.getElementById("suMgrCountry"); if(mc) mc.onchange=()=>d._mgrCountry=mc.value;
  // Step 3 — business info
  bind("suName",el=>d.name=el.value);
  const logo=document.getElementById("suLogo");
  if(logo) logo.onchange=()=>{ const f=logo.files&&logo.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ d.logo=r.result; const pv=document.getElementById("suLogoPrev"); if(pv) pv.src=r.result; }; r.readAsDataURL(f); };
  // Step 4 — success actions
  host.querySelectorAll("[data-su-finish]").forEach(b=>b.onclick=()=>finishSetup(b.dataset.suFinish));
}
/* commit the draft: create the manager + log in, save business config, start the trial */
function finishSetup(mode){
  const d=_setup.draft;
  // 1) create the first user (manager) and log them in automatically
  currentUser=(d._mgrName||"مدير").trim();
  state.role="manager";
  state.lock={ enabled:true, pin:(d._mgrPass||"0707") };
  state.manager={ name:currentUser, phone:d._mgrPhone||"", country:d._mgrCountry||"222" };
  if(!state.logins) state.logins=[];
  state.logins.push({ id:uid(), name:currentUser, role:"manager", date:iso(new Date()) });
  unlocked=true;
  // 2) apply feature flags into the engine + merge loyalty (reused, not duplicated)
  Object.keys(d.features).forEach(k=>{ if(!state.features[k]) state.features[k]={}; state.features[k].enabled=!!d.features[k]; });
  state.features.loyalty=Object.assign({}, state.features.loyalty, d.loyalty, { enabled:!!d.features.loyalty });
  // 3) finalize the business config (strip temp manager fields)
  d.phone=d._mgrPhone||d.phone||""; delete d._mgrName; delete d._mgrPhone; delete d._mgrPass; delete d._mgrCountry; delete d.loyalty;
  d.configured=true;
  state.business=d;
  // 4) start the free trial
  state.subscription={ trialStart:iso(new Date()), plan:null, active:false };
  _setup=null;
  save(); applyBusiness();
  document.getElementById("setupScreen").style.display="none";
  state.opDetail=null;
  state.tab = (mode==="plans") ? "subscription" : "dashboard";
  render(); toast("تم إنشاء نشاطك 🎉");
}
(function(){
  const next=document.getElementById("suNext"), back=document.getElementById("suBack");
  if(next) next.onclick=()=>{
    if(!_setup) return;
    const steps=setupSteps(), key=steps[_setup.i], d=_setup.draft;
    if(key==="activities" && !Object.keys(d.types).some(k=>d.types[k])) return toast("اختر نشاطًا واحدًا على الأقل");
    if(key==="manager"){
      if((d._mgrName||"").trim().length<2) return toast("أدخل اسم المدير");
      if(!validPhone(d._mgrPhone||"")) return toast("أدخل رقم هاتف صحيح (8 أرقام)");
      if((d._mgrPass||"").length<4) return toast("اختر كلمة مرور (4 خانات على الأقل)");
    }
    if(key==="info"){ if(!(d.name||"").trim()) return toast("أدخل اسم النشاط"); }
    _setup.i=Math.min(steps.length-1,_setup.i+1); renderSetupStep();
  };
  if(back) back.onclick=()=>{ if(_setup && _setup.i>0){ _setup.i--; renderSetupStep(); } };
})();


load();
runMigrations(); saveLocal();
{ const t=ymd(new Date()); state.dateFrom=t; state.dateTo=t; }
state.lock={enabled:true, pin:(state.lock&&state.lock.pin)||"0707"};
applyPalette();
applyTheme();
applyHeaderIcons();
applyBusiness();   // Release 5 — apply saved business name/logo to the header
applyLock();
render();
setInterval(tickOpTimers, 30000);   // Release 3 — keep live operation timers ticking

/* ---- Commit 4: namespace registration (aliases; globals retained) ---- */
Object.assign(App.ui,     { render, bindScreen, bindFeatureModules, bindBusinessSettings, gateDay, gateDate, bindHold, requireCode, toggleCancelCar,
  toggleCancelOrder, openWorkerStatement, applyHeaderIcons, applyLock, openReceipt, printReceipt, printReport,
  openCarChat, shareCarImages, openWa, openSettings, openEditCar, openEditOrder, completeUnpaidDelivery,
  openDeliverInfo, applySetup, applyBusiness, startSetup, renderSetupStep, finishSetup });
