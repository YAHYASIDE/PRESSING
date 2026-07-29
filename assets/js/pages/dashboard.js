/* pages/dashboard.js — Dashboard screen + period reports (extracted from index.html) */
/* ================= Screens ================= */
function buildReportText(){
  const F=(iso)=>inRange(iso);
  const carsInc=carIncome(F), rugsInc=carpetIncome(F);
  const inc=carsInc+rugsInc;
  const gen=manualExp(F), util=utilityCost(F), wages=wagesRange();
  const exp=gen+util+wages, profit=inc-exp;
  const carCount=state.carOps.filter(o=>F(o.date)).length;
  const rugCount=state.carpetOrders.filter(o=>F(o.date)).length;
  const washing=state.carpetOrders.filter(o=>o.status==="wash"&&F(o.date)).length;
  const today=ymd(now);
  const period=(state.dateFrom===state.dateTo)?(state.dateFrom===today?("اليوم "+today):state.dateFrom):(state.dateFrom+" ← "+state.dateTo);
  return `📋 تقرير مغاسيل صداقة
📅 ${period}

💰 الدخل: ${money(inc)}
   🚗 سيارات: ${money(carsInc)}
   🧺 سجاد: ${money(rugsInc)}

💸 المصروفات: ${money(exp)}
   👷 عمّال: ${money(wages)}
   🧾 عامة: ${money(gen)}
   ⚡ عدّادات: ${money(util)}

📈 الربح: ${money(profit)}

🚗 سيارات: ${carCount}
🧺 طلبات سجاد: ${rugCount}
🔄 قيد الغسيل: ${washing}`;
}
function sendReport(){
  const text=buildReportText();
  try{ if(navigator.share){ navigator.share({text}).catch(()=>{}); return; } }catch(e){}
  window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank");
}
function buildReportText2(){
  const F=(iso)=>inRange(iso);
  const carsInc=carIncome(F), rugsInc=carpetIncome(F);
  const inc=carsInc+rugsInc;
  const gen=manualExp(F);
  const net=inc-gen;
  const today=ymd(now);
  const period=(state.dateFrom===state.dateTo)?(state.dateFrom===today?("اليوم "+today):state.dateFrom):(state.dateFrom+" ← "+state.dateTo);
  return `📋 ${SHOP_NAME} — تقرير الدخل\n📅 ${period}\n📞 ${SHOP_PHONE}\n━━━━━━━━━━\n🚗 دخل السيارات: ${money(carsInc)}\n🧺 دخل الأفرشة: ${money(rugsInc)}\n💰 إجمالي الدخل: ${money(inc)}\n🧾 المصروفات العامة: ${money(gen)}\n📈 الصافي (بعد المصروفات العامة فقط): ${money(net)}\n━━━━━━━━━━\n(بدون خصم العدّاد ولا العمّال)`;
}
function sendReport2(){
  const text=buildReportText2();
  try{ if(navigator.share){ navigator.share({text}).catch(()=>{}); return; } }catch(e){}
  window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank");
}
function screenDashboard(){
  const F=(iso)=>inRange(iso);
  const carsInc=carIncome(F), rugsInc=carpetIncome(F);
  const inc=carsInc+rugsInc;
  const genT=manualExp(F), utilT=utilityCost(F), wagesT=wagesRange();
  const exp=genT+utilT+wagesT, profit=inc-exp;
  const washingList=state.carpetOrders.filter(o=>o.status==="wash"&&F(o.date));
  const washing=washingList.length, washingAmt=sum(washingList,o=>o.price);
  const today=ymd(now);
  const periodLabel=(state.dateFrom===state.dateTo && state.dateFrom===today)?"اليوم":"الفترة";
  const incItems=[
    {label:"سيارات",val:carsInc,icon:I.car,bg:"var(--chip)",c:"var(--brand)"},
    {label:"سجاد",val:rugsInc,icon:I.rug,bg:"var(--ready-bg)",c:"var(--ready)"}
  ];
  const expItems=[
    {label:"العمّال",val:wagesT,icon:I.worker,bg:"var(--chip)",c:"var(--brand)"},
    {label:"مصروفات عامة",val:genT,icon:I.wallet,bg:"var(--wash-bg)",c:"var(--wash)"},
    {label:"العدّادات",val:utilT,icon:I.bolt,bg:"var(--unpaid-bg)",c:"var(--unpaid)"}
  ];
  const M=[
    {label:`ربح ${periodLabel}`,val:money(profit),ic:I.profit,bg:"var(--chip)",c:"var(--brand)"},
    {label:"طلبات قيد الغسيل",val:washing,ic:I.clock,bg:"var(--wash-bg)",c:"var(--wash)",sub:`بقيمة ${money(washingAmt)}`}
  ];
  const vc=vehicleCounts(F);
  const vehItems=[
    {label:"سيارات",count:vc["سيارات"],img:VEH_IMG["سيارة صغيرة"]},
    {label:"دراجات نارية",count:vc["دراجة نارية"],img:VEH_IMG["دراجة نارية"]},
    {label:"انيل",count:vc["انيل"],img:VEH_IMG["انيل"]},
    {label:"شاحنات",count:vc["شاحنة"],img:VEH_IMG["شاحنة"]},
    {label:"أخرى",count:vc["أخرى"],img:null}
  ];
  const rc=carpetCounts(F);
  const rugItems=Object.keys(rc).map(t=>({label:t,count:rc[t],type:t}));
  const TINTS=["rgba(16,157,143,.16)","rgba(214,69,69,.13)","rgba(28,110,164,.14)","rgba(230,160,30,.16)","rgba(130,90,200,.14)","rgba(46,158,107,.16)","rgba(200,80,150,.13)","rgba(14,143,168,.15)"];
  vehItems.forEach((v,i)=>{ v.bg=TINTS[i%TINTS.length]; });
  rugItems.forEach((v,i)=>{ v.bg=TINTS[i%TINTS.length]; });
  const preset=(k,t)=>{
    let on=false; const yd=new Date(now); yd.setDate(yd.getDate()-1);
    const mS=ymd(new Date(now.getFullYear(),now.getMonth(),1));
    if(k==="today") on=state.dateFrom===today&&state.dateTo===today;
    else if(k==="yesterday") on=state.dateFrom===ymd(yd)&&state.dateTo===ymd(yd);
    else if(k==="month") on=state.dateFrom===mS&&state.dateTo===today;
    else if(k==="all") on=state.dateFrom==="1970-01-01"&&state.dateTo===today;
    return `<button class="chip ${on?'on':''}" data-preset="${k}">${t}</button>`;
  };
  const breakdown=(title,items,total)=>`
      <div class="metric veh-card">
        <div class="veh-head"><span class="label" style="margin:0">${title}</span></div>
        <div class="bd-grid">
          ${items.map(e=>`<div class="bd-item"><span class="bic" style="background:${e.bg};color:${e.c}">${svg(e.icon)}</span><span class="bv">${money(e.val)}</span><span class="bl">${e.label}</span></div>`).join("")}
        </div>
        <div class="sum-row" style="margin-top:14px"><span>${total.label}</span><span class="big">${money(total.val)}</span></div>
      </div>`;
  return `
    <div class="screen-head"><h2>الصفحة الرئيسية</h2><span>${periodLabel==="اليوم"?new Date().toLocaleDateString("ar",{weekday:"long",day:"numeric",month:"long"}):`${state.dateFrom} ← ${state.dateTo}`}</span></div>
    <div class="datebar">
      <div class="date-field"><label>من</label><input type="date" id="dateFrom" value="${state.dateFrom}" max="${today}"></div>
      <div class="date-field"><label>إلى</label><input type="date" id="dateTo" value="${state.dateTo}" max="${today}"></div>
      <div class="date-presets">${preset("today","اليوم")}${preset("yesterday","أمس")}${preset("month","هذا الشهر")}${preset("all","الكل")}</div>
    </div>
    <div class="report-btns">
      <button class="mini" id="sendReport">📤 التقرير الكامل</button>
      <button class="mini" id="sendReport2">📤 تقرير الدخل (− مصروفات عامة)</button>
    </div>
    <div class="grid metrics">
      ${breakdown(`دخل ${periodLabel} حسب النوع`,incItems,{label:`إجمالي دخل ${periodLabel}`,val:inc})}
      ${breakdown(`مصروف ${periodLabel} حسب النوع`,expItems,{label:`إجمالي مصروف ${periodLabel}`,val:exp})}
      ${M.map(m=>`<div class="metric"><div class="ic" style="background:${m.bg}">${svg(m.ic,m.c)}</div>
        <div class="label">${m.label}</div><div class="value">${m.val}</div>${m.sub?`<div style="font-size:.76rem;color:var(--muted);font-weight:600;margin-top:3px">${m.sub}</div>`:""}</div>`).join("")}
      <div class="metric veh-card">
        <div class="veh-head"><span class="label" style="margin:0">سيارات ${periodLabel} حسب النوع</span></div>
        <div class="veh-grid">
          ${vehItems.map(v=>`<div class="veh-item" style="background:${v.bg}">${v.img?`<img class="veh-badge" src="${v.img}" alt="">`:`<span class="vic">${svg(I.other)}</span>`}<span><span class="vc">${v.count}</span><span class="vl">${v.label}</span></span></div>`).join("")}
        </div>
      </div>
      <div class="metric veh-card">
        <div class="veh-head"><span class="label" style="margin:0">أفرشة ${periodLabel} حسب النوع</span></div>
        <div class="veh-grid">
          ${rugItems.map(v=>`<div class="veh-item" style="background:${v.bg}">${PIECE_IMG[v.type]?`<img class="veh-badge" src="${PIECE_IMG[v.type]}" alt="">`:`<span class="vic">${svg(pieceIcon(v.type))}</span>`}<span><span class="vc">${v.count}</span><span class="vl">${v.label}</span></span></div>`).join("")}
        </div>
      </div>
    </div>`;
}

