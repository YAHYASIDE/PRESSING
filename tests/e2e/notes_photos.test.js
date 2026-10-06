const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram|anon auth/i;
const PNG='/tmp/claude-0/-home-user-PRESSING/1dfcf506-9062-545f-ac7d-aa216f6c086b/scratchpad/px.png';
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:900} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const hold=async(sel)=>{ await page.dispatchEvent(sel,'pointerdown',{pointerId:1,bubbles:true}); await page.waitForTimeout(1250); await page.dispatchEvent(sel,'pointerup',{pointerId:1,bubbles:true}); await page.waitForTimeout(300); };
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ state.carpetOrders=[]; state.laundryOrders=[]; save(); });

  // ===== picker: gallery or camera =====
  await page.click('[data-tab="carpets"]'); await page.waitForTimeout(200);
  const pk = await page.evaluate(()=>{ const ins=[...document.querySelectorAll('#cpPhotoStrip input[type=file]')]; return {n:ins.length, cam:ins.some(i=>i.hasAttribute('capture')), gal:ins.some(i=>!i.hasAttribute('capture')&&i.multiple)}; });
  log('carpet photos: camera + gallery inputs: '+(pk.n===2&&pk.cam&&pk.gal)+' (expect true)');
  // ===== carpet with note (multi) =====
  await page.fill('#cpCust','محمد لمين');
  const ptypes = await page.evaluate(()=>Object.keys(state.piecePrices));
  await page.click(`[data-ppick="${ptypes[0]}"]`); await page.fill('#cpPrice','1500'); await page.fill('#cpCount','1'); await page.fill('#cpNote','سجاد 6×4 أحمر واضح');
  await page.click('#cpAddLine'); await page.waitForTimeout(150);
  log('note kept in draft line + field cleared: '+(await page.evaluate(()=>invDraft.cp[0].note==='سجاد 6×4 أحمر واضح'&&document.getElementById('cpNote').value===''))+' (expect true)');
  log('draft shows note: '+/📝 سجاد 6×4/.test(await page.textContent('#cpLines'))+' (expect true)');
  await page.click(`[data-ppick="${ptypes[1]}"]`); await page.fill('#cpPrice','500'); await page.fill('#cpCount','2'); await page.fill('#cpNote','أزرق');
  await hold('#cpSave');
  const c = await page.evaluate(()=>state.carpetOrders[0]);
  log('saved notes per item: '+(c.items&&c.items[0].note==='سجاد 6×4 أحمر واضح'&&c.items[1].note==='أزرق')+' (expect true)');
  log('card shows notes: '+/📝 .*سجاد 6×4 أحمر واضح/.test(await page.textContent('.grid.orders'))+' (expect true)');
  await page.click(`[data-receipt="${c.id}"]`); await page.waitForTimeout(150);
  log('receipt shows note: '+/6×4 أحمر/.test(await page.textContent('#receiptContent'))+' (expect true)'); await page.click('#receiptClose');
  log('bot list shows note: '+(await page.evaluate(()=>/\[سجاد 6×4 أحمر واضح\]/.test(tgHandleText('🧺 السجاد'))))+' (expect true)');
  // edit: note editable
  await page.click(`[data-edit-order="${c.id}"]`); await page.waitForTimeout(200);
  log('edit has note inputs: '+((await page.$$('#edLines .edl-note')).length===2)+' (expect true)');
  const rows = await page.$$('#edLines .ed-line'); await rows[1].$eval('.edl-note',(i)=>{ i.value='أزرق غامق'; });
  await page.click('#editSave'); await page.waitForTimeout(200);
  log('edited note saved: '+(await page.evaluate(()=>state.carpetOrders[0].items[1].note==='أزرق غامق'))+' (expect true)');
  // single order note
  await page.fill('#cpCust','سالم'); await page.click(`[data-ppick="${ptypes[0]}"]`); await page.fill('#cpPrice','700'); await page.fill('#cpCount','1'); await page.fill('#cpNote','بقعة زيت');
  await hold('#cpSave');
  log('single order note: '+(await page.evaluate(()=>{ const o=state.carpetOrders[1]; return !o.items&&o.note==='بقعة زيت'; }))+' (expect true)');

  // ===== laundry: note + photos =====
  await page.click('[data-tab="laundry"]'); await page.waitForTimeout(200);
  log('laundry photo strip exists: '+(await page.isVisible('#lndPhotoStrip'))+' (expect true)');
  await page.fill('#lndCust','أحمد'); await page.click('[data-lndtype="قميص"]'); await page.fill('#lndPrice','200'); await page.fill('#lndCount','3'); await page.fill('#lndNote','قميص أبيض، بقعة على الياقة');
  const gal = await page.$('#lndPhotoStrip input[type=file]:not([capture])'); await gal.setInputFiles(PNG); await page.waitForTimeout(400);
  log('photo added to pending laundry photos: '+(await page.evaluate(()=>pendingLndPhotos.length===1&&/^data:image/.test(pendingLndPhotos[0])))+' (expect true)');
  await hold('#lndSave');
  const l = await page.evaluate(()=>({o:state.laundryOrders[0], pend:pendingLndPhotos.length}));
  log('laundry saved with note + photo: '+(l.o.note==='قميص أبيض، بقعة على الياقة'&&l.o.photos.length===1&&l.pend===0)+' (expect true)');
  log('laundry card shows note + thumb: '+(await page.evaluate(()=>{ const g=document.querySelector('.grid.orders'); return /📝 قميص أبيض/.test(g.textContent)&&!!g.querySelector('img'); }))+' (expect true)');
  log('cloud copy strips laundry photos but keeps note: '+(await page.evaluate(()=>{ const c=cloudCopy().laundryOrders[0]; return !('photos' in c)&&c.note==='قميص أبيض، بقعة على الياقة'; }))+' (expect true)');
  log('remote merge re-attaches local photo: '+(await page.evaluate(()=>{ const r=JSON.parse(JSON.stringify(cloudCopy())); applyRemote(r); return state.laundryOrders[0].photos.length===1; }))+' (expect true)');
  log('laundry edit has note input: '+(await page.evaluate(()=>{ openEditLnd(state.laundryOrders[0].id); return !!document.querySelector('#edLines .edl-note'); }))+' (expect true)');
  await page.click('#editClose');

  // ===== product image: camera + gallery =====
  await page.click('[data-tab="store"]'); await page.click('[data-ssub="products"]'); await page.waitForTimeout(200);
  const pi = await page.evaluate(()=>{ const ins=[...document.querySelectorAll('.prodImgInp')]; return {n:ins.length, cam:ins.filter(i=>i.hasAttribute('capture')).length, gal:ins.filter(i=>!i.hasAttribute('capture')).length}; });
  log('product image: camera + gallery: '+(pi.n===2&&pi.cam===1&&pi.gal===1)+' (expect true)');
  const pg = await page.$('.prodImgInp:not([capture])'); await pg.setInputFiles(PNG); await page.waitForTimeout(400);
  log('gallery image loads into product form: '+(await page.evaluate(()=>/^data:image/.test(pendingProdImg)))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
