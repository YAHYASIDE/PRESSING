const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1100,height:900} });
  const page = await ctx.newPage();
  const errors=[];
  page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1400);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(500);

  // seed a product, NO laundry customer yet (test auto-create)
  await page.evaluate(()=>{
    state.storeProducts=[{id:'p1',name:'صابون',buyPrice:100,sellPrice:150,stock:20,minStock:0,unit:'حبة',editedAt:iso(new Date())}];
    state.storeSales=[]; state.storeCustomers=[]; state.storeCash=[]; save(); render();
  });

  // go to expenses > storemat
  await page.click('[data-tab="expenses"]'); await page.waitForTimeout(300);
  const segHasStoremat = await page.$('[data-sub="storemat"]');
  log('storemat sub-tab present:', !!segHasStoremat);
  await page.click('[data-sub="storemat"]'); await page.waitForTimeout(300);
  log('quick-sell form present:', !!(await page.$('#smSave')));

  // default price auto from product
  log('smPrice default (expect 150):', await page.inputValue('#smPrice'));
  // set qty 3 -> total 450
  await page.fill('#smQty','3'); await page.dispatchEvent('#smQty','input'); await page.waitForTimeout(150);
  log('smTotal after qty 3 (expect 450):', await page.textContent('#smTotal'));

  // record on credit (smPaid unchecked)
  await page.click('#smSave'); await page.waitForTimeout(400);

  // verify: internal sale created, laundry customer auto-created, stock decremented
  const res = await page.evaluate(()=>({
    sales: state.storeSales.length,
    laundryCusts: state.storeCustomers.filter(c=>c.isLaundry).map(c=>c.name),
    stock: state.storeProducts[0].stock,
    saleTotal: state.storeSales[0] && state.storeSales[0].total,
    salePaid: state.storeSales[0] && state.storeSales[0].paid,
    internalPurch: storeToLaundryPurch(()=>true),
  }));
  log('after quick-sell:', JSON.stringify(res));
  log('  expect sales=1, laundry=[المغسلة], stock=17, total=450, paid=false, internal=450');

  // list shows the row
  log('recent list shows صابون:', /صابون/.test(await page.textContent('.screen')));

  // unified report reflects internal purchase as laundry expense
  await page.click('[data-tab="reports"]'); await page.waitForTimeout(300);
  const panel = await page.evaluate(()=>{ const p=[...document.querySelectorAll('.panel')].find(x=>/الربح الموحّد/.test(x.textContent)); return p?p.textContent.replace(/\s+/g,' '):null; });
  log('report internal materials 450:', /مواد من المتجر \(داخلي\)450/.test(panel) || /450/.test(panel));

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
