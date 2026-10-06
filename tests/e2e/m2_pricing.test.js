const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram|anon auth/i;
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
  await page.evaluate(()=>{ state.carpetOrders=[]; save(); });
  // migration defaults
  const m = await page.evaluate(()=>({u:state.pieceUnit, p:state.piecePrices}));
  log('defaults: موكيت 800/م, سجاد 1000/م, وسادة per piece: '+(m.u['موكيت']==='m2'&&m.p['موكيت']===800&&m.u['سجاد داكن']==='m2'&&m.p['سجاد داكن']===1000&&!m.u['وسادة'])+' (expect true)');
  await page.click('[data-tab="carpets"]'); await page.waitForTimeout(200);
  log('piece type (وسادة) hides dims: '+!(await page.isVisible('#cpDimsRow'))+' (expect true)');
  await page.click('[data-ppick="سجاد داكن"]'); await page.waitForTimeout(100);
  log('metre type shows length + label سعر المتر: '+((await page.isVisible('#cpDimsRow'))&&(await page.textContent('#cpPriceLbl')).includes('المتر')&&(await page.inputValue('#cpPrice'))==='1000')+' (expect true)');
  await page.fill('#cpCust','محمد'); await page.fill('#cpLen','6'); await page.waitForTimeout(100);
  log('6 m × 1000 = 6,000: '+((await page.textContent('#cpArea')).includes('6 م')&&(await page.textContent('#cpTotal'))==='6,000')+' (expect true)');
  await page.fill('#cpPrice','1200'); await page.waitForTimeout(100);
  log('editable metre price -> 7,200: '+((await page.textContent('#cpTotal'))==='7,200')+' (expect true)');
  await page.fill('#cpCount','2'); await page.waitForTimeout(100);
  log('2 pieces -> 14,400: '+((await page.textContent('#cpTotal'))==='14,400')+' (expect true)');
  await page.fill('#cpCount','1');
  // missing dims blocked
  await page.fill('#cpLen',''); await hold('#cpSave');
  log('missing length blocked: '+(await page.evaluate(()=>state.carpetOrders.length===0))+' (expect true)');
  await page.fill('#cpLen','6'); await hold('#cpSave');
  const o = await page.evaluate(()=>state.carpetOrders[0]);
  log('saved with length (6 م, 1200/م, 7,200): '+(!!o.dims&&o.dims.l===6&&o.dims.m2===1200&&o.unit===7200&&o.price===7200)+' (expect true)');
  log('metre price remembered as default: '+(await page.evaluate(()=>state.piecePrices['سجاد داكن']===1200))+' (expect true)');
  const card=await page.textContent('.grid.orders');
  log('card shows 6 م: '+/سجاد داكن 6 م/.test(card)+' (expect true)');
  await page.click(`[data-receipt="${o.id}"]`); await page.waitForTimeout(150);
  log('receipt shows الطول line: '+/الطول/.test(await page.textContent('#receiptContent'))+' (expect true)'); await page.click('#receiptClose');
  log('bot list shows length: '+(await page.evaluate(()=>/سجاد داكن 6 م/.test(tgHandleText('🧺 السجاد'))))+' (expect true)');
  // mixed invoice: موكيت 3×2 @800 + وسادة 500
  await page.fill('#cpCust','سالم'); await page.click('[data-ppick="موكيت"]'); await page.fill('#cpLen','3'); await page.click('#cpAddLine'); await page.waitForTimeout(150);
  log('draft shows length × price: '+/3 م × 800/.test(await page.textContent('#cpLines'))+' (expect true)');
  await page.click('[data-ppick="وسادة"]'); await page.fill('#cpPrice','500'); await page.fill('#cpCount','1'); await hold('#cpSave');
  const o2 = await page.evaluate(()=>state.carpetOrders[1]);
  log('mixed invoice 2,400+500=2,900: '+(o2.items&&o2.items[0].dims&&o2.items[0].price===2400&&!o2.items[1].dims&&o2.price===2900)+' (expect true)');
  // edit dims
  await page.click(`[data-edit-order="${o.id}"]`); await page.waitForTimeout(200);
  log('edit shows dims inputs (readonly unit): '+(await page.evaluate(()=>{ const r=document.querySelector('#edLines .ed-line'); return r.querySelector('.edl-dims').style.display!=='none'&&r.querySelector('.edl-unit').readOnly; }))+' (expect true)');
  await page.$eval('#edLines .edl-len',(i)=>{ i.value='5'; i.dispatchEvent(new Event('input')); }); await page.waitForTimeout(100);
  log('edit recalculates 5×1200=6,000: '+((await page.textContent('#edTotal')).includes('6,000'))+' (expect true)');
  await page.click('#editSave'); await page.waitForTimeout(200);
  log('edited length saved: '+(await page.evaluate(()=>{ const x=state.carpetOrders[0]; return x.dims.l===5&&x.price===6000; }))+' (expect true)');
  // catalog toggle
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(300);
  await page.evaluate(()=>{ const cb=document.querySelector('[data-m2="وسادة"]'); cb.checked=true; cb.dispatchEvent(new Event('change')); }); await page.waitForTimeout(150);
  log('catalog toggle marks وسادة as per-metre: '+(await page.evaluate(()=>state.pieceUnit['وسادة']==='m2'))+' (expect true)');
  await page.evaluate(()=>{ const cb=document.querySelector('[data-m2="وسادة"]'); cb.checked=false; cb.dispatchEvent(new Event('change')); });
  await page.click('#setClose');
  log('number inputs use Latin digits (lang=en): '+(await page.evaluate(()=>[...document.querySelectorAll('input[type=number]')].every(i=>i.lang==='en')))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
