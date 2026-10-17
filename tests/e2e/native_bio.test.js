// 2.39.0 — البصمة داخل تطبيق الـ APK: إضافة Capacitor «NativeBiometric» (WebAuthn لا يعمل داخل WebView). نحاكي الإضافة هنا.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:400,height:860} });
  await ctx.addInitScript(()=>{ window._bioCalls=[]; window._bioOk=true; window.Capacitor={ isNativePlatform:()=>true, getPlatform:()=>'android', Plugins:{ NativeBiometric:{
    isAvailable:async()=>({isAvailable:true,biometryType:3}), verifyIdentity:async(o)=>{ window._bioCalls.push(o.reason); if(!window._bioOk) throw new Error('Authentication failed'); } } } }; });
  const page = await ctx.newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(500);
  log('inside the APK the fingerprint is reported as available: '+(await page.evaluate(async()=>await bioAvailable()))+' (expect true)');
  const en=await page.evaluate(async()=>{ const ok=await bioEnable(); return { ok, b:bioLoad(), calls:window._bioCalls.slice() }; });
  log('enabling asks the phone fingerprint and saves this device for the owner: '+(en.ok && en.b.native===true && en.b.u==='مالك' && en.calls.length===1)+' (expect true)');
  await page.evaluate(()=>lockNow()); await page.waitForTimeout(300);
  log('lock screen shows the fingerprint button: '+(await page.isVisible('#lockBio'))+' (expect true)');
  await page.evaluate(()=>{ window._bioOk=false; }); await page.click('#lockBio'); await page.waitForTimeout(300);
  log('a failed/cancelled fingerprint keeps the app locked: '+(await page.evaluate(()=>!unlocked))+' (expect true)');
  await page.evaluate(()=>{ window._bioOk=true; }); await page.click('#lockBio'); await page.waitForTimeout(500);
  log('a correct fingerprint opens the app as the owner: '+(await page.evaluate(()=>unlocked && currentUser==='مالك'))+' (expect true)');
  await page.evaluate(()=>{ openSettings('all'); renderBioSettings(); }); await page.waitForTimeout(300);
  log('settings shows it is enabled with a disable button: '+(await page.evaluate(()=>/مفعّلة على هذا الجهاز/.test(document.getElementById('bioAdmin').textContent) && !!document.getElementById('bioOffBtn')))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
