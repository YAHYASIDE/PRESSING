// 2.70.0 — «اجعل زر تعديل مادة يفتحها تلقائي»: ✏️ على مادة في أسفل القائمة ينقل الشاشة إلى نموذج التعديل (بالاسم الصحيح)
// ويضع المؤشر في الاسم، وبعد الحفظ أو الإلغاء يعود إلى المادة نفسها.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:360,height:740} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const t=iso(new Date()); state.storeProducts=Array.from({length:60},(_,i)=>({id:'p'+i,name:'مادة '+i,category:'قطع سيارات',buyPrice:0,sellPrice:0,stock:5,minStock:1,unit:'حبه',editedAt:t}));
    state.tab='store'; state.storeSub='products'; render(); });
  await page.waitForTimeout(200);
  // المادة p0 في أسفل القائمة (القائمة من الأحدث)
  await page.locator('[data-prod-edit="p0"]').scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  const inView=sel=>page.evaluate(s=>{ const e=document.querySelector(s); if(!e) return false; const b=e.getBoundingClientRect(); return b.top>=-2 && b.top<innerHeight-60; },sel);
  log('before: the form is off-screen: '+!(await inView('#prodFormPanel'))+' (expect true)');
  await page.click('[data-prod-edit="p0"]'); await page.waitForTimeout(900);
  let r=await page.evaluate(()=>({ name:document.getElementById('prodName').value, focus:document.activeElement&&document.activeElement.id, title:document.querySelector('#prodFormPanel h3').textContent }));
  log('✏️ brings the edit form into view with that product, cursor in the name: '+((await inView('#prodFormPanel')) && r.name==='مادة 0' && r.focus==='prodName' && /تعديل مادة: مادة 0/.test(r.title))+' (expect true) '+JSON.stringify(r));
  await page.fill('#prodSell','1500'); await page.click('#prodSave'); await page.waitForTimeout(900);
  r=await page.evaluate(()=>({ sell:storeProd('p0').sellPrice, editing:_editProdId }));
  log('saving updates the price and goes back to the product in the list: '+(r.sell===1500 && !r.editing && (await inView('.prod-row[data-pid="p0"]')))+' (expect true) '+JSON.stringify(r));
  await page.click('[data-prod-edit="p5"]'); await page.waitForTimeout(800);
  if(await page.isVisible('#prodCancelEdit')){ await page.click('#prodCancelEdit'); await page.waitForTimeout(800); log('cancel goes back to the product: '+(await inView('.prod-row[data-pid="p5"]'))+' (expect true)'); }
  log(errors.length?'ERRORS:\n'+errors.join('\n'):'ERRORS: NONE ✅');
  await browser.close();
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
