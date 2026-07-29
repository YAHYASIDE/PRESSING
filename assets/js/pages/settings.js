/* pages/settings.js — Expenses, meters and workers screens (extracted from index.html) */
function screenExpenses(){
  const seg=[
    {k:"general",t:"مصروفات عامة",icon:I.wallet},
    {k:"meters",t:"العدادات",icon:I.bolt},
    {k:"workers",t:"العمّال",icon:I.worker}
  ].map(s=>`<button data-sub="${s.k}" class="${state.expSub===s.k?'on':''}">${svg(s.icon)}${s.t}</button>`).join("");
  const body = state.expSub==="meters"?expMeters() : state.expSub==="workers"?expWorkers() : expGeneral();
  return `
    <div class="screen-head"><h2>المصروفات</h2><span>الكهرباء والماء بالعدّاد، والرواتب باليومية</span></div>
    <div class="seg">${seg}</div>
    ${body}`;
}

function expGeneral(){
  const _t=ymd(new Date());
  const periodTxt = (state.dateFrom===state.dateTo) ? (state.dateFrom===_t?"اليوم":state.dateFrom) : `${state.dateFrom} ← ${state.dateTo}`;
  const today=state.expenses.filter(e=>inRange(e.date)).slice().reverse();
  const total=manualExp(e=>inRange(e));
  const rows=today.length?today.map(e=>`
    <tr><td>${ymd(e.date)}<div style="font-size:.7rem;color:var(--muted)">${timeStr(e.date)}</div></td><td><span class="badge b-done">${e.category}</span></td>
      <td>${e.reason||"—"}</td><td class="amt">${money(e.amount)}</td>
      <td style="text-align:left"><button class="icon-btn" data-del-exp="${e.id}" title="حذف">${svg(I.trash)}</button></td></tr>`).join("")
    :`<tr><td colspan="5"><div class="empty">${svg(I.empty)}لا توجد مصروفات في هذه الفترة.</div></td></tr>`;
  const opts=EXP_CATS.map(c=>`<option value="${c}">${c}</option>`).join("");
  const reasonOpts=[...new Set(state.expenses.map(e=>(e.reason||"").trim()).filter(Boolean))].map(r=>`<option value="${r}"></option>`).join("");
  return `
    <div class="cols">
      <div class="panel">
        <h3>مصروف جديد</h3>
        <div class="field"><label>المبلغ</label><input id="expAmount" type="number" min="0" value="0"></div>
        <div class="field"><label>الفئة</label><select id="expCat">${opts}</select></div>
        <div class="field"><label>اسم المصروف <span style="color:var(--unpaid)">*</span></label><input id="expReason" list="expReasonList" type="text" placeholder="مثال: شامبو، مكرونة…" autocomplete="off"><datalist id="expReasonList">${reasonOpts}</datalist></div>
        <div class="field"><label>التاريخ</label><input id="expDate" type="date" value="${ymd(new Date())}" max="${ymd(new Date())}"></div>
        <button class="btn-primary" id="expSave">إضافة مصروف</button>
      </div>
      <div class="panel">
        <h3>مصروفات ${periodTxt}</h3>
        <div class="hint" style="margin-bottom:10px">العرض حسب التاريخ المختار في الرئيسية (${periodTxt}).</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>الفئة</th><th>السبب</th><th>المبلغ</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
        <div class="sum-row"><span>إجمالي المصروفات العامة (${periodTxt})</span><span class="big">${money(total)}</span></div>
      </div>
    </div>
    ${(()=>{
      const q=(state.expSearch||"").trim();
      let all=state.expenses.slice();
      if(q) all=all.filter(e=>((e.reason||"").includes(q))||((e.category||"").includes(q)));
      const groups={};
      all.forEach(e=>{ const key=(e.reason&&e.reason.trim())?e.reason.trim():("["+e.category+"]"); if(!groups[key])groups[key]={key,count:0,total:0,cat:e.category}; groups[key].count++; groups[key].total+=e.amount; });
      const gl=Object.values(groups).sort((a,b)=>b.total-a.total);
      const grand=sum(all,e=>e.amount);
      const catTot={}; all.forEach(e=>{ catTot[e.category]=(catTot[e.category]||0)+e.amount; });
      const body=gl.length?gl.map(g=>`<tr>
          <td><b>${g.key}</b></td>
          <td><span class="badge b-done">${g.cat}</span></td>
          <td class="amt" style="text-align:center;font-weight:800">${g.count}</td>
          <td class="amt">${money(g.total)}</td></tr>`).join(""):`<tr><td colspan="4"><div class="empty">${svg(I.empty)}لا توجد مصروفات مسجّلة${q?" مطابقة للبحث":""}.</div></td></tr>`;
      return `
    <div class="panel" style="margin-top:18px">
      <h3>كشف حساب المصروفات</h3>
      <input class="search-inp" id="expSearch" type="text" placeholder="بحث باسم الصنف (شامبو…) أو الفئة" value="${q}">
      ${Object.keys(catTot).length?`<div class="cat-tot">${Object.entries(catTot).map(([c,t])=>`<span>${c}: <b>${money(t)}</b></span>`).join("")}</div>`:""}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>الصنف</th><th>الفئة</th><th>مرات</th><th>الإجمالي</th></tr></thead>
        <tbody>${body}</tbody>
        ${gl.length?`<tfoot><tr style="border-top:2px solid var(--line);font-weight:800"><td colspan="3">الإجمالي الكلي</td><td class="amt" style="color:var(--brand)">${money(grand)}</td></tr></tfoot>`:""}
      </table></div>
    </div>`;
    })()}`;
}

function expMeters(){
  const list=sortedMeters();
  const recent=list[list.length-1]||null;
  const lockedNow = recent && recent.savedAt && (Date.now()-recent.savedAt<12*3600*1000);
  const baseline = lockedNow ? (list[list.length-2]||null) : recent;
  const baseElec = baseline?mElec(baseline):null, baseWater = baseline?mWater(baseline):null;
  const curElec = lockedNow?mElec(recent):"", curWater = lockedNow?mWater(recent):"";
  const consElec=(lockedNow&&baseline)?Math.max(0,mElec(recent)-baseElec):0;
  const consWater=(lockedNow&&baseline)?Math.max(0,mWater(recent)-baseWater):0;
  const cost=consElec*state.tariff.elec+consWater*state.tariff.water;
  const lockedUntil=(recent&&recent.savedAt)?recent.savedAt+12*3600*1000:0;
  const locked=lockedUntil>Date.now();
  const untilStr=locked?new Date(lockedUntil).toLocaleString("ar",{weekday:"short",hour:"2-digit",minute:"2-digit"}):"";
  const lockHint=locked
    ? `<div class="hint" style="color:var(--unpaid)">🔒 قراءة اليوم محفوظة. لتغييرها تحتاج كود العدّادات قبل ${untilStr}. غدًا تُدخل القراءة الجديدة.</div>`
    : `<div class="hint">${baseElec!=null?"أدخل قراءة العدّاد الحالية، ويُحسب الفرق عن آخر قراءة تلقائيًا.":"أدخل أول قراءة كنقطة بداية (بلا استهلاك)."}</div>`;
  return `
    <div class="cols">
      <div class="panel">
        <h3>قراءة العدّاد اليوم</h3>
        <div class="meter elec">
          <div class="meter-head"><span class="mi">${svg(I.bolt)}</span>الكهرباء<span class="use-pill">استهلاك ${fmt(consElec)} كيلو</span></div>
          <div class="row2">
            <div class="field"><label>قراءة الأمس (ثابتة)</label><input type="number" value="${baseElec!=null?baseElec:''}" placeholder="—" disabled></div>
            <div class="field"><label>قراءة اليوم</label><input id="elecNow" type="number" value="${curElec}" placeholder="${baseElec!=null?('أكبر من '+baseElec):'مثال: 1455'}"></div>
          </div>
        </div>
        <div class="meter water">
          <div class="meter-head"><span class="mi">${svg(I.drop)}</span>الماء<span class="use-pill">استهلاك ${fmt(consWater)} وحدة</span></div>
          <div class="row2">
            <div class="field"><label>قراءة الأمس (ثابتة)</label><input type="number" value="${baseWater!=null?baseWater:''}" placeholder="—" disabled></div>
            <div class="field"><label>قراءة اليوم</label><input id="waterNow" type="number" value="${curWater}" placeholder="${baseWater!=null?('أكبر من '+baseWater):'مثال: 300'}"></div>
          </div>
        </div>
        <button class="btn-primary" id="meterSave">حفظ قراءة اليوم</button>
        ${lockHint}
      </div>
      <div class="panel">
        <h3>تكلفة الاستهلاك</h3>
        <div class="hint" style="margin-bottom:13px">تُحسب تكلفة الاستهلاك من أسعار الوحدة وتُضاف لمصروف اليوم والربح. لتعديل الأسعار: الإعدادات ⚙.</div>
        <div class="row2">
          <div class="field"><label>سعر كيلو الكهرباء</label><input type="number" value="${state.tariff.elec}" disabled></div>
          <div class="field"><label>سعر وحدة الماء</label><input type="number" value="${state.tariff.water}" disabled></div>
        </div>
        <div class="sum-row"><span>تكلفة استهلاك اليوم</span><span class="big">${money(cost)}</span></div>
      </div>
    </div>
    ${(()=>{
      const L=sortedMeters();
      let cum=0, tElec=0, tWater=0;
      const body=L.length?L.map((rec,i)=>{
        const u=meterConsAt(i,L); const c=u.elec*state.tariff.elec+u.water*state.tariff.water;
        cum+=c; tElec+=u.elec; tWater+=u.water;
        return `<tr>
          <td>${ymd(rec.date)}</td>
          <td class="amt" style="font-weight:700">${fmt(mElec(rec))}</td>
          <td class="amt" style="color:var(--wash)">${i===0?"— بداية":fmt(u.elec)}</td>
          <td class="amt" style="color:var(--brand)">${i===0?"—":fmt(u.water)}</td>
          <td class="amt">${money(c)}</td>
          <td class="amt" style="font-weight:800">${money(cum)}</td></tr>`;
      }).join(""):`<tr><td colspan="6"><div class="empty">${svg(I.empty)}لا توجد قراءات بعد — أدخل أول قراءة كنقطة بداية.</div></td></tr>`;
      return `
    <div class="panel" style="margin-top:18px">
      <h3>كشف حساب استهلاك العدّاد</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>قراءة الكهرباء</th><th>استهلاك كهرباء</th><th>استهلاك ماء</th><th>تكلفة اليوم</th><th>التراكمي</th></tr></thead>
        <tbody>${body}</tbody>
        ${L.length?`<tfoot><tr style="border-top:2px solid var(--line);font-weight:800">
          <td colspan="2">الإجمالي</td><td class="amt" style="color:var(--wash)">${fmt(tElec)}</td><td class="amt" style="color:var(--brand)">${fmt(tWater)}</td>
          <td class="amt">${money(cum)}</td><td class="amt" style="color:var(--brand)">${money(cum)}</td></tr></tfoot>`:""}
      </table></div>
    </div>`;
    })()}`;
}

function expWorkers(){
  const totNet=sum(state.workers,netSalary), totPaid=sum(state.workers,wPaid), totBal=sum(state.workers,wBalance);
  const cards=state.workers.length?state.workers.map(w=>{
    const bal=wBalance(w);
    const balLabel=bal>0?"له":bal<0?"عليه":"مسدّد";
    const balCls=bal>0?"bal-pos":bal<0?"bal-neg":"bal-zero";
    const due=accruedDue(w);
    return `
    <div class="worker">
      <div class="wtop">
        <span class="wav">${svg(I.worker)}</span>
        <div style="min-width:0"><div class="wname">${w.name}</div><div class="wwage">${w.role||"موظف"}${w.phone?" • "+w.phone:""}${absentToday(w)?" • غائب اليوم":""}</div></div>
        <button class="icon-btn" data-del-worker="${w.id}" title="حذف" style="margin-inline-start:auto">${svg(I.trash)}</button>
      </div>
      <div class="winfo">
        <span>الراتب الشهري: <b>${fmt(w.monthly)}</b></span>
        <span>اليومية: <b>${fmt(dayRate(w))}</b></span>
        <span>المباشرة: <b>${w.start?ymd(w.start):"—"}</b></span>
      </div>
      <div class="wstats">
        <div class="wstat wdue"><b>${fmt(due+wCredit(w))}</b><span>المستحق (له)</span></div>
        <div class="wstat"><b>${fmt(wPaid(w))}</b><span>المأخوذ (عليه)</span></div>
        <div class="wstat ${balCls}"><b>${fmt(Math.abs(bal))}</b><span>الرصيد (${balLabel})</span></div>
      </div>
      <div class="wabsent">
        <span>غياب الشهر: <b>${monthAbsences(w)}</b> (−${fmt(monthAbsences(w)*dayRate(w))})</span>
        <button class="mini ${absentToday(w)?'abs-on':''}" data-abstoday="${w.id}">${absentToday(w)?"إلغاء غياب اليوم":"تسجيل غياب اليوم"}</button>
      </div>
      <div class="wpay2">
        <div class="wpay-col"><input type="number" min="0" placeholder="مبلغ" data-creditin="${w.id}"><input type="text" class="wnote" placeholder="الوصف (مكافأة، ساعات إضافية…)" data-creditnote="${w.id}"><button class="mini credit-btn" data-creditbtn="${w.id}">➕ له (مستحق/مكافأة)</button></div>
        <div class="wpay-col"><input type="number" min="0" placeholder="مبلغ" data-payin="${w.id}"><input type="text" class="wnote" placeholder="الوصف (سلفة، دفعة راتب…)" data-paynote="${w.id}"><button class="mini debit-btn" data-paybtn="${w.id}">➖ عليه (دفعة/سلفة)</button></div>
      </div>
      <button class="mini" data-wstate="${w.id}" style="margin-top:9px;width:100%;font-weight:800">🧾 كشف حساب ${w.name}</button>
    </div>`;}).join("") : `<div class="panel empty" style="grid-column:1/-1">${svg(I.empty)}لا يوجد عمّال — أضف أول عامل.</div>`;
  const totLabel=totBal>0?"لهم":totBal<0?"علينا":"مسدّد";
  return `
    <div class="cols">
      <div class="panel">
        <h3>إضافة موظف</h3>
        <div class="field"><label>اسم الموظف</label><input id="wName" type="text" placeholder="الاسم الكامل"></div>
        <div class="row2">
          <div class="field"><label>الوظيفة</label><input id="wRole" type="text" placeholder="مثال: كوّاء"></div>
          <div class="field"><label>الهاتف (8 أرقام)</label><input id="wPhone" class="phone-inp" type="tel" inputmode="numeric" maxlength="8" placeholder="الهاتف"></div>
        </div>
        <div class="row2">
          <div class="field"><label>الراتب الشهري</label><input id="wMonthly" type="number" min="0" value="0"></div>
          <div class="field"><label>تاريخ المباشرة</label><input id="wStart" type="date" value="${ymd(new Date())}"></div>
        </div>
        <div class="hint">اليومية = الشهري ÷ أيام الشهر (${daysInMonth} يومًا). «المستحق حتى اليوم» = أيام العمل من المباشرة حتى اليوم × اليومية. الدفعة/الوديعة تُخصم من رصيده فقط.</div>
        <button class="btn-primary" id="wAdd">إضافة الموظف</button>
        <div class="sum-row"><span>إجمالي الرصيد (${totLabel})</span><span class="big">${money(Math.abs(totBal))}</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:9px;font-size:.84rem;color:var(--muted);font-weight:700">
          <span>صافي الرواتب: ${fmt(totNet)}</span><span>المدفوع: ${fmt(totPaid)}</span></div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(258px,1fr))">${cards}</div>
    </div>`;
}

