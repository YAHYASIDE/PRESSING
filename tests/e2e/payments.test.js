const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:900} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const hold=async(sel)=>{ await page.dispatchEvent(sel,'pointerdown',{pointerId:1,bubbles:true}); await page.waitForTimeout(1250); await page.dispatchEvent(sel,'pointerup',{pointerId:1,bubbles:true}); await page.waitForTimeout(300); };
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date());
    state.carOps=[]; state.carpetOrders=[]; state.laundryOrders=[]; state.expenses=[]; state.storeSales=[]; state.storeCash=[]; state.storePurchases=[]; state.workers=[]; state.meters=[];
    state.storeCustomers=[{id:'c1',name:'زبون المتجر',phone:'33445566',country:'222',editedAt:d}]; state.suppliers=[];
    state.storeProducts=[{id:'p1',name:'صابون',buyPrice:100,sellPrice:300,stock:50,minStock:0,editedAt:d}];
    state.laundryOrders=[{id:'l1',no:'L1',customer:'أ',phone:'44556677',country:'222',type:'قميص',service:'كي',count:2,unit:250,price:500,status:'ready',paid:false,date:d,editedAt:d}];
    state.carpetOrders=[{id:'k1',no:'K1',customer:'ب',phone:'',type:'سجادة',count:1,unit:700,price:700,status:'ready',paid:false,date:d,editedAt:d}];
    save(); render(); });

  // 1) car wash paid via بنكيلي
  await page.click('[data-tab="cars"]'); await page.waitForTimeout(200);
  log('payment picker on car form: '+(await page.isVisible('#carPm'))+' (expect true)');
  await page.fill('#carPrice','1000'); await page.click('#carPm [data-pm="bankily"]'); await hold('#carSave');
  log('car saved with بنكيلي: '+(await page.evaluate(()=>state.carOps[0]&&state.carOps[0].payMethod==='bankily'&&state.carOps[0].paid))+' (expect true)');
  log('car card shows method: '+/بنكيلي/.test(await page.textContent('main'))+' (expect true)');

  // 2) laundry collect via مصرفي
  await page.click('[data-tab="laundry"]'); await page.waitForTimeout(200);
  await page.click('[data-lnd-pay="l1"]'); await page.waitForTimeout(150);
  log('pay modal has methods: '+(await page.isVisible('#payPm'))+' (expect true)');
  await page.click('#payPm [data-pm="masrvi"]'); await page.click('#payOk'); await page.waitForTimeout(200);
  log('laundry paid via مصرفي: '+(await page.evaluate(()=>state.laundryOrders[0].payMethod==='masrvi'))+' (expect true)');
  log('modal resets to كاش: '+(await page.evaluate(()=>document.getElementById('payPm').dataset.val==='cash'))+' (expect true)');
  // 3) carpet collect with cash (default)
  await page.click('[data-tab="carpets"]'); await page.waitForTimeout(200);
  await page.click('[data-pay="k1"]'); await page.waitForTimeout(150); await page.click('#payOk'); await page.waitForTimeout(200);
  log('carpet paid cash: '+(await page.evaluate(()=>normPM(state.carpetOrders[0].payMethod)==='cash'&&state.carpetOrders[0].paid))+' (expect true)');

  // 4) POS sale via سداد (picker survives adding to cart)
  await page.click('[data-tab="store"]'); await page.click('[data-ssub="pos"]'); await page.waitForTimeout(200);
  await page.click('#posPm [data-pm="sedad"]'); await page.click('[data-add="p1"]'); await page.waitForTimeout(150); await page.click('[data-add="p1"]'); await page.waitForTimeout(150);
  log('method kept after cart re-render: '+(await page.evaluate(()=>pmVal('posPm')==='sedad'))+' (expect true)');
  await page.click('#posSellCash'); await page.waitForTimeout(200);
  log('sale 600 via سداد in cashbox: '+(await page.evaluate(()=>state.storeCash.some(m=>m.type==='in'&&m.amount===600&&m.payMethod==='sedad')))+' (expect true)');
  // 5) credit sale then collect via بنكيلي
  await page.click('[data-add="p1"]'); await page.waitForTimeout(150); await page.selectOption('#posCust','c1'); await page.click('#posSellCredit'); await page.waitForTimeout(200);
  await page.evaluate(()=>{ _storePayCtx={kind:'cust',id:'c1'}; openStorePay(custBalance('c1'),'تحصيل'); });
  await page.click('#storePayPm [data-pm="bankily"]'); await page.click('#storePayOk'); await page.waitForTimeout(200);
  log('debt collected via بنكيلي: '+(await page.evaluate(()=>state.storeCash.some(m=>m.type==='in'&&m.amount===300&&m.payMethod==='bankily')))+' (expect true)');
  // 6) expense paid via مصرفي
  await page.click('[data-tab="expenses"]'); await page.waitForTimeout(200);
  await page.fill('#expAmount','200'); await page.fill('#expReason','شامبو'); await page.click('#expPm [data-pm="masrvi"]'); await page.click('#expSave'); await page.waitForTimeout(300);
  log('expense via مصرفي: '+(await page.evaluate(()=>state.expenses[0]&&state.expenses[0].payMethod==='masrvi'))+' (expect true)');

  // ===== totals by method =====
  const r = await page.evaluate(()=>{ const x=payBreakdown(()=>true); return {cash:x.cash.inc, bankily:x.bankily.inc, masrvi:x.masrvi.inc, sedad:x.sedad.inc, masrviOut:x.masrvi.out, masrviNet:x.masrvi.net}; });
  log('breakdown: '+JSON.stringify(r));
  log('cash 700 / بنكيلي 1300 / مصرفي 500 / سداد 600: '+(r.cash===700&&r.bankily===1300&&r.masrvi===500&&r.sedad===600)+' (expect true)');
  log('مصرفي net = 500 − 200 = 300: '+(r.masrviNet===300)+' (expect true)');
  await page.click('[data-tab="reports"]'); await page.waitForTimeout(250);
  const rep = await page.textContent('#payBreakPanel');
  log('reports panel shows bank total 2,400: '+(rep.includes('2,400')&&rep.includes('بنكيلي')&&rep.includes('سداد'))+' (expect true)');
  await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(200);
  log('dashboard strip shows methods: '+((await page.$$('.pm-strip .pm-chip')).length===4)+' (expect true)');
  await page.click('#openClosing'); await page.waitForTimeout(200);
  const cl = await page.textContent('#receiptContent');
  log('closing lists payment methods: '+(cl.includes('طريقة الدفع')&&cl.includes('مصرفي')&&cl.includes('صافي الكاش'))+' (expect true)');
  await page.click('#receiptClose');

  // ===== store debts tab: debtors + creditors =====
  await page.evaluate(()=>{ const d=iso(new Date()); state.suppliers=[{id:'s1',name:'مورّد المنظفات',phone:'22000000',editedAt:d}];
    state.storePurchases=[{id:'pu1',no:'P1',supplier:'مورّد المنظفات',supplierId:'s1',items:[],total:900,paid:false,paidAmount:0,date:d,editedAt:d}];
    state.laundryOrders.push({id:'l2',no:'L2',customer:'سارة',phone:'33445511',country:'222',type:'فستان',service:'غسيل',count:1,unit:400,price:400,status:'wash',paid:false,date:d,editedAt:d}); save(); });
  await page.click('[data-tab="store"]'); await page.click('[data-ssub="debts"]'); await page.waitForTimeout(250);
  const st = await page.textContent('main');
  log('store debts tab: owed 400 + owe 900: '+(st.includes('لنا عند الزبائن')&&st.includes('علينا للموردين')&&st.includes('900'))+' (expect true)');
  log('debtors listed (سارة): '+st.includes('سارة')+' (expect true)');
  await page.click('[data-debtview="cred"]'); await page.waitForTimeout(200);
  log('creditors listed: '+(await page.textContent('main')).includes('مورّد المنظفات')+' (expect true)');
  await page.click('[data-sp-pay="s1"]'); await page.waitForTimeout(150);
  await page.fill('#storePayAmt','900'); await page.click('#storePayPm [data-pm="bankily"]'); await page.click('#storePayOk'); await page.waitForTimeout(250);
  log('supplier paid via بنكيلي (out): '+(await page.evaluate(()=>state.storeCash.some(m=>m.type==='out'&&m.amount===900&&m.payMethod==='bankily')&&supplierBalance(state.suppliers[0])===0))+' (expect true)');
  log('no creditors left: '+/لا توجد ديون علينا/.test(await page.textContent('main'))+' (expect true)');
  log('legacy record without method counts as cash: '+(await page.evaluate(()=>normPM(undefined)==='cash'))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
