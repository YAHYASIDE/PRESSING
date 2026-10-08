// 2.18.0 — الرئيسية بثلاث طبقات: أرقام اليوم → يحتاج إجراء → نهاية اليوم، والتفاصيل حسب النوع مطوية افتراضيًا.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:820} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const login=async(n,p)=>{ if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch'); await page.fill('#lockName',n); await page.fill('#lockInput',p); await page.click('#lockEnter'); await page.waitForTimeout(400); };
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await login('مالك','0707');
  await page.evaluate(()=>{ const d=iso(new Date()); try{ localStorage.removeItem('sadaqa_dash_details'); }catch(e){}
    state.carOps=[{id:'c1',no:'A1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1000,paid:true,paidDate:d,payMethod:'cash',date:d,editedAt:d},{id:'c2',no:'A2',vehicle:'شاحنة',wash:'غسيل خارجي',price:5000,paid:false,date:d,editedAt:d}];
    state.carpetOrders=[{id:'r1',no:'R1',customer:'أحمد',type:'سجادة',count:1,unit:2000,price:2000,status:'wash',paid:false,date:d,editedAt:d}];
    state.laundryOrders=[{id:'l1',no:'L1',customer:'سعد',type:'قميص',service:'كي',count:1,unit:500,price:500,status:'ready',paid:false,date:d,editedAt:d}];
    state.users=[{id:'w1',name:'عامل',pin:'1111'}]; save(); render(); });
  await page.waitForTimeout(300);

  const order=await page.evaluate(()=>[...document.querySelectorAll('.dash-sec')].map(x=>x.textContent.trim()));
  log('three layers in order (أرقام → يحتاج إجراء → نهاية اليوم): '+(order.length===3 && /أرقام/.test(order[0]) && /يحتاج إجراء/.test(order[1]) && /نهاية اليوم/.test(order[2]))+' (expect true)');
  log('layer 1 has finance summary + profit cards: '+((await page.isVisible('.fin-wrap')) && /الربح المجمّع/.test(await page.textContent('main')))+' (expect true)');
  log('layer 2 action cards show dues 7,500 (3 orders), 1 rug washing, 1 laundry active: '+(await page.evaluate(()=>{ const t=[...document.querySelectorAll('.act-card')].map(x=>x.textContent); return t.length===3 && /7,500/.test(t[0]) && /3 طلب/.test(t[0]) && /^.*سجاد قيد الغسيل\s*1/.test(t[1].replace(/\s+/g,' ')) && /ملابس قيد العمل\s*1/.test(t[2].replace(/\s+/g,' ')); }))+' (expect true)');
  log('layer 3: report button renamed and status chip present: '+(/تقرير اليوم/.test(await page.textContent('#openClosing')) && (await page.isVisible('[data-daystat]')))+' (expect true)');
  log('details collapsed by default: '+(await page.evaluate(()=>!document.getElementById('dashDetails').open) && !(await page.isVisible('.veh-grid')))+' (expect true)');
  log('details still contain by-type panels and pay strip: '+(await page.evaluate(()=>document.querySelectorAll('#dashDetails .veh-card').length>=3 && !!document.querySelector('#dashDetails .pm-strip') && /دخل اليوم حسب النوع/.test(document.getElementById('dashDetails').textContent)))+' (expect true)');
  await page.click('#dashDetails summary'); await page.waitForTimeout(200);
  log('opening details shows panels and is remembered: '+((await page.isVisible('.veh-grid')) && (await page.evaluate(()=>localStorage.getItem('sadaqa_dash_details')==='1')))+' (expect true)');
  await page.click('[data-tab="cars"]'); await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(300);
  log('details stay open after re-render: '+(await page.evaluate(()=>document.getElementById('dashDetails').open))+' (expect true)');
  await page.click('#dashDetails summary'); await page.waitForTimeout(100);
  // action cards navigate
  await page.click('.act-card[data-go="contacts"]'); await page.waitForTimeout(300);
  log('dues card opens contacts ▸ debts: '+(await page.evaluate(()=>state.tab==='contacts' && state.contactsSub==='debts'))+' (expect true)');
  await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(200);
  await page.click('.act-card[data-go="laundry"]'); await page.waitForTimeout(300);
  log('laundry card opens laundry tab: '+(await page.evaluate(()=>state.tab==='laundry'))+' (expect true)');
  // worker view
  await page.evaluate(()=>lockNow()); await page.waitForTimeout(300); await login('عامل','1111'); await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(300);
  log('worker: no profit cards, no closing button, but report buttons and layers: '+(await page.evaluate(()=>!document.getElementById('openClosing') && !/الربح المجمّع/.test(document.querySelector('main').textContent) && !!document.getElementById('sendReport') && document.querySelectorAll('.dash-sec').length===3))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
