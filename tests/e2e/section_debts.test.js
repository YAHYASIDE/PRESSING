const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram|anon auth/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:900} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date()); window._opened=[]; window.open=(u)=>{ window._opened.push(u); return null; };
    state.storeCustomers=[{id:'c1',name:'أهل دار أنفع',phone:'22540775',country:'222',editedAt:d}];
    state.carOps=[{id:'a1',no:'A1',vehicle:'سيارة',wash:'غسيل',price:500,phone:'22540775',country:'222',paid:false,date:d}];
    state.carpetOrders=[{id:'k1',no:'K1',customer:'محمد لمين',phone:'30156145',country:'222',type:'سجادة',count:1,unit:1000,price:1000,status:'ready',paid:false,date:d}];
    state.laundryOrders=[{id:'l1',no:'L1',customer:'أهل دار أنفع',phone:'22540775',country:'222',type:'قميص',service:'كي',count:1,unit:2000,price:2000,status:'wash',paid:false,date:d},{id:'l2',no:'L2',customer:'سارة',phone:'44001100',country:'222',type:'فستان',service:'غسيل',count:1,unit:1400,price:1400,status:'wash',paid:false,date:d}];
    state.storeSales=[{id:'s1',no:'S1',customerId:'c1',customerName:'أهل دار أنفع',items:[],total:300,paidAmount:0,paid:false,date:d}];
    state.suppliers=[]; state.storePurchases=[]; state.secDebtOpen={}; save(); render(); });
  // store debts: store only
  await page.click('[data-tab="store"]'); await page.click('[data-ssub="debts"]'); await page.waitForTimeout(250);
  let txt=await page.textContent('main');
  log('store debts shows only store total 300 (1 مدين): '+(/ديون المتجر لنا \(1 مدين\)/.test(txt)&&!/4,400/.test(txt)&&!/السجاد/.test(txt.replace(/السجاد\s*$/,'')))+' (expect true)');
  log('no section switcher on store screen: '+((await page.$$('[data-debtkind]')).length===0)+' (expect true)');
  log('card shows laundry debt note: '+/وعليه للمغسلة أيضًا: 2,500/.test(txt)+' (expect true)');
  log('store card amount is 300: '+/300 أوقية/.test(txt)+' (expect true)');
  // laundry screen panel
  await page.click('[data-tab="laundry"]'); await page.waitForTimeout(250);
  txt=await page.textContent('main');
  log('laundry screen shows its debts header 3,400 (2 مدين): '+(/ديون الملابس/.test(txt)&&/3,400/.test(txt)&&/\(2 مدين\)/.test(txt))+' (expect true)');
  log('collapsed by default: '+((await page.$$('.sd-row')).length===0)+' (expect true)');
  await page.click('[data-sd-toggle="lnd"]'); await page.waitForTimeout(200);
  txt=await page.textContent('.sd-panel');
  log('expanded lists debtors with store note: '+((await page.$$('.sd-row')).length===2&&/أهل دار أنفع/.test(txt)&&/ويدين للمتجر 300/.test(txt)&&/سارة/.test(txt))+' (expect true)');
  await page.click('[data-sd-wa="c:c1"]'); await page.waitForTimeout(150);
  const msg=decodeURIComponent((await page.evaluate(()=>window._opened.pop()||'')).split('text=')[1]||'');
  log('reminder from laundry panel uses laundry amount 2,000: '+(msg.includes('2,000')&&!msg.includes('2,800'))+' (expect true)');
  await page.click('[data-sd-go="44001100"]'); await page.waitForTimeout(200);
  log('"عرض" filters laundry to unpaid + phone: '+(await page.evaluate(()=>state.lndFilter==='unpaid'&&state.lndSearch==='44001100'))+' (expect true)');
  // carpets + cars
  await page.click('[data-tab="carpets"]'); await page.waitForTimeout(250);
  log('carpets panel 1,000: '+/ديون السجاد.*1,000/.test((await page.textContent('.sd-head')).replace(/\s+/g,' '))+' (expect true)');
  await page.click('[data-tab="cars"]'); await page.waitForTimeout(250);
  log('cars panel 500: '+/ديون السيارات.*500/.test((await page.textContent('.sd-head')).replace(/\s+/g,' '))+' (expect true)');
  await page.evaluate(()=>{ state.carOps[0].paid=true; save(); render(); }); await page.waitForTimeout(150);
  log('panel disappears when no debts: '+((await page.$$('.sd-panel')).length===0)+' (expect true)');
  // contacts keeps all-sections view
  await page.click('[data-tab="contacts"]'); await page.click('[data-csub="debts"]'); await page.waitForTimeout(250);
  log('contacts debts still has all sections: '+((await page.$$('[data-debtkind]')).length===5)+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
