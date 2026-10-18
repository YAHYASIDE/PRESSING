// 2.45.0 — مصاريف باليومية (مثل الإيجار): الشهري ÷ أيام الشهر كل يوم، الدفع يُخصم من الصندوق ولا يُحسب مرتين، + أزرار الفطور/الغداء/العشاء.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:860} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const code=async()=>{ await page.waitForTimeout(150); if(await page.isVisible('#codeModal')){ await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(250); } };
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ state.dailyCosts=[]; state.dailyCostPays=[]; state.expenses=[{id:'m1',amount:1200,category:'مواد',reason:'فطور',payMethod:'cash',date:iso(new Date(Date.now()-864e5)),editedAt:iso(new Date())}]; state.workers=[]; state.carOps=[]; state.carpetOrders=[]; state.laundryOrders=[]; state.storeCash=[]; state.meters=[]; state.tab='expenses'; state.expSub='daily'; save(); render(); });
  await page.waitForTimeout(250);
  log('expenses has a «باليومية» tab with the add form: '+(await page.evaluate(()=>!!document.querySelector('[data-sub="daily"]') && !!document.getElementById('dcSave')))+' (expect true)');
  // إيجار 30,000 من 10 أيام
  const startDay=await page.evaluate(()=>{ const d=new Date(); d.setDate(d.getDate()-9); return ymd(d); });
  await page.fill('#dcName','إيجار المحل'); await page.fill('#dcMonthly','30000'); await page.fill('#dcStart',startDay); await page.waitForTimeout(80);
  log('live hint shows the daily amount (30,000 ÷ days of this month): '+(await page.evaluate(()=>{ const dim=_dim(new Date()); return document.getElementById('dcRateHint').textContent.includes(money(Math.round(30000/dim))); }))+' (expect true)');
  await page.click('#dcSave'); await page.waitForTimeout(250);
  let r=await page.evaluate(()=>{ const c=state.dailyCosts[0], t=ymd(new Date()); let exp=0; for(let i=9;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); d.setHours(12,0,0,0); exp+=30000/_dim(d); } return { n:state.dailyCosts.length, today:dailyCostBetween(t,t), todayExp:Math.round(30000/_dim(new Date())), all:dailyCostBetween('2000-01-01',t), exp10:Math.round(exp), due:dcDue(c), card:document.querySelector('.dcost-card').textContent }; });
  log('saved; today counts one day = 30,000 ÷ days in month: '+(r.n===1 && r.today===r.todayExp)+' (expect true)');
  log('10 days since start accrue ≈ 10 daily amounts and show as due: '+(Math.abs(r.all-r.exp10)<=1 && Math.abs(r.due-r.exp10)<=1 && /مستحق/.test(r.card))+' (expect true)');
  r=await page.evaluate(()=>{ const t=ymd(new Date()); const s=periodSummary(t,t); return { daily:s.daily, inExp:s.lndExp>=s.daily && s.daily>0 }; });
  log('periodSummary counts it in the laundry expenses (profit drops by the daily amount): '+r.inExp+' (expect true)');
  // الدفع
  await page.click('[data-dc-pay2]'); await page.waitForTimeout(200);
  log('«💵 دفع» opens with the due amount filled: '+(await page.evaluate(()=>document.getElementById('dcModal').style.display==='flex' && +document.getElementById('dcmAmt').value===dcDue(state.dailyCosts[0])))+' (expect true)');
  await page.fill('#dcmAmt','5000'); await page.click('#dcmPm [data-pm="bankily"]'); await page.fill('#dcmNote','دفعة'); await page.click('#dcmSave'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>{ const t=ymd(new Date()), F=x=>!!x&&ymd(x)===t, c=state.dailyCosts[0]; return { pays:state.dailyCostPays.length, pb:payBreakdown(F).bankily.out, lines:payLines(F,'bankily').some(l=>/دفع: إيجار المحل/.test(l.t)&&l.a===-5000), gen:manualExp(F), daily:periodSummary(t,t).daily, due:dcDue(c), acc:Math.round(dcAccrued(c,'0000-00-00',t)) }; });
  log('payment 5,000 via بنكيلي leaves the box (cash count lines too): '+(r.pays===1 && r.pb===5000 && r.lines)+' (expect true)');
  log('the payment is NOT counted as an expense again (only the daily amount): '+(r.gen===0 && r.daily>0)+' (expect true)');
  log('due = accrued − paid: '+(r.due===r.acc-5000)+' (expect true)');
  // الكشف
  await page.click('[data-dc-st2]'); await page.waitForTimeout(200);
  log('statement lists days per month and the payment: '+(await page.evaluate(()=>{ const t=document.getElementById('receiptContent').textContent; return /يوم/.test(t) && /5,000/.test(t) && /بنكيلي/.test(t); }))+' (expect true)');
  await page.click('#receiptClose'); await page.waitForTimeout(100);
  // تعديل المبلغ يسري من اليوم
  await page.click('[data-dc-ed2]'); await page.waitForTimeout(200); await page.fill('#dcmMonthly','45000'); await page.click('#dcmSave'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>{ const t=ymd(new Date()), y=new Date(); y.setDate(y.getDate()-1); return { today:dailyCostBetween(t,t), todayExp:Math.round(45000/_dim(new Date())), yest:dailyCostBetween(ymd(y),ymd(y)), yExp:Math.round(30000/_dim(y)) }; });
  log('changing the monthly amount applies from today only (yesterday stays 30,000/month): '+(r.today===r.todayExp && r.yest===r.yExp)+' (expect true)');
  // الإيقاف
  await page.click('[data-dc-stop2]'); await page.waitForTimeout(200);
  log('⏸ stop: nothing counts from today: '+(await page.evaluate(()=>{ const t=ymd(new Date()); return dailyCostBetween(t,t)===0 && !!state.dailyCosts[0].end; }))+' (expect true)');
  await page.click('[data-dc-stop2]'); await page.waitForTimeout(200);
  // الرئيسية والتقرير
  r=await page.evaluate(()=>{ state.tab='dashboard'; render(); const t=ymd(new Date()); const c=closingRows(periodSummary(t,t)).some(x=>/باليومية/.test(x[1]||"")); return { dash:!!document.querySelector('[data-stmt="exp:daily"]'), closing:c }; });
  log('the dashboard shows «باليومية» in expenses and the day report has its row: '+(r.dash && r.closing)+' (expect true)');
  r=await page.evaluate(()=>{ openDashStmt('exp:daily',ymd(new Date())+'~'+ymd(new Date())); return /إيجار المحل/.test(document.getElementById('receiptContent').textContent); });
  log('tapping it opens a statement with the rent: '+r+' (expect true)'); await page.click('#receiptClose');
  // المزامنة
  r=await page.evaluate(()=>{ const remote=JSON.parse(JSON.stringify(cloudCopy())); remote.dailyCosts.push({id:'dc2',name:'الإنترنت',monthly:3000,start:ymd(new Date()),salaryHist:[],editedAt:iso(new Date())}); state.dailyCostPays.push({id:'p2',costId:state.dailyCosts[0].id,amount:100,payMethod:'cash',date:iso(new Date()),editedAt:iso(new Date())}); applyRemote(remote); return { c:state.dailyCosts.length, p:state.dailyCostPays.length }; });
  log('items and payments from two devices merge (none lost): '+(r.c===2 && r.p===2)+' (expect true)');
  // الأكل
  await page.evaluate(()=>{ state.tab='expenses'; state.expSub='general'; render(); }); await page.waitForTimeout(200);
  r=await page.evaluate(()=>[...document.querySelectorAll('[data-meal]')].map(b=>b.textContent.trim()));
  log('three quick meal buttons: فطور · غداء · العشاء: '+(r.length===3 && /فطور/.test(r[0]) && /غداء/.test(r[1]) && /عشاء/.test(r[2]))+' (expect true)');
  await page.click('[data-meal="breakfast"]'); await page.waitForTimeout(100);
  r=await page.evaluate(()=>({ n:document.getElementById('expReason').value, c:document.getElementById('expCat').value, a:document.getElementById('expAmount').value }));
  log('🍳 fills name «فطور», category «مواد» and the last amount 1,200: '+(r.n==='فطور' && r.c==='مواد' && +r.a===1200)+' (expect true)');
  await page.click('#expSave'); await page.waitForTimeout(250); await code();
  log('saving adds the breakfast expense: '+(await page.evaluate(()=>state.expenses.filter(e=>e.reason==='فطور').length===2))+' (expect true)');
  log('no horizontal overflow at 390px: '+(await page.evaluate(()=>{ state.expSub='daily'; render(); return document.documentElement.scrollWidth<=window.innerWidth+1; }))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
