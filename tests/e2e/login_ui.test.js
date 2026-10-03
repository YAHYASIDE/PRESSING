const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:844} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const lockVisible=()=>page.evaluate(()=>getComputedStyle(document.getElementById('lockScreen')).display!=='none');
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  // first visit: no remembered user -> name field shown
  log('first visit name field visible: '+(await page.isVisible('#lockName'))+' (expect true) | who card hidden: '+!(await page.isVisible('#lockWho'))+' (expect true)');
  log('greeting + date shown: '+(((await page.textContent('#lockGreet')).length>3)&&((await page.textContent('#lockDate')).length>5))+' (expect true)');
  log('version in footer: '+/\d+\.\d+\.\d+/.test(await page.textContent('#lockVer'))+' (expect true)');
  // wrong code -> shake + still locked
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','1111'); await page.click('#lockEnter'); await page.waitForTimeout(150);
  log('wrong code stays locked + shakes: '+((await lockVisible())&&(await page.evaluate(()=>document.getElementById('lockBox').classList.contains('shake'))))+' (expect true)');
  // show/hide code
  await page.click('#lockEye'); log('eye shows code: '+(await page.evaluate(()=>document.getElementById('lockInput').type==='text'))+' (expect true)');
  await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  log('login ok: '+!(await lockVisible())+' (expect true) | code hidden again: '+(await page.evaluate(()=>document.getElementById('lockInput').type==='password'))+' (expect true)');
  log('name remembered locally: '+(await page.evaluate(()=>JSON.parse(localStorage.getItem('sadaqa_last_users'))[0]==='مالك'))+' (expect true)');
  log('not synced to cloud: '+(await page.evaluate(()=>!JSON.stringify(cloudCopy()).includes('sadaqa_last_users')))+' (expect true)');
  // add a worker, lock, log in as worker via "تغيير"
  await page.evaluate(()=>{ state.users=[{id:'w1',name:'سيدي',pin:'4321',role:'worker',active:true,editedAt:iso(new Date())}]; save(); lockNow(); });
  await page.waitForTimeout(300);
  log('lock shows last user card: '+(await page.isVisible('#lockWho'))+' (expect true) | name: '+((await page.textContent('#lockWhoName')).trim()==='مالك')+' (expect true)');
  await page.click('#lockSwitch'); await page.waitForTimeout(100);
  log('switch reveals empty name field: '+((await page.isVisible('#lockName'))&&(await page.inputValue('#lockName'))==='')+' (expect true)');
  await page.fill('#lockName','سيدي'); await page.fill('#lockInput','4321'); await page.press('#lockInput','Enter'); await page.waitForTimeout(400);
  log('worker logged in: '+(await page.evaluate(()=>currentRole==='worker'&&currentUser==='سيدي'))+' (expect true)');
  // lock again: worker is now the main card, مالك becomes a quick chip
  await page.evaluate(()=>lockNow()); await page.waitForTimeout(300);
  log('latest user first: '+((await page.textContent('#lockWhoName')).trim()==='سيدي')+' (expect true)');
  log('previous user chip shown: '+((await page.$$('[data-lock-user]')).length===1)+' (expect true)');
  await page.click('[data-lock-user="مالك"]'); await page.waitForTimeout(100);
  log('chip switches card to مالك: '+((await page.textContent('#lockWhoName')).trim()==='مالك')+' (expect true)');
  await page.fill('#lockInput','0707'); await page.press('#lockInput','Enter'); await page.waitForTimeout(400);
  log('owner back in with code only: '+(await page.evaluate(()=>currentRole==='owner'&&currentUser==='مالك'))+' (expect true)');
  // reload keeps remembered user (session cleared to force lock)
  await page.evaluate(()=>{ localStorage.removeItem('sadaqa_session'); }); await page.reload({waitUntil:'load'}); await page.waitForTimeout(1200);
  log('after reopen, name remembered: '+((await page.isVisible('#lockWho'))&&(await page.textContent('#lockWhoName')).trim()==='مالك')+' (expect true)');
  // register mode hides the card
  await page.click('#lockModeLink'); await page.waitForTimeout(100);
  log('register mode shows empty name field: '+((await page.isVisible('#lockName'))&&!(await page.isVisible('#lockWho'))&&(await page.inputValue('#lockName'))==='')+' (expect true)');
  await page.click('#lockModeLink');
  // phone layout: no horizontal scroll, card fits
  const fit = await page.evaluate(()=>{ const r=document.getElementById('lockBox').getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && document.documentElement.scrollWidth<=innerWidth; });
  log('fits phone width: '+fit+' (expect true)');
  await page.screenshot({path: process.env.SHOT || '/dev/null'}).catch(()=>{});
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
