// 2.22.0 — الوقت الصحيح: تصحيح ساعة الجهاز من الخادم، والأيام بتوقيت المحل مهما كانت منطقة الهاتف.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const log=(...a)=>console.log(...a);
  const errors=[];
  const mk=async(opts,serverSkewMs)=>{ const ctx=await browser.newContext(Object.assign({viewport:{width:1100,height:900}},opts)); const page=await ctx.newPage();
    page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); }); page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); }); page.on('dialog',d=>d.accept());
    await page.route('**/sw.js?clock=*', r=>r.fulfill({status:200,headers:{'date':new Date(Date.now()+serverSkewMs).toUTCString(),'content-type':'application/javascript'},body:''}));
    await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1500);
    if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch'); await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
    return {ctx,page}; };

  // ===== 1) جهاز منطقته الزمنية مختلفة (كراتشي +5): الأيام تُحسب بتوقيت نواكشوط =====
  { const {ctx,page}=await mk({timezoneId:'Asia/Karachi'},0);
    const r=await page.evaluate(()=>({ a:ymd('2026-10-08T22:30:00Z'), b:ymd('2026-10-08T00:10:00Z'), t:timeStr('2026-10-08T22:30:00Z'), tz:clockInfo().tz, devOff:clockInfo().deviceOffsetMin }));
    log('karachi device: 22:30Z is still 2026-10-08 (shop tz): '+(r.a==='2026-10-08')+' (expect true) | 00:10Z is 2026-10-08: '+(r.b==='2026-10-08')+' (expect true) | time shown 22:30: '+/22:30|10:30/.test(r.t)+' (expect true)');
    log('device tz detected as Karachi (+300): '+(r.tz==='Asia/Karachi' && r.devOff===300)+' (expect true)');
    // تسجيل سيارة الآن ثم التأكد أنها تظهر تحت «اليوم» على الجهاز نفسه وعلى جهاز بتوقيت نواكشوط (نفس ymd)
    const day=await page.evaluate(()=>{ const d=iso(new Date()); state.carOps=[{id:'k1',no:'K1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1000,paid:true,paidDate:d,date:d,editedAt:d}]; save(); render(); return {rec:ymd(d), today:todayStr(), shown:document.querySelector('main').innerHTML.includes('K1')}; });
    log('record day == today on the shifted device and it is shown: '+(day.rec===day.today && day.shown)+' (expect true)');
    const health=await page.evaluate(()=>{ openSettings('all'); renderHealthAdmin(); return document.getElementById('healthAdmin').textContent; });
    log('health mentions device timezone and shop-time days: '+/Asia\/Karachi/.test(health)+' (expect true) | '+/بتوقيت نواكشوط/.test(health)+' (expect true)');
    await ctx.close(); }

  // ===== 2) ساعة الجهاز متأخرة بساعتين عن الخادم → التطبيق يصحّح =====
  { const {ctx,page}=await mk({},2*3600*1000);
    const r=await page.evaluate(()=>({ off:clockInfo().offsetMin, now:Date.now(), real:RealDate.now(), d:new Date().getTime(), inst:(new Date() instanceof Date) && (new Date(0) instanceof RealDate), parse:Date.parse('2026-10-08T00:00:00Z')===1791417600000, utc:Date.UTC(2026,9,8)===1791417600000 }));
    log('offset measured ≈ +120 min: '+(r.off>=118&&r.off<=122)+' (expect true)');
    log('Date.now and new Date are corrected (+2h): '+(Math.abs((r.now-r.real)-7200000)<5000 && Math.abs((r.d-r.real)-7200000)<5000)+' (expect true)');
    log('Date subclass keeps instanceof/parse/UTC working: '+(r.inst&&r.parse&&r.utc)+' (expect true)');
    await page.waitForTimeout(2200);
    log('user warned by toast after login: '+/ساعة هذا الجهاز تختلف/.test(await page.textContent('#toast'))+' (expect true)');
    const rec=await page.evaluate(()=>{ const d=iso(new Date()); return { recMs:new Date(d).getTime(), real:RealDate.now(), day:ymd(d), today:todayStr() }; });
    log('new record stamped with corrected time and lands on corrected today: '+(Math.abs((rec.recMs-rec.real)-7200000)<5000 && rec.day===rec.today)+' (expect true)');
    log('offset persisted for offline use: '+(await page.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('sadaqa_clock')||'{}'); return c.off>7000000 && c.off<7400000; }))+' (expect true)');
    const health=await page.evaluate(()=>{ openSettings('all'); renderHealthAdmin(); return document.getElementById('healthAdmin').textContent; });
    log('health panel flags the clock difference: '+/ساعة الجهاز تختلف بـ120 دقيقة/.test(health)+' (expect true)');
    await ctx.close(); }

  // ===== 3) ساعة صحيحة (فرق < 90 ثانية يُهمل) =====
  { const {ctx,page}=await mk({},20*1000);
    const r=await page.evaluate(()=>({ off:clockInfo().offsetMin, health:(openSettings('all'),renderHealthAdmin(),document.getElementById('healthAdmin').textContent) }));
    log('small skew ignored: '+(r.off===0)+' (expect true) | health says clock OK: '+/✅ صحيحة/.test(r.health)+' (expect true)');
    log('chosen past date is noon UTC (same day in shop tz): '+(await page.evaluate(()=>chosenDateIso('2026-10-01')==='2026-10-01T12:00:00.000Z'))+' (expect true)');
    await ctx.close(); }

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
