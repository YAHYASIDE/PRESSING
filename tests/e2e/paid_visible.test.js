// 2.14.0 — طلب قديم دُفع/سُلّم/جهز اليوم يبقى ظاهرًا في قائمة «اليوم» (كان يختفي بعد الدفع ويظهر فقط في 7 أيام/الكل).
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
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  // طلبات أُنشئت قبل 3 أيام، دُفعت/سُلّمت اليوم؛ وأخرى قبل 3 أيام دُفعت أمس؛ وأخرى قديمة لم تُلمس
  await page.evaluate(()=>{ const now=new Date(); const d3=new Date(now); d3.setDate(d3.getDate()-3); const y=new Date(now); y.setDate(y.getDate()-1); const old=iso(d3), t=iso(now), yd=iso(y);
    state.carpetOrders=[
      {id:'r_today',no:'R1',customer:'أحمد',type:'سجادة',count:1,unit:1000,price:1000,status:'done',paid:true,paidDate:t,deliveredDate:t,date:old,editedAt:t},
      {id:'r_yest',no:'R2',customer:'بكر',type:'سجادة',count:1,unit:1000,price:1000,status:'done',paid:true,paidDate:yd,deliveredDate:yd,date:old,editedAt:yd},
      {id:'r_old',no:'R3',customer:'جابر',type:'سجادة',count:1,unit:1000,price:1000,status:'done',paid:true,paidDate:old,deliveredDate:old,date:old,editedAt:old},
      {id:'r_ready',no:'R4',customer:'دليل',type:'سجادة',count:1,unit:1000,price:1000,status:'ready',paid:true,paidDate:old,readyDate:t,date:old,editedAt:t}];
    state.laundryOrders=[{id:'l_today',no:'L1',customer:'سعد',type:'قميص',service:'كي',count:1,unit:500,price:500,status:'done',paid:true,paidDate:t,deliveredDate:t,date:old,editedAt:t}];
    state.carOps=[{id:'c_today',no:'A1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1000,paid:true,paidDate:t,date:old,editedAt:t},
                  {id:'c_old',no:'A2',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1000,paid:true,paidDate:old,date:old,editedAt:old}];
    save(); });
  const has=async(id)=>page.evaluate(id=>!!document.querySelector(`[data-id="${id}"],[data-order="${id}"],[data-op="${id}"],[data-cp="${id}"],[data-lnd="${id}"]`)||document.querySelector('main').innerHTML.includes(id), id);

  // «اليوم» (الافتراضي)
  await page.click('[data-tab="carpets"]'); await page.waitForTimeout(300);
  let txt=await page.textContent('main');
  log('today: rug paid today visible: '+/أحمد/.test(txt)+' (expect true) | rug ready today visible: '+/دليل/.test(txt)+' (expect true)');
  log('today: rug paid yesterday hidden: '+!/بكر/.test(txt)+' (expect true) | untouched old rug hidden: '+!/جابر/.test(txt)+' (expect true)');
  await page.click('[data-tab="laundry"]'); await page.waitForTimeout(300);
  log('today: laundry paid today visible: '+/سعد/.test(await page.textContent('main'))+' (expect true)');
  await page.click('[data-tab="cars"]'); await page.waitForTimeout(300);
  txt=await page.textContent('main');
  log('today: car paid today visible: '+/A1/.test(txt)+' (expect true) | old car hidden: '+!/A2/.test(txt)+' (expect true)');
  log('today income counts the rug paid today: '+(await page.evaluate(()=>periodSummary(ymd(new Date()),ymd(new Date())).rugs===1000))+' (expect true)');

  // «أمس»
  await page.click('[data-tab="carpets"]'); await page.waitForTimeout(200);
  await page.click('[data-preset="yesterday"]'); await page.waitForTimeout(300);
  txt=await page.textContent('main');
  log('yesterday: rug paid yesterday visible: '+/بكر/.test(txt)+' (expect true) | rug paid today hidden: '+!/أحمد/.test(txt)+' (expect true)');
  // «الكل»
  await page.click('[data-preset="all"]'); await page.waitForTimeout(300);
  txt=await page.textContent('main');
  log('all: every rug visible: '+(/أحمد/.test(txt)&&/بكر/.test(txt)&&/جابر/.test(txt)&&/دليل/.test(txt))+' (expect true)');
  log('inRange(undefined) is false, no crash: '+(await page.evaluate(()=>inRange(undefined)===false && inRange(null)===false))+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
