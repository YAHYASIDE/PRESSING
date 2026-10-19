// 2.52.0 — دبو: التجفيف (✅ جاهزة) + الطوب المكسور + الطلبيات بالعربون والتسليم على رحلات.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:860} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  const dialogs=[]; page.on('dialog', d=>{ dialogs.push(d.message()); d.accept(); });
  const log=(...a)=>console.log(...a);
  const code=async()=>{ await page.waitForTimeout(150); if(await page.isVisible('#codeInput')){ await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(250); } };
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date());
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickLoads','brickOrders','brickWaste'].forEach(k=>state[k]=[]);
    state.storeCustomers=[{id:'cu1',name:'محمد',phone:'22334455',country:'222',editedAt:d}]; state.suppliers=[];
    state.brickPorters=[{id:'po1',name:'دبيته',phone:'33445566',role:'porter',editedAt:d}];
    state.brickCfg={price:180,types:[{k:"t15",name:"15 بريك",price:180,wage:1300,load:2},{k:"t56",name:"56 وردي",price:350,wage:1300}]};
    state.brickPurchases=[{id:'p1',no:'BP1',material:'cement',name:'إسمنت',unit:'خنشة',qty:20,unitCost:3000,total:60000,paid:true,paidAmount:60000,date:d,editedAt:d},{id:'p2',no:'BP2',material:'sand',name:'تراب',unit:'فياج',qty:4,unitCost:5000,total:20000,paid:true,paidAmount:20000,date:d,editedAt:d}];
    state.tab='brick'; state.brickSub='batches'; state.dateFrom=state.dateTo=ymd(new Date()); _bkDraft.batchWorker=''; save(); render(); });
  await page.waitForTimeout(300);
  // 1) خلطة جديدة = تجفّ
  await page.fill('#bkBags','5'); await page.fill('#bkLoads','1'); await page.fill('#bkBricks','1000'); await page.click('#bkBatchSave'); await page.waitForTimeout(300);
  let r=await page.evaluate(()=>({ b:state.brickBatches[0].ready, dry:brickDrying('t15'), rdy:brickReady('t15'), panel:!!document.querySelector('.bk-dry [data-bk-ready]'), badge:/تجفّ/.test(document.querySelector('main .order').textContent) }));
  log('a new batch is «🌬️ تجفّ» (not ready) with a ✅ button: '+(r.b===false && r.dry===1000 && r.rdy===0 && r.panel && r.badge)+' (expect true)');
  // 2) البيع من طوب يجفّ = تنبيه ويُسمح
  await page.click('[data-bksub="sales"]'); await page.waitForTimeout(200);
  r=await page.evaluate(()=>document.getElementById('bkStockHint').textContent);
  log('sale form shows ready / drying: '+(/جاهز 0/.test(r) && /يجفّ 1,000/.test(r))+' (expect true) '+r);
  await page.fill('#bkQty','100'); await page.fill('#bkPrice','180'); await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>state.brickSales.length);
  log('selling drying bricks warns but is allowed: '+(dialogs.some(m=>/الجاهز للبيع/.test(m)&&/يجفّ/.test(m)) && r===1)+' (expect true)');
  // 3) ✅ جاهزة
  await page.click('[data-bksub="batches"]'); await page.waitForTimeout(200); await page.click('.bk-dry [data-bk-ready]'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>({ b:state.brickBatches[0], dry:brickDrying(), rdy:brickReady('t15'), panel:!!document.querySelector('.bk-dry') }));
  log('«✅ جاهزة» marks the batch ready (900 ready, nothing drying): '+(r.b.ready===true && !!r.b.readyAt && r.dry===0 && r.rdy===900 && !r.panel)+' (expect true)');
  // 4) المكسور
  await page.click('#bkWasteBox summary'); await page.waitForTimeout(150); await page.fill('#bkWQty','20'); await page.fill('#bkWNote','انكسر في التحميل'); await page.click('#bkWSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const f=brickFin(x=>inRange(x)); return { st:brickStock('t15'), wq:f.wasteQty, wv:f.wasteValue, row:!!document.querySelector('#bkWasteBox tbody tr'), w:state.brickWaste[0] }; });
  log('broken bricks reduce stock (880) and show their value: '+(r.st===880 && r.wq===20 && r.wv>0 && r.row && r.w.unitCost>0)+' (expect true) '+JSON.stringify({st:r.st,wv:r.wv}));
  // 5) الطلبيات: 9 مربعات في صفّين
  await page.click('[data-bksub="orders"]'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>{ const B=[...document.querySelectorAll('.bk-tiles [data-bksub]')]; return { n:B.length, rows:new Set(B.map(b=>Math.round(b.getBoundingClientRect().top))).size, ov:document.documentElement.scrollWidth>innerWidth }; });
  log('brick tabs: 9 tiles in 2 rows, no overflow: '+(r.n===9 && r.rows===2 && !r.ov)+' (expect true) '+JSON.stringify(r));
  await page.selectOption('#bkOrdParty','c:cu1'); await page.fill('#bkOrdQty','500'); await page.fill('#bkOrdPrice','180'); await page.fill('#bkOrdAddr','تفرغ زينة'); await page.fill('#bkOrdDep','30000'); await page.waitForTimeout(150);
  r=await page.evaluate(()=>({ tot:document.getElementById('bkOrdTotal').textContent, rem:document.getElementById('bkOrdRem').textContent, pm:document.getElementById('bkOrdPmWrap').style.display!=='none' }));
  log('order form: live total 90,000 and remaining 60,000, payment method shown for the deposit: '+(/90,000/.test(r.tot) && /60,000/.test(r.rem) && r.pm)+' (expect true)');
  await page.click('#bkOrdSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const o=state.brickOrders[0], p=brickParties().find(x=>x.key==='c:cu1'); return { o, dep:brickOrderDeposit(o), res:brickReserved('t15'), stock:brickStock('t15'), bal:p&&p.balance, box:brickCashBalance(), hint:brickStockHintTxt('t15') }; });
  log('order saved: no stock change, 500 reserved, deposit 30,000 in the box, customer has «له 30,000»: '+(r.o.status==='open' && r.o.total===90000 && r.dep===30000 && r.res===500 && r.stock===880 && r.bal===-30000 && /محجوز 500/.test(r.hint))+' (expect true) '+JSON.stringify({bal:r.bal,res:r.res}));
  // 6) تسليم رحلة 1: 200 طوبة + نقل على الزبون 2,000 + الحمّال
  await page.click('[data-bk-odeliv]'); await page.waitForTimeout(250);
  await page.fill('#bkDlvQty','200'); await page.selectOption('#bkDlvPorter','po1'); await page.click('[data-bkdtr="cust"]'); await page.waitForTimeout(200);
  await page.fill('#bkDlvQty','200'); await page.fill('#bkDlvTrAmt','2000'); await page.click('#bkDlvSave'); await page.waitForTimeout(400);
  r=await page.evaluate(()=>{ const o=state.brickOrders[0], s=state.brickSales.find(x=>x.orderId===o.id), ld=state.brickLoads.find(l=>l.ref===s.id), p=brickParties().find(x=>x.key==='c:cu1'); return { s, out:brickOut(s), ld, left:brickOrderLeft(o), depL:brickOrderDepLeft(o), bal:p.balance, stock:brickStock('t15'), res:brickReserved('t15'), rc:document.getElementById('receiptModal').style.display==='flex' && !!document.querySelector('#receiptContent .rcpt.winv') }; });
  log('trip 1: a sale of 200 (+2,000 transport) paid 30,000 from the deposit, 8,000 left on him: '+(r.s.qty===200 && r.s.total===38000 && r.s.depUsed===30000 && r.out===8000 && r.s.driver==='دبيته' && r.depL===0 && r.bal===8000)+' (expect true) '+JSON.stringify({total:r.s.total,dep:r.s.depUsed,bal:r.bal}));
  log('trip 1: stock 680, 300 still reserved, porter owed 400, delivery note opens: '+(r.stock===680 && r.res===300 && r.left===300 && r.ld && r.ld.amount===400 && r.rc)+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  // 7) تسليم رحلة 2: الباقي 300 → الطلبية مكتملة
  await page.click('[data-bk-odeliv]'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>document.getElementById('bkDlvQty').value);
  log('trip form proposes the remaining 300: '+(r==='300')+' (expect true)');
  await page.click('#bkDlvSave'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  r=await page.evaluate(()=>{ const o=state.brickOrders[0], p=brickParties().find(x=>x.key==='c:cu1'), rows=brickPartyRows('cust','cu1'); return { st:o.status, del:brickOrderDelivered(o), res:brickReserved(), bal:p.balance, last:rows[rows.length-1].balance, dep:rows.some(x=>/عربون طلبية/.test(x.label)), trip:rows.some(x=>/تسليم/.test(x.label)&&/طلبية/.test(x.label)), due:brickOrderDue(o) }; });
  log('trip 2 completes the order; balance 62,000 = statement (deposit row + 2 deliveries): '+(r.st==='done' && r.del===500 && r.res===0 && r.bal===62000 && r.last===62000 && r.dep && r.trip && r.due===62000)+' (expect true) '+JSON.stringify(r));
  r=await page.evaluate(()=>{ _bkDraft.ordAll=false; state.dateFrom=state.dateTo='2000-01-01'; render(); const n=document.querySelectorAll('main .bk-ord.s-done').length; state.dateFrom=state.dateTo=ymd(new Date()); render(); return { old:n, today:document.querySelectorAll('main .bk-ord.s-done').length }; });
  log('completed orders show in their day only, older ones need «عرض المكتملة»: '+(r.old===0 && r.today===1)+' (expect true) '+JSON.stringify(r));
  await page.click('#bkOrdAll'); await page.waitForTimeout(200);
  log('«عرض المكتملة» shows it with its 2 trips: '+(await page.evaluate(()=>{ const c=document.querySelector('main .bk-ord.s-done'); return !!c && c.querySelectorAll('.ord-trip').length===2; }))+' (expect true)');
  // 8) طلبية ثانية بعربون ثم إلغاء → العربون يبقى له → ردّه
  await page.selectOption('#bkOrdParty','c:cu1'); await page.fill('#bkOrdQty','100'); await page.fill('#bkOrdPrice','180'); await page.fill('#bkOrdDep','10000'); await page.click('#bkOrdSave'); await page.waitForTimeout(300);
  await page.click('.bk-ord.s-open [data-bk-ocancel]'); await code();
  r=await page.evaluate(()=>{ const o=state.brickOrders.find(x=>x.qty===100), p=brickParties().find(x=>x.key==='c:cu1'); return { st:o.status, depL:brickOrderDepLeft(o), bal:p.balance }; });
  log('cancelling an order with a deposit keeps it (له 10,000): '+(r.st==='cancelled' && r.depL===10000 && r.bal===52000)+' (expect true) '+JSON.stringify(r));
  await page.click('[data-bk-orefund]'); await page.waitForTimeout(200); await page.click('#storePayOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const o=state.brickOrders.find(x=>x.qty===100), p=brickParties().find(x=>x.key==='c:cu1'); return { depL:brickOrderDepLeft(o), bal:p.balance, out:state.brickCash.some(m=>m.ref===o.id&&m.type==='out'&&m.amount===10000) }; });
  log('«↩️ ردّ العربون» pays it back from the box: '+(r.depL===0 && r.bal===62000 && r.out)+' (expect true)');
  // 9) طلبية بلا عربون ولا تسليم → الإلغاء يحذفها
  await page.selectOption('#bkOrdParty','c:cu1'); await page.fill('#bkOrdQty','50'); await page.fill('#bkOrdPrice','180'); await page.fill('#bkOrdDep','0'); await page.click('#bkOrdSave'); await page.waitForTimeout(300);
  await page.click('.bk-ord.s-open [data-bk-ocancel]'); await code();
  log('an empty order is deleted on cancel: '+(await page.evaluate(()=>!state.brickOrders.some(x=>x.qty===50) && !!state.deleted && Object.keys(state.deleted).length>0))+' (expect true)');
  // 10) الأرقام والملخص
  r=await page.evaluate(()=>{ const f=brickFin(x=>inRange(x)); state.brickSub='home'; render(); return { sales:f.sales, profit:f.profit, ok:!isNaN(f.profit), t:document.querySelector('main').textContent }; });
  log('sales today = 18,000 + 38,000 + 54,000 = 110,000; summary shows broken bricks: '+(r.sales===110000 && r.ok && /مكسور/.test(r.t))+' (expect true) '+r.sales);
  log('no Arabic-Indic digits and no ISO dates on the orders screen: '+(await page.evaluate(()=>{ state.brickSub='orders'; _bkDraft.ordAll=true; render(); const t=document.querySelector('main').textContent; return !/[٠-٩]/.test(t) && !/\d{4}-\d{2}-\d{2}/.test(t.replace(/BO\d{4}-\d{2}-\d+|BS\d{4}-\d{2}-\d+|K\d{4}-\d{2}-\d+/g,'')); }))+' (expect true)');
  // 11) المزامنة: طلبية من جهاز آخر تُدمج ولا تضيع المحلية
  r=await page.evaluate(()=>{ const remote=JSON.parse(JSON.stringify(cloudCopy())); const mine=state.brickOrders.length; const d=iso(new Date());
    remote.brickOrders=(remote.brickOrders||[]).concat([{id:'ro1',no:'BO-R',partyType:'cust',partyId:'cu1',customerName:'محمد',btype:'t15',qty:10,unitPrice:180,total:1800,status:'open',date:d,by:'أنفع',editedAt:d}]);
    remote.brickWaste=[]; applyRemote(remote); return { n:state.brickOrders.length, mine, w:state.brickWaste.length, cc:Array.isArray(cloudCopy().brickOrders)&&Array.isArray(cloudCopy().brickWaste) }; });
  log('sync: another device’s order is merged, local orders and waste kept: '+(r.n===r.mine+1 && r.w===1 && r.cc)+' (expect true) '+JSON.stringify(r));
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
