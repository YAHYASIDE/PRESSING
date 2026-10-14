// 2.31.0 — دبو: أنواع الطوب بسعر البيع + أجرة الخنشة + حمل الطوبة؛ الحمل يُحسب تلقائيًا عند البيع ويُسجَّل مستحقًّا للحمّال؛
// الأرقام لاتينية في كل الحقول (تحويل الأرقام العربية فورًا)، ولا «0-».
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:860}, locale:'ar-EG' })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date());
    state.storeCustomers=[{id:'cu1',name:'محمد',phone:'22334455',country:'222',editedAt:d}]; state.suppliers=[];
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickPorters','brickLoads'].forEach(k=>state[k]=[]); state.brickCfg={price:0};
    state.brickPorters=[{id:'po1',name:'عبد الله',phone:'26262626',country:'222',editedAt:d},{id:'po2',name:'سيدي',phone:'',country:'222',editedAt:d}];
    state.brickPurchases=[{id:'p1',no:'BP1',material:'cement',name:'إسمنت',unit:'خنشة',qty:20,unitCost:3600,total:72000,paid:true,paidAmount:72000,date:d,editedAt:d},{id:'p2',no:'BP2',material:'sand',name:'تراب',unit:'فياج',qty:6,unitCost:15000,total:90000,paid:true,paidAmount:90000,date:d,editedAt:d}];
    state.brickBatches=[{id:'b1',no:'K1',btype:'t15',cementBags:20,sandLoads:6,bricks:1000,workerPay:26000,workerPaidAmt:26000,workerPaid:true,date:d,editedAt:d}];
    state.tab='brick'; state.brickSub='home'; _bkDraft.typesOpen=true; state.dateFrom=state.dateTo=ymd(new Date()); save(); render(); });
  await page.waitForTimeout(300);

  // ===== الأرقام اللاتينية و«0-»
  r=await page.evaluate(()=>({ noNum:document.querySelectorAll('main input[type=number]').length===0, num:document.querySelectorAll('main input[data-num]').length>5, im:document.querySelector('[data-bkt-wage="t15"]').getAttribute('inputmode'), negZero:/0-|-0/.test(document.querySelector('main').textContent.replace(/[^\d\-]/g,' ').split(/\s+/).filter(x=>x==='-0').join('')) , f:fmt(-0) }));
  var r;
  log('number fields became numeric text fields (keypad kept): '+(r.noNum && r.num && r.im==='decimal')+' (expect true)');
  log('fmt(-0) shows "0" not "-0": '+(r.f==='0')+' (expect true)');
  await page.fill('[data-bkt-price="t15"]','');
  await page.type('[data-bkt-price="t15"]','٢٥٠');
  log('typing Arabic digits ٢٥٠ becomes 250: '+(await page.inputValue('[data-bkt-price="t15"]')==='250')+' (expect true)');

  // ===== لوحة الأنواع: سعر البيع + أجرة الخنشة + حمل الطوبة + التكلفة الحالية
  log('types panel shows sale price, wage per bag, loading per brick and current cost 188: '+(await page.evaluate(()=>{ const t=document.getElementById('bkTypesBox').textContent; return /سعر البيع/.test(t) && /أجرة العامل/.test(t) && /حمل الطوبة الواحدة/.test(t) && /188/.test(t) && document.querySelectorAll('[data-bkt-load]').length===4; }))+' (expect true)');
  await page.fill('[data-bkt-load="t15"]','5'); await page.fill('[data-bkt-wage="t15"]','1300'); await page.click('#bkTypesSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ p:brickType('t15').price, l:brickType('t15').load }));
  log('saved: sale price 250, loading 5 per brick: '+(r.p===250 && r.l===5)+' (expect true)');
  log('no horizontal overflow in the types panel at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');

  // ===== البيع: الحمل تلقائي للحمّال المختار ومستحق له، ويُطرح من الربح
  await page.click('[data-bksub="sales"]'); await page.waitForTimeout(250);
  log('sale form shows auto loading with porter picker (rate 5): '+((await page.isVisible('#bkSalePorter')) && (await page.evaluate(()=>/5/.test(document.getElementById('bkSaleLoadRate').textContent) && document.getElementById('bkPrice').value==='250')))+' (expect true)');
  await page.selectOption('#bkSalePorter','po1'); await page.fill('#bkQty','300'); await page.waitForTimeout(100);
  log('live hint shows loading 1,500 and profit per brick 250−188−5=57 (sale 17,100): '+(await page.evaluate(()=>/1,500/.test(document.getElementById('bkSaleLoadHint').textContent) && /57/.test(document.getElementById('bkProfitHint').textContent) && /17,100/.test(document.getElementById('bkProfitHint').textContent)))+' (expect true)');
  const box0=await page.evaluate(()=>brickCashBalance());
  await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const s=state.brickSales[0], l=state.brickLoads[0]; return { n:state.brickLoads.length, ref:l&&l.ref===s.id, amt:l&&l.amount, paid:l&&l.paid, por:l&&l.porterId, due:brickPorterDues('po1'), box:brickCashBalance(), pf:Math.round(brickSaleProfit(s)), card:document.querySelector('.grid.orders').textContent }; });
  log('sale created an unpaid loading job 300×5=1,500 owed to عبد الله; cashbox got only the sale: '+(r.n===1 && r.ref && r.amt===1500 && r.paid===false && r.por==='po1' && r.due===1500 && r.box===box0+75000)+' (expect true)');
  log('sale profit deducts loading: (250−188)×300−1,500 = 17,100, and card shows حمل: '+(r.pf===17100 && /حمل 1,500/.test(r.card) && /الربح 17,100/.test(r.card))+' (expect true)');
  log('porter choice remembered for the next sale: '+(await page.evaluate(()=>document.getElementById('bkSalePorter').value==='po1'))+' (expect true)');
  // بلا حمل
  await page.selectOption('#bkSalePorter',''); await page.fill('#bkQty','100'); await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  log('«بلا حمل» creates no loading job: '+(await page.evaluate(()=>state.brickLoads.length===1 && state.brickSales.length===2))+' (expect true)');
  // تعديل البيع الأول إلى 400 → الحمل يصير 2,000
  const sid=await page.evaluate(()=>state.brickSales[0].id);
  await page.click(`[data-rec-edit="bsale:${sid}"]`); await page.waitForTimeout(250); await page.fill('#re_qty','400'); await page.click('#editSave'); await page.waitForTimeout(300);
  log('editing the sale to 400 bricks updates the unpaid loading to 2,000: '+(await page.evaluate(()=>state.brickLoads[0].qty===400 && state.brickLoads[0].amount===2000 && brickPorterDues('po1')===2000))+' (expect true)');
  // حذف البيع يحذف الحمل
  await page.click(`[data-bk-del="sale:${sid}"]`); await page.waitForTimeout(200); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300);
  log('deleting the sale removes its loading job and the porter dues: '+(await page.evaluate(()=>state.brickLoads.length===0 && brickPorterDues('po1')===0))+' (expect true)');
  // نوع بلا حمل → لا يظهر حقل الحمل
  await page.selectOption('#bkSaleType','t56'); await page.waitForTimeout(100);
  log('type without a loading rate hides the loading field: '+(!(await page.isVisible('#bkSalePorter')))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
