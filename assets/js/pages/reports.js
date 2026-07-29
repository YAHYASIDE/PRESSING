/* pages/reports.js — Reports screen (extracted from index.html) */
function screenReports(){
  const dInc=todayIncome(),dExp=expenseSum(isToday),dPro=dInc-dExp;
  const mInc=monthIncome(),mExp=expenseSum(isMonth),mPro=mInc-mExp;
  const carsM=carIncome(isMonth),rugsM=carpetIncome(isMonth);
  const totalOrders=state.carpetOrders.length;
  const washingList=state.carpetOrders.filter(o=>o.status==="wash");
  const washingAmt=sum(washingList,o=>o.price);
  const deliveredCount=state.carpetOrders.filter(o=>o.status==="done").length;
  const maxBar=Math.max(carsM,rugsM,1);
  const unpaidList=state.carpetOrders.filter(o=>!o.paid);
  const unpaidCount=unpaidList.length, unpaidAmt=sum(unpaidList,o=>o.price);
  const lm=new Date(now.getFullYear(),now.getMonth()-1,1);
  const isLM=(d)=>{const x=new Date(d);return x.getMonth()===lm.getMonth()&&x.getFullYear()===lm.getFullYear();};
  const lmInc=carIncome(isLM)+carpetIncome(isLM);
  const diff=mInc-lmInc, pct=lmInc>0?Math.round(diff/lmInc*100):(mInc>0?100:0);
  const days=[]; for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const ds=ymd(d);const F=(x)=>ymd(x)===ds;days.push({label:d.toLocaleDateString("ar",{weekday:"short"}),inc:carIncome(F)+carpetIncome(F)});}
  const maxD=Math.max(...days.map(x=>x.inc),1);
  const card=(t,d,m,c)=>`
    <div class="panel"><h3>${t}</h3>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:var(--muted);font-weight:700;font-size:.85rem">اليوم</span><span style="font-weight:800">${money(d)}</span></div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:var(--muted);font-weight:700;font-size:.85rem">هذا الشهر</span><span style="font-weight:800;color:${c}">${money(m)}</span></div>
    </div>`;
  return `
    <div class="screen-head"><h2>التقارير</h2><span>ملخص الأداء</span><button class="mini no-print" id="reportPrint" style="margin-inline-start:auto">طباعة التقرير</button></div>
    <div class="grid metrics" style="margin-bottom:16px">
      ${card("الدخل",dInc,mInc,"var(--ready)")}
      ${card("المصروفات",dExp,mExp,"var(--unpaid)")}
      ${card("الربح",dPro,mPro,"var(--brand)")}
    </div>
    <div class="panel" style="margin-bottom:16px"><h3>دخل آخر ٧ أيام</h3>
      <div class="chart7">${days.map(d=>`<div class="c7col"><span class="c7val">${d.inc?money(d.inc):""}</span><div class="c7bar" style="height:${Math.max(2,d.inc/maxD*100)}%"></div><span class="c7lbl">${d.label}</span></div>`).join("")}</div>
    </div>
    <div class="cols">
      <div class="panel"><h3>توزيع دخل الشهر</h3>
        <div class="bars">
          <div class="bar-row"><span>السيارات</span><div class="bar-track"><div class="bar-fill" style="width:${carsM/maxBar*100}%;background:var(--brand)"></div></div><span>${money(carsM)}</span></div>
          <div class="bar-row"><span>السجاد</span><div class="bar-track"><div class="bar-fill" style="width:${rugsM/maxBar*100}%;background:var(--teal)"></div></div><span>${money(rugsM)}</span></div>
        </div>
        <h3 style="margin-top:18px">مقارنة شهرية</h3>
        <div class="cmp"><span>دخل هذا الشهر</span><b>${money(mInc)}</b></div>
        <div class="cmp"><span>دخل الشهر الماضي</span><b>${money(lmInc)}</b></div>
        <div class="cmp"><span>الفرق</span><b class="${diff>=0?'up':'down'}">${diff>=0?'▲':'▼'} ${money(Math.abs(diff))} (${pct}%)</b></div>
      </div>
      <div class="panel"><h3>الطلبات والديون</h3>
        <table class="tbl"><tbody>
          <tr><td>إجمالي الطلبات</td><td class="amt" style="text-align:left">${totalOrders}</td></tr>
          <tr><td>قيد الغسيل</td><td class="amt" style="text-align:left;color:var(--wash)">${washingList.length}</td></tr>
          <tr><td>قيمة قيد الغسيل</td><td class="amt" style="text-align:left;color:var(--wash)">${money(washingAmt)}</td></tr>
          <tr><td>طلبات مُسلّمة</td><td class="amt" style="text-align:left;color:var(--ready)">${deliveredCount}</td></tr>
          <tr><td>طلبات غير مدفوعة</td><td class="amt" style="text-align:left;color:var(--unpaid)">${unpaidCount}</td></tr>
          <tr><td>قيمة غير المدفوعة</td><td class="amt" style="text-align:left;color:var(--unpaid)">${money(unpaidAmt)}</td></tr>
        </tbody></table>
      </div>
    </div>`;
}


/* ---- Commit 4: namespace registration ---- */
Object.assign(App.pages, { screenReports });
