// 2.25.0 — تبويب «دبو» (المستودع): إدخال/إخراج/تحويل إلى مخزون المتجر، مادة جديدة، حذف بالكود، مزامنة.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
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
  await page.evaluate(()=>{ const d=iso(new Date()); state.storeProducts=[{id:'p1',name:'صابون',unit:'كرتون',buyPrice:100,sellPrice:150,stock:4,minStock:0,editedAt:d}]; state.depotMoves=[]; state.storeDebts=[]; save(); render(); });

  log('nav has the «دبو» tab after carpets: '+(await page.evaluate(()=>{ const t=[...document.querySelectorAll('.nav-btn')].map(b=>b.dataset.tab); return t.indexOf('depot')===t.indexOf('carpets')+1 && document.querySelector('[data-tab="depot"]').textContent.includes('دبو'); }))+' (expect true)');
  await page.click('[data-tab="depot"]'); await page.waitForTimeout(300);
  log('depot screen opens with form, stock table and moves log: '+((await page.isVisible('#dpProd')) && (await page.isVisible('#dpQty')) && /ما في دبو الآن/.test(await page.textContent('main')) && /آخر الحركات/.test(await page.textContent('main')))+' (expect true)');

  // إدخال 20 كرتون صابون
  await page.selectOption('#dpProd','p1'); await page.fill('#dpQty','20'); await page.fill('#dpNote','من المورّد'); await page.click('#dpSave'); await page.waitForTimeout(300);
  let r=await page.evaluate(()=>({ n:state.depotMoves.length, m:state.depotMoves[0], dp:depotStock('p1'), st:storeProd('p1').stock }));
  log('inbound 20 recorded: depot 20, store stock unchanged (4): '+(r.n===1 && r.m.type==='in' && r.m.qty===20 && r.m.note==='من المورّد' && r.dp===20 && r.st===4)+' (expect true)');
  log('stock table shows 20 in depot and 4 in store: '+(await page.evaluate(()=>{ const tr=document.querySelector('.tbl tbody tr'); return tr && /صابون/.test(tr.textContent) && tr.children[1].textContent.trim()==='20' && tr.children[2].textContent.trim()==='4'; }))+' (expect true)');

  // تحويل 5 إلى المتجر عبر الزر السريع
  await page.click('[data-dp-quick="toStore"][data-dp-pid="p1"]'); await page.waitForTimeout(250);
  log('quick button preselects transfer + product: '+(await page.evaluate(()=>_dpDraft.type==='toStore' && _dpDraft.prod==='p1' && document.querySelector('[data-dptype="toStore"]').classList.contains('on') && /المتاح في دبو/.test(document.querySelector('main').textContent)))+' (expect true)');
  await page.fill('#dpQty','5'); await page.click('#dpSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ dp:depotStock('p1'), st:storeProd('p1').stock, m:state.depotMoves[1] }));
  log('transfer 5: depot 15, store stock 9: '+(r.dp===15 && r.st===9 && r.m.type==='toStore')+' (expect true)');

  // إخراج أكبر من المتاح يُرفض، ثم إخراج 3
  await page.click('[data-dptype="out"]'); await page.waitForTimeout(200); await page.selectOption('#dpProd','p1'); await page.waitForTimeout(200);
  await page.fill('#dpQty','100'); await page.click('#dpSave'); await page.waitForTimeout(250);
  log('outbound above available is refused: '+(await page.evaluate(()=>state.depotMoves.length===2 && /أكبر من المتاح/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.fill('#dpQty','3'); await page.fill('#dpNote','تالف'); await page.click('#dpSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ dp:depotStock('p1'), st:storeProd('p1').stock }));
  log('outbound 3: depot 12, store still 9: '+(r.dp===12 && r.st===9)+' (expect true)');

  // مادة جديدة من داخل دبو
  await page.click('[data-dptype="in"]'); await page.waitForTimeout(200); await page.selectOption('#dpProd','__new'); await page.waitForTimeout(200);
  log('new product fields appear: '+(await page.isVisible('#dpNewName'))+' (expect true)');
  await page.fill('#dpNewName','شامبو'); await page.fill('#dpNewUnit','لتر'); await page.fill('#dpQty','7'); await page.click('#dpSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const p=state.storeProducts.find(x=>x.name==='شامبو'); return { p:!!p, unit:p&&p.unit, st:p&&p.stock, dp:p?depotStock(p.id):-1, items:depotItems().length }; });
  log('new product created (store stock 0) with 7 in depot: '+(r.p && r.unit==='لتر' && r.st===0 && r.dp===7 && r.items===2)+' (expect true)');
  await page.selectOption('#dpProd','p1'); await page.waitForTimeout(150);
  log('switching back hides new-product fields: '+(!(await page.isVisible('#dpNewName')))+' (expect true)');

  // البحث
  await page.fill('#depotSearch','شام'); await page.waitForTimeout(300);
  log('search filters the stock table: '+(await page.evaluate(()=>{ const rows=[...document.querySelectorAll('.tbl tbody tr')]; return rows.length>=1 && /شامبو/.test(rows[0].textContent) && !/صابون/.test(document.querySelector('.tbl tbody').textContent); }))+' (expect true)');
  await page.fill('#depotSearch',''); await page.waitForTimeout(300);

  // حذف تحويل بالكود يعيد مخزون المتجر
  const tid=await page.evaluate(()=>state.depotMoves.find(m=>m.type==='toStore').id);
  await page.click(`[data-dp-del="${tid}"]`); await page.waitForTimeout(200); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ gone:!state.depotMoves.some(m=>m.type==='toStore'), tomb:!!state.deleted['rec:'+Object.keys(state.deleted).map(k=>k.slice(4)).find(k=>true)], dp:depotStock('p1'), st:storeProd('p1').stock }));
  log('deleting the transfer (code) restores depot 17 and store 4: '+(r.gone && r.dp===17 && r.st===4)+' (expect true)');

  // المزامنة: حركة بعيدة تُضاف ولا تُفقد المحلية؛ الحركات في النسخة السحابية
  r=await page.evaluate(()=>{ const remote=JSON.parse(JSON.stringify(cloudCopy())); const mine=state.depotMoves.length; remote.depotMoves=[{id:'rm1',type:'in',productId:'p1',name:'صابون',qty:2,note:'جهاز آخر',date:iso(new Date()),by:'أنفع',editedAt:iso(new Date())}]; applyRemote(remote); return { n:state.depotMoves.length, mine, dp:depotStock('p1'), inCloud:Array.isArray(cloudCopy().depotMoves)&&cloudCopy().depotMoves.length===state.depotMoves.length }; });
  log('merge keeps local moves and adds remote (depot 19): '+(r.n===r.mine+1 && r.dp===19 && r.inCloud)+' (expect true)');
  log('CSV export has a depot section: '+(await page.evaluate(()=>/دبو \(المستودع\)/.test(exportCSV('2000-01-01',ymd(new Date())))))+' (expect true)');

  // العامل يرى التبويب لكن بلا حذف
  await page.evaluate(()=>{ state.users=[{id:'w1',name:'عامل',pin:'1111'}]; lockNow(); }); await page.waitForTimeout(300);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch'); await page.fill('#lockName','عامل'); await page.fill('#lockInput','1111'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.click('[data-tab="depot"]'); await page.waitForTimeout(300);
  log('worker sees the tab and form but no delete buttons: '+((await page.isVisible('#dpSave')) && (await page.evaluate(()=>document.querySelectorAll('[data-dp-del]').length===0)))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
