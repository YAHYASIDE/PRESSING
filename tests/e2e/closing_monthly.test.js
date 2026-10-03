const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:1100,height:900} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  // seed: 300 cars today, 500 laundry last month, 50 expense today
  await page.evaluate(()=>{ const d=iso(new Date()); const lm=new Date(); lm.setDate(1); lm.setMonth(lm.getMonth()-1); lm.setDate(10); const l=iso(lm);
    state.workers=[];
    state.carOps=[{id:uid(),no:'A1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:100,paid:true,paidDate:d,date:d,editedAt:d},{id:uid(),no:'A2',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:200,paid:true,paidDate:d,date:d,editedAt:d}];
    state.laundryOrders=[{id:uid(),no:'L1',customer:'س',phone:'33445566',country:'222',type:'قميص',service:'كي',count:1,unit:500,price:500,status:'done',paid:true,paidDate:l,date:l,editedAt:l}];
    state.carpetOrders=[]; state.meters=[]; state.storeSales=[]; state.storePurchases=[]; state.storeCash=[];
    state.expenses=[{id:uid(),amount:50,note:'ماء',category:'عام',date:d,editedAt:d}];
    save(); render(); });

  // ===== تقفيل اليوم =====
  const s = await page.evaluate(()=>periodSummary(ymd(new Date()),ymd(new Date())));
  log('closing car income 300: '+(s.cars===300)+' (expect true) | laundry today 0: '+(s.lnd===0)+' (expect true)');
  log('closing button visible for owner: '+(await page.isVisible('#openClosing'))+' (expect true)');
  await page.click('#openClosing'); await page.waitForTimeout(250);
  const txt = await page.textContent('#receiptContent');
  log('closing modal shows title: '+/تقفيل اليوم/.test(txt)+' (expect true) | shows 300: '+/300/.test(txt)+' (expect true)');
  const wa = await page.evaluate(()=>{ const rows=closingRows(periodSummary(ymd(new Date()),ymd(new Date()))); return closingText(ymd(new Date()),rows); });
  log('whatsapp text has profit line: '+/الربح المجمّع/.test(wa)+' (expect true)');
  await page.evaluate(()=>{ window._opened=null; window.open=(u)=>{ window._opened=u; return null; }; try{ delete navigator.share; }catch(e){} Object.defineProperty(navigator,'share',{value:undefined,configurable:true}); });
  await page.click('#closingWa'); await page.waitForTimeout(150);
  log('whatsapp link opened: '+(await page.evaluate(()=>/wa\.me/.test(window._opened||'')))+' (expect true)');
  await page.click('#receiptClose');

  // ===== التقرير الشهري =====
  await page.click('[data-tab="reports"]'); await page.waitForTimeout(250);
  log('monthly panel present: '+(await page.isVisible('#monthlyPanel'))+' (expect true)');
  log('chart has 12 columns: '+((await page.$$('#mrChart .mr-col')).length===12)+' (expect true)');
  const prevKey = await page.evaluate(()=>prevMonthKey(monthKey(new Date())));
  const m = await page.evaluate(()=>{ const d=monthlyData(); return {cur:d.cur.lnd, prev:d.prev.lnd, cars:d.cur.cars}; });
  log('this month cars 300: '+(m.cars===300)+' (expect true) | last month laundry 500: '+(m.prev===500)+' (expect true)');
  // click last month's column -> selects it
  await page.click(`[data-mr="${prevKey}"]`); await page.waitForTimeout(250);
  log('click selects month: '+(await page.evaluate(k=>document.getElementById('repMonth').value===k,prevKey))+' (expect true)');
  log('selected month laundry 500: '+(await page.evaluate(()=>monthlyData().cur.lnd===500))+' (expect true)');
  // tooltip on hover
  await page.hover(`[data-mr="${prevKey}"]`); await page.waitForTimeout(120);
  log('tooltip shows on hover: '+(await page.isVisible('#mrTip'))+' (expect true)');
  // select via dropdown
  const curKey = await page.evaluate(()=>monthKey(new Date()));
  await page.selectOption('#repMonth', curKey); await page.waitForTimeout(200);
  log('dropdown switch: '+(await page.evaluate(k=>_repMonth===k,curKey))+' (expect true)');
  await page.click('#repMonthPrint'); await page.waitForTimeout(150);
  log('monthly print opens: '+/التقرير الشهري/.test(await page.textContent('#receiptContent'))+' (expect true)');
  await page.click('#receiptClose');
  log('monthly text: '+/مقارنة/.test(await page.evaluate(()=>monthlyText()))+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
