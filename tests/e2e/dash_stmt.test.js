// 2.39.0 — كشف لكل بطاقة في الرئيسية + صور الأنواع (تلقائية/خاصة مُزامنة) + سيارات اليوم لكل نوع + مواد المتجر صفوف صغيرة بالشراء والربح.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:860} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date()), y=iso(new Date(Date.now()-864e5));
    state.vehiclePrices={"انيل":1000,"دراجة نارية":500,"شاحنة":10000,"هايلوكس":4000,"كورولا":3000,"V6":4000,"أخرى":0};
    state.carOps=[{id:'c1',no:'K1',vehicle:'هايلوكس',plate:'1234',wash:'غسيل خارجي',price:4000,paid:true,payMethod:'cash',paidDate:d,date:d,by:'مالك',editedAt:d},
      {id:'c2',no:'K2',vehicle:'هايلوكس',wash:'غسيل خارجي',price:4000,paid:true,payMethod:'bankily',paidDate:d,date:d,by:'مالك',editedAt:d},
      {id:'c3',no:'K3',vehicle:'كورولا',wash:'غسيل كامل',price:3000,paid:false,customer:'سالم',phone:'22334455',date:d,by:'مالك',editedAt:d},
      {id:'c4',no:'K4',vehicle:'دراجة نارية',price:500,paid:true,payMethod:'cash',paidDate:d,date:y,by:'مالك',editedAt:d}];
    state.carpetOrders=[]; state.laundryOrders=[{id:'l1',no:'L1',customer:'مريم',phone:'33445566',type:'قميص',service:'كي',count:3,unit:100,price:300,status:'wash',paid:false,date:d,by:'مالك',editedAt:d}];
    state.expenses=[{id:'e1',amount:2000,category:'وقود',reason:'مازوت',payMethod:'cash',date:d,by:'مالك',editedAt:d}];
    state.workers=[]; state.meters=[]; state.storeSales=[]; state.typeImgs={};
    state.tab='dashboard'; state.dateFrom=state.dateTo=ymd(new Date()); save(); render(); localStorage.setItem('sadaqa_dash_details','1'); render(); });
  await page.waitForTimeout(300);
  const open=async(sel)=>{ await page.evaluate(s=>document.querySelector(s).click(),sel); await page.waitForTimeout(150); const t=await page.evaluate(()=>document.getElementById('receiptModal').style.display==='flex'?document.getElementById('receiptContent').textContent.replace(/\s+/g,' '):''); await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; }); return t; };
  let t=await open('[data-stmt="recv:cash"]');
  log('«كاش» opens a statement: هايلوكس 1234 + the motorcycle paid today (collected), total 4,500: '+(/المستلم|كاش/.test(t) && /هايلوكس 1234/.test(t) && /دراجة نارية/.test(t) && /الإجمالي\s*4,500/.test(t) && !/كورولا/.test(t))+' (expect true)');
  t=await open('[data-stmt="debt:new"]');
  log('«ديون جديدة» lists the unpaid كورولا (customer, phone) and the shirts: 3,300: '+(/كورولا/.test(t) && /سالم/.test(t) && /22334455/.test(t) && /قميص/.test(t) && /غير مدفوع/.test(t) && /الإجمالي\s*3,300/.test(t))+' (expect true)');
  t=await open('[data-stmt="svc:car"]');
  log('«دخل السيارات» card lists today\'s 3 car services (11,000): '+(/الإجمالي\s*11,000/.test(t) && /العدد\s*3/.test(t))+' (expect true)');
  t=await open('[data-stmt="svc:all"]');
  log('hero «إجمالي الإيرادات» opens all services (11,300): '+/الإجمالي\s*11,300/.test(t)+' (expect true)');
  t=await open('[data-stmt="profit:laundry"]');
  log('«ربح المغسلة» explains: income lines minus fuel expense: '+(/دخل السيارات/.test(t) && /مصروفات عامة/.test(t) && /2,000/.test(t))+' (expect true)');
  t=await open('[data-stmt="exp:gen"]');
  log('expense card lists وقود · مازوت 2,000: '+(/وقود/.test(t) && /مازوت/.test(t) && /الإجمالي\s*2,000/.test(t))+' (expect true)');
  t=await open('[data-stmt="type:veh:هايلوكس"]');
  log('tapping the هايلوكس count opens its 2 washes (8,000): '+(/العدد\s*2/.test(t) && /الإجمالي\s*8,000/.test(t))+' (expect true)');
  t=await open('[data-stmt="type:lnd:قميص"]');
  log('tapping the shirt count opens the shirts order (300): '+(/مريم/.test(t) && /الإجمالي\s*300/.test(t))+' (expect true)');
  // الأنواع على حدة في الرئيسية مع صورة
  let r=await page.evaluate(()=>{ const items=[...document.querySelectorAll('[data-stmt^="type:veh:"]')]; const lab=items.map(x=>x.textContent.replace(/\s+/g,' ').trim()); const hx=items.find(x=>/هايلوكس/.test(x.textContent)); return { lab, hxImg:!!(hx&&hx.querySelector('img')), noOther:!lab.some(l=>/^0? ?أخرى/.test(l)&&/[1-9]/.test(l)) }; });
  log('home shows each car type separately (هايلوكس 2, كورولا 1, دراجة نارية 0 today) not lumped in «أخرى»: '+(r.lab.some(l=>/2.*هايلوكس/.test(l)) && r.lab.some(l=>/1.*كورولا/.test(l)))+' (expect true)');
  log('هايلوكس gets a picture automatically (big-car photo) instead of a plain icon: '+r.hxImg+' (expect true)');
  // صورة خاصة من الإعدادات
  r=await page.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=c.height=300; const g=c.getContext('2d'); g.fillStyle='#e33'; g.fillRect(0,0,300,300); const blob=await new Promise(res=>c.toBlob(res,'image/png'));
    const f=new File([blob],'hilux.png',{type:'image/png'}); openSettings('all'); renderCatalogAdmin(); const inp=document.querySelector('[data-timg="veh~هايلوكس"]'); const dt=new DataTransfer(); dt.items.add(f); inp.files=dt.files; inp.dispatchEvent(new Event('change'));
    await new Promise(res=>setTimeout(res,800)); const x=state.typeImgs['veh:هايلوكس']; return { saved:!!(x&&x.img&&x.img.length<20000), inCloud:!!(cloudCopy().typeImgs||{})['veh:هايلوكس'], reset:!!document.querySelector('[data-timg-reset="veh~هايلوكس"]') }; });
  log('owner can pick a picture for a type in settings; stored small (<20KB) and synced to all devices: '+(r.saved && r.inCloud && r.reset)+' (expect true)');
  r=await page.evaluate(()=>{ document.getElementById('settingsModal').style.display='none'; state.tab='cars'; render(); const b=document.querySelector('[data-vpick="هايلوكس"] img'); return !!b && b.src===state.typeImgs['veh:هايلوكس'].img; });
  log('the custom picture appears on the car picker: '+r+' (expect true)');
  r=await page.evaluate(()=>{ const remote=JSON.parse(JSON.stringify(cloudCopy())); remote.typeImgs={'veh:كورولا':{img:'data:image/jpeg;base64,AAA',at:Date.now()}}; applyRemote(remote); return !!state.typeImgs['veh:هايلوكس'] && !!state.typeImgs['veh:كورولا']; });
  log('pictures from two devices merge (none lost): '+r+' (expect true)');
  // المتجر: صفوف صغيرة بسعر البيع والشراء والربح
  r=await page.evaluate(()=>{ state.storeProducts=[{id:'p1',name:'سكر 25 كيل',buyPrice:7500,sellPrice:8200,stock:2,minStock:0},{id:'p2',name:'مكروني',buyPrice:3500,sellPrice:4000,stock:1,minStock:2}]; state.tab='store'; state.storeSub='products'; render();
    const b=document.querySelector('.pos-prod[data-pid="p1"]'), rc=b.getBoundingClientRect(), t=b.textContent.replace(/\s+/g,' '); return { h:rc.height, w:rc.width, t, row:getComputedStyle(b).flexDirection }; });
  log('POS products are small rectangles (row layout, < 70px tall): '+(r.row==='row' && r.h<70 && r.w>r.h*2)+' (expect true)');
  log('each shows sale 8,200, purchase 7,500 and profit 700: '+(/8,200/.test(r.t) && /شراء 7,500/.test(r.t) && /ربح 700/.test(r.t))+' (expect true)');
  // الزبائن والديون في مكان واحد: مربعات الأقسام كلها ظاهرة، بطاقة مختصرة وتفاصيل مطوية، أزرار دائرية متساوية
  r=await page.evaluate(()=>{ state.storeCustomers=[{id:'cu1',name:'سالم',phone:'22334455',country:'222'}]; state.tab='contacts'; state.contactsSub='debts'; state.debtKind='all'; render();
    const tiles=[...document.querySelectorAll('.k-tile')], vw=window.innerWidth; const card=document.querySelector('.debtor-card'); const det=card&&card.querySelector('.dc-details'); const btns=[...card.querySelectorAll('.r-btn .rb-ic')].map(x=>{ const r=x.getBoundingClientRect(); return [Math.round(r.width),Math.round(r.height)]; });
    return { n:tiles.length, allIn:tiles.every(t=>{ const r=t.getBoundingClientRect(); return r.left>=0&&r.right<=vw+1; }), square:tiles.every(t=>{ const r=t.getBoundingClientRect(); return Math.abs(r.width-r.height)<4; }), hidden:det&&det.style.display==='none', head:/سالم/.test(card.querySelector('.dc-head').textContent)&&/3,000/.test(card.querySelector('.dc-amt').textContent), btns, segs:document.querySelectorAll('[data-csub]').length }; });
  log('contacts: one merged tab + suppliers, 7 square tiles all visible (no sideways scroll): '+(r.n===7 && r.allIn && r.square)+' (expect true)');
  log('debtor card shows just name + amount; details folded: '+(r.head && r.hidden)+' (expect true)');
  log('action buttons are round and the same size: '+(r.btns.length>=2 && r.btns.every(b=>b[0]===r.btns[0][0]&&b[1]===r.btns[0][1]&&b[0]===b[1]))+' (expect true)');
  await page.click('.debtor-card [data-debt-toggle]'); await page.waitForTimeout(150);
  log('the fold button opens the details: '+(await page.evaluate(()=>document.querySelector('.debtor-card .dc-details').style.display===''))+' (expect true)');
  await page.click('.k-tile[data-csub="customers"]'); await page.waitForTimeout(200);
  log('«كل الزبائن» tile lists saved customers in the same place: '+(await page.evaluate(()=>state.contactsSub==='customers' && !!document.querySelector('.k-tiles') && /سالم/.test(document.querySelector('main').textContent)))+' (expect true)');
  // الرئيسية: قسم «يحتاج إجراء» يطوى ويُتذكَّر، وأزرار نهاية اليوم متساوية
  await page.evaluate(()=>{ state.tab='dashboard'; render(); }); await page.waitForTimeout(200);
  await page.click('#dashAct > summary'); await page.waitForTimeout(150);
  r=await page.evaluate(()=>({ closed:!document.getElementById('dashAct').open, saved:localStorage.getItem('sadaqa_dash_act')==='0', w:[...document.querySelectorAll('.day-end .mini')].map(b=>Math.round(b.getBoundingClientRect().width)), h:[...document.querySelectorAll('.day-end .mini')].map(b=>Math.round(b.getBoundingClientRect().height)) }));
  log('«يحتاج إجراء» folds with its button and is remembered: '+(r.closed && r.saved)+' (expect true)');
  log('end-of-day buttons are the same width and height: '+(r.w.length===3 && new Set(r.w).size===1 && new Set(r.h).size===1)+' (expect true)');
  await page.evaluate(()=>{ localStorage.setItem('sadaqa_dash_act','1'); });
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
