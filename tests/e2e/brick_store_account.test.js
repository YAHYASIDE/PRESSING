// 2.61.0 — اختيار الزبون بالبطاقات (بدل القائمة) + دبو زبون ومورّد للمتجر في «بيع آجل/شراء آجل» + فواتير دبو على صورة «فاتورة بيع طوب» + البحث عن فاتورة.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:860} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date());
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickLoads','brickOrders','brickWaste','unitXfers','storeSales','storeDebts','storePurchases','storeCash'].forEach(k=>state[k]=[]);
    state.storeCustomers=[{id:'cu1',name:'محمد الأمين',phone:'22334455',editedAt:d},{id:'cu2',name:'سالم',phone:'22998877',editedAt:d}];
    state.storeProducts=[{id:'p1',name:'إسمنت',stock:50,sellPrice:1000,buyPrice:800,editedAt:d}];
    state.storeCash=[{id:'m0',type:'in',amount:10000,reason:'إيداع',payMethod:'cash',date:d,editedAt:d}];
    state.tab='store'; state.storeSub='pos'; state.tradeMode='sellCredit'; save(); render(); });
  await page.waitForTimeout(300);
  // (1) اختيار الزبون بالبطاقات
  let r=await page.evaluate(()=>{ const sel=document.getElementById('posCust'), pk=document.querySelector('.pk[data-for="posCust"]'); return { hidden:sel.classList.contains('pk-hidden'), pk:!!pk, rows:pk?pk.querySelectorAll('.pk-row[data-pkv]').length:0, brick:!!(pk&&pk.querySelector('[data-pkv="__brick"]')), neu:!!(pk&&pk.querySelector('[data-pkv="__new"]')) }; });
  log('بيع آجل shows a search + customer cards instead of the dropdown (with «🧱 دبو» and «زبون جديد»): '+(r.hidden&&r.pk&&r.brick&&r.neu&&r.rows>=4)+' (expect true) '+JSON.stringify(r));
  await page.fill('.pk[data-for="posCust"] .pk-q','2233'); await page.waitForTimeout(150);
  r=await page.evaluate(()=>[...document.querySelectorAll('.pk[data-for="posCust"] .pk-list .pk-row')].map(b=>b.dataset.pkv));
  log('typing part of the phone filters the cards: '+(r.length===1&&r[0]==='cu1')+' (expect true) '+r);
  await page.click('.pk[data-for="posCust"] [data-pkv="cu1"]'); await page.waitForTimeout(200);
  r=await page.evaluate(()=>({ v:document.getElementById('posCust').value, cur:(document.querySelector('.pk[data-for="posCust"] .pk-cur')||{}).textContent||'' }));
  log('picking a card selects him and shows him with «تغيير»: '+(r.v==='cu1'&&/محمد الأمين/.test(r.cur)&&/تغيير/.test(r.cur))+' (expect true)');
  await page.click('.pk[data-for="posCust"] .pk-chg'); await page.waitForTimeout(150);
  await page.click('.pk[data-for="posCust"] [data-pkv="__brick"]'); await page.waitForTimeout(200);
  log('«🧱 دبو» can be picked as the customer: '+(await page.evaluate(()=>document.getElementById('posCust').value==='__brick'))+' (expect true)');
  // (2) بيع لدبو 5 × 1,000 ودفع 2,000
  await page.fill('#tradeSearch','إسمنت'); await page.waitForTimeout(200); await page.click('[data-tadd="p1"]'); await page.waitForTimeout(150);
  await page.evaluate(()=>{ storeCart[0].qty=5; render(); }); await page.waitForTimeout(150);
  if(await page.isVisible('.pk[data-for="posCust"] [data-pkv="__brick"]')) await page.click('.pk[data-for="posCust"] [data-pkv="__brick"]');
  await page.fill('#tradePaidNow','2000'); await page.waitForTimeout(100); await page.click('#tradeSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const T=ymd(new Date()), S=state.storeSales[0], F=x=>ymd(x)===T; return { to:S&&S.toBrick, name:S&&S.customerName, income:storeSalesIncome(F), recv:totalReceivables(), ux:uxBalance(), exp:(state.brickExpenses||[]).filter(e=>e.storeSaleId===S.id&&e.noCash).length, bexp:brickFin(F).expenses, store:Math.round(cashboxBalance()), brick:Math.round(brickCashBalance()), stock:storeProd('p1').stock }; });
  log('sale to دبو: counts in store sales (5,000), not a store customer debt, دبو owes 3,000, دبو cost 5,000: '+(r.to&&r.income===5000&&r.recv===0&&r.ux===3000&&r.exp===1&&r.bexp===5000)+' (expect true) '+JSON.stringify(r));
  log('the 2,000 paid now moved from دبو box to the store box, stock 50 → 45: '+(r.store===12000&&r.brick===-2000&&r.stock===45)+' (expect true)');
  await page.evaluate(()=>{ state.storeSub='debts'; state.debtView='all'; render(); }); await page.waitForTimeout(200);
  await page.click('main [data-ux-stmt="store"]'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const t=document.getElementById('receiptContent').textContent; return { fin:/عليه لنا\s*3,000/.test(t), inv:/فاتورة متجر/.test(t), pay:/دفعة على/.test(t) }; });
  log('دبو statement: the invoice (عليه 5,000), the payment (له 2,000), balance «عليه لنا 3,000»: '+(r.fin&&r.inv&&r.pay)+' (expect true) '+JSON.stringify(r));
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  r=await page.evaluate(()=>{ _uxOpen=true; render(); const L=document.querySelector('.ux-log'); return { auto:L?L.querySelectorAll('.badge').length>=2:false, noEdit:!L||!L.querySelector('[data-rec-edit^="uxf:"]') }; });
  log('automatic entries say «🧾 فاتورة» and are edited from the invoice only: '+(r.auto&&r.noEdit)+' (expect true)');
  // تعديل الفاتورة: 6 × 1,000 → القيد والتكلفة يتبعان
  r=await page.evaluate(()=>{ const S=state.storeSales[0]; openRecEdit('ssale',S.id); document.getElementById('re_q0').value='6'; const e=recEditSave('ssale',S.id); return { e, ux:uxBalance(), exp:state.brickExpenses[0].amount, paid:S.paidAmount===S.total, recv:totalReceivables() }; });
  log('editing the invoice to 6,000 moves دبو debt to 4,000 and its cost to 6,000: '+(!r.e&&r.ux===4000&&r.exp===6000&&r.paid&&r.recv===0)+' (expect true) '+JSON.stringify(r));
  await page.evaluate(()=>{ document.getElementById('editModal').style.display='none'; });
  r=await page.evaluate(()=>{ cancelSale(state.storeSales[0]); return { ux:uxBalance(), exp:(state.brickExpenses||[]).length, store:Math.round(cashboxBalance()), brick:Math.round(brickCashBalance()) }; });
  log('cancelling the invoice cancels its دبو entries and cost, boxes go back: '+(r.ux===0&&r.exp===0&&r.store===10000&&r.brick===0)+' (expect true) '+JSON.stringify(r));
  // (3) شراء المتجر من دبو 4,000 آجل
  await page.evaluate(()=>{ state.storeSub='pos'; state.tradeMode='buyCredit'; purCart=[{productId:'p1',name:'إسمنت',qty:4,cost:1000}]; render(); }); await page.waitForTimeout(250);
  log('شراء آجل also offers «🧱 دبو» as the supplier card: '+(await page.isVisible('.pk[data-for="tradeParty"] [data-pkv="__brick"]'))+' (expect true)');
  await page.click('.pk[data-for="tradeParty"] [data-pkv="__brick"]'); await page.waitForTimeout(150); await page.click('#tradeSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const T=ymd(new Date()), F=x=>ymd(x)===T, P=state.storePurchases[0], bs=state.brickSales.find(x=>x.storePurId===P.id); return { from:P.fromBrick, ux:uxBalance(), sup:sum(state.suppliers||[],x=>supplierBalance(x)), bs:!!bs, bsales:brickFin(F).sales, stock:storeProd('p1').stock, brickStockT:brickStock('t15') }; });
  log('purchase from دبو: store owes دبو 4,000, دبو sale income 4,000, store stock +4: '+(r.from&&r.ux===-4000&&r.sup===0&&r.bs&&r.bsales===4000&&r.stock===54)+' (expect true) '+JSON.stringify(r));
  await page.evaluate(()=>{ state.tab='brick'; state.brickSub='sales'; _bkDraft.side='sell'; state.dateFrom='1970-01-01'; state.dateTo=ymd(new Date()); render(); }); await page.waitForTimeout(250);
  log('دبو sales list shows «🏪 بيع للمتجر» without edit/delete buttons: '+(await page.evaluate(()=>{ const t=document.getElementById('main').innerText; return /بيع للمتجر/.test(t) && !document.querySelector('[data-rec-edit^="bsale:"]'); }))+' (expect true)');
  // (4) فواتير دبو على صورة «فاتورة بيع طوب»
  r=await page.evaluate(async()=>{ const d=iso(new Date()); state.brickSales.push({id:'bs1',no:'BS-T1',btype:'t15',qty:100,unitPrice:180,total:18000,paidAmount:5000,paid:false,partyType:'cust',partyId:'cu1',customerId:'cu1',customerName:'محمد الأمين',phone:'22334455',date:d,editedAt:d});
    state.brickBatches.push({id:'bb',no:'B1',btype:'t15',bricks:1000,opening:true,ready:true,date:d,editedAt:d});
    openBrickReceipt(state.brickSales.find(x=>x.id==='bs1')); await new Promise(r=>setTimeout(r,800)); const im=document.querySelector('#receiptContent .winv-page'); if(im) await im.decode(); return { img:!!im, w:im&&im.naturalWidth, h:im&&im.naturalHeight }; });
  log('دبو sale invoice = the owner brick-invoice image 1024×1536: '+(r.img&&r.w===1024&&r.h===1536)+' (expect true) '+JSON.stringify(r));
  r=await page.evaluate(async()=>{ for(let i=0;i<9;i++){ const d=iso(new Date(Date.now()-i*36e5)); state.brickLedger.push({id:'lg'+i,partyType:'cust',partyId:'cu1',dir:'on',kind:'other',amount:100,note:'قيد '+i,date:d,editedAt:d}); }
    openBrickStatement('cust','cu1'); await new Promise(r=>setTimeout(r,1000)); const b=await receiptPdfBlob(); const t=await b.text(); return { imgs:document.querySelectorAll('#receiptContent .winv-page').length, pages:(t.match(/\/Type\s*\/Page[^s]/g)||[]).length, txt:!!rcptTextCtx() }; });
  log('دبو statement (10 rows) = 2 image pages of 8 rows + PDF 2 pages + «💬 كتابةً» still available: '+(r.imgs===2&&r.pages===2&&r.txt)+' (expect true) '+JSON.stringify(r));
  r=await page.evaluate(async()=>{ const d=iso(new Date()); state.brickPurchases.push({id:'pu1',no:'BP-T1',material:'cement',name:'إسمنت',unit:'خنشة',qty:20,unitCost:3300,total:66000,paid:true,paidAmount:66000,payMethod:'cash',supplier:'مورّد',date:d,editedAt:d}); state.brickSub='purchases'; render(); await new Promise(r=>setTimeout(r,100));
    const b=document.querySelector('[data-bk-purrcpt="pu1"]'); if(b) b.click(); await new Promise(r=>setTimeout(r,800)); return { btn:!!b, img:!!document.querySelector('#receiptContent .winv-page') }; });
  log('دبو purchase card has «🧾 فاتورة» that opens the same image (title فاتورة شراء): '+(r.btn&&r.img)+' (expect true) '+JSON.stringify(r));
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  // (5) البحث عن فاتورة في سجل البيع والشراء
  await page.evaluate(()=>{ state.tab='store'; state.storeSub='pos'; state.tradeMode='sellCash'; state.dateFrom='1970-01-01'; state.dateTo=ymd(new Date()); render(); }); await page.waitForTimeout(250);
  const no=await page.evaluate(()=>state.storePurchases[0].no);
  await page.fill('#tradeLogSearch',no); await page.waitForTimeout(250);
  r=await page.evaluate(()=>document.querySelectorAll('.t-log').length);
  log('invoice search finds it by number: '+(r===1)+' (expect true) '+r);
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
