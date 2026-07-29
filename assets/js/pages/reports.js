/* pages/reports.js — Executive Reports & Analytics. Sub-tabs: Financial, Sales,
   Customers, Inventory, Analytics. Reuses accounting/pos/crm/inventory cores.
   CSV export + print per report. Mobile-first. */

function repPeriodTxt(){ const t=ymd(new Date()); return (state.dateFrom===state.dateTo)?(state.dateFrom===t?"اليوم":state.dateFrom):`${state.dateFrom} ← ${state.dateTo}`; }
function repHBar(items, valKey, fmt){
  if(!items.length) return `<div class="acc-empty">لا توجد بيانات</div>`;
  const max=Math.max.apply(null, items.map(i=>Math.max(i[valKey]||0,1)));
  return `<div class="rep-hbars">${items.map(i=>`
    <div class="rep-hbar"><span class="rep-hbar-l">${i.name}</span>
      <span class="rep-hbar-t"><span class="rep-hbar-f" style="width:${Math.max(3,(i[valKey]/max*100))}%"></span></span>
      <span class="rep-hbar-v">${fmt?fmt(i):money(i[valKey])}</span></div>`).join("")}</div>`;
}

function repFinancial(){
  const F=(d)=>inRange(d);
  const pl=App.core.plStatement(F), cash=App.core.cashSummary(F), bs=App.core.balanceSheet(F);
  return `
    <div class="acc-kpis">
      ${acctKpi(money(pl.revTotal),"الإيرادات","k-rev")}
      ${acctKpi(money(pl.expTotal),"المصروفات","k-exp")}
      ${acctKpi(money(pl.net),"صافي الربح",pl.net>=0?"k-net":"k-loss")}
      ${acctKpi(money(cash.net),"صافي النقد","k-cash")}
    </div>
    <div class="acc-card"><div class="acc-card-t">قائمة الدخل · ${repPeriodTxt()}</div>
      ${pl.rev.map(a=>acctRow(a.name, money(a.amount))).join("")||'<div class="acc-empty">لا إيرادات</div>'}
      ${acctRow("إجمالي الإيرادات", money(pl.revTotal), true)}
      ${pl.exp.map(a=>acctRow(a.name, money(a.amount))).join("")}
      ${acctRow("إجمالي المصروفات", money(pl.expTotal), true)}
      ${acctRow("صافي الربح", money(pl.net), true)}
    </div>
    <div class="acc-card"><div class="acc-card-t">التدفق النقدي</div>
      ${acctRow("تدفق داخل", money(cash.inflow))}${acctRow("تدفق خارج", money(cash.outflow))}${acctRow("صافي النقد", money(cash.net), true)}</div>
    <div class="acc-card"><div class="acc-card-t">الميزانية</div>
      ${acctRow("إجمالي الأصول", money(bs.assetsTotal))}${acctRow("الخصوم + حقوق الملكية", money(bs.liabTotal+bs.eqTotal))}
      <div class="acc-balance ${bs.balanced?'ok':'bad'}">${bs.balanced?"✓ متوازنة":"⚠ غير متوازنة"}</div></div>
    <button class="mini rep-export" data-rep-export="financial">⬇️ تصدير CSV</button>`;
}
function repSalesTab(){
  const F=(d)=>inRange(d);
  const s=App.core.repSales(F);
  const pm=bizPayMethods();
  const methodRows=Object.keys(s.byMethod).map(k=>acctRow((pm.find(m=>m.k===k)||{}).label||k, money(s.byMethod[k]))).join("")||'<div class="acc-empty">—</div>';
  const cashiers=Object.keys(s.byCashier).map(k=>({name:k, rev:s.byCashier[k].total, count:s.byCashier[k].count}));
  return `
    <div class="acc-kpis">
      ${acctKpi(s.count,"عدد الفواتير","k-cash")}
      ${acctKpi(money(s.gross),"إجمالي المبيعات","k-rev")}
      ${acctKpi(money(s.refunds),"المرتجعات","k-loss")}
      ${acctKpi(money(s.tax),"الضريبة","k-net")}
    </div>
    <div class="acc-card"><div class="acc-card-t">حسب طريقة الدفع</div>${methodRows}</div>
    <div class="acc-card"><div class="acc-card-t">أفضل المنتجات</div>${repHBar(App.core.repTopProducts(F),"rev",i=>`${money(i.rev)} · ${i.qty}`)}</div>
    <div class="acc-card"><div class="acc-card-t">أفضل الخدمات</div>${repHBar(App.core.repTopServices(F),"rev",i=>`${money(i.rev)} · ${i.qty}`)}</div>
    <div class="acc-card"><div class="acc-card-t">الكاشير</div>${cashiers.length?cashiers.map(c=>acctRow(c.name+" ("+c.count+")", money(c.rev))).join(""):'<div class="acc-empty">—</div>'}</div>
    <button class="mini rep-export" data-rep-export="sales">⬇️ تصدير CSV</button>`;
}
function repCustomersTab(){
  const seg=App.core.repCustomerSegments();
  const top=App.core.repTopCustomers(10);
  return `
    <div class="acc-kpis">
      ${acctKpi(seg.total,"إجمالي الزبائن","k-cash")}
      ${acctKpi(seg.repeat,"متكررون","k-rev")}
      ${acctKpi(seg.inactive,"خاملون (30ي)","k-net")}
      ${acctKpi(seg.lost,"مفقودون (90ي)","k-loss")}
    </div>
    <div class="acc-card"><div class="acc-card-t">أفضل الزبائن إنفاقًا</div>${repHBar(top,"rev",i=>`${money(i.rev)} · ${i.visits} زيارة`)}</div>
    <button class="mini rep-export" data-rep-export="customers">⬇️ تصدير CSV</button>`;
}
function repInventoryTab(){
  const r=App.core.repInventory();
  if(!r) return `<div class="acc-card">${emptyState({icon:I.wallet, title:"وحدة المخزون غير مفعّلة", sub:"فعّلها من الإعدادات ▸ الميزات."})}</div>`;
  const F=(d)=>inRange(d);
  const topP=App.core.repTopProducts(F);
  return `
    <div class="acc-kpis">
      ${acctKpi(r.count,"المنتجات","k-cash")}
      ${acctKpi(money(r.value),"قيمة المخزون (تكلفة)","k-net")}
      ${acctKpi(money(r.retail),"قيمة البيع","k-rev")}
      ${acctKpi(r.low,"منخفض",r.low?"k-loss":"k-rev")}
    </div>
    <div class="acc-card"><div class="acc-card-t">حركات المخزون</div>${acctRow("عدد الحركات", r.movements)}${acctRow("قرب الانتهاء", r.expiring)}${acctRow("تنبيهات نقص", r.low, true)}</div>
    <div class="acc-card"><div class="acc-card-t">الأكثر مبيعًا (الفترة)</div>${repHBar(topP,"qty",i=>`${i.qty} · ${money(i.rev)}`)}</div>
    <button class="mini rep-export" data-rep-export="inventory">⬇️ تصدير CSV</button>`;
}
function repAnalytics(){
  const ser=App.core.repMonthlySeries(6);
  const max=Math.max.apply(null, ser.map(s=>Math.max(s.revenue, s.profit, 1)));
  const bars=ser.map(s=>`
    <div class="rep-col">
      <div class="rep-col-bars">
        <div class="rep-b rev" style="height:${Math.max(2,s.revenue/max*100)}%" title="إيراد ${money(s.revenue)}"></div>
        <div class="rep-b pro" style="height:${Math.max(2,Math.max(0,s.profit)/max*100)}%" title="ربح ${money(s.profit)}"></div>
      </div>
      <div class="rep-col-l">${s.label}</div>
    </div>`).join("");
  const grow=(()=>{ if(ser.length<2) return 0; const a=ser[ser.length-2].revenue, b=ser[ser.length-1].revenue; return a>0?Math.round((b-a)/a*100):(b>0?100:0); })();
  return `
    <div class="acc-card"><div class="acc-card-t">الإيراد والربح · آخر ٦ أشهر</div>
      <div class="rep-chart">${bars}</div>
      <div class="rep-legend"><span class="lg rev">إيراد</span><span class="lg pro">ربح</span></div>
    </div>
    <div class="acc-kpis">
      ${acctKpi((grow>=0?"▲ ":"▼ ")+Math.abs(grow)+"%","نمو شهري",grow>=0?"k-rev":"k-loss")}
      ${acctKpi(money(ser[ser.length-1].revenue),"إيراد الشهر","k-net")}
      ${acctKpi(money(ser.reduce((s,x)=>s+x.revenue,0)),"إيراد ٦ أشهر","k-cash")}
    </div>`;
}

function screenReports(){
  const tabs=[{k:"financial",t:"مالي"},{k:"sales",t:"المبيعات"},{k:"customers",t:"الزبائن"},{k:"inventory",t:"المخزون"},{k:"analytics",t:"تحليلات"}];
  const cur=state.repTab||"financial";
  const seg=tabs.map(x=>`<button data-rep-tab="${x.k}" class="${cur===x.k?'on':''}">${x.t}</button>`).join("");
  const body = cur==="sales"?repSalesTab() : cur==="customers"?repCustomersTab() : cur==="inventory"?repInventoryTab() : cur==="analytics"?repAnalytics() : repFinancial();
  return `
    <div class="screen-head"><h2>التقارير</h2><span>تقارير تنفيذية · ${repPeriodTxt()}</span><button class="mini no-print" id="reportPrint" style="margin-inline-start:auto">🖨️</button></div>
    <div class="datebar acc-datebar">
      <div class="date-field"><label>من</label><input type="date" id="dateFrom" value="${state.dateFrom}" max="${ymd(new Date())}"></div>
      <div class="date-field"><label>إلى</label><input type="date" id="dateTo" value="${state.dateTo}" max="${ymd(new Date())}"></div>
    </div>
    <div class="seg acc-seg scroll-x">${seg}</div>
    ${body}`;
}

/* CSV rows for the active report (used by the export handler) */
function repExportData(which){
  const F=(d)=>inRange(d);
  if(which==="sales"){ const p=App.core.repTopProducts(F,50), s=App.core.repTopServices(F,50);
    return { name:"sales", header:["النوع","الصنف","الكمية","الإيراد"], rows:p.map(x=>["منتج",x.name,x.qty,x.rev]).concat(s.map(x=>["خدمة",x.name,x.qty,x.rev])) }; }
  if(which==="customers"){ const t=App.core.repTopCustomers(1000);
    return { name:"customers", header:["الزبون","الإنفاق","الزيارات"], rows:t.map(x=>[x.name,x.rev,x.visits]) }; }
  if(which==="inventory"){ const ps=App.core.invProducts();
    return { name:"inventory", header:["المنتج","الفئة","الكمية","التكلفة","السعر","الحد"], rows:ps.map(p=>[p.name,p.category,p.qty,p.cost,p.price,p.min]) }; }
  // financial
  const pl=App.core.plStatement(F);
  return { name:"financial", header:["البند","المبلغ"], rows:pl.rev.map(a=>[a.name,a.amount]).concat([["إجمالي الإيرادات",pl.revTotal]]).concat(pl.exp.map(a=>[a.name,a.amount])).concat([["إجمالي المصروفات",pl.expTotal],["صافي الربح",pl.net]]) };
}

Object.assign(App.pages, { screenReports, repExportData });
