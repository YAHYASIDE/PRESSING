const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function run(label, viewport) {
    const page = await browser.newPage({ viewport });
    page.on('console', m => { if (m.type()==='error' && !IGNORE.test(m.text())) errors.push(`[${label}] CONSOLE: `+m.text()); });
    page.on('pageerror', e => { if (!IGNORE.test(e.message)) errors.push(`[${label}] PAGEERROR: `+e.message); });
    await page.goto('http://localhost:8123/index.html', { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(1400);
    // owner login
    await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter');
    await page.waitForTimeout(500);
    const tabs = await page.$$eval('.nav-btn', els => els.map(e=>e.dataset.tab));
    console.log(`[${label}] owner tabs:`, tabs.join(','));
    for (const t of tabs) {
      await page.click(`[data-tab="${t}"]`); await page.waitForTimeout(300);
      const h = await page.textContent('.screen-head h2, .screen h2').catch(()=>'?');
      const hasContent = await page.$('.screen');
      console.log(`  [${label}] tab ${t}: head="${(h||'').trim()}" rendered=${!!hasContent}`);
    }
    // dashboard dues metric present
    await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(300);
    const dash = await page.textContent('.screen');
    console.log(`  [${label}] dashboard shows مستحقّات:`, /مستحقّات غير مدفوعة/.test(dash));
    await page.close();
  }
  await run('mobile', { width:400, height:850 });
  await run('desktop', { width:1280, height:900 });

  console.log('\n=== ERRORS (filtered) ===');
  console.log(errors.length ? errors.join('\n') : 'NONE ✅');
  await browser.close();
})().catch(e=>{ console.error('CRASH:',e); process.exit(1); });
