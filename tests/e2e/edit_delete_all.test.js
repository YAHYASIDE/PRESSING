// 2.56.0 — زرّا ✏️ تعديل و🗑️ حذف في كل بطاقة زبون/مورّد/عامل وكل عملية (المتجر ▸ الزبائن والديون، أطراف دبو، العمّال والحمّالون، الطلبيات، المكسور، زبائن السيارات).
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
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date());
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickLoads','brickOrders','brickWaste','storeSales','storeDebts','storePurchases'].forEach(k=>state[k]=[]);
    state.storeCustomers=[{id:'cu1',name:'محمد',phone:'22334455',country:'222',editedAt:d},{id:'cu2',name:'سالم',phone:'22998877',country:'222',editedAt:d},{id:'cu3',name:'تاجر',phone:'',country:'222',editedAt:d}];
    state.suppliers=[{id:'su1',name:'حمد و باي',phone:'44556677',editedAt:d},{id:'su2',name:'مورّد قديم',phone:'',editedAt:d}];
    state.storeDebts=[{id:'md1',customerId:'cu1',dir:'on',amount:5000,paidAmount:0,paid:false,note:'سلفة',date:d,by:'مالك',editedAt:d},{id:'md2',customerId:'cu2',dir:'on',amount:1000,paidAmount:1000,paid:true,note:'قديم',date:d,by:'مالك',editedAt:d}];
    state.storePurchases=[{id:'sp1',no:'P1',supplier:'حمد و باي',supplierId:'su1',items:[{name:'صابون',qty:1,cost:3000}],total:3000,paid:false,paidAmount:0,date:d,editedAt:d}];
    state.brickPorters=[{id:'po1',name:'دبيته',phone:'33445566',role:'porter',editedAt:d},{id:'po2',name:'حمّال قديم',phone:'',role:'porter',editedAt:d},{id:'po3',name:'بلا أعمال',phone:'',role:'porter',editedAt:d}];
    state.brickBatches=[{id:'b1',no:'B1',btype:'t15',cementBags:0,sandLoads:0,bricks:1000,workerPay:0,workerPaidAmt:0,workerPaid:true,opening:true,ready:true,date:d,editedAt:d}];
    state.brickLoads=[{id:'l1',porterId:'po1',kind:'bricks',qty:1000,rate:10,amount:10000,paidAmount:0,paid:false,date:d,editedAt:d},{id:'l2',porterId:'po2',kind:'bricks',qty:100,rate:10,amount:1000,paidAmount:1000,paid:true,date:d,editedAt:d}];
    state.brickSales=[{id:'s2',no:'BS2',btype:'t15',qty:100,unitPrice:180,total:18000,paidAmount:0,paid:false,partyType:'cust',partyId:'cu1',customerId:'cu1',customerName:'محمد',phone:'22334455',date:d,editedAt:d},{id:'s3',no:'BS3',btype:'t15',qty:10,unitPrice:180,total:1800,paidAmount:1800,paid:true,partyType:'cust',partyId:'cu3',customerId:'cu3',customerName:'تاجر',date:d,editedAt:d}];
    state.brickOrders=[{id:'o1',no:'BO1',partyType:'cust',partyId:'cu2',customerName:'سالم',phone:'22998877',btype:'t15',qty:500,unitPrice:200,total:100000,address:'تفرغ زينة',note:'',status:'open',date:d,by:'مالك',editedAt:d}];
    state.brickWaste=[{id:'w1',no:'W1',btype:'t15',qty:20,unitCost:0,note:'انكسر',date:d,by:'مالك',editedAt:d}];
    state.customers={'AB 123':{plate:'AB 123',name:'أحمد',phone:'22110000',stamps:2,lastVisit:d}};
    state.tab='store'; state.storeSub='debts'; state.debtView='all'; save(); render(); });
  await page.waitForTimeout(300);
  // (1) المتجر ▸ الزبائن والديون
  let r=await page.evaluate(()=>{ const cs=[...document.querySelectorAll('main .party-card')]; const f=t=>cs.find(c=>c.textContent.includes(t));
    const m=f('محمد'), s=f('حمد و باي'); return { n:cs.length, mEd:!!(m&&m.querySelector('[data-pe="cust:cu1"]')), mDel:!!(m&&m.querySelector('[data-pdel="cust:cu1"]')), sEd:!!(s&&s.querySelector('[data-pe="sup:su1"]')), sDel:!!(s&&s.querySelector('[data-pdel="sup:su1"]')), saEd:true }; });
  log('store debts: every card has ✏️ تعديل + 🗑️ حذف (customer and supplier): '+(r.mEd&&r.mDel&&r.sEd&&r.sDel&&r.saEd)+' (expect true) '+JSON.stringify(r));
  await page.click('main .party-card [data-pe="cust:cu1"]'); await page.waitForTimeout(250);
  log('✏️ opens the edit window with name and phone: '+(await page.evaluate(()=>getComputedStyle(document.getElementById('editModal')).display!=='none' && document.getElementById('re_name').value==='محمد' && document.getElementById('re_phone').value==='22334455'))+' (expect true)');
  await page.fill('#re_name','محمد الأمين'); await page.fill('#re_phone','22998877'); await editSave();
  log('duplicate phone is refused (keeps window open): '+(await page.evaluate(()=>storeCust('cu1').name==='محمد' && getComputedStyle(document.getElementById('editModal')).display!=='none'))+' (expect true)');
  await page.fill('#re_phone','22334466'); await editSave();
  r=await page.evaluate(()=>({ c:storeCust('cu1'), sale:state.brickSales[0].customerName, card:[...document.querySelectorAll('main .party-card')].some(c=>c.textContent.includes('محمد الأمين')) }));
  log('customer renamed + new phone saved, the old sale name follows: '+(r.c.name==='محمد الأمين' && r.c.phone==='22334466' && r.sale==='محمد الأمين' && r.card)+' (expect true) '+JSON.stringify(r.sale));
  await page.click('main .party-card [data-pdel="cust:cu1"]'); await page.waitForTimeout(250);
  log('delete is blocked while he owes money (no code asked): '+(await page.evaluate(()=>!!storeCust('cu1') && getComputedStyle(document.getElementById('codeModal')).display==='none'))+' (expect true)');
  // سالم: لا دين في المتجر لكن له طلبية مفتوحة في دبو؟ (الطلبية بلا عربون = لا رصيد) → يُحذف بالكود
  await page.click('main .party-card [data-pe="sup:su1"]'); await page.waitForTimeout(250);
  await page.fill('#re_name','حمد باي'); await editSave();
  log('supplier renamed and his purchase follows: '+(await page.evaluate(()=>supplierById('su1').name==='حمد باي' && state.storePurchases[0].supplier==='حمد باي'))+' (expect true)');
  await page.click('main .party-card [data-pdel="sup:su1"]'); await page.waitForTimeout(250);
  log('supplier with unpaid purchase cannot be deleted: '+(await page.evaluate(()=>!!supplierById('su1')))+' (expect true)');
  // (2) دبو ▸ الديون والحسابات
  await page.evaluate(()=>{ state.tab='brick'; state.brickSub='debts'; render(); }); await page.waitForTimeout(250);
  await page.click('main [data-pdel="cust:cu2"]'); await page.waitForTimeout(200);
  log('customer with an open brick order cannot be deleted: '+(await page.evaluate(()=>!!storeCust('cu2')))+' (expect true)');
  await page.click('main [data-pdel="cust:cu3"]'); await code();
  log('settled customer (paid sale only) is deleted with the code, his sale keeps the name: '+(await page.evaluate(()=>!storeCust('cu3') && state.brickSales.find(x=>x.id==='s3').customerName==='تاجر'))+' (expect true)');
  r=await page.evaluate(()=>{ const c=[...document.querySelectorAll('main .person-card')].find(x=>x.textContent.includes('محمد الأمين')); return { ed:!!(c&&c.querySelector('[data-pe="cust:cu1"]')), del:!!(c&&c.querySelector('[data-pdel="cust:cu1"]')), ladd:!!(c&&c.querySelector('[data-bk-ladd]')) }; });
  log('brick party cards: ➕ قيد + ✏️ تعديل + 🗑️ حذف: '+(r.ed&&r.del&&r.ladd)+' (expect true) '+JSON.stringify(r));
  // (3) العمّال والحمّالون
  await page.evaluate(()=>{ state.brickSub='porters'; render(); }); await page.waitForTimeout(250);
  r=await page.evaluate(()=>['po1','po2','po3'].map(id=>!!document.querySelector(`main .person-card [data-pe="porter:${id}"]`)&&!!document.querySelector(`main .person-card [data-pdel="porter:${id}"]`)));
  log('porter cards all have ✏️ + 🗑️: '+r.every(Boolean)+' (expect true) '+r);
  await page.click('main [data-pe="porter:po1"]'); await page.waitForTimeout(250);
  await page.selectOption('#re_role','worker'); await page.fill('#re_name','دبيته الكبير'); await editSave();
  log('porter edited (name + role → رئيس العمّال): '+(await page.evaluate(()=>brickPorter('po1').name==='دبيته الكبير' && brickPorter('po1').role==='worker'))+' (expect true)');
  await page.click('main [data-pdel="porter:po1"]'); await page.waitForTimeout(200);
  log('porter with money due cannot be deleted: '+(await page.evaluate(()=>!!brickPorter('po1') && !brickPorter('po1').deleted))+' (expect true)');
  await page.click('main [data-pdel="porter:po2"]'); await code();
  r=await page.evaluate(()=>({ kept:!!brickPorter('po2'), del:brickPorter('po2')&&brickPorter('po2').deleted, card:!!document.querySelector('main [data-pe="porter:po2"]'), opt:!![...document.querySelectorAll('#bkPorter option')].find(o=>o.value==='po2') }));
  log('porter with past work: hidden from lists but kept for his old statements: '+(r.kept && r.del && !r.card && !r.opt)+' (expect true) '+JSON.stringify(r));
  await page.click('main [data-pdel="porter:po3"]'); await code();
  log('porter without any work is removed completely: '+(await page.evaluate(()=>!brickPorter('po3')))+' (expect true)');
  // (4) الطلبيات
  await page.evaluate(()=>{ state.brickSub='orders'; render(); }); await page.waitForTimeout(250);
  log('order card has ✏️ تعديل: '+(await page.isVisible('main [data-rec-edit="bord:o1"]'))+' (expect true)');
  await page.click('main [data-rec-edit="bord:o1"]'); await page.waitForTimeout(250);
  await page.fill('#re_qty','400'); await page.fill('#re_price','210'); await page.fill('#re_addr','عرفات'); await editSave();
  log('order edited: 400 × 210 = 84,000 and new address: '+(await page.evaluate(()=>{ const o=brickOrder('o1'); return o.qty===400&&o.unitPrice===210&&o.total===84000&&o.address==='عرفات'; }))+' (expect true)');
  // (5) المكسور
  await page.evaluate(()=>{ state.brickSub='batches'; _bkDraft.wasteOpen=true; render(); }); await page.waitForTimeout(250);
  log('waste row has ✏️ + 🗑️: '+(await page.evaluate(()=>!!document.querySelector('main [data-rec-edit="bwaste:w1"]') && !!document.querySelector('main [data-bk-wdel="w1"]')))+' (expect true)');
  await page.click('main [data-rec-edit="bwaste:w1"]'); await page.waitForTimeout(250);
  await page.fill('#re_qty','30'); await editSave();
  log('waste edited 20 → 30 and stock follows (1000 − 110 sold − 30 = 860): '+(await page.evaluate(()=>(state.brickWaste[0].qty===30)&&brickStock('t15')===860))+' (expect true) '+(await page.evaluate(()=>brickStock('t15'))));
  // (6) زبائن السيارات (بطاقة الولاء)
  await page.evaluate(()=>{ state.tab='cars'; render(); }); await page.waitForTimeout(300);
  log('car loyalty customer has ✏️ تعديل: '+(await page.evaluate(()=>!!document.querySelector('[data-lcust-edit="AB 123"]')))+' (expect true)');
  await page.evaluate(()=>document.querySelector('[data-lcust-edit="AB 123"]').click()); await page.waitForTimeout(250);
  await page.fill('#re_name','أحمد سالم'); await page.fill('#re_phone','22110011'); await editSave();
  log('car customer name and phone edited: '+(await page.evaluate(()=>state.customers['AB 123'].name==='أحمد سالم'&&state.customers['AB 123'].phone==='22110011'))+' (expect true)');
  log('every edit is logged: '+(await page.evaluate(()=>(state.activity||[]).filter(a=>/^تعديل/.test(a.action||a.a||'')).length>=5))+' (expect true)');
  // العامل لا يرى أزرار التعديل والحذف
  await page.evaluate(()=>{ currentRole='worker'; state.tab='store'; state.storeSub='debts'; render(); }); await page.waitForTimeout(250);
  log('worker sees no edit/delete person buttons: '+(await page.evaluate(()=>!document.querySelector('main [data-pe],main [data-pdel]')))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
