// 2.42.0 — بطاقة السيارة: اسم الزبون أعلاها، اللوحة تُحفظ وتُقترح (Aa واحد، بحث بأي جزء)، الزبون يُحفظ تلقائيًا بعدة سيارات،
// أنواع السيارات دوائر صغيرة، أزرار الصور دائرية في صف واحد، زر الدفع المؤجّل = دين، والتاريخ بالفرنسية والأرقام لاتينية في كل الأقسام.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:860}, locale:'ar-EG' })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const hold=async(sel)=>{ const b=await page.$(sel); await b.evaluate(e=>e.scrollIntoView({block:'center'})); await page.waitForTimeout(80); const bb=await b.boundingBox(); await page.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2); await page.mouse.down(); await page.waitForTimeout(1150); await page.mouse.up(); await page.waitForTimeout(300); };
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ state.carOps=[]; state.customers={}; state.storeCustomers=[]; state.tab='cars'; state.dateFrom=state.dateTo=ymd(new Date()); save(); render(); });
  await page.waitForTimeout(300);
  let r=await page.evaluate(()=>{ const p=document.querySelector('#vPicker .pick'), im=p.querySelector('.pick-img,svg'), rc=p.getBoundingClientRect(), ir=im.getBoundingClientRect(); return { w:rc.width, h:rc.height, iw:ir.width, br:getComputedStyle(im).borderRadius, perRow:[...document.querySelectorAll('#vPicker .pick')].filter(x=>Math.abs(x.getBoundingClientRect().top-rc.top)<2).length }; });
  log('car types are small circles (≤ 44px, round, ≥ 4 per row): '+(r.iw<=44 && /50%/.test(r.br) && r.perRow>=4 && r.h<80)+' (expect true)');
  log('the name field sits at the top with the plate: '+(await page.evaluate(()=>{ const n=document.getElementById('carName'), p=document.getElementById('carPlate'); return !!n && !!p && Math.abs(n.getBoundingClientRect().top-p.getBoundingClientRect().top)<4; }))+' (expect true)');
  r=await page.evaluate(()=>{ const c=document.querySelector('#carBeforeStrip .pa .pa-ic'), g=document.querySelector('#carAfterStrip .pa-gal .pa-ic'), b=document.getElementById('carBeforeStrip').getBoundingClientRect(), a=document.getElementById('carAfterStrip').getBoundingClientRect(); return { round:/50%/.test(getComputedStyle(c).borderRadius), w:c.getBoundingClientRect().width, colored:getComputedStyle(c).backgroundImage!=='none' && getComputedStyle(g).backgroundImage!=='none', row:Math.abs(b.top-a.top)<4 }; });
  log('photo buttons are small coloured circles, before and after in one row: '+(r.round && r.w<=34 && r.colored && r.row)+' (expect true)');
  // 1) أول عملية: اسم + لوحة بأحرف صغيرة + هاتف
  await page.fill('#carName','محمد سالم'); await page.fill('#carPlate','1234 ab'); await page.fill('#carPhone','22334455');
  log('the plate is written in capitals: '+(await page.inputValue('#carPlate')==='1234 AB')+' (expect true)');
  await page.fill('#carPrice','300'); await page.click('#carPm [data-pm="cash"]'); await hold('#carSave');
  r=await page.evaluate(()=>{ const o=state.carOps[0], c=state.storeCustomers.find(x=>x.phone==='22334455'); return { plate:o.plate, nm:o.custName, cid:o.custId, c:!!c, cn:c&&c.name, loy:state.customers['1234 AB']&&state.customers['1234 AB'].name }; });
  log('saving keeps the plate in capitals and the name on the operation: '+(r.plate==='1234 AB' && r.nm==='محمد سالم')+' (expect true)');
  log('the customer is saved automatically in «الزبائن» with his phone: '+(r.c && r.cn==='محمد سالم' && !!r.cid)+' (expect true)');
  log('the loyalty card carries the name: '+(r.loy==='محمد سالم')+' (expect true)');
  r=await page.evaluate(()=>{ const c=document.querySelector('.car-card'), t=c.textContent; return { name:/محمد سالم/.test(c.querySelector('.cc-cust').textContent), top:c.querySelector('.cc-cust').getBoundingClientRect().top<c.querySelector('.cc-main').getBoundingClientRect().top, fr:/\d{2}\/\d{2}\/\d{4}/.test(c.querySelector('.date-chip').textContent), iso:/\d{4}-\d{2}-\d{2}/.test(t) }; });
  log('the card shows the customer name on top: '+(r.name && r.top)+' (expect true)');
  log('the card date is French (17/10/2026), not 2026-10-17: '+(r.fr && !r.iso)+' (expect true)');
  // 2) نفس اللوحة بأحرف صغيرة = نفس الزبون؛ الاقتراح بأي جزء
  await page.fill('#carName',''); await page.fill('#carPhone',''); await page.fill('#carPlate','4 a'); await page.waitForTimeout(150);
  r=await page.evaluate(()=>({ n:document.querySelectorAll('#plateSugg .ps-item').length, t:document.getElementById('plateSugg').textContent, vis:document.getElementById('plateSugg').style.display!=='none' }));
  log('typing any part of the plate («4 a») suggests the saved plate with its name: '+(r.vis && r.n===1 && /1234 AB/.test(r.t) && /محمد سالم/.test(r.t))+' (expect true)');
  await page.click('#plateSugg .ps-item'); await page.waitForTimeout(150);
  r=await page.evaluate(()=>({ p:document.getElementById('carPlate').value, n:document.getElementById('carName').value, ph:document.getElementById('carPhone').value, loy:/1 غسلة|غسلة/.test(document.getElementById('loyaltyBox').textContent) }));
  log('choosing it fills plate, name and phone: '+(r.p==='1234 AB' && r.n==='محمد سالم' && r.ph==='22334455')+' (expect true)');
  await page.fill('#carPlate','1234 ab'); await page.waitForTimeout(100);
  log('lower-case plate opens the same loyalty card (Aa = same): '+(await page.evaluate(()=>/1 غسلة/.test(document.getElementById('loyaltyBox').textContent)))+' (expect true)');
  // 3) سيارة ثانية لنفس الزبون
  await page.fill('#carPlate','5678 CD'); await page.fill('#carPrice','300'); await page.click('#carPm [data-pm="cash"]'); await hold('#carSave');
  r=await page.evaluate(()=>({ nCust:state.storeCustomers.filter(x=>x.phone==='22334455').length, plates:custPlates('22334455') }));
  log('a second car for the same customer does not duplicate him; he has 2 cars: '+(r.nCust===1 && r.plates.length===2 && r.plates.includes('1234 AB') && r.plates.includes('5678 CD'))+' (expect true)');
  await page.fill('#carPhone','22334455'); await page.waitForTimeout(150);
  log('typing his phone shows his cars to pick from: '+(await page.evaluate(()=>document.querySelectorAll('#custCars [data-pick-plate]').length===2 && document.getElementById('carName').value==='محمد سالم'))+' (expect true)');
  await page.fill('#carPhone',''); await page.fill('#carName',''); await page.fill('#carPlate','');
  // 4) البحث في القائمة بأي جزء من اللوحة
  await page.fill('#carSearch','78 c'); await page.waitForTimeout(250);
  log('list search by any part of the plate, any case («78 c»): '+(await page.evaluate(()=>{ const c=[...document.querySelectorAll('.car-card')]; return c.length===1 && /5678 CD/.test(c[0].textContent); }))+' (expect true)');
  await page.fill('#carSearch',''); await page.waitForTimeout(250);
  // 5) الدفع المؤجّل = دين
  await page.fill('#carPrice','500'); await page.check('#carDeferred'); await page.waitForTimeout(80);
  r=await page.evaluate(()=>({ on:document.getElementById('carDeferWrap').classList.contains('on'), pm:document.getElementById('carPmWrap').style.display, btn:document.getElementById('carSave').textContent }));
  log('the deferred-payment button turns red, hides the pay method and the save says «حفظ كدين»: '+(r.on && r.pm==='none' && /دين/.test(r.btn))+' (expect true)');
  await hold('#carSave');
  log('a deferred payment without a name or phone is refused (a debt needs a person): '+(await page.evaluate(()=>state.carOps.length===2 && /اسم الزبون أو هاتفه/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.fill('#carName','أحمد'); await page.fill('#carPhone','33445566'); await page.fill('#carPlate','9 ZZ'); await hold('#carSave');
  r=await page.evaluate(()=>{ const o=state.carOps[2]; const d=debtors().find(x=>normPhone(x.phone)==='33445566'); return { paid:o.paid, pm:o.payMethod, nm:o.custName, debt:d?d.total:0 }; });
  log('saved as unpaid and it appears as his debt (500): '+(r.paid===false && !r.pm && r.nm==='أحمد' && r.debt===500)+' (expect true)');
  // 6) الأرقام لاتينية والتاريخ بالفرنسية في كل الأقسام (حتى دبو)
  const tabs=['dashboard','cars','carpets','laundry','brick','store','contacts','expenses','reports'];
  let bad=[];
  for(const t of tabs){ const out=await page.evaluate((t)=>{ state.tab=t; render(); const txt=document.getElementById('main').innerText+' '+[...document.querySelectorAll('#main input,#main select')].map(x=>x.value).join(' '); return { ar:(txt.match(/[٠-٩۰-۹]/g)||[]).length, iso:(document.getElementById('main').innerText.match(/\b20\d\d-\d\d-\d\d\b/g)||[]).slice(0,3) }; },t); if(out.ar) bad.push(t+':arabic-digits'); if(out.iso.length) bad.push(t+':'+out.iso.join(',')); }
  for(const sub of ['production','sales','materials','expenses','debts','box','reports','porters']){ const out=await page.evaluate((sub)=>{ state.tab='brick'; state.brickSub=sub; render(); const txt=document.getElementById('main').innerText; return (txt.match(/[٠-٩۰-۹]/g)||[]).length; },sub); if(out) bad.push('brick/'+sub); }
  log('no Arabic-Indic digits and no ISO dates on screen in any section (incl. دبو): '+(bad.length===0)+' (expect true)'+(bad.length?' '+bad.join(' | '):''));
  log('time is shown in 24h French style (no م/ص): '+(await page.evaluate(()=>/^\d{2}:\d{2}$/.test(timeStr(new Date()))))+' (expect true)');
  log('no horizontal overflow at 390px: '+(await page.evaluate(()=>{ state.tab='cars'; render(); return document.documentElement.scrollWidth<=window.innerWidth+1; }))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
