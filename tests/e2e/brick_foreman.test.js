// 2.35.0 — دبو: رئيس العمّال (شخص واحد نتعامل معه) له حساب: كل خلطة تُضاف أجرتها لحسابه؛ ندفع له؛ إن دفعنا أكثر تُسجَّل سلفة
// عليه (لا تُحسب تكلفة) وتُخصم تلقائيًا من أجور الخلطات القادمة. الصفة: رئيس العمّال / حمّال.
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
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickPorters','brickLoads'].forEach(k=>state[k]=[]);
    state.brickPorters=[{id:'po1',name:'عبد الله',phone:'26262626',country:'222',role:'porter',editedAt:d}];
    state.brickPurchases=[{id:'p1',no:'BP1',material:'cement',name:'إسمنت',unit:'خنشة',qty:60,unitCost:3600,total:216000,paid:true,paidAmount:216000,date:d,editedAt:d},{id:'p2',no:'BP2',material:'sand',name:'تراب',unit:'فياج',qty:18,unitCost:15000,total:270000,paid:true,paidAmount:270000,date:d,editedAt:d}];
    state.brickCfg={price:180,types:[{k:"t15",name:"15 بريك",price:180,wage:1300,load:0},{k:"t56",name:"56 وردي",price:0,wage:1500},{k:"t20k",name:"20 كري",price:0,wage:1300},{k:"t20b",name:"20 بليه",price:0,wage:1300}]};
    state.tab='brick'; state.brickSub='batches'; _bkDraft.batchWorker=null; _bkDraft.wagePaid=false; save(); render(); });
  await page.waitForTimeout(300);

  // رئيس العمّال الجديد من نموذج الخلطة → صفته «رئيس العمّال»
  await page.selectOption('#bkWorker','__new'); await page.waitForTimeout(80);
  await page.fill('#bkWorkerName','المشرف سيدي'); await page.fill('#bkWorkerPhone','27272727'); await page.fill('#bkBricks','1000'); await page.click('#bkBatchSave'); await page.waitForTimeout(300);
  let r=await page.evaluate(()=>{ const w=state.brickPorters.find(x=>x.name==='المشرف سيدي'); return { role:w&&w.role, bal:w?brickPersonBalance(w.id):null, id:w&&w.id }; });
  const fid=r.id;
  log('foreman created as «رئيس العمّال»; batch wage 20×1,300 = 26,000 added to his account: '+(r.role==='worker' && r.bal===26000)+' (expect true)');
  log('next batch preselects the foreman (workers listed first): '+(await page.evaluate(id=>document.getElementById('bkWorker').value===id,fid))+' (expect true)');
  await page.fill('#bkBricks','1000'); await page.click('#bkBatchSave'); await page.waitForTimeout(300);
  log('second batch adds another 26,000 → he is owed 52,000: '+(await page.evaluate(id=>brickPersonBalance(id)===52000,fid))+' (expect true)');

  // ندفع له 60,000 (أكثر من المستحق بـ8,000) → يُسدَّد كل شيء و8,000 سلفة عليه
  await page.click('[data-bksub="porters"]'); await page.waitForTimeout(250);
  log('his card shows role badge and «له علينا 52,000»: '+(await page.evaluate(()=>{ const t=document.querySelector('main').textContent; return /رئيس العمّال/.test(t) && /52,000\s*له/.test(t); }))+' (expect true)');
  const box0=await page.evaluate(()=>brickCashBalance());
  await page.click(`[data-bk-porterpay="${fid}"]`); await page.waitForTimeout(200);
  log('pay dialog explains that extra becomes an advance: '+(await page.evaluate(()=>/الزائد يُسجَّل سلفة/.test(document.getElementById('storePayTitle').textContent)))+' (expect true)');
  await page.fill('#storePayAmt','60000'); await page.click('#storePayOk'); await page.waitForTimeout(300);
  r=await page.evaluate(id=>({ bal:brickPersonBalance(id), adv:brickPersonAdvance(id), box:brickCashBalance(), batchesPaid:state.brickBatches.every(b=>b.workerPaid), cost:brickFin(()=>true).wages, toast:document.getElementById('toast').textContent, card:document.querySelector('main').textContent }),fid);
  log('overpaying 60,000: both batches paid, 8,000 advance → balance −8,000, cashbox −60,000: '+(r.bal===-8000 && r.adv===8000 && r.batchesPaid && r.box===box0-60000)+' (expect true)');
  log('advance is not counted as a cost (wages stay 52,000): '+(r.cost===52000)+' (expect true)');
  log('toast and card say «سلفة» / «عليه لنا (سلفة) 8,000»: '+(/سلفة عليه 8,000/.test(r.toast) && /8,000\s*عليه/.test(r.card) && /سلفة عليه/.test(r.card))+' (expect true)');

  // خلطة جديدة 26,000 → تُخصم السلفة 8,000 تلقائيًا فيبقى له 18,000 (بلا حركة صندوق)
  await page.click('[data-bksub="batches"]'); await page.waitForTimeout(250);
  await page.fill('#bkBricks','1000'); await page.click('#bkBatchSave'); await page.waitForTimeout(300);
  r=await page.evaluate(id=>{ const b=state.brickBatches[state.brickBatches.length-1]; return { bal:brickPersonBalance(id), adv:brickPersonAdvance(id), paidPart:b.workerPaidAmt, box:brickCashBalance() }; },fid);
  log('next batch consumes the advance: 8,000 applied, he is owed 18,000, cashbox unchanged: '+(r.bal===18000 && r.adv===0 && r.paidPart===8000 && r.box===box0-60000)+' (expect true)');

  // الكشف: الخلطات والسلفة والرصيد
  await page.click('[data-bksub="porters"]'); await page.waitForTimeout(250);
  await page.click(`[data-bk-porterstmt="${fid}"]`); await page.waitForTimeout(200);
  log('statement lists 3 batch wages, the advance (used 8,000) and «المستحقّ له 18,000»: '+(await page.evaluate(()=>{ const t=document.getElementById('receiptContent').textContent; return (t.match(/أجرة خلطة/g)||[]).length===3 && /سلفة/.test(t) && /خُصم 8,000/.test(t) && /المستحقّ له/.test(t) && /18,000/.test(t) && /رئيس العمّال/.test(t); }))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  // سلفة مباشرة وهو لا يستحق شيئًا: ندفع 30,000 وله 18,000 → 12,000 سلفة
  await page.click(`[data-bk-porterpay="${fid}"]`); await page.waitForTimeout(200); await page.fill('#storePayAmt','30000'); await page.click('#storePayOk'); await page.waitForTimeout(300);
  log('paying 30,000 when owed 18,000 → advance 12,000: '+(await page.evaluate(id=>brickPersonBalance(id)===-12000,fid))+' (expect true)');
  // الحمّال يبقى حمّالًا
  log('the porter keeps the «حمّال» role and a neutral balance: '+(await page.evaluate(()=>brickPersonRole(brickPorter('po1'))==='porter' && brickPersonBalance('po1')===0))+' (expect true)');
  log('debts tab lists the foreman with «عليه سلفة 12,000»: '+(await page.evaluate(()=>{ state.brickSub='debts'; render(); const t=document.querySelector('main').textContent; return /12,000\s*عليه/.test(t) && /سلفة عليه/.test(t); }))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
