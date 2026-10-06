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
  log('defaults: موكيت 800/م², سجاد 1000/م², وسادة per piece: '+(m.u['موكيت']==='m2'&&m.p['موكيت']===800&&m.u['سجاد داكن']==='m2'&&m.p['سجاد داكن']===1000&&!m.u['وسادة'])+' (expect true)');
  await page.click('[data-tab="carpets"]'); await page.waitForTimeout(200);
  log('piece type (وسادة) hides dims: '+!(await page.isVisible('#cpDimsRow'))+' (expect true)');
  await page.click('[data-ppick="سجاد داكن"]'); await page.waitForTimeout(100);
  log('m² type shows dims + label سعر المتر²: '+((await page.isVisible('#cpDimsRow'))&&(await page.textContent('#cpPriceLbl')).includes('المتر')&&(await page.inputValue('#cpPrice'))==='1000')+' (expect true)');
  await page.fill('#cpCust','محمد'); await page.fill('#cpLen','6'); await page.fill('#cpWid','4'); await page.waitForTimeout(100);
  log('area 24 m² and total 24,000: '+((await page.textContent('#cpArea')).includes('24 م²')&&(await page.textContent('#cpTotal'))==='24,000')+' (expect true)');
  await page.fill('#cpPrice','1200'); await page.waitForTimeout(100);
  log('editable m² price -> 28,800: '+((await page.textContent('#cpTotal'))==='28,800')+' (expect true)');
  await page.fill('#cpCount','2'); await page.waitForTimeout(100);
  log('2 pieces -> 57,600: '+((await page.textContent('#cpTotal'))==='57,600')+' (expect true)');
  await page.fill('#cpCount','1');
  // missing dims blocked
  await page.fill('#cpLen',''); await hold('#cpSave');
  log('missing dims blocked: '+(await page.evaluate(()=>state.carpetOrders.length===0))+' (expect true)');
  await page.fill('#cpLen','6'); await hold('#cpSave');
  const o = await page.evaluate(()=>state.carpetOrders[0]);
  log('saved with dims (6×4=24, 1200/م², 28,800): '+(!!o.dims&&o.dims.l===6&&o.dims.w===4&&o.dims.area===24&&o.dims.m2===1200&&o.unit===28800&&o.price===28800)+' (expect true)');
  log('m² price remembered as default: '+(await page.evaluate(()=>state.piecePrices['سجاد داكن']===1200))+' (expect true)');
  const card=await page.textContent('.grid.orders');
  log('card shows 6×4 م (24 م²): '+/6×4 م \(24 م²\)/.test(card)+' (expect true)');
  await page.click(`[data-receipt="${o.id}"]`); await page.waitForTimeout(150);
  log('receipt shows القياس line: '+/القياس/.test(await page.textContent('#receiptContent'))+' (expect true)'); await page.click('#receiptClose');
  log('bot list shows dims: '+(await page.evaluate(()=>/6×4 م \(24 م²\)/.test(tgHandleText('🧺 السجاد'))))+' (expect true)');
  // mixed invoice: موكيت 3×2 @800 + وسادة 500
  await page.fill('#cpCust','سالم'); await page.click('[data-ppick="موكيت"]'); await page.fill('#cpLen','3'); await page.fill('#cpWid','2'); await page.click('#cpAddLine'); await page.waitForTimeout(150);
  log('draft shows area: '+/3×2 م = 6 م²/.test(await page.textContent('#cpLines'))+' (expect true)');
  await page.click('[data-ppick="وسادة"]'); await page.fill('#cpPrice','500'); await page.fill('#cpCount','1'); await hold('#cpSave');
  const o2 = await page.evaluate(()=>state.carpetOrders[1]);
  log('mixed invoice 4,800+500=5,300: '+(o2.items&&o2.items[0].dims&&o2.items[0].price===4800&&!o2.items[1].dims&&o2.price===5300)+' (expect true)');
  // edit dims
  await page.click(`[data-edit-order="${o.id}"]`); await page.waitForTimeout(200);
  log('edit shows dims inputs (readonly unit): '+(await page.evaluate(()=>{ const r=document.querySelector('#edLines .ed-line'); return r.querySelector('.edl-dims').style.display!=='none'&&r.querySelector('.edl-unit').readOnly; }))+' (expect true)');
  await page.$eval('#edLines .edl-len',(i)=>{ i.value='5'; i.dispatchEvent(new Event('input')); }); await page.waitForTimeout(100);
  log('edit recalculates 5×4×1200=24,000: '+((await page.textContent('#edTotal')).includes('24,000'))+' (expect true)');
  await page.click('#editSave'); await page.waitForTimeout(200);
  log('edited dims saved: '+(await page.evaluate(()=>{ const x=state.carpetOrders[0]; return x.dims.l===5&&x.dims.area===20&&x.price===24000; }))+' (expect true)');
  // catalog toggle
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(300);
  await page.evaluate(()=>{ const cb=document.querySelector('[data-m2="وسادة"]'); cb.checked=true; cb.dispatchEvent(new Event('change')); }); await page.waitForTimeout(150);
  log('catalog toggle marks وسادة as m²: '+(await page.evaluate(()=>state.pieceUnit['وسادة']==='m2'))+' (expect true)');
  await page.evaluate(()=>{ const cb=document.querySelector('[data-m2="وسادة"]'); cb.checked=false; cb.dispatchEvent(new Event('change')); });
  await page.click('#setClose');
  log('number inputs use Latin digits (lang=en): '+(await page.evaluate(()=>[...document.querySelectorAll('input[type=number]')].every(i=>i.lang==='en')))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
