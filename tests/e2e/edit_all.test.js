// 2.29.0 — تعديل أي عملية سابقة: مصروف، فاتورة/شراء/دين يدوي/حركة صندوق في المتجر، وكل عمليات دبو، وهاتف/طريقة دفع طلبات المغسلة.
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
    state.storeCustomers=[{id:'cu1',name:'محمد',phone:'22334455',country:'222',editedAt:d},{id:'cu2',name:'سالم',phone:'33445566',country:'222',editedAt:d}];
    state.storeProducts=[{id:'p1',name:'صابون',buyPrice:100,sellPrice:150,stock:20,minStock:0,editedAt:d}];
    state.storeSales=[]; state.storePurchases=[]; state.storeCash=[]; state.storeDebts=[]; state.expenses=[]; state.suppliers=[];
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger'].forEach(k=>state[k]=[]);
    save(); });
  const open=async(sel)=>{ await page.click(sel); await page.waitForTimeout(250); };
  const saveEdit=async()=>{ await page.click('#editSave'); await page.waitForTimeout(300); };

  // ===== المتجر: فاتورة نقدية 4 × 150 = 600 → تعديل إلى 6 × 140 = 840 (المخزون والصندوق يتعدّلان)
  await page.evaluate(()=>{ commitStoreSale(null,null,[{productId:'p1',name:'صابون',qty:4,price:150}],true,'cash'); state.tab='store'; state.storeSub='sales'; state.dateFrom=state.dateTo=ymd(new Date()); render(); });
  await page.waitForTimeout(250);
  let sid=await page.evaluate(()=>state.storeSales[0].id);
  log('store sale card has an edit button: '+(await page.isVisible(`[data-rec-edit="ssale:${sid}"]`))+' (expect true)');
  await open(`[data-rec-edit="ssale:${sid}"]`);
  await page.fill('#re_q0','6'); await page.fill('#re_p0','140'); await page.click('#re_pm [data-pm="bankily"]'); await saveEdit();
  let r=await page.evaluate(()=>{ const s=state.storeSales[0]; return { total:s.total, paid:s.paidAmount, stock:storeProd('p1').stock, cash:state.storeCash.find(m=>m.ref===s.id), log:state.activity.some(a=>/تعديل فاتورة متجر/.test(a.action)) }; });
  log('cash sale edited to 840: stock 14, cash move 840 via bankily, logged: '+(r.total===840 && r.paid===840 && r.stock===14 && r.cash.amount===840 && r.cash.payMethod==='bankily' && r.log)+' (expect true)');
  // فاتورة آجلة لمحمد 2 × 150 = 300، دُفع منها 100 → تعديل إلى 50 يُرفض، إلى 1 × 200 مقبول ويبقى دين 100، ثم تغيير الزبون إلى سالم
  await page.evaluate(()=>{ const s=commitStoreSale('cu1',storeCust('cu1'),[{productId:'p1',name:'صابون',qty:2,price:150}],false); s.paidAmount=100; addCashMove('in',100,'تحصيل',s.customerId,s.id,'cash'); render(); });
  sid=await page.evaluate(()=>state.storeSales[1].id);
  await open(`[data-rec-edit="ssale:${sid}"]`); await page.fill('#re_q0','1'); await page.fill('#re_p0','50'); await saveEdit();
  log('credit sale cannot go below what was paid: '+(await page.evaluate(()=>state.storeSales[1].total===300 && /أقل من المدفوع/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.fill('#re_p0','200'); await page.selectOption('#re_cust','cu2'); await saveEdit();
  r=await page.evaluate(()=>{ const s=state.storeSales[1]; return { total:s.total, out:saleOutstanding(s), cust:s.customerName, stock:storeProd('p1').stock, mv:state.storeCash.find(m=>m.ref===s.id).customerId }; });
  log('credit sale edited: total 200, debt 100 moved to سالم, stock back +1: '+(r.total===200 && r.out===100 && r.cust==='سالم' && r.stock===13 && r.mv==='cu2')+' (expect true)');

  // ===== شراء متجر 10 × 100 = 1,000 مدفوع → 8 × 110 = 880
  await page.evaluate(()=>{ const d=iso(new Date()); const p={id:'pu1',no:'P1',supplier:'شركة',items:[{productId:'p1',name:'صابون',qty:10,cost:100}],total:1000,paid:true,paidAmount:1000,payMethod:'cash',date:d,by:'مالك',editedAt:d}; state.storePurchases.push(p); storeProd('p1').stock+=10; addCashMove('out',1000,'شراء P1',null,'pu1','cash'); state.storeSub='purchases'; render(); });
  await open('[data-rec-edit="spur:pu1"]'); await page.fill('#re_q0','8'); await page.fill('#re_p0','110'); await page.fill('#re_sup','مورّد جديد'); await saveEdit();
  r=await page.evaluate(()=>{ const p=state.storePurchases[0]; return { total:p.total, stock:storeProd('p1').stock, mv:state.storeCash.find(m=>m.ref==='pu1').amount, sup:p.supplier, supRec:!!state.suppliers.find(s=>s.name==='مورّد جديد') }; });
  log('purchase edited: 880, stock 23−2=21, cash out 880, supplier renamed and created: '+(r.total===880 && r.stock===21 && r.mv===880 && r.sup==='مورّد جديد' && r.supRec)+' (expect true)');

  // ===== دين يدوي على محمد 5,000 عبر الصندوق → 4,000 ووصف جديد
  await page.evaluate(()=>{ const d=iso(new Date()); state.storeDebts.push({id:'md1',customerId:'cu1',dir:'on',amount:5000,paidAmount:0,paid:false,note:'سلفة',cash:true,payMethod:'cash',date:d,by:'مالك',editedAt:d}); addCashMove('out',5000,'سلفة','cu1','md1','cash'); state.storeSub='debts'; state.debtView='debt'; render(); });
  log('manual debt item has an edit button in the debts list: '+(await page.isVisible('[data-rec-edit="sdebt:md1"]'))+' (expect true)');
  await open('[data-rec-edit="sdebt:md1"]'); await page.fill('#re_amount','4000'); await page.fill('#re_note','سلفة معدّلة'); await saveEdit();
  r=await page.evaluate(()=>({ a:state.storeDebts[0].amount, n:state.storeDebts[0].note, mv:state.storeCash.find(m=>m.ref==='md1').amount, bal:custBalance('cu1') }));
  log('manual debt edited: 4,000, note, cash move 4,000, balance follows: '+(r.a===4000 && r.n==='سلفة معدّلة' && r.mv===4000 && r.bal===4000)+' (expect true)');

  // ===== حركة صندوق يدوية 700 → 900
  await page.evaluate(()=>{ addCashMove('in',700,'إيداع',null,null,'cash'); state.storeSub='cashbox'; render(); });
  const cmid=await page.evaluate(()=>state.storeCash[state.storeCash.length-1].id);
  log('linked cash moves have no edit button, manual ones do: '+((await page.isVisible(`[data-rec-edit="scash:${cmid}"]`)) && (await page.evaluate(()=>document.querySelectorAll('[data-rec-edit^="scash:"]').length===1)))+' (expect true)');
  await open(`[data-rec-edit="scash:${cmid}"]`); await page.fill('#re_amount','900'); await page.fill('#re_reason','إيداع معدّل'); await saveEdit();
  log('manual cash move edited: '+(await page.evaluate(id=>{ const m=state.storeCash.find(x=>x.id===id); return m.amount===900 && m.reason==='إيداع معدّل'; },cmid))+' (expect true)');

  // ===== مصروف مغسلة 1,500 → 1,200 وتاريخ أمس
  await page.evaluate(()=>{ const d=iso(new Date()); state.expenses.push({id:'ex1',category:'عامة',reason:'ماء',amount:1500,payMethod:'cash',date:d,by:'مالك',editedAt:d}); state.tab='expenses'; state.expSub='general'; render(); });
  await open('[data-rec-edit="exp:ex1"]');
  const yday=await page.evaluate(()=>{ const t=new Date(Date.now()-864e5); return ymd(t); });
  await page.fill('#re_amount','1200'); await page.fill('#re_date',yday); await saveEdit(); await page.waitForTimeout(400);
  r=await page.evaluate(()=>({ a:state.expenses[0].amount, d:ymd(state.expenses[0].date) }));
  log('expense edited (amount and date moved to yesterday): '+(r.a===1200 && r.d===yday)+' (expect true)');

  // ===== دبو: شراء 10 خنشات × 3,600 مدفوع، خلطة 300 طوبة بأجرة مدفوعة، بيع نقدي 100 × 120، قيد مال عبر الصندوق، مصروف
  await page.evaluate(()=>{ const d=iso(new Date());
    state.brickPurchases.push({id:'bp1',no:'BP1',material:'cement',name:'إسمنت',unit:'خنشة',qty:10,unitCost:3600,total:36000,paid:true,paidAmount:36000,payMethod:'cash',date:d,editedAt:d}); addBrickCash('out',36000,'شراء','bp1','cash'); state.brickPurchases.push({id:'bp2',no:'BP2',material:'sand',name:'تراب',unit:'فياج',qty:5,unitCost:15000,total:75000,paid:true,paidAmount:75000,opening:true,date:d,editedAt:d});
    state.brickBatches.push({id:'bb1',no:'K1',btype:'t15',cementBags:5,sandLoads:2,bricks:300,workerPay:6500,workerPaidAmt:6500,workerPaid:true,date:d,editedAt:d}); addBrickCash('out',6500,'أجرة','bb1','cash');
    state.brickSales.push({id:'bs1',no:'BS1',btype:'t15',partyType:null,partyId:null,customerName:'زبون نقدي',qty:100,unitPrice:120,total:12000,paidAmount:12000,paid:true,payMethod:'cash',date:d,editedAt:d}); addBrickCash('in',12000,'بيع','bs1','cash');
    state.brickLedger.push({id:'bl1',partyType:'cust',partyId:'cu1',dir:'for',kind:'cash',amount:2000,qty:0,note:'دفعة',cash:true,payMethod:'cash',date:d,editedAt:d}); addBrickCash('in',2000,'دفعة','bl1','cash');
    state.brickExpenses.push({id:'be1',category:'water',amount:1500,note:'ماء',payMethod:'cash',date:d,editedAt:d}); addBrickCash('out',1500,'ماء','be1','cash');
    state.tab='brick'; state.brickSub='sales'; state.dateFrom=state.dateTo=ymd(new Date()); render(); });
  const box0=await page.evaluate(()=>brickCashBalance());
  await open('[data-rec-edit="bsale:bs1"]'); await page.fill('#re_qty','400'); await saveEdit();
  log('brick sale above stock is refused: '+(await page.evaluate(()=>state.brickSales[0].qty===100 && /لا يكفي/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.fill('#re_qty','150'); await page.fill('#re_price','110'); await page.selectOption('#re_party','c:cu1'); await saveEdit();
  r=await page.evaluate(()=>{ const s=state.brickSales[0]; return { total:s.total, party:s.customerName, stock:brickStock('t15'), box:brickCashBalance() }; });
  log('brick cash sale edited 150×110=16,500, party محمد, stock 150, box +4,500: '+(r.total===16500 && r.party==='محمد' && r.stock===150 && r.box===box0+4500)+' (expect true)');
  await page.click('[data-bksub="batches"]'); await page.waitForTimeout(250);
  await open('[data-rec-edit="bbatch:bb1"]'); await page.fill('#re_bricks','100'); await saveEdit();
  log('batch cannot drop below what was sold: '+(await page.evaluate(()=>state.brickBatches[0].bricks===300 && /بِيع/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.fill('#re_bricks','320'); await page.fill('#re_wage','7800'); await page.fill('#re_bags','6'); await saveEdit();
  r=await page.evaluate(()=>{ const b=state.brickBatches[0]; return { br:b.bricks, w:b.workerPay, paid:b.workerPaidAmt, mv:state.brickCash.find(m=>m.ref==='bb1').amount, cem:brickMatStock('cement'), stock:brickStock('t15') }; });
  log('batch edited: 320 bricks, wage 7,800 still paid (cash move 7,800), cement 4, stock 170: '+(r.br===320 && r.w===7800 && r.paid===7800 && r.mv===7800 && r.cem===4 && r.stock===170)+' (expect true)');
  await page.click('[data-bksub="purchases"]'); await page.waitForTimeout(250);
  await open('[data-rec-edit="bpur:bp1"]'); await page.fill('#re_qty','12'); await page.fill('#re_cost','3500'); await saveEdit();
  log('material purchase edited 12×3,500=42,000 paid, cash out follows, cement 6: '+(await page.evaluate(()=>{ const p=state.brickPurchases[0]; return p.total===42000 && p.paidAmount===42000 && state.brickCash.find(m=>m.ref==='bp1').amount===42000 && brickMatStock('cement')===6; }))+' (expect true)');
  await page.click('[data-bksub="expenses"]'); await page.waitForTimeout(250);
  await open('[data-rec-edit="bexp:be1"]'); await page.selectOption('#re_cat','power'); await page.fill('#re_amount','2500'); await saveEdit();
  log('brick expense edited: power 2,500 and its cash move: '+(await page.evaluate(()=>{ const e=state.brickExpenses[0]; return e.category==='power' && e.amount===2500 && state.brickCash.find(m=>m.ref==='be1').amount===2500; }))+' (expect true)');
  await page.click('[data-bksub="debts"]'); await page.waitForTimeout(250);
  await open('[data-rec-edit="bledger:bl1"]'); await page.fill('#re_amount','3000'); await page.fill('#re_note','دفعة معدّلة'); await saveEdit();
  r=await page.evaluate(()=>({ a:state.brickLedger[0].amount, mv:state.brickCash.find(m=>m.ref==='bl1').amount, bal:brickParties().find(x=>x.key==='c:cu1').balance }));
  log('brick ledger entry edited: 3,000 and its cash move; cash sale owes nothing so محمد is owed 3,000: '+(r.a===3000 && r.mv===3000 && r.bal===-3000)+' (expect true)');

  // ===== المغسلة: الهاتف وطريقة الدفع في تعديل السجاد
  await page.evaluate(()=>{ const d=iso(new Date()); state.carpetOrders=[{id:'r1',no:'R1',customer:'أحمد',phone:'',type:'سجادة',count:1,unit:2000,price:2000,status:'done',paid:true,paidDate:d,payMethod:'cash',date:d,editedAt:d}]; state.tab='carpets'; render(); });
  await page.click('[data-edit-order="r1"]'); await page.waitForTimeout(250);
  await page.fill('#edPhone','22112211'); await page.click('#re_pm [data-pm="sedad"]'); await saveEdit();
  log('carpet order edit now sets phone and payment method: '+(await page.evaluate(()=>state.carpetOrders[0].phone==='22112211' && state.carpetOrders[0].payMethod==='sedad'))+' (expect true)');

  // العامل لا يرى أزرار تعديل المال
  await page.evaluate(()=>{ state.users=[{id:'w1',name:'عامل',pin:'1111'}]; lockNow(); }); await page.waitForTimeout(300);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch'); await page.fill('#lockName','عامل'); await page.fill('#lockInput','1111'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ state.tab='store'; state.storeSub='sales'; render(); }); await page.waitForTimeout(250);
  log('worker sees no money edit buttons: '+(await page.evaluate(()=>document.querySelectorAll('[data-rec-edit]').length===0))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
