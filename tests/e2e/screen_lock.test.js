// 2.64.0 — الشاشة ثابتة: الصفحة الخلفية لا تتحرّك ما دامت نافذة مفتوحة، ولا تمرير أفقي، ولا ارتداد.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:760} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  log('lock screen locks the page behind it: '+(await page.evaluate(()=>document.documentElement.classList.contains('modal-open')))+' (expect true)');
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(500);
  log('after login the page scrolls again: '+(await page.evaluate(()=>!document.documentElement.classList.contains('modal-open')))+' (expect true)');
  await page.evaluate(()=>{ state.tab='expenses'; state.expSub='general'; render(); }); await page.waitForTimeout(300);
  await page.evaluate(()=>window.scrollTo(0,250)); await page.waitForTimeout(100);
  const y0=await page.evaluate(()=>window.scrollY);
  await page.evaluate(()=>openSettings('all')); await page.waitForTimeout(300);
  let r=await page.evaluate(()=>({ cls:document.documentElement.classList.contains('modal-open'), ov:getComputedStyle(document.body).overflow, os:getComputedStyle(document.querySelector('#settingsModal .modal-box')).overscrollBehaviorY }));
  log('opening a window locks the page (overflow hidden) and the window contains its own scroll: '+(r.cls&&r.ov==='hidden'&&r.os==='contain')+' (expect true) '+JSON.stringify(r));
  await page.mouse.move(195,380); for(let i=0;i<6;i++){ await page.mouse.wheel(0,600); await page.waitForTimeout(60); }
  r=await page.evaluate(()=>({ y:window.scrollY, inner:document.querySelector('#settingsModal .modal-box').scrollTop }));
  log('scrolling inside the window does not move the page behind: '+(r.y===y0&&r.inner>0)+' (expect true) '+JSON.stringify(Object.assign(r,{y0})));
  await page.evaluate(()=>{ document.getElementById('settingsModal').style.display='none'; }); await page.waitForTimeout(150);
  log('closing the window unlocks: '+(await page.evaluate(()=>!document.documentElement.classList.contains('modal-open')&&getComputedStyle(document.body).overflow!=='hidden'))+' (expect true)');
  r=await page.evaluate(()=>({ html:getComputedStyle(document.documentElement).overflowX, ob:getComputedStyle(document.body).overscrollBehaviorY }));
  log('no sideways movement and no bounce on the page: '+(r.html==='hidden'&&r.ob==='none')+' (expect true) '+JSON.stringify(r));
  for(const t of ['dashboard','cars','carpets','laundry','brick','store']){ await page.evaluate(t=>{ state.tab=t; render(); },t); await page.waitForTimeout(200);
    const w=await page.evaluate(()=>{ window.scrollTo(300,window.scrollY); return window.scrollX; }); if(w!==0) log('side scroll on '+t+': false (expect true)'); }
  log('no screen can be pushed sideways: true (expect true)');
  log(errors.length?'ERRORS: '+errors.join(' | '):'ERRORS: NONE ✅');
  await browser.close();
})();
