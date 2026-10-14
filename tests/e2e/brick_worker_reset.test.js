// 2.33.0 — دبو: تكلفة الطوبة تظهر حيًّا أثناء ملء الخلطة؛ أجرة الخلطة لا تُدفع تلقائيًا وتُضاف لحساب العامل (مع الحمّالين)؛
// وزر «تصفير دبو» في التقارير يمحو كل شيء ويُبقي الأنواع والأسعار والزبائن والعمّال وآخر سعر شراء.
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
    state.storeCustomers=[{id:'cu1',name:'يحي',phone:'22227268',country:'222',editedAt:d}]; state.suppliers=[{id:'su1',name:'شركة الإسمنت',phone:'44556677',country:'222',editedAt:d}];
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickPorters','brickLoads'].forEach(k=>state[k]=[]);
    state.brickPorters=[{id:'po1',name:'عبد الله',phone:'26262626',country:'222',editedAt:d}];
    state.brickPurchases=[{id:'p1',no:'BP1',material:'cement',name:'إسمنت',unit:'خنشة',qty:40,unitCost:3600,total:144000,paid:true,paidAmount:144000,date:d,editedAt:d},{id:'p2',no:'BP2',material:'sand',name:'تراب',unit:'فياج',qty:12,unitCost:15000,total:180000,paid:true,paidAmount:180000,date:d,editedAt:d}];
    state.brickCfg={price:180,types:[{k:"t15",name:"15 بريك",price:180,wage:1300,load:5},{k:"t56",name:"56 وردي",price:220,wage:1500,load:6},{k:"t20k",name:"20 كري",price:0,wage:1300},{k:"t20b",name:"20 بليه",price:0,wage:1300}]};
    state.tab='brick'; state.brickSub='batches'; _bkDraft.batchWorker=null; _bkDraft.wagePaid=false; save(); render(); });
  await page.waitForTimeout(300);

  // ===== التكلفة الحيّة أثناء ملء الخلطة
  log('batch form: wage paid-now is unchecked by default and worker account is preselected: '+(await page.evaluate(()=>!document.getElementById('bkWagePaid').checked && document.getElementById('bkWorker').value==='po1'))+' (expect true)');
  log('before typing bricks: shows the batch cost 188,000 and asks for the count: '+(await page.evaluate(()=>{ const t=document.getElementById('bkBatchCost').textContent; return /188,000/.test(t) && /اكتب عدد الطوب/.test(t); }))+' (expect true)');
  await page.fill('#bkBricks','1000'); await page.waitForTimeout(80);
  log('typing 1000 bricks shows cost per brick 188 with the breakdown: '+(await page.evaluate(()=>{ const t=document.getElementById('bkBatchCost').textContent; return /تكلفة الطوبة الآن: 188/.test(t) && /إسمنت 20 × 3,600/.test(t) && /تراب 6 × 15,000/.test(t) && /أجرة 26,000/.test(t); }))+' (expect true)');
  await page.fill('#bkWage','30000'); await page.waitForTimeout(80);
  log('changing the wage updates the cost to 192: '+(await page.evaluate(()=>/192/.test(document.getElementById('bkBatchCost').textContent)))+' (expect true)');
  // الحفظ: الأجرة دين في حساب العامل، لا تخرج من الصندوق
  const box0=await page.evaluate(()=>brickCashBalance());
  await page.click('#bkBatchSave'); await page.waitForTimeout(300);
  let r=await page.evaluate(()=>{ const b=state.brickBatches[0]; return { wid:b.workerId, paid:b.workerPaidAmt, due:brickPorterDues('po1'), box:brickCashBalance() }; });
  log('saved batch: wage 30,000 owed to عبد الله (his account), cashbox untouched: '+(r.wid==='po1' && r.paid===0 && r.due===30000 && r.box===box0)+' (expect true)');
  // عامل جديد من نموذج الخلطة
  await page.selectOption('#bkWorker','__new'); await page.waitForTimeout(80);
  await page.fill('#bkWorkerName','محمد الخلاط'); await page.fill('#bkWorkerPhone','27272727'); await page.selectOption('#bkType','t56'); await page.fill('#bkBags','10'); await page.fill('#bkLoads','3'); await page.fill('#bkBricks','400'); await page.click('#bkBatchSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const w=state.brickPorters.find(x=>x.name==='محمد الخلاط'); return { w:!!w, ph:w&&w.phone, due:w?brickPorterDues(w.id):-1 }; });
  log('new worker created with phone; 10 × 1,500 = 15,000 owed to him: '+(r.w && r.ph==='27272727' && r.due===15000)+' (expect true)');
  // حساب العامل في تبويب العمّال والحمّالين: الدين، الكشف، والدفع
  await page.click('[data-bksub="porters"]'); await page.waitForTimeout(250);
  log('workers tab shows عبد الله owed 30,000 from the batch: '+(await page.evaluate(()=>/له علينا 30,000/.test(document.querySelector('main').textContent) && /العمّال والحمّالون/.test(document.querySelector('[data-bksub="porters"]').textContent)))+' (expect true)');
  await page.click('[data-bk-porterstmt="po1"]'); await page.waitForTimeout(200);
  log('worker statement lists the batch wage: '+(await page.evaluate(()=>/أجرة خلطة/.test(document.getElementById('receiptContent').textContent) && /30,000/.test(document.getElementById('receiptContent').textContent)))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  await page.click('[data-bk-porterpay="po1"]'); await page.waitForTimeout(200); await page.fill('#storePayAmt','20000'); await page.click('#storePayOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ due:brickPorterDues('po1'), b:state.brickBatches[0].workerPaidAmt, box:brickCashBalance() }));
  log('paying 20,000 settles the batch wage partly (10,000 left) from the cashbox: '+(r.due===10000 && r.b===20000 && r.box===box0-20000)+' (expect true)');
  log('assigned batches are not double-listed in the unassigned wage panel: '+(await page.evaluate(()=>{ state.brickSub='debts'; render(); const t=document.querySelector('main').textContent; return /كل أجور الخلطات مدفوعة/.test(t) && /مستحقّ للعمّال والحمّالين/.test(t); }))+' (expect true)');

  // ===== تصفير دبو
  await page.evaluate(()=>{ state.brickSub='reports'; render(); }); await page.waitForTimeout(250);
  log('reports tab has the reset button: '+(await page.isVisible('#bkResetAll'))+' (expect true)');
  await page.evaluate(()=>{ window._preReset=JSON.parse(JSON.stringify(cloudCopy())); });
  await page.click('#bkResetAll'); await page.waitForTimeout(200); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(400);
  r=await page.evaluate(()=>({ arrays:["brickBatches","brickPurchases","brickSales","brickExpenses","brickCash","brickLedger","brickLoads"].every(k=>state[k].length===0), tombs:Object.keys(state.deleted).length,
    types:brickTypes().length===4&&brickType('t15').price===180&&brickType('t56').wage===1500&&brickType('t15').load===5, porters:state.brickPorters.length===2&&state.brickPorters[0].phone==='26262626',
    cust:state.storeCustomers.length===1&&state.storeCustomers[0].phone==='22227268', sup:state.suppliers.length===1, last:brickCfg().lastCost, avg:brickAvgCost('cement'), box:brickCashBalance(), stock:brickStock(), dues:brickPorterDues('po1') }));
  log('reset wipes every دبو record (with tombstones), cashbox/stock/dues back to 0: '+(r.arrays && r.tombs>=5 && r.box===0 && r.stock===0 && r.dues===0)+' (expect true)');
  log('reset keeps types/prices/wage/loading, workers with phones, customers and suppliers: '+(r.types && r.porters && r.cust && r.sup)+' (expect true)');
  log('reset keeps the last purchase prices (cement 3,600 / sand 15,000) for new cost calculations: '+(r.last.cement===3600 && r.last.sand===15000 && r.avg===3600)+' (expect true)');
  log('another device still holding the old records does not bring them back: '+(await page.evaluate(()=>{ applyRemote(window._preReset); return ["brickBatches","brickPurchases","brickCash","brickLoads"].every(k=>state[k].length===0); }))+' (expect true)');
  await page.evaluate(()=>{ state.brickSub='purchases'; render(); }); await page.waitForTimeout(200);
  log('purchase form pre-fills the last cement price 3,600: '+(await page.evaluate(()=>document.getElementById('bkPurCost').value==='3600'))+' (expect true)');
  log('activity logged the reset: '+(await page.evaluate(()=>state.activity.some(a=>/تصفير/.test(a.action))))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
