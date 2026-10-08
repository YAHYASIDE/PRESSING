// 2.13.0 — سلامة التخزين: الصور في IndexedDB لا في localStorage/السحابة، كشف فشل الحفظ المحلي،
// editedAt عند الإنشاء، إصدار الجهاز في سجل الدخول، لوحة «صحة البيانات»، وتنبيه الإصدار الأحدث.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
const PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1100,height:900} });
  const page = await ctx.newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const hold=async(sel)=>{ await page.dispatchEvent(sel,'pointerdown',{pointerId:1,bubbles:true}); await page.waitForTimeout(1250); await page.dispatchEvent(sel,'pointerup',{pointerId:1,bubbles:true}); await page.waitForTimeout(300); };
  const login=async()=>{ if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch'); await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400); };
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await login();

  // ===== سجل الدخول يحمل إصدار الجهاز =====
  const lv = await page.evaluate(()=>({ ver:state.logins[state.logins.length-1].ver, app:window.APP_VERSION }));
  log('login records app version: '+(lv.ver===lv.app && !!lv.app)+' (expect true)');
  log('state.appVer set to current version: '+(await page.evaluate(()=>state.appVer===window.APP_VERSION))+' (expect true)');

  // ===== إنشاء سيارة بصور قبل/بعد عبر الواجهة → editedAt موجود =====
  await page.click('[data-tab="cars"]'); await page.waitForTimeout(300);
  await page.evaluate(PX=>{ pendingCarBefore.push(PX); pendingCarAfter.push(PX); }, PX);
  await page.fill('#carPlate','1234AB'); await page.fill('#carPrice','1000'); await hold('#carSave');
  const car = await page.evaluate(()=>{ const o=state.carOps[state.carOps.length-1]; return { ed:!!o.editedAt, b:(o.photosBefore||[]).length, a:(o.photosAfter||[]).length, id:o.id }; });
  log('new car has editedAt: '+car.ed+' (expect true) | photos kept in memory: '+(car.b===1&&car.a===1)+' (expect true)');
  // سجاد وملابس عبر state (مسار الإنشاء) — editedAt
  await page.evaluate(PX=>{ state.carpetOrders.push({id:uid(),no:'R1',customer:'س',status:'wash',type:'سجاد',count:1,unit:1000,price:1000,photos:[PX],date:iso(new Date()),editedAt:iso(new Date())}); state.storeProducts.push({id:'pimg1',name:'صابون',price:100,cost:50,stock:5,image:PX}); save(); }, PX);
  await page.waitForTimeout(700);

  // ===== localStorage بلا صور، السحابة بلا صور، الصور في IndexedDB =====
  const ls = await page.evaluate(()=>{ const j=JSON.parse(localStorage.getItem('sadaqa_laundry_v1')); const c=j.carOps[j.carOps.length-1]; const p=j.storeProducts.find(x=>x.id==='pimg1'); return { noB:!('photosBefore' in c), noA:!('photosAfter' in c), noImg:!p.image, rugNo:!('photos' in j.carpetOrders[j.carpetOrders.length-1]) }; });
  log('localStorage has no car before/after photos: '+(ls.noB&&ls.noA)+' (expect true) | no product image: '+ls.noImg+' (expect true) | no rug photos: '+ls.rugNo+' (expect true)');
  const cc = await page.evaluate(()=>{ const j=cloudCopy(); const c=j.carOps[j.carOps.length-1]; return !('photosBefore' in c) && !('photosAfter' in c) && !('photos' in c) && !j.storeProducts.find(x=>x.id==='pimg1').image && !('photos' in j.carpetOrders[j.carpetOrders.length-1]); });
  log('cloudCopy strips ALL photos incl. car before/after: '+cc+' (expect true)');
  const idb = await page.evaluate(async(id)=>{ const db=await _idb(); return await new Promise(res=>{ const rq=db.transaction('photos','readonly').objectStore('photos').getAll(); rq.onsuccess=()=>res(rq.result.map(r=>r.k)); rq.onerror=()=>res([]); }); }, car.id);
  log('IndexedDB photos store has car before/after + product image: '+(idb.includes('cb'+car.id)&&idb.includes('ca'+car.id)&&idb.includes('pipimg1'))+' (expect true)');

  // ===== إعادة التحميل: الصور تعود من IndexedDB =====
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1500);
  const back = await page.evaluate((id)=>{ const o=state.carOps.find(x=>x.id===id); const p=state.storeProducts.find(x=>x.id==='pimg1'); return { b:(o.photosBefore||[]).length, a:(o.photosAfter||[]).length, img:!!(p&&p.image), rug:(state.carpetOrders[state.carpetOrders.length-1].photos||[]).length }; }, car.id);
  log('after reload photos re-attached from IndexedDB: '+(back.b===1&&back.a===1&&back.img&&back.rug===1)+' (expect true)');
  log('session restored without code: '+(await page.evaluate(()=>unlocked===true))+' (expect true)');

  // ===== محاكاة المزامنة: remote بلا صور لا يمسح الصور المحلية =====
  await page.evaluate((id)=>{ const r=JSON.parse(JSON.stringify(cloudCopy())); r.appVer='99.0.0'; applyRemote(r); }, car.id);
  await page.waitForTimeout(200);
  const afterRemote = await page.evaluate((id)=>{ const o=state.carOps.find(x=>x.id===id); return (o.photosBefore||[]).length===1 && (o.photosAfter||[]).length===1 && !!state.storeProducts.find(x=>x.id==='pimg1').image; }, car.id);
  log('applyRemote keeps local photos: '+afterRemote+' (expect true)');
  log('newer version on another device shows update banner: '+(await page.evaluate(()=>document.getElementById('updateBanner').style.display==='flex'))+' (expect true)');
  log('banner text names the version: '+/99\.0\.0/.test(await page.textContent('#updateBanner'))+' (expect true)');
  log('state.appVer keeps the max: '+(await page.evaluate(()=>state.appVer==='99.0.0'))+' (expect true)');

  // ===== فشل الحفظ المحلي (امتلاء الذاكرة) لا يمرّ بصمت =====
  await page.evaluate(()=>{ window._origSet=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){ if(k==='sadaqa_laundry_v1'){ const e=new Error('QuotaExceededError'); e.name='QuotaExceededError'; throw e; } return window._origSet.call(this,k,v); }; });
  const r1 = await page.evaluate(()=>saveLocal());
  log('saveLocal returns false on quota error: '+(r1===false)+' (expect true)');
  log('storage warning bar shown: '+(await page.evaluate(()=>document.getElementById('storageWarn').style.display==='flex'))+' (expect true)');
  log('toast warns user: '+/ممتلئة/.test(await page.textContent('#toast'))+' (expect true)');
  await page.evaluate(()=>{ Storage.prototype.setItem=window._origSet; });
  const r2 = await page.evaluate(()=>saveLocal());
  log('saveLocal recovers: '+(r2===true)+' (expect true) | warning hidden again: '+(await page.evaluate(()=>document.getElementById('storageWarn').style.display==='none'))+' (expect true)');

  // ===== لوحة صحة البيانات في الإعدادات =====
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(900);
  const h = await page.textContent('#healthAdmin');
  log('health panel shows version: '+h.includes(await page.evaluate(()=>window.APP_VERSION))+' (expect true)');
  log('health panel shows local save OK: '+/الحفظ على الجهاز: ✅/.test(h)+' (expect true)');
  log('health panel shows photos count: '+/الصور على الجهاز: 4/.test(h)+' (expect true)');
  log('health panel flags newer version elsewhere: '+/جهاز آخر على 99\.0\.0/.test(h)+' (expect true)');
  log('health panel lists device versions: '+/مالك: /.test(h)+' (expect true)');
  await page.click('#healthRefresh'); await page.waitForTimeout(100);
  log('refresh keeps panel: '+(await page.isVisible('#healthSync'))+' (expect true)');

  // ===== الاسترجاع من نسخة يعيد ربط الصور المحلية =====
  await page.evaluate((id)=>{ const snap=JSON.parse(JSON.stringify(cloudCopy())); state.carOps=state.carOps.filter(x=>x.id!==id); restoreMissing(snap); }, car.id);
  const rest = await page.evaluate((id)=>{ const o=state.carOps.find(x=>x.id===id); return !!o && (o.photosBefore||[]).length===1; }, car.id);
  log('restored record gets its photos back: '+rest+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
