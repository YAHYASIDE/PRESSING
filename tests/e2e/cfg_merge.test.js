// 2.66.0 — تعديل الإعدادات (أسماء السيارات والأصناف والأسعار…) لا يرجع إلى القديم بعد الحفظ/الدمج مع السحابة: يفوز الأحدث (state.cfgAt).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:860} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  let promptAnswer='بيك أب كبير';
  page.on('dialog', d=>d.type()==='prompt'?d.accept(promptAnswer):d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  // نسخة «السحابة» قبل التعديل (الأسماء القديمة)
  const old=await page.evaluate(()=>{ window._cloudOld=JSON.parse(JSON.stringify(cloudCopy())); return Object.keys(state.vehiclePrices); });
  // التعديل من الإعدادات ▸ الأصناف والأسعار (زر ✏️ ثم الاسم الجديد)
  await page.evaluate(()=>openSettings('all')); await page.waitForTimeout(300);
  const first=old[0];
  await page.click(`#catalogAdmin [data-cat-ren="vehiclePrices~${first}"]`); await page.waitForTimeout(250);
  let r=await page.evaluate(f=>({ has:state.vehiclePrices['بيك أب كبير']!=null, gone:state.vehiclePrices[f]==null, at:+((state.cfgAt||{}).vehiclePrices||0) }),first);
  log('rename in settings: new name saved and stamped: '+(r.has&&r.gone&&r.at>0)+' (expect true) '+JSON.stringify(r));
  log('the renamed type keeps its place in the list: '+(await page.evaluate(()=>Object.keys(state.vehiclePrices)[0]==='بيك أب كبير'))+' (expect true)');
  // الرفع: المعاملة تدمج نسخة الخادم القديمة أولًا — يجب ألّا ترجع الأسماء القديمة
  r=await page.evaluate(()=>{ const out=window.mergeForPush?window.mergeForPush(JSON.parse(JSON.stringify(_cloudOld))):null; return { keys:Object.keys(state.vehiclePrices), out:out?Object.keys(out.vehiclePrices||{}):null }; });
  log('merge with the old cloud copy keeps the new name (local and what is written): '+(r.keys.includes('بيك أب كبير')&&!r.keys.includes(first)&&(!r.out||r.out.includes('بيك أب كبير')))+' (expect true) '+JSON.stringify(r));
  r=await page.evaluate(()=>{ applyRemote(JSON.parse(JSON.stringify(_cloudOld))); return Object.keys(state.vehiclePrices); });
  log('a live update from the cloud with the old names does not undo it: '+(r.includes('بيك أب كبير')&&!r.includes(first))+' (expect true)');
  await page.evaluate(()=>{ state.tab='cars'; render(); }); await page.waitForTimeout(200);
  log('the car screen shows the new name: '+(await page.evaluate(()=>!!document.querySelector('[data-vpick="بيك أب كبير"]')))+' (expect true)');
  // جهاز آخر عدّل بعده (وقت أحدث) → يفوز
  r=await page.evaluate(()=>{ const rem=JSON.parse(JSON.stringify(cloudCopy())); rem.vehiclePrices={'سيارة':500,'دراجة':200}; rem.cfgAt=Object.assign({},rem.cfgAt,{vehiclePrices:Date.now()+60000}); applyRemote(rem); return Object.keys(state.vehiclePrices).join(); });
  log('a newer change from another device wins: '+(r==='سيارة,دراجة')+' (expect true) '+r);
  // السعر والرسائل أيضًا
  r=await page.evaluate(()=>{ const before=JSON.parse(JSON.stringify(cloudCopy())); state.vehiclePrices['سيارة']=900; state.shopInfo=Object.assign({},state.shopInfo,{name:'مغاسيل صداقة 2'}); save(); applyRemote(before); return { p:state.vehiclePrices['سيارة'], n:state.shopInfo.name }; });
  log('price and shop name changes also survive the old cloud copy: '+(r.p===900&&r.n==='مغاسيل صداقة 2')+' (expect true) '+JSON.stringify(r));
  log(errors.length?'ERRORS: '+errors.join(' | '):'ERRORS: NONE ✅');
  await browser.close();
})();
