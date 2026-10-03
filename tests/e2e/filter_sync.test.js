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
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1400);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(500);

  // seed a car op dated YESTERDAY
  await page.evaluate(()=>{
    const y=new Date(); y.setDate(y.getDate()-1); const yiso=y.toISOString();
    state.carOps=[{id:'cy',no:'Y1',vehicle:Object.keys(state.vehiclePrices)[0],wash:state.washTypes[0],plate:'YDAY',price:700,paid:true,paidDate:yiso,date:yiso,by:'مالك'}];
    state.tab='cars'; save(); render();
  });
  await page.waitForTimeout(300);

  // cars screen has a datebar now
  log('cars has datebar:', !!(await page.$('.datebar [data-preset="yesterday"]')));
  // default today -> yesterday's op NOT shown
  let carsText = await page.textContent('.screen');
  log('YDAY shown on default (today) view:', /YDAY/.test(carsText), '(expect false)');
  // click أمس
  await page.click('.datebar [data-preset="yesterday"]'); await page.waitForTimeout(300);
  carsText = await page.textContent('.screen');
  log('YDAY shown after clicking أمس:', /YDAY/.test(carsText), '(expect true)');
  // week preset exists
  log('week preset present:', !!(await page.$('[data-preset="week"]')));

  // datebar present on other screens
  await page.click('[data-tab="laundry"]'); await page.waitForTimeout(200);
  log('laundry has datebar:', !!(await page.$('.datebar')));
  await page.click('[data-tab="expenses"]'); await page.waitForTimeout(200);
  log('expenses has datebar:', !!(await page.$('.datebar')));
  await page.click('[data-tab="store"]'); await page.waitForTimeout(200);
  await page.click('[data-ssub="sales"]'); await page.waitForTimeout(200);
  log('store sales has datebar:', !!(await page.$('.datebar')));
  await page.click('[data-ssub="pos"]'); await page.waitForTimeout(200);
  log('store POS has NO datebar (correct):', !(await page.$('.datebar')));

  // cloudCopy strips product images (size guard)
  const strip = await page.evaluate(()=>{
    state.storeProducts=[{id:'p1',name:'x',image:'data:image/jpeg;base64,'+('A'.repeat(50000)),stock:1,sellPrice:1,buyPrice:1}];
    const cc=cloudCopy();
    return { localHasImg: !!state.storeProducts[0].image, cloudHasImg: !!(cc.storeProducts&&cc.storeProducts[0]&&cc.storeProducts[0].image), ccSize: JSON.stringify(cc).length };
  });
  log('product image kept locally:', strip.localHasImg, '| stripped from cloud:', !strip.cloudHasImg, '| cloudCopy size:', strip.ccSize);

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
