// 2.24.1 — سحب إجباري من السحابة: عند فتح التطبيق/العودة إليه وعند «إعادة المزامنة الآن» يُسحب المستند من الخادم ويُدمج،
// فلا تبقى تسجيلات الجهاز الآخر مخفية إن توقّف المستمع الحي. (Firebase غير متاح في الاختبار: نُحاكي cloudPull/cloudPush.)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const ctx=await browser.newContext({ viewport:{width:400,height:860} }); const page = await ctx.newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  // محاكاة السحابة: المستند فيه سيارة سجّلها المشرف اليوم ولم تصل لهذا الجهاز
  await page.evaluate(()=>{ window._pulls=0; window._pushes=0; window._pullFail=false;
    window.cloudReady=true;
    window.cloudPush=(d)=>{ window._pushes++; window._lastPushed=d; };
    window.cloudPull=async()=>{ window._pulls++; if(window._pullFail) throw new Error('unavailable'); const d=iso(new Date()); const remote=JSON.parse(JSON.stringify(cloudCopy())); remote.carOps=[{id:'sup1',no:'SUP1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:2000,paid:true,paidDate:d,payMethod:'cash',date:d,by:'أنفع',editedAt:d}]; window.onCloudState(remote); return true; };
  });
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(1500);
  let r=await page.evaluate(()=>({ pulls:window._pulls, has:state.carOps.some(o=>o.id==='sup1'), shown:document.querySelector('main').textContent.includes('SUP1')||true, ok:_lastPullOk>0 }));
  log('login triggers a pull from the server and merges the supervisor\'s car: '+(r.pulls===1 && r.has && r.ok)+' (expect true)');
  await page.click('[data-tab="cars"]'); await page.waitForTimeout(300);
  log('the car is visible under «اليوم» on this device: '+(await page.evaluate(()=>document.querySelector('main').textContent.includes('SUP1')))+' (expect true)');
  // لا سحب متكرر إن كان الاستلام حديثًا (< 60 ثانية)
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); await page.waitForTimeout(500);
  log('no extra pull when the last receive is fresh: '+(await page.evaluate(()=>window._pulls===1))+' (expect true)');
  // العودة للتطبيق بعد مدة طويلة → سحب
  await page.evaluate(()=>{ _lastPullOk=Date.now()-5*60*1000; document.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(600);
  log('coming back after 5 minutes pulls again: '+(await page.evaluate(()=>window._pulls===2))+' (expect true)');
  // زر «إعادة المزامنة الآن» يسحب ثم يرفع، وصحة البيانات تعرض آخر استلام
  await page.evaluate(()=>{ openSettings('all'); renderHealthAdmin(); }); await page.waitForTimeout(200);
  const before=await page.evaluate(()=>({p:window._pulls,u:window._pushes}));
  await page.click('#healthSync'); await page.waitForTimeout(1600);
  r=await page.evaluate(()=>({ p:window._pulls, u:window._pushes, h:document.getElementById('healthAdmin').textContent }));
  log('resync button pulls then pushes: '+(r.p===before.p+1 && r.u>before.u)+' (expect true) | health shows last receive: '+/✅ آخر استلام/.test(r.h)+' (expect true)');
  // فشل السحب يظهر في صحة البيانات ولا يكسر التطبيق
  await page.evaluate(()=>{ window._pullFail=true; }); await page.click('#healthSync'); await page.waitForTimeout(1600);
  r=await page.evaluate(()=>({ h:document.getElementById('healthAdmin').textContent, t:document.getElementById('toast').textContent, n:state.carOps.length }));
  log('pull failure is reported, data untouched: '+(/آخر خطأ سحب/.test(r.h) && /تعذّر السحب/.test(r.t) && r.n>=1)+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
