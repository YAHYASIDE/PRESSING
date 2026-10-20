// 2.62.0 — كل حركة صندوق (دبو/المتجر) فيها ✏️ و🗑️: المرتبطة بعملية تُحدِّث المدفوع على العملية نفسها؛ عمليات العامل (له/عليه)
// تُعدَّل وتُحذف حذفًا ناعمًا وتُستعاد؛ دفعات المصاريف باليومية؛ كشف الصندوق.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:860} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const code=async()=>{ await page.waitForSelector('#codeInput',{state:'visible'}); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(250); };
  const editSave=async()=>{ await page.click('#editSave'); await page.waitForTimeout(250); };
  const modalOpen=id=>page.evaluate(id=>getComputedStyle(document.getElementById(id)).display!=='none',id);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date()), mv=(id,type,amount,reason,ref,pm)=>({id,type,amount,reason,ref,payMethod:pm||'cash',date:d,by:'مالك',editedAt:d});
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickLoads','brickOrders','brickWaste','storeSales','storeDebts','storePurchases','storeCash','dailyCosts','dailyCostPays','unitXfers'].forEach(k=>state[k]=[]);
    state.storeCustomers=[{id:'cu1',name:'يحي سيدا',phone:'22334455',country:'222',editedAt:d},{id:'cu2',name:'بقالة صداقة',phone:'22998877',country:'222',editedAt:d}];
    state.suppliers=[{id:'su1',name:'حمد و باي',phone:'44556677',editedAt:d}];
    state.brickPorters=[{id:'po1',name:'دبيته',phone:'33445566',role:'porter',editedAt:d}];
    state.brickBatches=[{id:'b0',no:'K0',btype:'t15',opening:true,cementBags:0,sandLoads:0,bricks:5000,workerPay:0,workerPaidAmt:0,workerPaid:true,ready:true,date:d,editedAt:d}];
    state.brickSales=[{id:'s1',no:'BS1',btype:'t15',qty:50,unitPrice:200,total:10000,paidAmount:7000,paid:false,partyType:'cust',partyId:'cu1',customerId:'cu1',customerName:'يحي سيدا',phone:'22334455',date:d,editedAt:d},
                      {id:'s2',no:'BS2',btype:'t15',qty:10,unitPrice:200,total:2000,paidAmount:2000,paid:true,partyType:null,partyId:null,customerId:null,customerName:'زبون نقدي',date:d,editedAt:d}];
    state.brickLoads=[{id:'l1',no:'H1',porterId:'po1',kind:'bricks',qty:1800,rate:10,amount:18000,paidAmount:18000,paid:true,date:d,editedAt:d}];
    state.brickLedger=[{id:'x1',partyType:'cust',partyId:'cu2',dir:'on',kind:'cash',amount:5000,qty:0,note:'دفعنا له على الحساب',cash:true,payMethod:'cash',date:d,by:'مالك',editedAt:d}];
    state.brickExpenses=[{id:'e1',category:'water',amount:700,note:'ماء',payMethod:'cash',date:d,by:'مالك',editedAt:d}];
    state.brickCash=[mv('m1','in',4000,'بيع طوب BS1','s1'),mv('m2','in',3000,'تحصيل طوب BS1 — يحي سيدا','s1','bankily'),mv('m3','in',2000,'بيع طوب BS2','s2'),
      mv('m4','out',18000,'حمل حمل طوب — دبيته','l1','bankily'),mv('m5','out',5000,'دفعة لـ بقالة صداقة','x1'),mv('m6','out',700,'مصروف دبو: ماء','e1'),mv('m7','in',10000,'إيداع',null)];
    state.storeSales=[{id:'ss1',no:'F1',customerId:'cu1',customerName:'يحي سيدا',items:[{name:'صابون',qty:1,price:5000}],total:5000,paidAmount:3000,paid:false,date:d,editedAt:d}];
    state.storePurchases=[{id:'sp1',no:'P1',supplier:'حمد و باي',supplierId:'su1',items:[{name:'صابون',qty:1,cost:3000}],total:3000,paid:false,paidAmount:2000,date:d,editedAt:d}];
    state.storeCash=[{id:'c1',type:'in',amount:3000,reason:'تحصيل من يحي سيدا',customerId:'cu1',ref:null,payMethod:'cash',date:d,by:'مالك',editedAt:d},
                     {id:'c2',type:'out',amount:2000,reason:'تسديد للمورّد حمد و باي',customerId:null,ref:'su1',payMethod:'cash',date:d,by:'مالك',editedAt:d}];
    state.workers=[{id:'w1',name:'حمد',role:'كوّاء',phone:'',start:d,monthly:30000,absent:[],payments:[{id:'p1',amount:1000,note:'سلفة',date:d}],credits:[{id:'k1',amount:500,note:'مكافأة',date:d}],editedAt:d}];
    state.dailyCosts=[{id:'dc1',name:'الإيجار',monthly:30000,start:ymd(new Date()),category:'أخرى',active:true,salaryHist:[],date:d,editedAt:d}];
    state.dailyCostPays=[{id:'dp1',costId:'dc1',amount:1000,payMethod:'cash',note:'دفعة',date:d,by:'مالك',editedAt:d}];
    state.tab='brick'; state.brickSub='cash'; state.dateFrom='1970-01-01'; state.dateTo='2999-12-31'; save(); render(); });
  await page.waitForTimeout(300);
  // (1) كل صفوف صندوق دبو فيها تعديل وحذف
  let r=await page.evaluate(()=>{ const rows=[...document.querySelectorAll('main .cash-row')]; return { n:rows.length, all:rows.every(tr=>tr.querySelector('[data-cm-edit],[data-rec-edit]')&&tr.querySelector('[data-cm-del],[data-ux-del]')),
    led:!!document.querySelector('[data-rec-edit="bledger:x1"]'), exp:!!document.querySelector('[data-rec-edit="bexp:e1"]'), pay:!!document.querySelector('[data-cm-edit="brickCash|m2"]'), stmt:!!document.querySelector('[data-cash-stmt="brick"]') }; });
  log('brick cash: every move row has ✏️ + 🗑️ (linked ones too) + 📄 statement: '+(r.n===7&&r.all&&r.led&&r.exp&&r.pay&&r.stmt)+' (expect true) '+JSON.stringify(r));
  // (2) تعديل دفعة على بيع: 3000 → 5000 = المدفوع 9000
  await page.click('[data-cm-edit="brickCash|m2"]'); await page.waitForTimeout(200);
  log('payment editor opens with amount: '+(await page.evaluate(()=>document.getElementById('re_amount').value==='3000'))+' (expect true)');
  await page.fill('#re_amount','5000'); await editSave();
  r=await page.evaluate(()=>({ paid:state.brickSales[0].paidAmount, mv:state.brickCash.find(m=>m.id==='m2').amount, pm:state.brickCash.find(m=>m.id==='m2').payMethod }));
  log('payment 3000→5000 raises the sale paid to 9000 (method kept): '+(r.paid===9000&&r.mv===5000&&r.pm==='bankily')+' (expect true) '+JSON.stringify(r));
  await page.click('[data-cm-edit="brickCash|m2"]'); await page.waitForTimeout(200); await page.fill('#re_amount','8000'); await editSave();
  r=await page.evaluate(()=>({ paid:state.brickSales[0].paidAmount, open:getComputedStyle(document.getElementById('editModal')).display!=='none' }));
  log('paying more than the sale is refused (window stays): '+(r.paid===9000&&r.open)+' (expect true) '+JSON.stringify(r));
  await page.fill('#re_amount','6000'); await editSave();
  log('payment 6000 makes the sale fully paid: '+(await page.evaluate(()=>state.brickSales[0].paidAmount===10000&&state.brickSales[0].paid===true))+' (expect true)');
  // (3) حذف دفعة: يُرجَع المدفوع
  await page.click('[data-cm-del="brickCash|m1"]'); await code();
  r=await page.evaluate(()=>({ paid:state.brickSales[0].paidAmount, flag:state.brickSales[0].paid, gone:!state.brickCash.some(m=>m.id==='m1'), tomb:!!(state.deleted&&state.deleted['rec:m1']) }));
  log('deleting a payment (code) removes it and the sale owes it again: '+(r.paid===6000&&r.flag===false&&r.gone&&r.tomb)+' (expect true) '+JSON.stringify(r));
  log('the party balance follows (owes 4000): '+(await page.evaluate(()=>(brickParties().find(p=>p.key==='c:cu1')||{}).balance===4000))+' (expect true)');
  // (4) بيع نقدي بلا زبون: حذف دفعته ممنوع (احذف الفاتورة نفسها)
  await page.click('[data-cm-del="brickCash|m3"]'); await page.waitForTimeout(250);
  log('cash sale without customer: deleting its payment is refused, no code asked: '+(await page.evaluate(()=>state.brickCash.some(m=>m.id==='m3')&&getComputedStyle(document.getElementById('codeModal')).display==='none'))+' (expect true)');
  // (5) حمل: 18000 → 10000 = المدفوع 10000 ويبقى له 8000
  await page.click('[data-cm-edit="brickCash|m4"]'); await page.waitForTimeout(200); await page.fill('#re_amount','10000'); await editSave();
  r=await page.evaluate(()=>({ l:state.brickLoads[0], bal:brickPersonBalance('po1') }));
  log('porter payment 18000→10000: job paid 10000 and he is owed 8000: '+(r.l.paidAmount===10000&&r.l.paid===false&&r.bal===8000)+' (expect true) '+JSON.stringify({p:r.l.paidAmount,b:r.bal}));
  // (6) «دفعة لـ بقالة صداقة» = قيد → ✏️ يفتح محرّر القيد، 🗑️ حذف ناعم
  await page.click('[data-rec-edit="bledger:x1"]'); await page.waitForTimeout(200);
  log('ledger cash move opens the ledger editor: '+(await page.evaluate(()=>_editCtx&&_editCtx.kind==='bledger'&&document.getElementById('re_amount').value==='5000'))+' (expect true)');
  await page.fill('#re_amount','4500'); await editSave();
  log('editing the ledger updates its cash move: '+(await page.evaluate(()=>state.brickCash.find(m=>m.ref==='x1').amount===4500))+' (expect true)');
  await page.click('[data-cm-del="brickCash|m5"]'); await code(); await page.waitForTimeout(200);
  r=await page.evaluate(()=>({ x:state.brickLedger[0].cancelled, mv:state.brickCash.some(m=>m.ref==='x1') }));
  log('deleting it cancels the ledger entry (kept, restorable) and removes the cash: '+(r.x===true&&!r.mv)+' (expect true) '+JSON.stringify(r));
  // (7) مصروف: ✏️ = محرّر المصروف
  await page.click('[data-rec-edit="bexp:e1"]'); await page.waitForTimeout(200); await page.fill('#re_amount','900'); await editSave();
  log('expense move edits the expense and its cash: '+(await page.evaluate(()=>state.brickExpenses[0].amount===900&&state.brickCash.find(m=>m.ref==='e1').amount===900))+' (expect true)');
  // (8) حركة يدوية
  await page.click('[data-cm-edit="brickCash|m7"]'); await page.waitForTimeout(200); await page.fill('#re_amount','12000'); await page.fill('#re_reason','إيداع المالك'); await editSave();
  log('manual move edited: '+(await page.evaluate(()=>{ const m=state.brickCash.find(x=>x.id==='m7'); return m.amount===12000&&m.reason==='إيداع المالك'; }))+' (expect true)');
  // (9) كشف الصندوق
  await page.click('[data-cash-stmt="brick"]'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const t=document.getElementById('receiptContent').innerText; return { open:getComputedStyle(document.getElementById('receiptModal')).display!=='none', rows:document.querySelectorAll('#receiptContent .lg-row').length, bal:t.includes(money(brickCashBalance())), noOwe:!t.includes('عليه لنا') }; });
  log('📄 box statement lists every move with the balance: '+(r.open&&r.rows>=5&&r.bal&&r.noOwe)+' (expect true) '+JSON.stringify(r));
  await page.click('#receiptClose'); await page.waitForTimeout(150);
  // (10) صندوق المتجر: تحصيل من زبون وتسديد مورّد
  await page.evaluate(()=>{ state.tab='store'; state.storeSub='cashbox'; render(); }); await page.waitForTimeout(250);
  r=await page.evaluate(()=>({ c1:!!document.querySelector('[data-cm-edit="storeCash|c1"]'), c2:!!document.querySelector('[data-cm-del="storeCash|c2"]'), st:!!document.querySelector('[data-cash-stmt="store"]') }));
  log('store cash rows: collection and supplier payment have ✏️/🗑️ + statement: '+(r.c1&&r.c2&&r.st)+' (expect true) '+JSON.stringify(r));
  await page.click('[data-cm-edit="storeCash|c1"]'); await page.waitForTimeout(200); await page.fill('#re_amount','1000'); await editSave();
  log('collection 3000→1000 gives back 2000 of the invoice: '+(await page.evaluate(()=>state.storeSales[0].paidAmount===1000&&custBalance('cu1')===4000))+' (expect true)');
  await page.click('[data-cm-edit="storeCash|c1"]'); await page.waitForTimeout(200); await page.fill('#re_amount','9000'); await editSave();
  log('collection above the debt is refused: '+(await page.evaluate(()=>state.storeSales[0].paidAmount===1000&&getComputedStyle(document.getElementById('editModal')).display!=='none'))+' (expect true)');
  await page.click('#editCancel').catch(()=>{}); await page.evaluate(()=>{ document.getElementById('editModal').style.display='none'; });
  await page.click('[data-cm-del="storeCash|c2"]'); await code();
  log('deleting the supplier payment makes his purchase unpaid again: '+(await page.evaluate(()=>state.storePurchases[0].paidAmount===0&&!state.storeCash.some(m=>m.id==='c2')&&supplierBalance(supplierById('su1'))===3000))+' (expect true)');
  // (11) العامل: تفاصيل العمليات + تعديل + حذف ناعم + استعادة
  await page.evaluate(()=>{ state.tab='expenses'; state.expSub='workers'; render(); }); await page.waitForTimeout(250);
  await page.click('.wcard [data-debt-toggle="wk:w1"]'); await page.waitForTimeout(150);
  r=await page.evaluate(()=>({ vis:getComputedStyle(document.querySelector('[data-debt-det="wk:w1"]')).display!=='none', ed:!!document.querySelector('[data-wtx-edit="w1|p1"]'), del:!!document.querySelector('[data-wtx-del="w1|k1"]'), stmt:!!document.querySelector('[data-wstate="w1"]') }));
  log('worker card: details list each له/عليه with ✏️ and 🗑️ (+ كشف): '+(r.vis&&r.ed&&r.del&&r.stmt)+' (expect true) '+JSON.stringify(r));
  const bal0=await page.evaluate(()=>wBalance(state.workers[0]));
  await page.click('[data-wtx-edit="w1|p1"]'); await page.waitForTimeout(200); await page.fill('#re_amount','1500'); await editSave();
  r=await page.evaluate(()=>({ paid:wPaid(state.workers[0]), bal:wBalance(state.workers[0]), ed:!!state.workers[0].payments[0].editedAt }));
  log('editing «عليه» 1000→1500 changes his balance by 500: '+(r.paid===1500&&Math.round(bal0-r.bal)===500&&r.ed)+' (expect true) '+JSON.stringify(r));
  await page.click('[data-wtx-del="w1|k1"]'); await code();
  r=await page.evaluate(()=>({ cr:wCredit(state.workers[0]), kept:state.workers[0].credits.length===1&&state.workers[0].credits[0].cancelled, restore:!!document.querySelector('[data-wtx-restore="w1|k1"]') }));
  log('deleting «له» is soft: not counted, kept with ↩️ restore: '+(r.cr===0&&r.kept&&r.restore)+' (expect true) '+JSON.stringify(r));
  await page.click('[data-wtx-restore="w1|k1"]'); await code();
  log('restore brings it back: '+(await page.evaluate(()=>wCredit(state.workers[0])===500))+' (expect true)');
  r=await page.evaluate(()=>{ const loc=JSON.parse(JSON.stringify(state.workers[0])), old=JSON.parse(JSON.stringify(loc)); old.payments[0].amount=1000; delete old.payments[0].editedAt; old.editedAt='2000-01-01T00:00:00.000Z';
    const a=mergeWorker(loc,old), b=mergeWorker(old,loc); return { a:a.payments[0].amount, b:b.payments[0].amount, n:b.payments.length }; });
  log('sync merge keeps the edited payment from either side: '+(r.a===1500&&r.b===1500&&r.n===1)+' (expect true) '+JSON.stringify(r));
  // (12) المصاريف باليومية: دفعة تُعدَّل وتُحذف
  await page.evaluate(()=>{ state.expSub='daily'; render(); }); await page.waitForTimeout(250);
  await page.click('[data-debt-toggle="dcp:dc1"]'); await page.waitForTimeout(150);
  await page.click('[data-cm-edit="dailyCostPays|dp1"]'); await page.waitForTimeout(200); await page.fill('#re_amount','1200'); await editSave();
  log('daily-cost payment edited: '+(await page.evaluate(()=>state.dailyCostPays[0].amount===1200))+' (expect true)');
  await page.click('[data-debt-toggle="dcp:dc1"]').catch(()=>{}); await page.waitForTimeout(100);
  if(!(await page.isVisible('[data-cm-del="dailyCostPays|dp1"]'))) await page.click('[data-debt-toggle="dcp:dc1"]');
  await page.click('[data-cm-del="dailyCostPays|dp1"]'); await code();
  log('daily-cost payment deleted: '+(await page.evaluate(()=>state.dailyCostPays.length===0))+' (expect true)');
  // (13) العامل (role worker) لا يرى أزرار التعديل في الصندوق
  await page.evaluate(()=>{ currentRole='worker'; state.tab='brick'; state.brickSub='cash'; render(); }); await page.waitForTimeout(200);
  log('worker role sees no edit/delete on cash rows: '+(await page.evaluate(()=>!document.querySelector('main [data-cm-edit],main [data-cm-del]')))+' (expect true)');
  await page.evaluate(()=>{ currentRole='owner'; render(); });
  log('audit has no errors after all edits: '+(await page.evaluate(()=>!auditChecks().issues.some(i=>i.lvl==='err'&&/دبو|المتجر|الصندوق/.test(i.area+i.t)))) +' (expect true)');
  log(errors.length?'ERRORS: '+errors.join(' | '):'ERRORS: NONE ✅');
  await browser.close();
})();
