// 2.69.0 — «العامل له 50,000 من شهر 10، لماذا يظهر أن مستحق راتبه 13,333 فقط؟»: كان الراتب يُحسب للشهر الحالي فقط، فيختفي راتب
// الشهر الماضي يوم 1 بينما دفعاته تبقى. الآن يتراكم لكل شهر منذ المباشرة، والكشف يعرض سطرًا لكل شهر.
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
  // عامل بدأ أول الشهر الماضي براتب يساوي أيام ذلك الشهر × 1,000 (فاليومية 1,000 بالضبط)، غاب يومًا في الشهر الماضي، وأخذ 5,000 فيه
  let r=await page.evaluate(()=>{ const t=new Date(), pm=new Date(t.getFullYear(),t.getMonth()-1,1,12), dimP=_dim(pm), today=ymd(t), d1=ymd(pm), dToday=+today.slice(8);
    const ab=ymd(new Date(pm.getFullYear(),pm.getMonth(),5,12)), py=ymd(new Date(pm.getFullYear(),pm.getMonth(),10,12));
    state.workers=[{id:'w1',name:'حمد',role:'غسيل سيارات',phone:'',start:d1+'T00:00:00.000Z',monthly:dimP*1000,absent:[ab+'T12:00:00.000Z'],
      payments:[{id:'p1',amount:5000,note:'سلفة',date:py+'T10:00:00.000Z'}],credits:[],editedAt:iso(new Date())}];
    const w=state.workers[0], M=wSalaryMonths(w), dimC=_dim(t), expPrev=(dimP-1)*1000, expCur=Math.round(dToday*dimP*1000/dimC);
    return { n:M.length, prev:M[0].amount, expPrev, cur:M[1].amount, expCur, acc:accruedDue(w), bal:wBalance(w), name0:M[0].name, cur1:M[1].cur, abs0:M[0].absent }; });
  log('salary accrues for every month since the start (2 months): '+(r.n===2)+' (expect true) '+JSON.stringify(r));
  log('last month = full month minus the absent day: '+(r.prev===r.expPrev && r.abs0===1)+' (expect true)');
  log('this month = days so far: '+(Math.abs(r.cur-r.expCur)<=1 && r.cur1===true)+' (expect true)');
  log('balance = all months − what he took (no longer only this month): '+(r.acc===r.prev+r.cur && Math.round(r.bal)===r.prev+r.cur-5000)+' (expect true)');
  await page.evaluate(()=>{ state.tab='expenses'; state.expSub='workers'; render(); }); await page.waitForTimeout(200);
  r=await page.evaluate(()=>{ const c=document.querySelector('.wcard .dc-amt').textContent, w=state.workers[0]; return { c, ok:c.includes(fmt(Math.round(wBalance(w))))&&/له/.test(c) }; });
  log('card shows the full balance «له»: '+r.ok+' (expect true) '+r.c);
  await page.evaluate(()=>openWorkerStatement('w1')); await page.waitForTimeout(200);
  r=await page.evaluate(()=>{ const el=document.getElementById('receiptContent'), t=el.textContent, M=wSalaryMonths(state.workers[0]), bal=Math.round(wBalance(state.workers[0]));
    const last=[...el.querySelectorAll('.lg-bal b')].pop(); return { months:M.every(m=>t.includes('راتب '+m.name)), cur:/حتى اليوم/.test(t), last:last&&last.textContent, bal:fmt(bal), noOld:!/مستحق راتب هذا الشهر/.test(t), final:t.includes('له علينا '+fmt(bal)) }; });
  log('statement has one salary line per month and the running balance ends at the balance: '+(r.months && r.cur && r.noOld && r.final && r.last==='له '+r.bal)+' (expect true) '+JSON.stringify(r));
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; document.querySelectorAll('[data-debt-det]').forEach(d=>d.style.display=''); });
  r=await page.evaluate(()=>{ const rows=[...document.querySelectorAll('.wtx-row')].map(x=>x.textContent); return { sal:rows.filter(x=>/💼 راتب/.test(x)).length, run:rows.every(x=>/كان .*← صار/.test(x)) }; });
  log('card details list salary months too, each with «كان ← صار»: '+(r.sal===2 && r.run)+' (expect true) '+JSON.stringify(r));
  log(errors.length?'ERRORS:\n'+errors.join('\n'):'ERRORS: NONE ✅');
  await browser.close();
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
