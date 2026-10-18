// 2.32.0 — ما يُكتب لا يختفي عند الضغط على أزرار النموذج (نقدي/آجل، النقل، نوع المادة…) أو عند مزامنة؛ ويُفرَّغ بعد الحفظ؛
// ومبلغ الفاتورة والربح يظهران حيًّا في بيع الطوب وفي توست الحفظ.
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
    state.storeCustomers=[{id:'cu1',name:'يحي',phone:'22227268',country:'222',editedAt:d}];
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickPorters','brickLoads'].forEach(k=>state[k]=[]);
    state.brickPurchases=[{id:'p1',no:'BP1',material:'cement',name:'إسمنت',unit:'خنشة',qty:20,unitCost:3600,total:72000,paid:true,paidAmount:72000,date:d,editedAt:d},{id:'p2',no:'BP2',material:'sand',name:'تراب',unit:'فياج',qty:6,unitCost:15000,total:90000,paid:true,paidAmount:90000,date:d,editedAt:d}];
    state.brickBatches=[{id:'b1',no:'K1',btype:'t15',cementBags:20,sandLoads:6,bricks:1500,workerPay:26000,workerPaidAmt:26000,workerPaid:true,date:d,editedAt:d}];
    state.brickCfg={price:180,types:[{k:"t15",name:"15 بريك",price:180,wage:1300,load:0},{k:"t56",name:"56 وردي",price:0,wage:1300},{k:"t20k",name:"20 كري",price:0,wage:1300},{k:"t20b",name:"20 بليه",price:0,wage:1300}]};
    state.tab='brick'; state.brickSub='sales'; _bkDraft.side='sell'; _bkDraft.paid=false; save(); render(); }); // 2.46.0: الطرف يظهر في «بيع آجل» فقط
  await page.waitForTimeout(300);
  // تكلفة الطوبة = (72,000 + 90,000 + 26,000) / 1500 = 125.33
  await page.selectOption('#bkCust','c:cu1'); await page.fill('#bkQty','1000'); await page.fill('#bkPrice','180'); await page.fill('#bkSaleNote','ملاحظة مهمة');
  await page.waitForTimeout(100);
  let r=await page.evaluate(()=>document.getElementById('bkSaleSum').textContent.replace(/\s+/g,' '));
  log('live invoice total 180,000 and profit (180−125.33)×1000 ≈ 54,667 shown: '+(/مبلغ الفاتورة: 180,000/.test(r) && /الربح: 54,667/.test(r))+' (expect true)');
  // الضغط على «علينا» في النقل ثم كتابة أجرة النقل، ثم «بيع آجل»: لا يضيع شيء
  await page.click('[data-bktr="us"]'); await page.waitForTimeout(250);
  log('after pressing «علينا»: qty, price, party and note kept: '+(await page.evaluate(()=>document.getElementById('bkQty').value==='1000' && document.getElementById('bkPrice').value==='180' && document.getElementById('bkCust').value==='c:cu1' && document.getElementById('bkSaleNote').value==='ملاحظة مهمة'))+' (expect true)');
  await page.fill('#bkTrAmt','10000'); await page.waitForTimeout(80);
  log('transport on us lowers the shown profit to ≈ 44,667, invoice stays 180,000: '+(await page.evaluate(()=>{ const t=document.getElementById('bkSaleSum').textContent.replace(/\s+/g,' '); return /مبلغ الفاتورة: 180,000/.test(t) && /الربح: 44,667/.test(t); }))+' (expect true)');
  await page.click('[data-bkpaid="0"]'); await page.waitForTimeout(250);
  log('after pressing «بيع آجل»: all typed values (incl. transport 10,000) kept: '+(await page.evaluate(()=>document.getElementById('bkQty').value==='1000' && document.getElementById('bkPrice').value==='180' && document.getElementById('bkTrAmt').value==='10000' && document.getElementById('bkCust').value==='c:cu1' && document.getElementById('bkSaleNote').value==='ملاحظة مهمة'))+' (expect true)');
  log('summary still correct after re-render: '+(await page.evaluate(()=>/مبلغ الفاتورة: 180,000/.test(document.getElementById('bkSaleSum').textContent) && /44,667/.test(document.getElementById('bkSaleSum').textContent)))+' (expect true)');
  // مزامنة تصل أثناء الكتابة لا تمسح شيئًا
  await page.evaluate(()=>{ applyRemote(JSON.parse(JSON.stringify(cloudCopy()))); render(); }); await page.waitForTimeout(200);
  log('a sync re-render while typing keeps the values: '+(await page.evaluate(()=>document.getElementById('bkQty').value==='1000' && document.getElementById('bkTrAmt').value==='10000'))+' (expect true)');
  // الحفظ: التوست يذكر الفاتورة والربح، والنموذج يُفرَّغ
  await page.click('#bkSaleSave'); await page.waitForTimeout(350);
  r=await page.evaluate(()=>({ t:document.getElementById('toast').textContent, q:document.getElementById('bkQty').value, n:document.getElementById('bkSaleNote').value, s:state.brickSales[0] }));
  log('save toast shows invoice 180,000 and profit: '+(/الفاتورة 180,000/.test(r.t) && /الربح 44,667/.test(r.t))+' (expect true)');
  log('form is emptied after a successful save: '+(r.q==='' && r.n==='' && r.s && r.s.total===180000 && !r.s.paid)+' (expect true)');
  // نفس الحماية في نموذج المواد (تبديل نوع المادة) والحمّالين
  await page.click('[data-bksub="purchases"]'); await page.waitForTimeout(250);
  await page.fill('#bkPurQty','7'); await page.fill('#bkPurCost','3500'); await page.click('[data-bkmat="sand"]'); await page.waitForTimeout(250);
  log('purchase: switching material keeps qty and cost: '+(await page.evaluate(()=>document.getElementById('bkPurQty').value==='7' && document.getElementById('bkPurCost').value==='3500'))+' (expect true)');
  await page.click('[data-bksub="sales"]'); await page.waitForTimeout(250);
  log('changing sub-tab starts clean (no leftovers from other forms): '+(await page.evaluate(()=>document.getElementById('bkQty').value===''))+' (expect true)');
  // المتجر ▸ الديون: التبديل بين عليه/له يحفظ المبلغ والوصف
  await page.evaluate(()=>{ state.tab='store'; state.storeSub='debts'; render(); }); await page.waitForTimeout(250);
  await page.click('#mdOpen'); await page.waitForTimeout(200); await page.fill('#mdAmt','5000'); await page.fill('#mdNote','سلفة'); await page.click('[data-mddir="for"]'); await page.waitForTimeout(250);
  log('store manual debt: switching عليه/له keeps amount and description: '+(await page.evaluate(()=>document.getElementById('mdAmt').value==='5000' && document.getElementById('mdNote').value==='سلفة'))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
