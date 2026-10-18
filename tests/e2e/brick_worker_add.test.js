// 2.47.0 — دبو ▸ العمّال والحمّالون: رئيس العمّال الجديد يُحفظ بلا «حمل»، والحمل اختياري لأي شخص جديد.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:860} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ state.brickPorters=[]; state.brickLoads=[]; state.brickCash=[]; _bkDraft.porter='__new'; state.tab='brick'; state.brickSub='porters'; save(); render(); });
  await page.waitForTimeout(250);
  await page.selectOption('#bkPorterRole','worker'); await page.waitForTimeout(100);
  let r=await page.evaluate(()=>({ fields:document.getElementById('bkLoadFields').style.display, kinds:document.getElementById('bkLoadKinds').style.display, hint:document.getElementById('bkWorkerOnlyHint').style.display, btn:document.getElementById('bkLoadSave').textContent }));
  log('choosing «رئيس العمّال» hides the loading fields and the button says «حفظ رئيس العمّال»: '+(r.fields==='none' && r.kinds==='none' && r.hint==='' && /رئيس العمّال/.test(r.btn))+' (expect true)');
  await page.fill('#bkPorterName','محمد منيفر'); await page.click('#bkLoadSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ p:state.brickPorters.map(x=>x.name+'|'+x.role), loads:state.brickLoads.length, box:brickCashBalance() }));
  log('the foreman is saved with no loading job and no cash movement: '+(r.p.length===1 && r.p[0]==='محمد منيفر|worker' && r.loads===0 && r.box===0)+' (expect true)');
  // حمّال جديد بلا حمل
  await page.selectOption('#bkPorter','__new'); await page.waitForTimeout(100); await page.selectOption('#bkPorterRole','porter'); await page.waitForTimeout(80);
  log('for a porter the loading fields stay visible (optional): '+(await page.evaluate(()=>document.getElementById('bkLoadFields').style.display===''))+' (expect true)');
  await page.fill('#bkPorterName','سالم الحمّال'); await page.click('#bkLoadSave'); await page.waitForTimeout(300);
  log('a new porter can be saved without a job: '+(await page.evaluate(()=>state.brickPorters.length===2 && state.brickLoads.length===0))+' (expect true)');
  // حمّال موجود: العمل يحتاج مبلغًا
  await page.selectOption('#bkPorter',await page.evaluate(()=>state.brickPorters[1].id)); await page.waitForTimeout(100); await page.click('#bkLoadSave'); await page.waitForTimeout(200);
  log('an existing porter still needs a quantity/amount to record a job: '+(await page.evaluate(()=>state.brickLoads.length===0 && /الكمية/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.fill('#bkLoadQty','100'); await page.fill('#bkLoadRate','5'); await page.uncheck('#bkLoadPaid'); await page.click('#bkLoadSave'); await page.waitForTimeout(300);
  log('a normal loading job 100 × 5 = 500 still works: '+(await page.evaluate(()=>state.brickLoads.length===1 && state.brickLoads[0].amount===500))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
