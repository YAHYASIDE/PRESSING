// 2.36.0 — دبو: لا إنتاج قبل شراء الإسمنت والتراب — المخزون لا يصير سالبًا أبدًا (الحفظ، التعديل، حذف الشراء).
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
    state.brickCfg={price:180,types:[{k:"t15",name:"15 بريك",price:180,wage:1300,load:0},{k:"t56",name:"56 وردي",price:0,wage:1500},{k:"t20k",name:"20 كري",price:0,wage:1300},{k:"t20b",name:"20 بليه",price:0,wage:1300}]};
    state.tab='brick'; state.brickSub='batches'; _bkDraft.batchWorker=null; _bkDraft.wagePaid=false; save(); render(); });
  await page.waitForTimeout(300);
  log('batch form shows available materials (0) and a red «buy first» notice: '+(await page.evaluate(()=>{ const t=document.getElementById('bkMatAvail').textContent; return /إسمنت 0 خنشة/.test(t) && /تراب 0 فياج/.test(t) && /اشترِ المواد أولًا/.test(t); }))+' (expect true)');
  await page.fill('#bkBricks','1000'); await page.click('#bkBatchSave'); await page.waitForTimeout(250);
  let r=await page.evaluate(()=>({ n:state.brickBatches.length, toast:document.getElementById('toast').textContent, c:brickMatStock('cement'), s:brickMatStock('sand') }));
  log('saving with no cement/sand is refused, nothing recorded, stock stays 0: '+(r.n===0 && /لا يمكن الإنتاج قبل شراء المواد/.test(r.toast) && r.c===0 && r.s===0)+' (expect true)');
  // نشتري 30 خنشة و4 فياجات فقط
  await page.evaluate(()=>{ const d=iso(new Date()); state.brickPurchases=[{id:'p1',no:'BP1',material:'cement',name:'إسمنت',unit:'خنشة',qty:30,unitCost:3600,total:108000,paid:true,paidAmount:108000,date:d,editedAt:d},{id:'p2',no:'BP2',material:'sand',name:'تراب',unit:'فياج',qty:4,unitCost:15000,total:60000,paid:true,paidAmount:60000,date:d,editedAt:d}]; save(); render(); });
  await page.waitForTimeout(200);
  await page.fill('#bkBricks','1000'); await page.click('#bkBatchSave'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>({ n:state.brickBatches.length, toast:document.getElementById('toast').textContent }));
  log('20 bags + 6 loads with only 4 loads of sand is refused and names the missing sand: '+(r.n===0 && /التراب: المتاح 4 فياج والمطلوب 6/.test(r.toast) && !/الإسمنت:/.test(r.toast))+' (expect true)');
  await page.fill('#bkLoads','4'); await page.waitForTimeout(80);
  log('with 4 loads the notice turns normal: '+(await page.evaluate(()=>!/اشترِ المواد/.test(document.getElementById('bkMatAvail').textContent)))+' (expect true)');
  await page.fill('#bkBricks','1000'); await page.click('#bkBatchSave'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>({ n:state.brickBatches.length, c:brickMatStock('cement'), s:brickMatStock('sand') }));
  log('a batch within stock is saved: cement 10 left, sand 0 left: '+(r.n===1 && r.c===10 && r.s===0)+' (expect true)');
  // التعديل لا يتجاوز المخزون
  const bid=await page.evaluate(()=>state.brickBatches[0].id);
  await page.click('[data-rec-edit="bbatch:'+bid+'"]'); await page.waitForTimeout(200); await page.fill('#re_bags','35'); await page.click('#editSave'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>({ bags:state.brickBatches[0].cementBags, c:brickMatStock('cement'), modal:document.getElementById('editModal').style.display }));
  log('editing the batch to 35 bags (only 30 bought) is refused: '+(r.bags===20 && r.c===10)+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('editModal').style.display='none'; });
  // حذف/تقليل شراء مستعمل
  await page.evaluate(()=>{ state.brickSub='purchases'; render(); }); await page.waitForTimeout(200);
  await page.click('[data-bk-del="pur:p2"]'); await page.waitForTimeout(250);
  log('deleting the used sand purchase is refused: '+(await page.evaluate(()=>state.brickPurchases.some(p=>p.id==='p2') && /لا يمكن حذف هذا الشراء/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.click('[data-rec-edit="bpur:p1"]'); await page.waitForTimeout(200); await page.fill('#re_qty','15'); await page.click('#editSave'); await page.waitForTimeout(250);
  log('reducing the cement purchase below what was used (15 < 20) is refused: '+(await page.evaluate(()=>state.brickPurchases.find(p=>p.id==='p1').qty===30 && brickMatStock('cement')===10))+' (expect true)');
  log('stock never negative: '+(await page.evaluate(()=>brickMatStock('cement')>=0 && brickMatStock('sand')>=0))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
