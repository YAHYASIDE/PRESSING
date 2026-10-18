// 2.30.0 — دبو: تكلفة الطوبة لكل خلطة ولكل نوع، ربح كل بيع (يتغيّر مع تعديل الخلطة)، البحث في قوائم الأطراف عند الشراء والبيع
// (الشراء من مورّد أو زبون)، وقسم الحمّالين (حمل طوب/إسمنت، دفع فوري أو مستحق، دفع لاحق، كشف، تكلفة في الربح، تعديل).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
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
  await page.evaluate(()=>{ const d=iso(new Date());
    state.storeCustomers=[{id:'cu1',name:'محمد',phone:'22334455',country:'222',editedAt:d},{id:'cu2',name:'سالم البناء',phone:'33445566',country:'222',editedAt:d}];
    state.suppliers=[{id:'su1',name:'شركة الإسمنت',phone:'44556677',country:'222',editedAt:d},{id:'su2',name:'بوبكر تراب',phone:'45454545',country:'222',editedAt:d}];
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickPorters','brickLoads'].forEach(k=>state[k]=[]); state.brickCfg={price:0};
    state.tab='brick'; state.brickSub='purchases'; state.dateFrom=state.dateTo=ymd(new Date()); save(); render(); });
  await page.waitForTimeout(300);
  const log2=log;

  // ===== الشراء: البحث يختار المورّد، والشراء من زبون ممكن
  log('purchase form lists customers and suppliers with a search box: '+(await page.evaluate(()=>{ const sel=document.getElementById('bkPurParty'); const t=sel.textContent; return !!document.getElementById('bkPurFind') && /شركة الإسمنت/.test(t) && /سالم البناء/.test(t) && /44556677/.test(t); }))+' (expect true)');
  await page.fill('#bkPurFind','شركة'); await page.waitForTimeout(150);
  log('typing in search selects the matching supplier: '+(await page.evaluate(()=>document.getElementById('bkPurParty').value==='s:su1'))+' (expect true)');
  await page.fill('#bkPurQty','20'); await page.fill('#bkPurCost','3600'); await page.click('#bkPurSave'); await page.waitForTimeout(300);
  await page.click('[data-bkmat="sand"]'); await page.waitForTimeout(200); await page.fill('#bkPurFind','45454'); await page.waitForTimeout(150);
  await page.fill('#bkPurQty','6'); await page.fill('#bkPurCost','15000'); await page.uncheck('#bkPurPaid'); await page.click('#bkPurSave'); await page.waitForTimeout(300);
  let r=await page.evaluate(()=>({ p0:state.brickPurchases[0].supplierId, p1:state.brickPurchases[1].supplierId, bal:brickParties().find(x=>x.key==='s:su2').balance }));
  log('purchases linked to the searched suppliers; sand on credit → we owe بوبكر 90,000: '+(r.p0==='su1' && r.p1==='su2' && r.bal===-90000)+' (expect true)');
  // شراء من زبون (سالم يبيعنا إسمنت بالدين)
  await page.click('[data-bkmat="cement"]'); await page.waitForTimeout(200); await page.selectOption('#bkPurParty','c:cu2'); await page.fill('#bkPurQty','2'); await page.fill('#bkPurCost','3600'); await page.uncheck('#bkPurPaid'); await page.click('#bkPurSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ p:state.brickPurchases[2], bal:brickParties().find(x=>x.key==='c:cu2').balance, rows:brickPartyRows('cust','cu2').length }));
  log('purchase from a customer: party cust, we owe سالم 7,200, in his statement: '+(r.p.partyType==='cust' && r.p.partyId==='cu2' && r.bal===-7200 && r.rows===1)+' (expect true)');

  // ===== تكلفة الطوبة: خلطة 20 خنشة + 6 فياجات + أجرة 26,000 → 1,000 طوبة
  // متوسط الإسمنت = (20×3600 + 2×3600)/22 = 3600، التراب 15000 → (72,000 + 90,000 + 26,000) / 1000 = 188
  await page.click('[data-bksub="batches"]'); await page.waitForTimeout(250);
  await page.fill('#bkBricks','1000'); await page.click('#bkBatchSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ c:brickBatchCost(state.brickBatches[0]), t:brickTypeCost('t15'), toast:document.getElementById('toast').textContent, card:document.querySelector('main').textContent }));
  log('batch cost per brick 188 shown in toast and on the card: '+(Math.abs(r.c-188)<0.01 && Math.abs(r.t-188)<0.01 && /188/.test(r.toast) && /تكلفة الطوبة في هذه الخلطة: 188/.test(r.card))+' (expect true)');

  // ===== البيع: تلميح الربح الحيّ وربح البطاقة
  await page.click('[data-bksub="sales"]'); await page.waitForTimeout(250);
  await page.fill('#bkQty','100'); await page.fill('#bkPrice','250'); await page.waitForTimeout(100);
  log('sale form shows cost 188, profit per brick 62 and sale profit 6,200 live: '+(await page.evaluate(()=>{ const t=document.getElementById('bkProfitHint').textContent; return /188/.test(t) && /62/.test(t) && /6,200/.test(t); }))+' (expect true)');
  await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  log('sale card shows cost, sale price and profit 6,200: '+(await page.evaluate(()=>{ const t=document.querySelector('.grid.orders').textContent.replace(/\s+/g,' '); return /تكلفة الطوبة 188/.test(t) && /البيع 250/.test(t) && /الربح 6,200/.test(t); }))+' (expect true)');
  // تعديل الخلطة إلى 900 طوبة → التكلفة والربح يتغيّران فورًا
  await page.evaluate(()=>{ state.brickSub='batches'; render(); }); await page.waitForTimeout(250);
  await page.click(`[data-rec-edit="bbatch:${await page.evaluate(()=>state.brickBatches[0].id)}"]`); await page.waitForTimeout(250); await page.fill('#re_bricks','940'); await page.click('#editSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ c:brickTypeCost('t15'), pf:brickSaleProfit(state.brickSales[0]) }));
  log('after editing the batch to 940 bricks: cost 200, sale profit 5,000: '+(Math.abs(r.c-200)<0.01 && Math.round(r.pf)===5000)+' (expect true)');
  // البحث في البيع
  await page.evaluate(()=>{ state.brickSub='sales'; _bkDraft.side='sell'; _bkDraft.paid=false; render(); }); await page.waitForTimeout(250);
  await page.fill('#bkCustFind','سالم'); await page.waitForTimeout(150);
  log('sale party search picks سالم البناء: '+(await page.evaluate(()=>document.getElementById('bkCust').value==='c:cu2'))+' (expect true)');

  // ===== الحمّالون
  await page.click('[data-bksub="porters"]'); await page.waitForTimeout(250);
  log('porters tab has form, kinds and table: '+((await page.isVisible('#bkPorter')) && (await page.evaluate(()=>document.querySelectorAll('[data-bklk]').length===3)))+' (expect true)');
  await page.selectOption('#bkPorter','__new'); await page.waitForTimeout(100);
  await page.fill('#bkPorterName','عبد الله'); await page.fill('#bkPorterPhone','26262626'); await page.fill('#bkLoadQty','1000'); await page.fill('#bkLoadRate','5'); await page.waitForTimeout(80);
  log('amount auto = qty × rate = 5,000: '+(await page.evaluate(()=>document.getElementById('bkLoadAmt').value==='5000'))+' (expect true)');
  const box0=await page.evaluate(()=>brickCashBalance());
  await page.fill('#bkLoadNote','تحميل لمحمد'); await page.click('#bkLoadSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ pr:state.brickPorters[0], x:state.brickLoads[0], box:brickCashBalance(), rate:brickCfg().loadRate.bricks }));
  log('porter created with phone; paid load 5,000 out of the cashbox; rate remembered: '+(r.pr.name==='عبد الله' && r.pr.phone==='26262626' && r.x.amount===5000 && r.x.paid && r.box===box0-5000 && r.rate===5)+' (expect true)');
  // حمل إسمنت 20 خنشة × 100 = 2,000 غير مدفوع
  await page.click('[data-bklk="cement"]'); await page.waitForTimeout(200); await page.selectOption('#bkPorter',await page.evaluate(()=>state.brickPorters[0].id));
  await page.fill('#bkLoadQty','20'); await page.fill('#bkLoadRate','100'); await page.uncheck('#bkLoadPaid'); await page.click('#bkLoadSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ due:brickPorterDues(state.brickPorters[0].id), f:brickFin(()=>true), card:document.querySelector('main').textContent }));
  log('unpaid cement load: porter is owed 2,000; costs 7,000 counted in profit; card shows it: '+(r.due===2000 && r.f.porterDues===2000 && r.f.wages===26000+7000 && /2,000\s*له/.test(r.card))+' (expect true)');
  // دفع له من البطاقة
  await page.click('[data-bk-porterpay]'); await page.waitForTimeout(200); await page.click('#storePayOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ due:brickPorterDues(state.brickPorters[0].id), box:brickCashBalance() }));
  log('paying the porter clears his dues and takes 2,000 from the box: '+(r.due===0 && r.box===box0-7000)+' (expect true)');
  // كشف الحمّال
  await page.click('[data-bk-porterstmt]'); await page.waitForTimeout(200);
  log('porter statement lists both jobs with phone and totals: '+(await page.evaluate(()=>{ const t=document.getElementById('receiptContent').textContent; return /عبد الله/.test(t) && /26262626/.test(t) && /حمل طوب/.test(t) && /حمل إسمنت/.test(t) && /7,000/.test(t); }))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  // تعديل عمل حمل مدفوع 5,000 → 6,000 (الصندوق يتبع)
  const lid=await page.evaluate(()=>state.brickLoads[0].id);
  await page.click(`[data-rec-edit="bload:${lid}"]`); await page.waitForTimeout(250); await page.fill('#re_amount','6000'); await page.click('#editSave'); await page.waitForTimeout(300);
  log('editing a paid load to 6,000 adjusts its cash move: '+(await page.evaluate(id=>{ const x=state.brickLoads.find(y=>y.id===id); return x.amount===6000 && x.paidAmount===6000 && state.brickCash.filter(m=>m.ref===id).reduce((t,m)=>t+m.amount,0)===6000; },lid))+' (expect true)');
  log('CSV has porters section; report text has cost per brick: '+(await page.evaluate(()=>/دبو — الحمّالون/.test(exportCSV('2000-01-01',ymd(new Date()))) && /تكلفة الطوبة: 15 بريك 200/.test(brickReportText(ymd(new Date())))))+' (expect true)');
  log('summary shows cost per type: '+(await page.evaluate(()=>{ state.brickSub='home'; render(); return /تكلفة 200/.test(document.querySelector('main').textContent); }))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
