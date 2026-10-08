// 2.16.0 — السيناريو الكامل: ملابس 30,000 كاش، أفرشة 20,000 Bankily، سيارة 20,000 تحويل بنكي، سيارة 30,000 دين
// → الخدمات 100,000 / المستلم 70,000 / الدين 30,000 → إغلاق اليوم → حركة واحدة 70,000 في المتجر بتفاصيلها →
// تحديث الصفحة وإعادة الدمج بلا تكرار → تقرير اليوم وملخص المغسلة والتقارير متطابقة.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:1100,height:900} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const hold=async(sel)=>{ await page.dispatchEvent(sel,'pointerdown',{pointerId:1,bubbles:true}); await page.waitForTimeout(1250); await page.dispatchEvent(sel,'pointerup',{pointerId:1,bubbles:true}); await page.waitForTimeout(300); };
  const code=async()=>{ await page.waitForTimeout(150); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300); };
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  const T = await page.evaluate(()=>{ const d=iso(new Date());
    state.carOps=[]; state.carpetOrders=[]; state.expenses=[]; state.storeCash=[]; state.closings=[]; state.closedDayEdits=[];
    // 1) ملابس 30,000 و 2) أفرشة 20,000 — تُسجَّل ثم تُحصَّل عبر نافذة الدفع
    state.laundryOrders=[{id:'l1',no:'L1',customer:'سعد',phone:'33445566',country:'222',type:'قميص',service:'كي',count:10,unit:3000,price:30000,status:'done',paid:false,date:d,editedAt:d}];
    state.carpetOrders=[{id:'r1',no:'R1',customer:'أحمد',phone:'',type:'سجادة',count:2,unit:10000,price:20000,status:'ready',paid:false,date:d,editedAt:d}];
    save(); render(); return ymd(new Date()); });

  // 1) تحصيل الملابس كاش
  await page.click('[data-tab="laundry"]'); await page.waitForTimeout(300);
  await page.click('[data-lnd-pay="l1"]'); await page.waitForTimeout(200); await page.click('#payPm [data-pm="cash"]'); await page.click('#payOk'); await page.waitForTimeout(300);
  // 2) تحصيل الأفرشة Bankily
  await page.click('[data-tab="carpets"]'); await page.waitForTimeout(300);
  await page.click('[data-pay="r1"]'); await page.waitForTimeout(200); await page.click('#payPm [data-pm="bankily"]'); await page.click('#payOk'); await page.waitForTimeout(300);
  // 3) سيارة 20,000 تحويل بنكي (مصرفي) عبر النموذج
  await page.click('[data-tab="cars"]'); await page.waitForTimeout(300);
  await page.fill('#carPrice','20000'); await page.click('#carPm [data-pm="masrvi"]'); await hold('#carSave');
  // 4) سيارة 30,000 دين (دفع مؤجّل)
  await page.fill('#carPrice','30000'); await page.check('#carDeferred'); await hold('#carSave');
  const st=await page.evaluate(()=>({ l:state.laundryOrders[0], r:state.carpetOrders[0], cars:state.carOps.map(o=>({price:o.price,paid:o.paid,pm:o.payMethod})) }));
  log('laundry paid cash: '+(st.l.paid&&st.l.payMethod==='cash')+' (expect true) | carpet paid bankily: '+(st.r.paid&&st.r.payMethod==='bankily')+' (expect true)');
  log('cars: 20,000 masrvi + 30,000 deferred: '+(st.cars.length===2 && st.cars.some(c=>c.price===20000&&c.pm==='masrvi'&&c.paid!==false) && st.cars.some(c=>c.price===30000&&c.paid===false))+' (expect true)');

  // 5-7) الإجماليات
  const f=await page.evaluate(d=>daySnapshot(d),T);
  log('services 100,000: '+(f.services===100000)+' (expect true) | received 70,000: '+(f.received===70000)+' (expect true) | debts 30,000: '+(f.newDebts===30000)+' (expect true)');
  log('by method cash 30,000 / bankily 20,000 / bank 20,000: '+(f.by.cash===30000&&f.by.bankily===20000&&f.bank===20000)+' (expect true)');
  log('by service lnd 30,000 / rug 20,000 / car 50,000 (20,000 received): '+(f.svc.lnd===30000&&f.svc.rug===20000&&f.svc.car===50000&&f.bySvc.car===20000&&f.debtSvc.car===30000)+' (expect true)');
  // ملخص المغسلة أعلى الرئيسية
  await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(300);
  const dash=await page.textContent('.fin-wrap');
  log('dashboard summary shows 100,000 total, 70,000 received, 30,000 debts: '+(/100,000/.test(dash)&&/70,000/.test(dash)&&/30,000/.test(dash))+' (expect true)');
  log('dashboard summary has bank-apps group 40,000 and service cards: '+/التطبيقات البنكية/.test(dash)+' (expect true) | '+/40,000/.test(dash)+' (expect true) | '+/دخل الملابس/.test(dash)+' (expect true)');
  log('bank apps detail hidden by default: '+(await page.evaluate(()=>[...document.querySelectorAll('[data-bank-detail]')].every(d=>d.style.display==='none')))+' (expect true)');
  await page.click('.fin-wrap .fin-card[onclick]'); await page.waitForTimeout(100);
  log('toggle opens full bank apps (bankily 20,000 / masrvi 20,000 / sedad 0) everywhere: '+(await page.evaluate(()=>{ const ds=[...document.querySelectorAll('[data-bank-detail]')]; const t=ds.map(d=>d.textContent).join(' '); return ds.every(d=>d.style.display==='') && /بنكيلي/.test(t) && /مصرفي/.test(t) && /سداد/.test(t) && document.querySelectorAll('.pm-strip .pm-chip').length===5; }))+' (expect true)');
  await page.click('.fin-wrap .fin-card[onclick]'); await page.waitForTimeout(100);
  log('toggle closes again: '+(await page.evaluate(()=>[...document.querySelectorAll('[data-bank-detail]')].every(d=>d.style.display==='none')))+' (expect true)');
  // الفلتر: أمس → أصفار
  await page.click('[data-preset="yesterday"]'); await page.waitForTimeout(300);
  log('yesterday filter shows 0 services: '+(await page.evaluate(()=>laundryFin(x=>inRange(x)).services===0))+' (expect true)');
  await page.click('[data-preset="today"]'); await page.waitForTimeout(300);

  // 8) إغلاق يوم المغسلة من تقرير اليوم
  await page.click('#openClosing'); await page.waitForTimeout(300);
  const rep1=await page.textContent('#receiptContent');
  log('day report modal shows cards with 100,000 / 70,000 / 30,000: '+(/تقرير اليوم/.test(rep1)&&/100,000/.test(rep1)&&/70,000/.test(rep1)&&/30,000/.test(rep1))+' (expect true)');
  await page.click('#closeDayBtn'); await page.waitForTimeout(200);
  const body=await page.textContent('#cdyBody');
  log('confirm window: services 100,000, cash 30,000, bankily 20,000, bank 20,000, debts 30,000, transfer 70,000: '+(/100,000/.test(body)&&/30,000/.test(body)&&/40,000/.test(body)&&/20,000/.test(body)&&/70,000/.test(body)&&/التطبيقات البنكية/.test(body)&&/لا تُحوَّل/.test(body))+' (expect true)');
  await page.click('#closeDayOk'); await code(); await page.waitForTimeout(400);
  // 9) حركة واحدة فقط بقيمة 70,000
  const mv=await page.evaluate(d=>({ list:state.storeCash.filter(m=>m.kind==='lndTransfer'), bal:cashboxBalance(), st:dayStatus(d), c:closingOf(d) }),T);
  log('exactly one store movement of 70,000: '+(mv.list.length===1 && mv.list[0].amount===70000 && mv.list[0].id==='LaundryTransfer-'+T)+' (expect true)');
  log('movement details pm 30/20/20 and svc 30/20/20 and debts 30,000: '+(mv.list[0].pm.cash===30000&&mv.list[0].pm.bankily===20000&&mv.list[0].pm.masrvi===20000&&mv.list[0].svc.lnd===30000&&mv.list[0].svc.rug===20000&&mv.list[0].svc.car===20000&&mv.list[0].fin.newDebts===30000)+' (expect true)');
  log('cashbox balance 70,000 (debt NOT transferred): '+(mv.bal===70000)+' (expect true) | day locked: '+(mv.st==='locked')+' (expect true) | closing id: '+(mv.c.id==='LaundryClosing-'+T)+' (expect true)');
  await page.click('#receiptClose'); await page.waitForTimeout(200);

  // 10) كشف حساب المتجر يعرض الحركة بتفاصيلها
  await page.evaluate(()=>{ state.tab='store'; state.storeSub='cashbox'; render(); }); await page.waitForTimeout(300);
  const cb=await page.textContent('main');
  log('cashbox shows laundry transfer +70,000 with source badge: '+(/تحويل دخل المغسلة/.test(cb)&&/70,000/.test(cb)&&/المغسلة/.test(cb))+' (expect true)');
  log('per-method chips cash 30,000 / bankily 20,000 / masrvi 20,000: '+(await page.evaluate(()=>{ const t=document.querySelector('.pm-strip').textContent; return /30,000/.test(t)&&/20,000/.test(t); }))+' (expect true)');
  await page.click('[data-cash-view]'); await page.waitForTimeout(300);
  const det=await page.textContent('#receiptContent');
  log('movement detail: source laundry, services split, methods, debts, transferred: '+(/المصدر/.test(det)&&/الملابس/.test(det)&&/الأفرشة والسجاد/.test(det)&&/السيارات/.test(det)&&/التطبيقات البنكية/.test(det)&&/بنكيلي/.test(det)&&/مصرفي/.test(det)&&/ديون جديدة/.test(det)&&/المحوّل فعليًا/.test(det)&&/70,000/.test(det))+' (expect true)');
  await page.click('#tdOpenDay'); await page.waitForTimeout(300);
  log('detail links back to the day report: '+/تقرير اليوم/.test(await page.textContent('#receiptContent'))+' (expect true)');
  await page.click('#receiptClose');

  // 11) تحديث الصفحة وإعادة الفتح: لا تكرار
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1500);
  const after=await page.evaluate(d=>{ const n1=state.storeCash.filter(m=>m.kind==='lndTransfer').length; const again=closeDay(d); const r=JSON.parse(JSON.stringify(cloudCopy())); applyRemote(r); applyRemote(r); const n2=state.storeCash.filter(m=>m.kind==='lndTransfer').length; return {n1,again:again.ok,n2,bal:cashboxBalance(),locked:dayIsClosed(d)}; },T);
  log('after reload still one movement: '+(after.n1===1)+' (expect true) | close again refused: '+(after.again===false)+' (expect true) | after double remote merge still one: '+(after.n2===1)+' (expect true) | balance 70,000: '+(after.bal===70000)+' (expect true) | locked: '+after.locked+' (expect true)');
  log('close button gone for a closed day: '+(await page.evaluate(d=>{ openClosing(d); return !document.getElementById('closeDayBtn') && !!document.getElementById('cdRequestBtn'); },T))+' (expect true)');
  await page.click('#receiptClose');

  // 12) تقرير اليوم والتقارير متطابقة
  const rep2=await page.evaluate(d=>{ openClosing(d); return document.getElementById('receiptContent').textContent; },T);
  log('day report after closing: 100,000 / 70,000 / 30,000 and transferred 70,000 and locked: '+(/100,000/.test(rep2)&&/70,000/.test(rep2)&&/30,000/.test(rep2)&&/إجمالي المحوّل للمتجر/.test(rep2)&&/🔒 مغلق/.test(rep2))+' (expect true)');
  await page.click('#receiptClose');
  await page.click('[data-tab="reports"]'); await page.waitForTimeout(400);
  const rp=await page.textContent('main');
  const ts=await page.evaluate(()=>transfersSummary(x=>inRange(x)));
  log('reports: transfers summary 1 day / 70,000 / cash 30,000 / bankily 20,000 / bank 20,000 / debts 30,000: '+(ts.n===1&&ts.total===70000&&ts.cash===30000&&ts.bankily===20000&&ts.bank===20000&&ts.newDebts===30000&&ts.collected===0)+' (expect true)');
  log('reports panels present: '+(/دخل المغسلة المحوّل إلى المتجر/.test(rp)&&/سجل أيام المغسلة/.test(rp))+' (expect true)');
  log('days log row shows 100,000 / 70,000 / 30,000 / locked: '+(await page.evaluate(d=>{ const tr=document.querySelector(`[data-dayrep="${d}"]`); const t=tr&&tr.textContent; return !!t&&/100,000/.test(t)&&/70,000/.test(t)&&/30,000/.test(t)&&/مغلق/.test(t); },T))+' (expect true)');
  await page.click(`[data-dayrep="${T}"]`); await page.waitForTimeout(300);
  log('clicking a day opens its full report: '+/تقرير اليوم/.test(await page.textContent('#receiptContent'))+' (expect true)');
  await page.click('#receiptClose');
  // تحصيل الدين لاحقًا (غدًا) يُحسب تحصيلًا في يوم الدفع لا في اليوم المغلق
  const col=await page.evaluate(d=>{ const o=state.carOps.find(x=>x.paid===false); const tm=new Date(); tm.setDate(tm.getDate()+1); o.paid=true; o.paidDate=iso(tm); o.payMethod='cash'; o.editedAt=iso(new Date()); const today=daySnapshot(d), next=laundryFin(x=>ymd(x)===ymd(tm)); return {todayRecv:today.received, todayDebts:today.newDebts, nextCollected:next.collected, nextRecv:next.received, nextServices:next.services, verify:verifyDay(d).ok}; },T);
  log('debt paid next day: today unchanged (70,000 received, 30,000 new debts): '+(col.todayRecv===70000&&col.todayDebts===30000)+' (expect true) | next day: collected 30,000, received 30,000, services 0: '+(col.nextCollected===30000&&col.nextRecv===30000&&col.nextServices===0)+' (expect true) | closed day still consistent: '+col.verify+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
