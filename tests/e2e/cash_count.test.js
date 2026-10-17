// 2.43.0 — جرد الصندوق: تفصيل الرقم المتوقع، جرد التطبيقات البنكية، السبب إلزامي مع الفرق + تسوية، ولا إغلاق بلا جرد.
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
  // اليوم: سيارة 30,000 كاش + سيارة 6,000 بنكيلي، فطور 3,000 كاش، تسديد 9,000 كاش، إيداع 500 كاش، سحب 1,000 بنكيلي
  const D=await page.evaluate(()=>{ const d=iso(new Date()), day=ymd(new Date());
    state.carOps=[{id:'c1',no:'A1',vehicle:'شاحنة',wash:'غسيل',price:30000,paid:true,paidDate:d,payMethod:'cash',date:d,editedAt:d},{id:'c2',no:'A2',vehicle:'كورولا',wash:'غسيل',price:6000,paid:true,paidDate:d,payMethod:'bankily',date:d,editedAt:d}];
    state.carpetOrders=[]; state.laundryOrders=[]; state.closings=[]; state.closedDayEdits=[];
    state.expenses=[{id:'e1',amount:3000,category:'أخرى',reason:'فطور',payMethod:'cash',date:d,editedAt:d}];
    state.storeCash=[{id:'m1',type:'out',amount:9000,reason:'تسديد دين له — سيدي محمد',payMethod:'cash',date:d,editedAt:d},{id:'m2',type:'in',amount:500,reason:'إيداع يدوي',payMethod:'cash',date:d,editedAt:d},{id:'m3',type:'out',amount:1000,reason:'سحب يدوي',payMethod:'bankily',date:d,editedAt:d}];
    save(); openClosing(day); return day; });
  await page.waitForTimeout(300);
  let r=await page.evaluate(d=>{ const F=x=>!!x&&ymd(x)===d; const box=document.getElementById('cashCountBox'); return { exp:document.getElementById('ccExp').textContent, t:box.querySelector('.ccx').textContent, sumOk:sum(payLines(F,'cash'),x=>x.a)===payBreakdown(F).cash.net && sum(payLines(F,'bankily'),x=>x.a)===payBreakdown(F).bankily.net, apps:box.querySelectorAll('[data-ccapp]').length }; },D);
  log('expected cash in the drawer = 18,500 with a line for each movement (cars, breakfast, 9,000 payment, deposit): '+(/18,500/.test(r.exp) && /السيارات/.test(r.t) && /فطور/.test(r.t) && /9,000/.test(r.t) && /إيداع/.test(r.t))+' (expect true)');
  log('the lines add up exactly to the expected net (cash and بنكيلي): '+r.sumOk+' (expect true)');
  log('the three bank apps can be counted too: '+(r.apps===3)+' (expect true)');
  // لا إغلاق بلا جرد
  await page.click('#closeDayBtn'); await page.waitForTimeout(250);
  log('closing the day without a count is refused: '+(await page.evaluate(()=>document.getElementById('closeDayModal').style.display!=='flex' && /جرد/.test(document.getElementById('toast').textContent)))+' (expect true)');
  // الفرق حيّ، والسبب إلزامي
  await page.fill('#ccActual','29500'); await page.fill('#ccApp_bankily','4500'); await page.waitForTimeout(100);
  r=await page.evaluate(()=>({ c:document.getElementById('ccCashDiff').textContent, b:document.querySelector('[data-ccd="bankily"]').textContent, req:document.getElementById('ccNoteReq').textContent }));
  log('live difference: cash زيادة 11,000, بنكيلي عجز 500, reason marked required: '+(/زيادة 11,000/.test(r.c) && /عجز 500/.test(r.b) && /إلزامي/.test(r.req))+' (expect true)');
  await page.click('#ccSave'); await page.waitForTimeout(250);
  log('saving with a difference but no reason is refused: '+(await page.evaluate(()=>!cashCountOf(ymd(new Date())) && /السبب/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.fill('#ccNote','تجربة الجرد'); await page.click('#ccSave'); await page.waitForTimeout(300);
  r=await page.evaluate(d=>{ const c=cashCountOf(d); return { id:c.id, diff:c.diff, b:c.apps&&c.apps.bankily, note:c.note, adj:!!document.getElementById('ccAdjust'), rep:/بنكيلي/.test(closingsReportHTML()) }; },D);
  log('saved: cash +11,000, بنكيلي −500, reason kept, one record per day (fixed id): '+(r.diff===11000 && r.b && r.b.expected===5000 && r.b.diff===-500 && r.note==='تجربة الجرد' && r.id==='LaundryClosing-'+D)+' (expect true)');
  log('the report table shows the bank-app difference; an «⚖️ تسوية» button appears: '+(r.rep && r.adj)+' (expect true)');
  // التسوية
  await page.click('#ccAdjust'); await page.waitForTimeout(350);
  r=await page.evaluate(d=>{ const c=cashCountOf(d); return { e:state.expenses.find(x=>x.category==='عجز صندوق'), m:state.storeCash.find(x=>x.kind==='countAdj'), diff:c.diff, bd:c.apps.bankily.diff, adjusted:!!c.adjusted }; },D);
  log('adjust: shortage 500 → expense «عجز صندوق» via بنكيلي; surplus 11,000 → «زيادة جرد» cash in: '+(!!r.e && r.e.amount===500 && r.e.payMethod==='bankily' && !!r.m && r.m.amount===11000 && r.m.payMethod==='cash')+' (expect true)');
  log('after adjusting, the count matches (cash 0, بنكيلي 0): '+(r.diff===0 && r.bd===0 && r.adjusted)+' (expect true)');
  // حركة جديدة بعد الجرد ← يجب إعادة الجرد
  await page.evaluate(d=>{ state.expenses.push({id:'e2',amount:100,category:'أخرى',reason:'ماء',payMethod:'cash',date:iso(new Date()),editedAt:iso(new Date())}); save(); openClosing(d); },D); await page.waitForTimeout(200);
  await page.click('#closeDayBtn'); await page.waitForTimeout(250);
  log('a movement after the count asks to count again before closing: '+(await page.evaluate(()=>document.getElementById('closeDayModal').style.display!=='flex' && /أعد حفظ الجرد/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.evaluate(d=>{ state.expenses=state.expenses.filter(x=>x.id!=='e2'); save(); openClosing(d); },D); await page.waitForTimeout(200);
  await page.click('#closeDayBtn'); await page.waitForTimeout(250);
  log('with a valid count the close confirmation opens and shows the count: '+(await page.evaluate(()=>document.getElementById('closeDayModal').style.display==='flex' && /الجرد/.test(document.getElementById('cdyBody').textContent)))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
