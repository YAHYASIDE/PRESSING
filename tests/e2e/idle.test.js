const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:420,height:900} });
  const page = await ctx.newPage();
  const errors=[];
  page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  const log=(...a)=>console.log(...a);
  const lockVisible = ()=>page.evaluate(()=>{ const ls=document.getElementById('lockScreen'); return ls && getComputedStyle(ls).display!=='none'; });

  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1300);
  log('lock shown before login:', await lockVisible(), '(expect true)');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  log('lock hidden after login:', !(await lockVisible()), '(expect true)');

  // session saved
  const sess = await page.evaluate(()=>{ try{ return JSON.parse(localStorage.getItem('sadaqa_session')); }catch(e){ return null; } });
  log('session saved:', sess && sess.u, '| role:', sess && sess.r);

  // reload within 60 min -> should auto-restore (no lock)
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1300);
  log('after reload (fresh session) lock hidden:', !(await lockVisible()), '(expect true)');
  const role1 = await page.evaluate(()=>currentRole);
  log('restored role:', role1, '(expect owner)');

  // make session stale (>60 min) then reload -> should LOCK
  await page.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('sadaqa_session')); s.ts=Date.now()-61*60*1000; localStorage.setItem('sadaqa_session', JSON.stringify(s)); });
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1300);
  log('after reload (stale 61min) lock shown:', await lockVisible(), '(expect true)');

  // login again, then simulate idle fire via lockNow()
  // the last name is remembered on this device: only the code is needed
  log('remembered last user shown: '+(await page.isVisible('#lockWho'))+' (expect true) | name field hidden: '+!(await page.isVisible('#lockName'))+' (expect true)');
  log('remembered name is مالك: '+((await page.textContent('#lockWhoName')).trim()==='مالك')+' (expect true)');
  await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  log('re-login with code only: '+!(await lockVisible())+' (expect true)');
  await page.evaluate(()=>lockNow()); await page.waitForTimeout(300);
  log('after lockNow() lock shown:', await lockVisible(), '(expect true)');
  const sessAfterLock = await page.evaluate(()=>localStorage.getItem('sadaqa_session'));
  log('session cleared after lock:', sessAfterLock===null, '(expect true)');

  // IDLE_MS is 60 min
  const idle = await page.evaluate(()=>IDLE_MS);
  log('IDLE_MS minutes:', idle/60000, '(expect 60)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
