/* pages/accounting.js — the Accounting screen (double-entry books & statements).
   Sub-tabs: Overview · P&L · Balance Sheet · Trial Balance · Journal · Accounts.
   Pure render from App.core.* over the selected period (inRange). Mobile-first. */

function acctPeriodTxt(){
  const t=ymd(new Date());
  return (state.dateFrom===state.dateTo) ? (state.dateFrom===t?"اليوم":state.dateFrom) : `${state.dateFrom} ← ${state.dateTo}`;
}
function acctKpi(v,l,cls){ return `<div class="acc-kpi ${cls||''}"><div class="acc-kpi-v">${v}</div><div class="acc-kpi-l">${l}</div></div>`; }
function acctRow(k,v,strong){ return `<div class="acc-row ${strong?'strong':''}"><span>${k}</span><b>${v}</b></div>`; }

function acctOverview(){
  const F=(iso)=>inRange(iso);
  const pl=App.core.plStatement(F), cash=App.core.cashSummary(F), bs=App.core.balanceSheet(F);
  const je=App.core.journalEntries(F).length;
  return `
    <div class="acc-kpis">
      ${acctKpi(money(pl.revTotal),"الإيرادات","k-rev")}
      ${acctKpi(money(pl.expTotal),"المصروفات","k-exp")}
      ${acctKpi(money(pl.net),"صافي الربح",pl.net>=0?"k-net":"k-loss")}
      ${acctKpi(money(cash.net),"صافي النقد","k-cash")}
    </div>
    <div class="acc-card">
      <div class="acc-card-t">لمحة مالية · ${acctPeriodTxt()}</div>
      ${acctRow("إجمالي الإيرادات", money(pl.revTotal))}
      ${acctRow("إجمالي المصروفات", money(pl.expTotal))}
      ${acctRow("صافي الربح", money(pl.net), true)}
      ${acctRow("تدفق نقدي داخل", money(cash.inflow))}
      ${acctRow("تدفق نقدي خارج", money(cash.outflow))}
      ${acctRow("عدد القيود", je)}
    </div>
    <div class="acc-card">
      <div class="acc-card-t">التوازن المحاسبي</div>
      ${acctRow("إجمالي الأصول", money(bs.assetsTotal))}
      ${acctRow("الخصوم + حقوق الملكية", money(bs.liabTotal+bs.eqTotal))}
      <div class="acc-balance ${bs.balanced?'ok':'bad'}">${bs.balanced?"✓ الميزانية متوازنة":"⚠ غير متوازنة"}</div>
    </div>`;
}
function acctPL(){
  const pl=App.core.plStatement((iso)=>inRange(iso));
  const rows=(arr)=>arr.length?arr.map(a=>acctRow(a.name, money(a.amount))).join(""):`<div class="acc-empty">لا توجد حركة</div>`;
  return `
    <div class="acc-card"><div class="acc-card-t">الإيرادات</div>${rows(pl.rev)}${acctRow("إجمالي الإيرادات", money(pl.revTotal), true)}</div>
    <div class="acc-card"><div class="acc-card-t">المصروفات</div>${rows(pl.exp)}${acctRow("إجمالي المصروفات", money(pl.expTotal), true)}</div>
    <div class="acc-card acc-net ${pl.net>=0?'pos':'neg'}"><span>صافي الربح / الخسارة</span><b>${money(pl.net)}</b></div>`;
}
function acctBalance(){
  const bs=App.core.balanceSheet((iso)=>inRange(iso));
  const rows=(arr)=>arr.length?arr.map(a=>acctRow(a.name, money(a.amount))).join(""):`<div class="acc-empty">—</div>`;
  return `
    <div class="acc-card"><div class="acc-card-t">الأصول</div>${rows(bs.assets)}${acctRow("إجمالي الأصول", money(bs.assetsTotal), true)}</div>
    <div class="acc-card"><div class="acc-card-t">الخصوم</div>${rows(bs.liab)}${acctRow("إجمالي الخصوم", money(bs.liabTotal), true)}</div>
    <div class="acc-card"><div class="acc-card-t">حقوق الملكية</div>${bs.eqAcc.map(a=>acctRow(a.name, money(a.amount))).join("")}${acctRow("الأرباح المحتجزة (الفترة)", money(bs.net))}${acctRow("إجمالي حقوق الملكية", money(bs.eqTotal), true)}</div>
    <div class="acc-card acc-net ${bs.balanced?'pos':'neg'}"><span>${bs.balanced?"الأصول = الخصوم + حقوق الملكية ✓":"غير متوازنة ⚠"}</span><b>${money(bs.assetsTotal)}</b></div>`;
}
function acctTrial(){
  const tb=App.core.trialBalance((iso)=>inRange(iso));
  const rows=tb.rows.length?tb.rows.map(r=>`<tr><td class="acc-code">${r.code}</td><td>${r.name}</td><td class="amt">${r.debit?money(r.debit):"—"}</td><td class="amt">${r.credit?money(r.credit):"—"}</td></tr>`).join("")
    :`<tr><td colspan="4">${emptyState({icon:I.chart, title:"لا توجد قيود بعد", sub:"تُسجَّل القيود تلقائيًا مع كل عملية بيع أو دفع أو مصروف."})}</td></tr>`;
  return `<div class="acc-card"><div class="acc-card-t">ميزان المراجعة · ${acctPeriodTxt()}</div>
    <div class="tbl-wrap"><table class="tbl acc-tbl"><thead><tr><th>الحساب</th><th>الاسم</th><th>مدين</th><th>دائن</th></tr></thead>
    <tbody>${rows}</tbody>
    ${tb.rows.length?`<tfoot><tr class="acc-tfoot"><td></td><td>الإجمالي</td><td class="amt">${money(tb.totalDebit)}</td><td class="amt">${money(tb.totalCredit)}</td></tr></tfoot>`:""}
    </table></div></div>`;
}
function acctJournal(){
  const list=App.core.journalEntries((iso)=>inRange(iso)).slice().reverse();
  if(!list.length) return `<div class="acc-card">${emptyState({icon:I.chart, title:"لا توجد قيود بعد", sub:"تُسجَّل القيود تلقائيًا مع كل عملية."})}</div>`;
  const srcLbl={sale:"مبيعات",collection:"تحصيل",expense:"مصروف",reversal:"عكس",manual:"يدوي"};
  return `<div class="acc-journal">${list.map(e=>`
    <div class="je-card">
      <div class="je-head"><span class="je-src src-${e.source}">${srcLbl[e.source]||e.source}</span><span class="je-ref">${e.ref||""}</span><span class="je-date">${ymd(e.date)}</span></div>
      <div class="je-memo">${e.memo||""}</div>
      <div class="je-lines">${e.lines.map(l=>`<div class="je-line"><span class="je-acc">${App.core.acctByCode(l.account).name}</span><span class="je-d">${l.debit?money(l.debit):""}</span><span class="je-c">${l.credit?money(l.credit):""}</span></div>`).join("")}</div>
    </div>`).join("")}</div>`;
}
function acctAccounts(){
  const F=(iso)=>inRange(iso);
  const groups=Object.keys(ACCT_TYPES);
  return groups.map(t=>{
    const accs=CHART_OF_ACCOUNTS.filter(a=>a.type===t);
    return `<div class="acc-card"><div class="acc-card-t">${ACCT_TYPES[t].label}</div>
      ${accs.map(a=>{ const bal=App.core.accountBalance(a.code,F); return `<div class="acc-row"><span><span class="acc-code">${a.code}</span> ${a.name}</span><b>${money(bal)}</b></div>`; }).join("")}</div>`;
  }).join("");
}

function screenAccounting(){
  const tabs=[
    {k:"overview", t:"نظرة عامة"},
    {k:"pl",       t:"قائمة الدخل"},
    {k:"balance",  t:"الميزانية"},
    {k:"trial",    t:"ميزان المراجعة"},
    {k:"journal",  t:"القيود"},
    {k:"accounts", t:"الحسابات"}
  ];
  const cur=state.acctTab||"overview";
  const seg=tabs.map(x=>`<button data-acct-tab="${x.k}" class="${cur===x.k?'on':''}">${x.t}</button>`).join("");
  const body = cur==="pl"?acctPL() : cur==="balance"?acctBalance() : cur==="trial"?acctTrial() : cur==="journal"?acctJournal() : cur==="accounts"?acctAccounts() : acctOverview();
  return `
    <div class="screen-head"><h2>المحاسبة</h2><span>قيود تلقائية · قيد مزدوج · ${acctPeriodTxt()}</span></div>
    <div class="datebar acc-datebar">
      <div class="date-field"><label>من</label><input type="date" id="dateFrom" value="${state.dateFrom}" max="${ymd(new Date())}"></div>
      <div class="date-field"><label>إلى</label><input type="date" id="dateTo" value="${state.dateTo}" max="${ymd(new Date())}"></div>
    </div>
    <div class="seg acc-seg scroll-x">${seg}</div>
    ${body}`;
}

Object.assign(App.pages, { screenAccounting });
