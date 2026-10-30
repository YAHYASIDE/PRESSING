// 2.68.0 — من فاحص الأخطاء: (1) أرقام عربية مكتوبة في اللوحة أو الوصف كانت تظهر (١٠ / ٠٠) — صارت تُعرض وتُكتب لاتينية،
// واللوحة «١٠» هي نفسها «10» في بطاقة الولاء. (2) حذف دين يدوي سُدِّد منه شيء كان يجعل كشف الحساب لا يطابق الرصيد — صار ممنوعًا.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:360,height:800} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  const now=await page.evaluate(()=>iso(new Date()));
  await page.evaluate(n=>{
    state.carOps=[{id:'c1',plate:'١٠',vehicle:'سيارة صغيرة',wash:'غسيل كامل',price:500,paid:true,payMethod:'cash',date:n,by:'أنفع',custName:'زبون ٣',editedAt:n}];
    state.laundryOrders=[{id:'l1',no:'L-1',customerName:'ب',phone:'',status:'wash',type:'تركي، سروال',count:12,price:1200,paid:false,date:n,by:'أنفع',editedAt:n,
      items:[{type:'تركي',count:6,unit:100,price:600,service:'غسيل وكي',note:'٠٠'},{type:'سروال',count:6,unit:100,price:600,service:'غسيل وكي'}]}];
    state.customers={'10':{plate:'10',name:'زبون',stamps:2,washes:2}};
    state.dateFrom=ymd(new Date()); state.dateTo=state.dateFrom; state.tab='cars'; save(); render(); }, now);
  await page.waitForTimeout(200);
  const ar=()=>page.evaluate(()=>/[٠-٩]/.test(document.getElementById('main').innerText));
  log('cars screen: plate «١٠» shows as 10, no Arabic digits: '+(!(await ar()) && /\b10\b/.test(await page.textContent('.cc-plate')))+' (expect true)');
  log('plate «١٠» is the same loyalty card as «10»: '+(await page.evaluate(()=>plateKey('١٠')==='10' && normPlate(' ١٠ ab ')==='10 AB'))+' (expect true)');
  await page.type('#carPlate','٢٣'); await page.type('#carName','أحمد ٧');
  log('typing Arabic digits in the plate/name fields gives Latin digits: '+(await page.evaluate(()=>document.getElementById('carPlate').value.includes('23') && document.getElementById('carName').value==='أحمد 7'))+' (expect true)');
  await page.evaluate(()=>{ state.tab='laundry'; render(); }); await page.waitForTimeout(200);
  log('laundry screen: note «٠٠» shows as 00, no Arabic digits: '+(!(await ar()) && /تركي: 00/.test(await page.evaluate(()=>document.getElementById('main').innerText)))+' (expect true)');
  const ta=await page.$('#main textarea, #lndNote');
  if(ta){ await ta.type('كيس ٤'); log('typing Arabic digits in a note gives Latin digits: '+/كيس 4/.test(await ta.inputValue())+' (expect true)'); }
  // (2) دين يدوي مسدَّد منه شيء لا يُحذف
  await page.evaluate(n=>{ state.storeCustomers=[{id:'cu1',name:'سيدي',phone:'33227268',country:'222',editedAt:n}]; state.storeSales=[]; state.suppliers=[]; state.storePurchases=[];
    state.storeDebts=[{id:'d1',customerId:'cu1',dir:'for',amount:2000,paidAmount:2000,paid:true,note:'بنكلي',date:n,by:'أنفع',editedAt:n},
      {id:'d2',customerId:'cu1',dir:'on',amount:700,paidAmount:0,paid:false,note:'أصانس',date:n,by:'أنفع',editedAt:n}];
    state.storeCash=[{id:'m1',type:'out',amount:2000,reason:'تسديد دين له — سيدي',customerId:'cu1',payMethod:'bankily',date:n,by:'أنفع',editedAt:n}];
    state.tab='store'; state.storeSub='debts'; state.debtView='hist'; save(); render(); }, now);
  await page.waitForTimeout(200);
  const before=await page.evaluate(()=>{ const L=custLedger(storeCust('cu1')); return Math.round(L.final)===Math.round(custNet(storeCust('cu1')).net) && !L.rows.some(r=>/تسوية/.test(r.t)); });
  log('before: statement matches the balance: '+before+' (expect true)');
  await page.click('[data-md-del="d1"]'); await page.waitForTimeout(250);
  let r=await page.evaluate(()=>({ code:getComputedStyle(document.getElementById('codeModal')).display!=='none', del:!!state.storeDebts.find(x=>x.id==='d1').cancelled, msg:document.getElementById('toast').textContent }));
  log('a paid manual debt cannot be deleted (no code asked, explains why): '+(!r.code && !r.del && /لا يُحذف/.test(r.msg))+' (expect true)');
  log('statement still matches the balance: '+(await page.evaluate(()=>{ const L=custLedger(storeCust('cu1')); return !L.rows.some(r=>/تسوية/.test(r.t)); }))+' (expect true)');
  await page.evaluate(()=>{ window.prompt=()=>''; });
  await page.click('[data-md-del="d2"]'); await page.waitForTimeout(200); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300);
  log('an unpaid manual debt is still deletable: '+(await page.evaluate(()=>!!state.storeDebts.find(x=>x.id==='d2').cancelled))+' (expect true)');
  log('audit is clean: '+(await page.evaluate(()=>!auditChecks().issues.some(i=>i.lvl==='err')))+' (expect true)');
  log(errors.length?'ERRORS:\n'+errors.join('\n'):'ERRORS: NONE ✅');
  await browser.close();
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
