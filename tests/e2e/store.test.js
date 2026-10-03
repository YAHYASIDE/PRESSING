const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1100,height:900} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m=>{ if(m.type()==='error' && !IGNORE.test(m.text())) errors.push('CONSOLE: '+m.text()); });
  page.on('pageerror', e=>{ if(!IGNORE.test(e.message)) errors.push('PAGEERROR: '+e.message); });
  const log=(...a)=>console.log(...a);

  await page.goto('http://localhost:8123/index.html', { waitUntil:'load' });
  await page.waitForTimeout(1400);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter');
  await page.waitForTimeout(500);

  // nav has store
  const tabs = await page.$$eval('.nav-btn', els=>els.map(e=>e.dataset.tab));
  log('tabs:', tabs.join(','));
  await page.click('[data-tab="store"]'); await page.waitForTimeout(300);
  log('store head:', (await page.textContent('.screen-head h2')).trim());

  // --- Products: add two ---
  await page.click('[data-ssub="products"]'); await page.waitForTimeout(250);
  async function addProduct(name, buy, sell, stock, min){
    await page.fill('#prodName', name);
    await page.fill('#prodBuy', String(buy));
    await page.fill('#prodSell', String(sell));
    await page.fill('#prodStock', String(stock));
    await page.fill('#prodMin', String(min));
    await page.click('#prodSave');
    await page.waitForTimeout(250);
  }
  await addProduct('شامبو سجاد', 100, 150, 10, 3);
  await addProduct('مسحوق غسيل', 50, 80, 2, 5); // low stock (2<=5)
  const prodCards = await page.$$('.grid.orders .order');
  log('product cards (expect 2):', prodCards.length);
  const lowMention = await page.textContent('.screen');
  log('low-stock warning present:', /منخفض/.test(lowMention));

  // --- Customer (laundry) ---
  await page.click('[data-ssub="customers"]'); await page.waitForTimeout(250);
  await page.fill('#scustName','مغسلة النور');
  await page.fill('#scustPhone','22112233');
  await page.check('#scustIsLaundry');
  await page.click('#scustSave'); await page.waitForTimeout(250);
  log('customer added, laundry badge:', /مغسلة 🧺/.test(await page.textContent('.screen')));

  // --- POS: cash sale ---
  await page.click('[data-ssub="pos"]'); await page.waitForTimeout(250);
  log('POS product buttons:', (await page.$$('[data-add]')).length);
  await page.locator('[data-add]').first().click(); await page.waitForTimeout(200); // شامبو x1
  await page.locator('[data-add]').first().click(); await page.waitForTimeout(200); // x2
  const cartTotalTxt = await page.textContent('.total-line b');
  log('cart total after 2x شامبو (expect 300):', cartTotalTxt.trim());
  await page.click('#posSellCash'); await page.waitForTimeout(350);
  log('after cash sale, cart cleared:', (await page.$$('[data-crm]')).length===0);

  // --- POS: credit sale to laundry ---
  await page.locator('[data-add]').first().click(); await page.waitForTimeout(200); // شامبو x1 (150)
  await page.selectOption('#posCust', { label: 'مغسلة النور (مغسلة)' }).catch(async()=>{
    // fallback: pick by index 1
    const opts = await page.$$eval('#posCust option', o=>o.map(x=>({v:x.value,t:x.textContent})));
    log('cust options:', JSON.stringify(opts));
    await page.selectOption('#posCust', opts[1].v);
  });
  await page.click('#posSellCredit'); await page.waitForTimeout(350);
  log('credit sale done');

  // --- Sales list ---
  await page.click('[data-ssub="sales"]'); await page.waitForTimeout(250);
  const saleCards = await page.$$('.grid.orders .order');
  log('sales invoices (expect 2):', saleCards.length);
  const recvTxt = await page.textContent('.store-stat .v');
  log('receivables (expect 150):', recvTxt.trim());

  // collect the unpaid invoice
  const payBtn = await page.$('[data-sale-pay]');
  if(payBtn){ await payBtn.click(); await page.waitForTimeout(250);
    log('store pay modal visible:', await page.isVisible('#storePayModal'));
    await page.click('#storePayOk'); await page.waitForTimeout(300);
  }
  const recvAfter = await page.textContent('.store-stat .v');
  log('receivables after collect (expect 0):', recvAfter.trim());

  // --- Purchases: restock مسحوق ---
  await page.click('[data-ssub="purchases"]'); await page.waitForTimeout(250);
  await page.fill('#purSupplier','مورّد عام');
  const purOpts = await page.$$eval('#purProd option', o=>o.map(x=>({v:x.value,t:x.textContent})));
  const mashoq = purOpts.find(o=>/مسحوق/.test(o.t));
  await page.selectOption('#purProd', mashoq.v);
  await page.fill('#purQty','20'); await page.fill('#purCost','55');
  await page.click('#purAdd'); await page.waitForTimeout(200);
  await page.click('#purSave'); await page.waitForTimeout(300);
  log('purchase saved, list has item:', (await page.$$('.grid.orders .order')).length>0);

  // --- Cashbox ---
  await page.click('[data-ssub="cashbox"]'); await page.waitForTimeout(250);
  const bal = await page.textContent('.big-balance');
  log('cashbox balance:', bal.trim(), '(cash sale 300 + collected 150 - purchase 1100 = -650)');
  const stats = await page.$$eval('.store-stat .s', els=>els.map(e=>e.textContent.replace(/\s+/g,' ').trim()));
  log('cashbox stats:', JSON.stringify(stats));

  // manual deposit
  await page.fill('#cashAmt','1000'); await page.fill('#cashReason','رأس مال');
  await page.click('#cashInBtn'); await page.waitForTimeout(300);
  log('after deposit balance:', (await page.textContent('.big-balance')).trim());

  log('\n=== ERRORS (filtered) ===');
  log(errors.length ? errors.join('\n') : 'NONE ✅');
  await browser.close();
})().catch(e=>{ console.error('CRASH:',e); process.exit(1); });
