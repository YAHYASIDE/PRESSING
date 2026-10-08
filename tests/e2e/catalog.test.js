const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
const ARDIG=/[٠-٩۰-۹]/; // Arabic-Indic / Extended digits
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1100,height:900}, locale:'ar' });
  const page = await ctx.newPage();
  const errors=[];
  page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept()); // accept confirm() deletes
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1400);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(500);

  await page.evaluate(()=>openSettings('all')); await page.waitForTimeout(300);
  log('catalogAdmin present:', !!(await page.$('#catalogAdmin')));

  // add carpet piece لحاف = 500
  await page.fill('[data-newnm="piecePrices"]','لحاف');
  await page.fill('[data-newpr="piecePrices"]','500');
  await page.click('[data-cat-add="piecePrices"]'); await page.waitForTimeout(250);
  log('piecePrices.لحاف =', await page.evaluate(()=>state.piecePrices['لحاف']));

  // add laundry type جينز
  await page.fill('[data-newnm2="laundryTypes"]','جينز');
  await page.click('[data-catn-add="laundryTypes"]'); await page.waitForTimeout(250);
  log('laundryTypes includes جينز:', await page.evaluate(()=>state.laundryTypes.includes('جينز')));

  // edit a vehicle price (first data-cp of vehiclePrices)
  const vInp = await page.$('[data-cp^="vehiclePrices~"]');
  await vInp.fill('1234'); await vInp.dispatchEvent('change'); await page.waitForTimeout(200);
  log('a vehicle price updated to 1234:', await page.evaluate(()=>Object.values(state.vehiclePrices).includes(1234)));

  // delete first wash type
  const washBefore = await page.evaluate(()=>state.washTypes.length);
  await page.click('[data-catn-del="washTypes~0"]'); await page.waitForTimeout(250);
  const washAfter = await page.evaluate(()=>state.washTypes.length);
  log('washTypes deleted one:', washBefore, '->', washAfter);

  // close settings, verify pickers updated
  await page.click('#setClose'); await page.waitForTimeout(200);
  await page.click('[data-tab="carpets"]'); await page.waitForTimeout(300);
  log('carpet picker shows لحاف:', (await page.$$eval('[data-ppick]', els=>els.map(e=>e.dataset.ppick))).includes('لحاف'));
  await page.click('[data-tab="laundry"]'); await page.waitForTimeout(300);
  log('laundry picker shows جينز:', (await page.$$eval('[data-lndtype]', els=>els.map(e=>e.dataset.lndtype))).includes('جينز'));

  // DIGITS: seed a car op with a date/time, render, scan for Arabic-Indic digits
  await page.evaluate(()=>{
    state.carOps=[{id:'co1',no:'S1',vehicle:Object.keys(state.vehiclePrices)[0],wash:(state.washTypes[0]||'غسيل'),plate:'9999',price:1000,paid:true,paidDate:iso(new Date()),date:iso(new Date()),by:'مالك'}];
    state.tab='cars'; save(); render();
  });
  await page.waitForTimeout(300);
  const carsText = await page.textContent('.screen');
  log('CARS screen has Arabic-Indic digits:', ARDIG.test(carsText), '(want false)');
  await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(300);
  const dashText = await page.textContent('.screen');
  log('DASHBOARD has Arabic-Indic digits:', ARDIG.test(dashText), '(want false)');
  await page.click('[data-tab="reports"]'); await page.waitForTimeout(300);
  const repText = await page.textContent('.screen');
  log('REPORTS has Arabic-Indic digits:', ARDIG.test(repText), '(want false)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
