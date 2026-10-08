const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:400,height:850} });
  const page = await ctx.newPage();
  const errors=[];
  page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1400);

  // CHANGE 2: no floating cloud button
  log('floating cloudBtn removed:', (await page.$('#cloudBtn'))===null);

  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(500);

  // settings gear reachable (visible, clickable)
  const gearBox = await page.$('#settingsBtn');
  log('settings gear present:', !!gearBox);

  // CHANGE 1: loyalty table delete button is first column + styled
  await page.evaluate(()=>{ // seed a customer
    state.customers={'ABC123':{plate:'ABC123',phone:'22223333',stamps:1,totalWashes:1,freeWashes:0,lastVisit:iso(new Date())}};
    save(); render();
  });
  await page.click('[data-tab="cars"]'); await page.waitForTimeout(300);
  const firstTh = await page.$eval('.tbl thead th', e=>e.textContent);
  log('loyalty first column header (expect حذف):', firstTh);
  const delBtn = await page.$('[data-del-cust]');
  log('loyalty delete button present:', !!delBtn);
  const delVisible = delBtn ? await delBtn.isVisible() : false;
  log('loyalty delete visible:', delVisible);

  // CHANGE 3: create a manager in settings, then log in as manager
  await page.evaluate(()=>openSettings('all')); await page.waitForTimeout(300);
  const settingsOpen = await page.isVisible('#settingsModal');
  log('settings modal open:', settingsOpen);
  log('manager section present:', !!(await page.$('#mgrCreate')));
  await page.fill('#mgrName','سالم المدير');
  await page.fill('#mgrPass','1234');
  await page.click('#mgrCreate'); await page.waitForTimeout(300);
  const mgrCount = await page.evaluate(()=>state.managers.length);
  log('managers after create (expect 1):', mgrCount);
  log('manager list row shows name:', /سالم المدير/.test(await page.textContent('#managersAdmin')));

  // close settings, relock, login as manager
  await page.click('#setClose').catch(()=>{}); await page.waitForTimeout(200);
  await page.evaluate(()=>{ unlocked=false; currentUser=""; currentRole=""; applyLock(); });
  await page.waitForTimeout(300);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch'); // آخر اسم محفوظ — «تغيير» لكتابة اسم آخر
  await page.fill('#lockName','سالم المدير'); await page.fill('#lockInput','1234'); await page.click('#lockEnter'); await page.waitForTimeout(500);
  const role = await page.evaluate(()=>currentRole);
  log('logged in role (expect manager):', role);
  const tabs = await page.$$eval('.nav-btn', els=>els.map(e=>e.dataset.tab));
  log('manager sees reports tab:', tabs.includes('reports'));
  const bellVisible = await page.evaluate(()=>{ const b=document.getElementById('notifBtn'); return b && b.style.display!=='none'; });
  log('manager sees notification bell:', bellVisible);

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
