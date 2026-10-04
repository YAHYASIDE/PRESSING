const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
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
  await page.evaluate(()=>{ state.laundryOrders=[]; state.carpetOrders=[]; state.laundryPrices={}; save(); });

  // ===== الملابس: 4 قمصان + 6 بنطلونات في فاتورة واحدة =====
  await page.click('[data-tab="laundry"]'); await page.waitForTimeout(200);
  await page.fill('#lndCust','أحمد'); await page.fill('#lndPhone','44556677');
  await page.click('[data-lndtype="قميص"]'); await page.fill('#lndPrice','100'); await page.fill('#lndCount','4');
  await page.click('#lndAddLine'); await page.waitForTimeout(100);
  log('line added to draft: '+((await page.$$('#lndLines .inv-line')).length===1)+' (expect true)');
  log('customer name kept after adding line: '+((await page.inputValue('#lndCust'))==='أحمد')+' (expect true)');
  await page.click('[data-lndtype="بنطلون"]'); await page.fill('#lndPrice','150'); await page.fill('#lndCount','6');
  log('save button shows invoice with 2 items: '+/حفظ الفاتورة \(2/.test(await page.textContent('#lndSave'))+' (expect true)');
  await hold('#lndSave');
  let o = await page.evaluate(()=>JSON.parse(JSON.stringify(state.laundryOrders)));
  log('one order created: '+(o.length===1)+' (expect true)');
  log('2 items, 10 pieces, total 1300: '+(o[0].items.length===2&&o[0].count===10&&o[0].price===1300)+' (expect true)');
  log('draft cleared after save: '+(await page.evaluate(()=>invDraft.lnd.length===0))+' (expect true)');
  const card = await page.textContent('.grid.orders');
  log('card lists both items: '+(card.includes('قميص ×4')&&card.includes('بنطلون ×6'))+' (expect true)');
  // add-line then save without touching the current line -> current (untouched) line NOT duplicated
  await page.fill('#lndCust','سارة');
  await page.click('[data-lndtype="فستان"]'); await page.fill('#lndPrice','300'); await page.fill('#lndCount','1');
  await page.click('#lndAddLine');
  await page.click('[data-lndtype="عباية"]'); await page.fill('#lndPrice','250'); await page.fill('#lndCount','2');
  await page.click('#lndAddLine'); await page.waitForTimeout(100);
  await hold('#lndSave');
  o = await page.evaluate(()=>state.laundryOrders.find(x=>x.customer==='سارة'));
  log('both added lines saved, untouched line ignored: '+(o.items.length===2&&o.price===800)+' (expect true)');
  // single item still saved the old way (no items array)
  await page.fill('#lndCust','علي'); await page.click('[data-lndtype="قميص"]'); await page.fill('#lndPrice','100'); await page.fill('#lndCount','3');
  await hold('#lndSave');
  o = await page.evaluate(()=>state.laundryOrders.find(x=>x.customer==='علي'));
  log('single order unchanged format: '+(!o.items&&o.type==='قميص'&&o.count===3&&o.price===300)+' (expect true)');

  // ===== تعديل فاتورة الملابس: إضافة صنف وتغيير عدد =====
  const aid = await page.evaluate(()=>state.laundryOrders.find(x=>x.customer==='أحمد').id);
  await page.click(`[data-lnd-edit="${aid}"]`); await page.waitForTimeout(200);
  log('edit shows 2 item rows: '+((await page.$$('#edLines .ed-line')).length===2)+' (expect true)');
  await page.click('#edAddLine'); await page.waitForTimeout(80);
  const rows = await page.$$('#edLines .ed-line');
  await rows[2].$eval('.edl-type', (s)=>{ s.value='بطانية'; s.dispatchEvent(new Event('change')); });
  await rows[2].$eval('.edl-svc', (s)=>{ s.value='غسيل'; s.dispatchEvent(new Event('change')); });
  await rows[2].$eval('.edl-count', (i)=>{ i.value='1'; i.dispatchEvent(new Event('input')); });
  await rows[2].$eval('.edl-unit', (i)=>{ i.value='500'; i.dispatchEvent(new Event('input')); });
  await rows[0].$eval('.edl-count', (i)=>{ i.value='5'; i.dispatchEvent(new Event('input')); });
  await page.click('#editSave'); await page.waitForTimeout(250);
  o = await page.evaluate(id=>state.laundryOrders.find(x=>x.id===id), aid);
  log('edited: 3 items, 12 pieces, total 1900: '+(o.items.length===3&&o.count===12&&o.price===1900)+' (expect true) ['+o.count+'/'+o.price+']');
  log('mixed services -> full flow: '+(o.service==='غسيل وكي')+' (expect true)');
  // receipt lists items
  await page.click(`[data-lnd-receipt="${aid}"]`); await page.waitForTimeout(150);
  const rt = await page.textContent('#receiptContent');
  log('receipt lists each item: '+(rt.includes('قميص')&&rt.includes('بنطلون')&&rt.includes('بطانية')&&rt.includes('1,900'))+' (expect true)');
  await page.click('#receiptClose');
  // paid/income counts the whole invoice
  await page.evaluate(id=>{ const x=state.laundryOrders.find(o=>o.id===id); x.paid=true; x.paidDate=iso(new Date()); save(); }, aid);
  log('income counts invoice total: '+(await page.evaluate(()=>laundryIncome(()=>true)===1900))+' (expect true)');

  // ===== السجاد: سجادة 1 + 5 لحاف =====
  await page.click('[data-tab="carpets"]'); await page.waitForTimeout(200);
  const ptypes = await page.evaluate(()=>Object.keys(state.piecePrices));
  await page.fill('#cpCust','محمد');
  await page.click(`[data-ppick="${ptypes[0]}"]`); await page.fill('#cpPrice','1000'); await page.fill('#cpCount','1');
  await page.click('#cpAddLine');
  await page.click(`[data-ppick="${ptypes[1]}"]`); await page.fill('#cpPrice','200'); await page.fill('#cpCount','5');
  await hold('#cpSave');
  const c = await page.evaluate(()=>state.carpetOrders[0]);
  log('carpet invoice: 2 items, 6 pieces, 2000: '+(c.items.length===2&&c.count===6&&c.price===2000)+' (expect true)');
  log('carpet card shows items: '+(await page.textContent('.grid.orders')).includes(ptypes[1]+' ×5')+' (expect true)');
  await page.click(`[data-edit-order="${c.id}"]`); await page.waitForTimeout(200);
  const crow = await page.$$('#edLines .ed-line');
  await crow[1].$eval('.edl-x', b=>b.click()); await page.waitForTimeout(80);
  await page.click('#editSave'); await page.waitForTimeout(200);
  const c2 = await page.evaluate(()=>state.carpetOrders[0]);
  log('removing a line -> single order 1000: '+(!c2.items&&c2.count===1&&c2.price===1000)+' (expect true)');
  log('wa message ok: '+(await page.evaluate(()=>{ const x=state.laundryOrders.find(o=>o.customer==='أحمد'); return waStatusMsg(x).includes('بطانية'); }))+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
