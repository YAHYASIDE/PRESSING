const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:400,height:850} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m=>{ if(m.type()==='error' && !IGNORE.test(m.text())) errors.push('CONSOLE: '+m.text()); });
  page.on('pageerror', e=>{ if(!IGNORE.test(e.message)) errors.push('PAGEERROR: '+e.message); });

  await page.goto('http://localhost:8123/index.html', { waitUntil:'load' });
  await page.waitForTimeout(1500);

  // manifest linked + title
  const title = await page.title();
  const manifestHref = await page.getAttribute('link[rel=manifest]','href');
  const themeColor = await page.getAttribute('meta[name=theme-color]','content');
  console.log('title:', title);
  console.log('manifest:', manifestHref, '| theme-color:', themeColor);

  // manifest fetch + parse
  const mf = await page.evaluate(async () => {
    const r = await fetch('manifest.webmanifest'); const j = await r.json();
    return { name:j.name, display:j.display, icons:j.icons.length, start:j.start_url };
  });
  console.log('manifest parsed:', JSON.stringify(mf));

  // service worker registered + controlling
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    // wait until there is an active worker
    for (let i=0;i<30 && !(reg && reg.active);i++){ await new Promise(r=>setTimeout(r,100)); const reg2 = await navigator.serviceWorker.getRegistration(); if(reg2&&reg2.active) break; }
    const r = await navigator.serviceWorker.getRegistration();
    return { hasReg: !!r, active: !!(r&&r.active), scope: r&&r.scope };
  });
  console.log('SW:', JSON.stringify(sw));

  // version text set
  const ver = await page.textContent('#appVerFoot').catch(()=>null);
  console.log('footer version:', (ver||'').trim());

  // icons load (200)
  const iconOk = await page.evaluate(async () => {
    const r = await fetch('assets/icon-192.png'); return r.ok && r.headers.get('content-type');
  });
  console.log('icon-192 fetch ok, type:', iconOk);

  // offline test: cache serves index.html
  await page.waitForTimeout(500);
  await ctx.setOffline(true);
  const offline = await page.evaluate(async () => {
    try { const r = await fetch('index.html'); return r.ok ? 'served('+r.status+')' : 'fail('+r.status+')'; }
    catch(e){ return 'throw:'+e.message; }
  });
  console.log('offline index.html:', offline);
  await ctx.setOffline(false);

  // update button + install button present in DOM
  const btnUpdate = await page.$('#btnUpdate');
  const btnInstall = await page.$('#btnInstall');
  const banner = await page.$('#updateBanner');
  console.log('btnUpdate:', !!btnUpdate, '| btnInstall:', !!btnInstall, '| banner:', !!banner);

  console.log('\n=== ERRORS (filtered) ===');
  console.log(errors.length ? errors.join('\n') : 'NONE ✅');
  await browser.close();
})().catch(e=>{ console.error('CRASH:',e); process.exit(1); });
