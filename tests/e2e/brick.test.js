// 2.26.0 — «دبو» مصنع الطوب: شراء مواد، خلطات بأجرة، بيع طوب نقدًا/دينًا، مصاريف، صندوق مستقل، تكلفة الطوبة، الربح المجمّع، الديون، المزامنة.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:860} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date()); state.storeCustomers=[{id:'cu1',name:'محمد',phone:'22334455',country:'222',editedAt:d}]; state.brickBatches=[]; state.brickPurchases=[]; state.brickSales=[]; state.brickExpenses=[]; state.brickCash=[]; state.brickCfg={price:0,workerPerBatch:0}; state.carOps=[]; state.carpetOrders=[]; state.laundryOrders=[]; state.expenses=[]; state.storeSales=[]; state.storeCash=[]; state.storeDebts=[]; state.suppliers=[]; save(); render(); });

  log('nav has «دبو» after carpets: '+(await page.evaluate(()=>{ const t=[...document.querySelectorAll('.nav-btn')].map(b=>b.dataset.tab); return t.indexOf('brick')===t.indexOf('carpets')+1; }))+' (expect true)');
  await page.click('[data-tab="brick"]'); await page.waitForTimeout(300);
  log('brick screen has 8 sub-tabs and opens on the summary: '+(await page.evaluate(()=>document.querySelectorAll('[data-bksub]').length===8 && /الربح/.test(document.querySelector('main').textContent)))+' (expect true)');

  // 1) شراء 10 أكياس إسمنت × 2,000 = 20,000 مدفوع كاش من مورّد «شركة الإسمنت»
  await page.click('[data-bksub="purchases"]'); await page.waitForTimeout(250);
  await page.fill('#bkPurQty','10'); await page.fill('#bkPurCost','2000'); await page.selectOption('#bkPurParty','__new'); await page.waitForTimeout(80); await page.fill('#bkPurSup','شركة الإسمنت'); await page.click('#bkPurSave'); await page.waitForTimeout(300);
  let r=await page.evaluate(()=>({ n:state.brickPurchases.length, p:state.brickPurchases[0], cement:brickMatStock('cement'), box:brickCashBalance(), sup:state.suppliers.length, move:state.brickCash[0] }));
  log('cement purchase: 10 bags, 20,000 paid, cash out, supplier created: '+(r.n===1 && r.p.material==='cement' && r.p.total===20000 && r.p.paid && r.cement===10 && r.box===-20000 && r.sup===1 && r.move.type==='out' && r.move.ref===r.p.id)+' (expect true)');
  // شراء 4 حمولات تراب × 5,000 بالدين
  await page.click('[data-bkmat="sand"]'); await page.waitForTimeout(200); await page.fill('#bkPurQty','4'); await page.fill('#bkPurCost','5000'); await page.selectOption('#bkPurParty','__new'); await page.waitForTimeout(80); await page.fill('#bkPurSup','بوبكر'); await page.uncheck('#bkPurPaid'); await page.click('#bkPurSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ sand:brickMatStock('sand'), out:brickOut(state.brickPurchases[1]), box:brickCashBalance(), avgC:brickAvgCost('cement'), avgS:brickAvgCost('sand') }));
  log('sand on credit: 4 loads, 20,000 owed to supplier, cash unchanged, averages 2,000/5,000: '+(r.sand===4 && r.out===20000 && r.box===-20000 && r.avgC===2000 && r.avgS===5000)+' (expect true)');

  // 2) خلطة: 2 خنشة + 1 فياج → 300 طوبة، أجرة 3,000 مدفوعة
  await page.click('[data-bksub="batches"]'); await page.waitForTimeout(250);
  await page.fill('#bkBags','2'); await page.fill('#bkLoads','1'); await page.fill('#bkBricks','300'); await page.fill('#bkWage','3000'); await page.check('#bkWagePaid'); await page.click('#bkBatchSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ b:state.brickBatches[0], stock:brickStock(), cement:brickMatStock('cement'), sand:brickMatStock('sand'), box:brickCashBalance() }));
  log('batch: 300 bricks in stock, cement 8, sand 3, wage 3,000 paid (box −23,000): '+(r.b.bricks===300 && r.b.workerPaid && r.stock===300 && r.cement===8 && r.sand===3 && r.box===-23000)+' (expect true)');
  // خلطة ثانية بأجرة غير مدفوعة
  await page.fill('#bkBags','2'); await page.fill('#bkLoads','1'); await page.fill('#bkBricks','300'); await page.fill('#bkWage','3000'); await page.uncheck('#bkWagePaid'); await page.click('#bkBatchSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ due:brickWageOut(state.brickBatches[1]), stock:brickStock(), box:brickCashBalance(), fin:brickFin(()=>true) }));
  log('second batch: wage due 3,000, stock 600, box unchanged, wageDues 3,000: '+(r.due===3000 && r.stock===600 && r.box===-23000 && r.fin.wageDues===3000)+' (expect true)');
  log('cost per brick = (4×2,000 + 2×5,000 + 6,000) ÷ 600 = 40: '+(Math.abs(r.fin.costPerBrick-40)<0.01)+' (expect true)');

  // 3) بيع 400 طوبة × 100 نقدًا بنكيلي، ثم 100 بالدين لمحمد
  await page.click('[data-bksub="sales"]'); await page.waitForTimeout(250);
  await page.fill('#bkQty','400'); await page.fill('#bkPrice','100'); await page.click('#bkSalePm [data-pm="bankily"]'); await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ s:state.brickSales[0], stock:brickStock(), box:brickCashBalance(), price:state.brickCfg.price, bk:brickFin(()=>true).pm.bankily.inc }));
  log('cash sale 400×100=40,000 via bankily: stock 200, box 17,000, price remembered: '+(r.s.total===40000 && r.s.paid && r.s.payMethod==='bankily' && r.stock===200 && r.box===17000 && r.price===100 && r.bk===40000)+' (expect true)');
  await page.fill('#bkQty','500'); await page.click('#bkSaleSave'); await page.waitForTimeout(250);
  log('selling more than stock is refused: '+(await page.evaluate(()=>state.brickSales.length===1 && /لا يكفي/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.click('[data-bkpaid="0"]'); await page.waitForTimeout(250); await page.fill('#bkQty','100'); await page.click('#bkSaleSave'); await page.waitForTimeout(250);
  log('credit sale without a customer is refused: '+(await page.evaluate(()=>state.brickSales.length===1 && /يحتاج زبونًا/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.selectOption('#bkCust','c:cu1'); await page.fill('#bkQty','100'); await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ s:state.brickSales[1], stock:brickStock(), box:brickCashBalance(), d:debtors().find(x=>x.name==='محمد'), fin:brickFin(()=>true) }));
  log('credit sale 100×100 to محمد: unpaid 10,000, stock 100, box unchanged: '+(r.s.total===10000 && !r.s.paid && r.s.customerId==='cu1' && r.stock===100 && r.box===17000 && r.fin.custDebt===10000)+' (expect true)');
  log('brick debt appears in the general debtors list under kind «brick»: '+(!!r.d && r.d.by.brick===10000 && r.d.n.brick===1)+' (expect true)');
  log('sales screen shows the section debts panel for bricks: '+(await page.evaluate(()=>/10,000/.test(document.querySelector('main').textContent) && !!document.querySelector('[data-sd-toggle="brick"]')))+' (expect true)');

  // 4) مصروف ماء 1,500
  await page.click('[data-bksub="expenses"]'); await page.waitForTimeout(250);
  await page.fill('#bkExpAmt','1500'); await page.fill('#bkExpNote','فاتورة الماء'); await page.click('#bkExpSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ e:state.brickExpenses[0], box:brickCashBalance(), fin:brickFin(()=>true) }));
  log('water expense 1,500: cash out, box 15,500: '+(r.e.category==='water' && r.e.amount===1500 && r.box===15500)+' (expect true)');
  log('period profit = 50,000 − (40,000 + 6,000 + 1,500) = 2,500: '+(r.fin.sales===50000 && r.fin.cost===47500 && r.fin.profit===2500)+' (expect true)');

  // 5) الديون: تحصيل من محمد 4,000 كاش، تسديد بوبكر 20,000، دفع أجرة الخلطة الثانية
  await page.click('[data-bksub="debts"]'); await page.waitForTimeout(250);
  log('debts tab lists customer, supplier and wage dues: '+(await page.evaluate(()=>{ const t=document.querySelector('main').textContent; return /محمد/.test(t) && /بوبكر/.test(t) && /سيدي وعمر|K20/.test(t) && document.querySelectorAll('[data-bk-pcollect]').length===1 && document.querySelectorAll('[data-bk-ppay]').length===1 && document.querySelectorAll('[data-bk-wage]').length===1 && /22334455/.test(t); }))+' (expect true)');
  await page.click('[data-bk-pcollect]'); await page.waitForTimeout(200); await page.fill('#storePayAmt','4000'); await page.click('#storePayOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ out:brickOut(state.brickSales[1]), box:brickCashBalance(), d:debtors().find(x=>x.name==='محمد') }));
  log('partial collection 4,000: 6,000 left, box 19,500, debtors updated: '+(r.out===6000 && r.box===19500 && r.d && r.d.by.brick===6000)+' (expect true)');
  await page.click('[data-bk-ppay]'); await page.waitForTimeout(200); await page.click('#storePayOk'); await page.waitForTimeout(300);
  await page.click('[data-bk-wage]'); await page.waitForTimeout(200); await page.click('#storePayOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ sup:brickOut(state.brickPurchases[1]), wage:brickWageOut(state.brickBatches[1]), box:brickCashBalance(), fin:brickFin(()=>true) }));
  log('supplier and wage paid in full: box 19,500−20,000−3,000=−3,500, no supplier/wage dues: '+(r.sup===0 && r.wage===0 && r.box===-3500 && r.fin.supDebt===0 && r.fin.wageDues===0)+' (expect true)');

  // 6) الصندوق: حركة يدوية + حذف بالكود يحذف حركة الصندوق المرتبطة
  await page.click('[data-bksub="cash"]'); await page.waitForTimeout(250);
  await page.fill('#bkCashAmt','10000'); await page.fill('#bkCashReason','رأس مال'); await page.click('#bkCashIn'); await page.waitForTimeout(300);
  log('manual deposit 10,000 → box 6,500 and listed: '+(await page.evaluate(()=>brickCashBalance()===6500 && /رأس مال/.test(document.querySelector('main').textContent)))+' (expect true)');
  await page.click('[data-bksub="expenses"]'); await page.waitForTimeout(250);
  const eid=await page.evaluate(()=>state.brickExpenses[0].id);
  await page.click(`[data-bk-del="exp:${eid}"]`); await page.waitForTimeout(200); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300);
  log('deleting the expense (code) removes its cash move too (box 8,000) and leaves tombstones: '+(await page.evaluate(()=>state.brickExpenses.length===0 && !state.brickCash.some(m=>m.reason.includes('الماء')) && brickCashBalance()===8000 && Object.keys(state.deleted).length>=2))+' (expect true)');

  // 7) الربح المجمّع في الرئيسية والتقارير يشمل دبو
  await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(300);
  log('dashboard shows a «ربح دبو» card and includes it in the group profit: '+(await page.evaluate(()=>{ const t=document.querySelector('main').textContent; return /ربح دبو/.test(t) && /\+ دبو/.test(t); }))+' (expect true)');
  await page.click('[data-tab="reports"]'); await page.waitForTimeout(400);
  log('reports unified profit has a 🧱 دبو section: '+(await page.evaluate(()=>/🧱 ربح دبو/.test(document.querySelector('main').textContent) && /دبو \(مصنع الطوب\)/.test(document.querySelector('main').textContent)))+' (expect true)');
  log('periodSummary.group includes brick profit: '+(await page.evaluate(()=>{ const t=ymd(new Date()); const s=periodSummary(t,t); return s.brick===brickFin(x=>ymd(x)===t).profit && s.group===s.lndProfit+s.storeMargin+s.brick; }))+' (expect true)');
  log('CSV export has brick sections: '+(await page.evaluate(()=>{ const c=exportCSV('2000-01-01',ymd(new Date())); return /دبو — الخلطات/.test(c) && /دبو — مبيعات الطوب/.test(c) && /دبو — الصندوق/.test(c); }))+' (expect true)');
  log('bot summary mentions دبو: '+(await page.evaluate(()=>/🧱 دبو/.test(tgSummaryText(ymd(new Date()),ymd(new Date())))))+' (expect true)');

  // 7b) قيود الحسابات: محمد أخذ 50 طوبة بلا فاتورة بقيمة 5,000 (عليه) → المخزون ينقص ويُحسب بيعًا
  await page.click('[data-tab="brick"]'); await page.waitForTimeout(200); await page.click('[data-bksub="debts"]'); await page.waitForTimeout(250);
  await page.click('#bkLOpen'); await page.waitForTimeout(200); await page.selectOption('#bkLParty','c:cu1'); await page.click('[data-bklkind="bricks"]'); await page.waitForTimeout(200);
  await page.fill('#bkLAmt','5000'); await page.fill('#bkLQty','50'); await page.fill('#bkLNote','أخذ بلا فاتورة'); await page.click('#bkLSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ x:state.brickLedger[0], stock:brickStock(), bal:brickParties().find(p=>p.key==='c:cu1').balance, sales:brickFin(()=>true).sales, box:brickCashBalance() }));
  log('ledger «bricks on» 50 → stock 50, محمد owes 6,000+5,000=11,000, counted as sales, no cash: '+(r.x.kind==='bricks' && r.x.dir==='on' && r.stock===50 && r.bal===11000 && r.sales===55000 && r.box===8000)+' (expect true)');
  // محمد دفع 1,000 مال دخل الصندوق (له)
  await page.click('[data-bk-ladd="c:cu1"]'); await page.waitForTimeout(250); await page.click('[data-bkldir="for"]'); await page.waitForTimeout(200); await page.click('[data-bklkind="cash"]'); await page.waitForTimeout(200);
  await page.fill('#bkLAmt','1000'); await page.fill('#bkLNote','دفعة'); await page.check('#bkLCash'); await page.waitForTimeout(100); await page.click('#bkLSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ bal:brickParties().find(p=>p.key==='c:cu1').balance, box:brickCashBalance(), m:state.brickCash[state.brickCash.length-1], d:debtors().find(x=>x.name==='محمد') }));
  log('ledger «cash for» 1,000 with cashbox: balance 10,000, box 9,000, cash-in linked, debtors updated: '+(r.bal===10000 && r.box===9000 && r.m.type==='in' && r.m.amount===1000 && r.d && r.d.by.brick===10000)+' (expect true)');
  // المورّد بوبكر يشتري 30 طوبة آجلًا → يصير مدينًا لنا 3,000
  const supId=await page.evaluate(()=>state.suppliers.find(x=>x.name==='بوبكر').id);
  await page.click('[data-bksub="sales"]'); await page.waitForTimeout(250); await page.click('[data-bkpaid="0"]'); await page.waitForTimeout(200);
  await page.selectOption('#bkCust','s:'+supId); await page.fill('#bkPartyPhone','33445566'); await page.fill('#bkQty','30'); await page.fill('#bkPrice','100'); await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const s=state.brickSales[state.brickSales.length-1]; const P=brickParties().find(p=>p.type==='sup'); return { pt:s.partyType, name:s.customerName, bal:P&&P.balance, stock:brickStock(), d:debtors().find(x=>x.name==='بوبكر') }; });
  log('credit sale to a supplier: party=sup, بوبكر now owes 3,000, stock 20, in debtors with kind brick: '+(r.pt==='sup' && r.name==='بوبكر' && r.bal===3000 && r.stock===20 && r.d && r.d.by.brick===3000)+' (expect true)');
  // كشف حساب محمد بالرصيد الجاري وهاتفه
  await page.evaluate(()=>openBrickStatement('cust','cu1')); await page.waitForTimeout(200);
  r=await page.evaluate(()=>{ const t=document.getElementById('receiptContent').textContent; const rows=brickPartyRows('cust','cu1'); return { t, n:rows.length, last:rows[rows.length-1].balance }; });
  log('statement: phone, sale, payment, ledger rows with running balance ending at 10,000: '+(/22334455/.test(r.t) && /بيع 15 بريك/.test(r.t) && /دفعة على/.test(r.t) && /أخذ بلا فاتورة/.test(r.t) && r.n===4 && r.last===10000 && /10,000/.test(r.t))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  // تقارير دبو: تقرير اليوم والشهر وكشوف الحسابات
  await page.click('[data-bksub="home"]'); await page.waitForTimeout(300); // 2.48.0: التقارير صارت داخل الملخص
  r=await page.evaluate(()=>{ const t=document.querySelector('main').textContent; const f=brickDayFin(ymd(new Date())); return { t, ok:/ربح اليوم/.test(t) && /ربح الشهر/.test(t) && /كشوف الحسابات/.test(t), sales:f.sales, stmts:document.querySelectorAll('[data-bk-stmt]').length, rows:document.querySelectorAll('[data-bk-day]').length, wa:/واتساب/.test(t), phone:/22334455/.test(t) }; });
  log('reports tab: day + month + statements list with phones, today row and WhatsApp: '+(r.ok && r.sales===58000 && r.stmts>=2 && r.rows===1 && r.wa && r.phone)+' (expect true)');
  await page.click('[data-bk-dayjump="-1"]'); await page.waitForTimeout(250);
  log('yesterday has zero sales: '+(await page.evaluate(()=>brickDayFin(state.brickRepDay).sales===0 && state.brickRepDay<ymd(new Date()) && state.dateFrom===state.brickRepDay))+' (expect true)');
  await page.click('[data-bk-dayjump="0"]'); await page.waitForTimeout(200);
  log('report text for WhatsApp mentions profit: '+(await page.evaluate(()=>/الربح/.test(brickReportText(ymd(new Date())))))+' (expect true)');
  // 8) المزامنة: خلطة من جهاز آخر تُضاف ولا تضيع المحلية؛ النسخة السحابية تحوي مصفوفات دبو
  r=await page.evaluate(()=>{ const remote=JSON.parse(JSON.stringify(cloudCopy())); const mine=state.brickBatches.length; remote.brickBatches=[{id:'rb1',no:'K2026-10-099',cementBags:1,sandLoads:1,bricks:150,workerPay:0,workerPaid:true,date:iso(new Date()),by:'أنفع',editedAt:iso(new Date())}]; applyRemote(remote); const cc=cloudCopy(); return { n:state.brickBatches.length, mine, stock:brickStock(), inCloud:['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger'].every(k=>Array.isArray(cc[k])) }; });
  log('merge keeps local batches and adds remote (stock 20+150=170): '+(r.n===r.mine+1 && r.stock===170 && r.inCloud)+' (expect true)');
  // إيصال بيع
  await page.evaluate(()=>openBrickReceipt(state.brickSales[1])); await page.waitForTimeout(200);
  log('brick receipt shows qty×price and remaining debt: '+(await page.evaluate(()=>{ const t=document.getElementById('receiptContent').textContent; return /100 طوبة × 100/.test(t) && /المتبقي/.test(t) && /6,000/.test(t); }))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  await page.click('[data-tab="brick"]'); await page.waitForTimeout(300);
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
