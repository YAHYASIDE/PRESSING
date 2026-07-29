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
  return `📋 تقرير ${bizName()}
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
  return `📋 ${bizName()} — تقرير الدخل\n📅 ${period}\n📞 ${bizPhone()}\n━━━━━━━━━━\n🚗 دخل السيارات: ${money(carsInc)}\n🧺 دخل الأفرشة: ${money(rugsInc)}\n💰 إجمالي الدخل: ${money(inc)}\n🧾 المصروفات العامة: ${money(gen)}\n📈 الصافي (بعد المصروفات العامة فقط): ${money(net)}\n━━━━━━━━━━\n(بدون خصم العدّاد ولا العمّال)`;
}
function sendReport2(){
  const text=buildReportText2();
  try{ if(navigator.share){ navigator.share({text}).catch(()=>{}); return; } }catch(e){}
  window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank");
}
/* ---- Release 1: dashboard SVG charts (presentation helpers) ---- */
function dashArea(series){
  const max=Math.max.apply(null, series.map(d=>d.value).concat([1]));
  const W=320,H=124,padX=12,padTop=16,padBot=22,n=series.length;
  const span=(W-padX*2)/Math.max(1,n-1);
  const yOf=(v)=>padTop+(1-(v/max))*(H-padTop-padBot);
  const pts=series.map((d,i)=>[padX+i*span, yOf(d.value)]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=line+` L${(padX+(n-1)*span).toFixed(1)} ${H-padBot} L${padX} ${H-padBot} Z`;
  const dots=pts.map(p=>`<circle class="ac-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.8"/>`).join('');
  const labs=series.map((d,i)=>`<text class="ac-x" x="${(padX+i*span).toFixed(1)}" y="${H-6}">${d.label}</text>`).join('');
  return `<svg class="area-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="income chart">
    <defs><linearGradient id="acGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--brand)" stop-opacity=".30"/>
      <stop offset="1" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>
    <path class="ac-area" d="${area}" fill="url(#acGrad)"/>
    <path class="ac-line" d="${line}" pathLength="1000"/>
    ${dots}${labs}
  </svg>`;
}
function dashDonut(a, b){
  const total=a+b, r=44, C=2*Math.PI*r;
  const aLen=(total?a/total:0)*C, bLen=(total?b/total:0)*C;
  const seg=(len,off,cls)=>`<circle class="donut-seg ${cls}" cx="60" cy="60" r="${r}" stroke-dasharray="${len.toFixed(1)} ${(C-len).toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 60 60)"/>`;
  return `<svg class="donut" viewBox="0 0 120 120" role="img" aria-label="orders by type">
    <circle class="donut-track" cx="60" cy="60" r="${r}"/>
    ${total?seg(aLen,0,'seg-a'):''}
    ${total?seg(bLen,-aLen,'seg-b'):''}
    <text class="donut-num" x="60" y="58">${total}</text>
    <text class="donut-lbl" x="60" y="76">طلب</text>
  </svg>`;
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
  const carsTotal=Object.keys(vc).reduce((s,k)=>s+vc[k],0);
  const carpetsTotal=Object.keys(rc).reduce((s,k)=>s+rc[k],0);
  // last-7-days income series (independent of the date filter)
  const series=[];
  for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); const ds=ymd(d); const G=(x)=>ymd(x)===ds;
    series.push({label:d.toLocaleDateString("ar",{weekday:"short"}), value:carIncome(G)+carpetIncome(G)}); }
  const inc7=series.reduce((s,d)=>s+d.value,0);
  const preset=(k,t)=>{
    let on=false; const yd=new Date(now); yd.setDate(yd.getDate()-1);
    const mS=ymd(new Date(now.getFullYear(),now.getMonth(),1));
    if(k==="today") on=state.dateFrom===today&&state.dateTo===today;
    else if(k==="yesterday") on=state.dateFrom===ymd(yd)&&state.dateTo===ymd(yd);
    else if(k==="month") on=state.dateFrom===mS&&state.dateTo===today;
    else if(k==="all") on=state.dateFrom==="1970-01-01"&&state.dateTo===today;
    return `<button class="chip ${on?'on':''}" data-preset="${k}">${t}</button>`;
  };
  const stat=(cls,icon,c,label,value,sub)=>`
    <div class="stat-card ${cls}">
      <div class="sc-ic">${svg(icon,c)}</div>
      <div class="sc-body">
        <div class="sc-label">${label}</div>
        <div class="sc-value">${value}</div>
        ${sub?`<div class="sc-sub">${sub}</div>`:""}
      </div>
    </div>`;
  // Release 3 — operational KPIs (consume the live operations data)
  const cops=state.carOps.filter(o=>!o.cancelled);
  const opInProg=cops.filter(o=>carStageKey(o)!=="delivered").length;
  const opReady=cops.filter(o=>carStageKey(o)==="ready").length;
  const opDelToday=cops.filter(o=>carStageKey(o)==="delivered" && o.deliveredDate && isToday(o.deliveredDate)).length;
  const avgWash=avgStageMin(cops,"washing"), avgWait=avgStageMin(cops,"waiting");
  const kpi=(v,l,cls)=>`<div class="kpi ${cls||""}"><div class="kpi-v">${v}</div><div class="kpi-l">${l}</div></div>`;
  const opsKpis=`
    <div class="ops-kpis">
      <div class="ops-kpi-head">مركز العمليات المباشر</div>
      <div class="kpi-grid">
        ${kpi(opInProg,"قيد التنفيذ","k-prog")}
        ${kpi(opReady,"جاهزة للتسليم","k-ready")}
        ${kpi(opDelToday,"سُلّمت اليوم","k-done")}
        ${kpi(avgWash+" د","م. الغسيل","k-wash")}
        ${kpi(avgWait+" د","م. الانتظار","k-wait")}
      </div>
    </div>`;
  return `
    <div class="screen-head"><h2>الصفحة الرئيسية</h2><span>${periodLabel==="اليوم"?new Date().toLocaleDateString("ar",{weekday:"long",day:"numeric",month:"long"}):`${state.dateFrom} ← ${state.dateTo}`}</span></div>
    ${trialCardHTML()}
    ${opsCenterHTML()}
    <div class="datebar">
      <div class="date-field"><label>من</label><input type="date" id="dateFrom" value="${state.dateFrom}" max="${today}"></div>
      <div class="date-field"><label>إلى</label><input type="date" id="dateTo" value="${state.dateTo}" max="${today}"></div>
      <div class="date-presets">${preset("today","اليوم")}${preset("yesterday","أمس")}${preset("month","هذا الشهر")}${preset("all","الكل")}</div>
    </div>
    <div class="report-btns">
      <button class="mini" id="sendReport">📤 التقرير الكامل</button>
      <button class="mini" id="sendReport2">📤 تقرير الدخل (− مصروفات عامة)</button>
    </div>
    <div class="stat-row">
      ${stat("sc-income", I.income,"var(--ready)", `دخل ${periodLabel}`, money(inc), `🚗 ${money(carsInc)} · 🧺 ${money(rugsInc)}`)}
      ${stat("sc-expense",I.expense,"var(--unpaid)",`مصروف ${periodLabel}`, money(exp), `👷 ${money(wagesT)} · 🧾 ${money(genT)} · ⚡ ${money(utilT)}`)}
      ${stat("sc-profit", I.profit,"var(--brand)", `ربح ${periodLabel}`, money(profit), inc>0?`هامش الربح ${Math.round(profit/inc*100)}%`:"—")}
      ${stat("sc-wash",   I.clock,"var(--wash)",   "قيد الغسيل", washing, `بقيمة ${money(washingAmt)}`)}
    </div>
    ${opsKpis}
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-head"><h3>الدخل — آخر ٧ أيام</h3><span class="chart-total">${money(inc7)}</span></div>
        ${dashArea(series)}
      </div>
      <div class="chart-card">
        <div class="chart-head"><h3>الطلبات حسب النوع</h3><span class="chart-total">${carsTotal+carpetsTotal}</span></div>
        <div class="donut-wrap">
          ${dashDonut(carsTotal, carpetsTotal)}
          <div class="donut-legend">
            <span><i class="lg-dot dot-a"></i> سيارات <b>${carsTotal}</b></span>
            <span><i class="lg-dot dot-b"></i> أفرشة <b>${carpetsTotal}</b></span>
          </div>
        </div>
      </div>
    </div>
    <div class="grid metrics">
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


/* ---- Commit 4: namespace registration ---- */
Object.assign(App.pages, { buildReportText, sendReport, buildReportText2, sendReport2, screenDashboard, dashArea, dashDonut });
