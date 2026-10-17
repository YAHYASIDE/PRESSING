// 2.41.0 — المتجر ▸ «البيع والشراء» شاشة واحدة: بيع نقدي/آجل وشراء نقدي/آجل، الزبون إلزامي في الآجل، «دُفع الآن» يبدأ بـ 0، والسجل تحتها.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
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
  await page.evaluate(()=>{ const d=iso(new Date());
    state.storeProducts=[{id:'p1',name:'سكر 25 كيل',buyPrice:7500,sellPrice:8200,stock:5,minStock:0},{id:'p2',name:'مكروني',buyPrice:3500,sellPrice:4000,stock:10,minStock:0}];
    state.storeCustomers=[{id:'cu1',name:'سالم',phone:'22334455',country:'222',editedAt:d}]; state.suppliers=[{id:'su1',name:'مورّد السكر',phone:'44556677',country:'222',editedAt:d}];
    state.storeSales=[]; state.storePurchases=[]; state.storeCash=[]; state.tab='store'; state.storeSub='pos'; state.tradeMode=null; state.dateFrom=state.dateTo=ymd(new Date()); save(); render(); });
  await page.waitForTimeout(300);
  let r=await page.evaluate(()=>({ modes:[...document.querySelectorAll('[data-tmode]')].map(b=>b.textContent.trim()), list:document.querySelectorAll('.pos-prod').length, on:(document.querySelector('[data-tmode].on')||{}).dataset }));
  log('one screen with 4 operation types at the top (بيع نقدي/آجل، شراء نقدي/آجل): '+(r.modes.length===4 && /بيع نقدي/.test(r.modes[0]) && /بيع آجل/.test(r.modes[1]) && /شراء نقدي/.test(r.modes[2]) && /شراء آجل/.test(r.modes[3]))+' (expect true)');
  log('the materials list is not shown in POS (it lives in «المواد»): '+(r.list===0)+' (expect true)');
  // 1) بيع نقدي: بلا زبون، طريقة الدفع فقط
  log('cash sale: no customer field, only pay method: '+(await page.evaluate(()=>!document.getElementById('posCust') && !document.getElementById('tradeParty') && !!document.getElementById('tradePm')))+' (expect true)');
  await page.fill('#tradeSearch','سكر'); await page.waitForTimeout(250);
  log('typing shows matching materials to add: '+(await page.evaluate(()=>document.querySelectorAll('[data-tadd]').length===1))+' (expect true)');
  await page.click('[data-tadd="p1"]'); await page.waitForTimeout(150); await page.click('[data-tq="0|1"]'); await page.waitForTimeout(150);
  await page.click('#tradePm [data-pm="bankily"]'); await page.click('#tradeSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const s=state.storeSales[0]; const m=state.storeCash[0]; return { tot:s.total, paid:s.paid, cust:s.customerId, pm:s.payMethod, mv:m&&m.type==='in'&&m.amount===16400&&m.payMethod==='bankily', stock:storeProd('p1').stock }; });
  log('cash sale 2 × 8,200 = 16,400 fully paid into بنكيلي, stock 5→3: '+(r.tot===16400 && r.paid && !r.cust && r.pm==='bankily' && r.mv && r.stock===3)+' (expect true)');
  // 2) بيع آجل: الزبون إلزامي، دُفع الآن يبدأ بـ 0
  await page.click('[data-tmode="sellCredit"]'); await page.waitForTimeout(200);
  r=await page.evaluate(()=>({ cust:!!document.getElementById('posCust'), paid:document.getElementById('tradePaidNow').value, pmHidden:document.getElementById('tradePmWrap').style.display==='none' }));
  log('credit sale shows the customer field and «دُفع الآن» starting at 0 (pay method hidden until something is paid): '+(r.cust && r.paid==='0' && r.pmHidden)+' (expect true)');
  await page.selectOption('#tradeProd','p2'); await page.waitForTimeout(150); await page.click('#tradeSave'); await page.waitForTimeout(200);
  log('saving a credit sale without a customer is refused: '+(await page.evaluate(()=>state.storeSales.length===1 && /يحتاج زبونًا/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.selectOption('#posCust','__new'); await page.waitForTimeout(100);
  log('«➕ زبون جديد» reveals name/phone: '+(await page.isVisible('#tNewName'))+' (expect true)');
  await page.fill('#tNewName','أحمد'); await page.fill('#tNewPhone','33445566'); await page.fill('#tradePaidNow','1500'); await page.waitForTimeout(100);
  log('typing a partial payment shows the remaining 2,500 and the pay method: '+(await page.evaluate(()=>/2,500/.test(document.getElementById('tradeRem').textContent) && document.getElementById('tradePmWrap').style.display===''))+' (expect true)');
  await page.click('#tradeSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const s=state.storeSales[1], c=state.storeCustomers.find(x=>x.name==='أحمد'); return { c:!!c, cid:s.customerId===(c&&c.id), paidA:s.paidAmount, out:saleOutstanding(s), bal:c?custBalance(c.id):-1, mv:state.storeCash.some(m=>m.type==='in'&&m.amount===1500&&m.ref===s.id) }; });
  log('credit sale to a new customer: paid 1,500 now, 2,500 stays as his debt: '+(r.c && r.cid && r.paidA===1500 && r.out===2500 && r.bal===2500 && r.mv)+' (expect true)');
  // 3) شراء نقدي: بلا مورّد، يُخصم من الحساب
  await page.click('[data-tmode="buyCash"]'); await page.waitForTimeout(200);
  log('cash purchase: no party field, pay-from method only: '+(await page.evaluate(()=>!document.getElementById('posCust') && !document.getElementById('tradeParty') && !!document.getElementById('tradePm')))+' (expect true)');
  await page.selectOption('#tradeProd','p1'); await page.waitForTimeout(150);
  await page.fill('[data-tprice="0"]','7000'); await page.dispatchEvent('[data-tprice="0"]','change'); await page.waitForTimeout(150);
  await page.click('#tradePm [data-pm="masrvi"]'); await page.click('#tradeSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const p=state.storePurchases[0]; return { tot:p.total, paid:p.paid, sup:p.supplierId, out:state.storeCash.some(m=>m.type==='out'&&m.amount===7000&&m.payMethod==='masrvi'&&m.ref===p.id), stock:storeProd('p1').stock, cost:storeProd('p1').buyPrice }; });
  log('cash purchase 7,000 deducted from مصرفي, stock 3→4, cost updated: '+(r.tot===7000 && r.paid && !r.sup && r.out && r.stock===4 && r.cost===7000)+' (expect true)');
  // 4) شراء آجل: مورّد/زبون إلزامي
  await page.click('[data-tmode="buyCredit"]'); await page.waitForTimeout(200);
  log('credit purchase shows suppliers and customers to choose from: '+(await page.evaluate(()=>{ const s=document.getElementById('tradeParty'); return !!s && !!s.querySelector('option[value="s:su1"]') && !!s.querySelector('option[value="c:cu1"]'); }))+' (expect true)');
  await page.selectOption('#tradeProd','p2'); await page.waitForTimeout(150); await page.click('[data-tq="0|1"]'); await page.waitForTimeout(100);
  await page.selectOption('#tradeParty','s:su1'); await page.click('#tradeSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const p=state.storePurchases[1]; return { tot:p.total, paidA:p.paidAmount, sup:p.supplierId, bal:supplierBalance(state.suppliers[0]), stock:storeProd('p2').stock }; });
  log('credit purchase 2 × 3,500 = 7,000 owed to the supplier, stock 9→11: '+(r.tot===7000 && r.paidA===0 && r.sup==='su1' && r.bal===7000 && r.stock===11)+' (expect true)');
  // السجل
  r=await page.evaluate(()=>({ n:document.querySelectorAll('.t-log').length, t:document.querySelector('main').textContent }));
  log('one log below lists the 2 sales and 2 purchases with their type: '+(r.n===4 && /بيع نقدي/.test(r.t) && /بيع آجل/.test(r.t) && /شراء نقدي/.test(r.t) && /شراء آجل/.test(r.t))+' (expect true)');
  await page.click('[data-tlog="unpaid"]'); await page.waitForTimeout(200);
  log('«غير المدفوع» filter shows only the credit sale and credit purchase: '+(await page.evaluate(()=>document.querySelectorAll('.t-log').length===2))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
