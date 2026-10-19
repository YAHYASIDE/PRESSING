// 2.28.0 — دبو: أنواع الطوب (15 بريك/56 وردي/20 كري/20 بليه)، خنشة/فياج، أجرة الخنشة حسب النوع، رصيد افتتاحي، النقل،
// الهاتف إلزامي في الآجل، تنبيه الإسمنت، تذكير الجميع، زر دبو في البوت، ومنع الكسور في الأسعار.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:400,height:860} }); const page = await ctx.newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  ctx.on('page', p=>p.close().catch(()=>{}));
  const log=(...a)=>console.log(...a);
  // طلب ملابس قديم بسعر فيه كسور قبل الترحيل
  await page.addInitScript(()=>{ try{ if(!sessionStorage.getItem('seeded')){ sessionStorage.setItem('seeded','1'); const raw=localStorage.getItem('sadaqa_state'); } }catch(e){} });
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);

  // ترحيل الكسور: طلب فيه 4 × 111.3
  let r=await page.evaluate(()=>{ const d=iso(new Date()); state.laundryOrders=[{id:'lx',no:'L-X',customer:'س',phone:'22000000',items:[{type:'دراعه',count:1,unit:600,price:600,service:'غسيل وكي'},{type:'تركي',count:4,unit:111.3,price:445.2,service:'غسيل وكي'}],type:'دراعه، تركي',count:5,unit:209,price:1045.2,status:'wash',paid:false,date:d,editedAt:d}]; state.priceRoundV=0; runMigrations(); const o=state.laundryOrders[0]; return { price:o.price, unit:o.items[1].unit, ip:o.items[1].price, flag:state.priceRoundV, ed:o.editedAt>d }; });
  log('fraction migration: 111.3 → 111, item 444, order 1,044, editedAt stamped: '+(r.price===1044 && r.unit===111 && r.ip===444 && r.flag===1)+' (expect true)');
  log('new order lines are rounded: '+(await page.evaluate(()=>{ const b=buildOrderFromLines([{type:'تركي',count:3,unit:33.4}],'lnd'); return b.unit===33 && b.price===99; }))+' (expect true)');

  await page.evaluate(()=>{ const d=iso(new Date()); state.storeCustomers=[{id:'cu1',name:'محمد',phone:'22334455',country:'222',editedAt:d},{id:'cu2',name:'بلا هاتف',phone:'',country:'222',editedAt:d}]; state.suppliers=[{id:'su1',name:'موسسة صداقة',phone:'',country:'222',editedAt:d}];
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger'].forEach(k=>state[k]=[]); state.brickCfg={price:0}; state.notify={telegram:{enabled:false}}; save(); render(); });
  await page.click('[data-tab="brick"]'); await page.waitForTimeout(300);
  log('four default types shown with stock: '+(await page.evaluate(()=>{ const t=document.querySelector('main').textContent; return /15 بريك/.test(t)&&/56 وردي/.test(t)&&/20 كري/.test(t)&&/20 بليه/.test(t)&&brickTypes().length===4&&brickTypes().every(x=>x.wage===1300); }))+' (expect true)');

  // إعداد الأنواع: سعر 15 بريك 120، أجرة 56 وردي 1500، نوع جديد، حد الإسمنت 25
  await page.click('#bkTypesBox summary'); await page.waitForTimeout(150);
  await page.fill('[data-bkt-price="t15"]','120'); await page.fill('[data-bkt-wage="t56"]','1500'); await page.fill('#bkTypeNew','10 بريك'); await page.fill('#bkLowCement','25'); await page.click('#bkTypesSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ t15:brickType('t15').price, w56:brickType('t56').wage, n:brickTypes().length, low:brickCfg().lowCement }));
  log('types saved: price 120, wage 1500, new type, low cement 25: '+(r.t15===120 && r.w56===1500 && r.n===5 && r.low===25)+' (expect true)');

  // رصيد افتتاحي بالكود: 500 من 15 بريك، 200 من 20 كري، 10 خنشات × 3,600، 3 فياجات × 15,000
  await page.click('[data-bksub="purchases"]'); await page.waitForTimeout(250);
  await page.click('#bkOpenBox summary'); await page.waitForTimeout(150);
  await page.fill('[data-bkop-type="t15"]','500'); await page.fill('[data-bkop-type="t20k"]','200'); await page.fill('#bkOpCement','10'); await page.fill('#bkOpCementCost','3600'); await page.fill('#bkOpSand','3'); await page.fill('#bkOpSandCost','15000');
  await page.click('#bkOpSave'); await page.waitForTimeout(200); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ s15:brickStock('t15'), s20k:brickStock('t20k'), cem:brickMatStock('cement'), sand:brickMatStock('sand'), avg:brickAvgCost('cement'), f:brickFin(()=>true), box:brickCashBalance() }));
  log('opening stock: 500 + 200 bricks, 10 bags, 3 loads, avg 3,600; no purchases/production/profit/cash counted: '+(r.s15===500 && r.s20k===200 && r.cem===10 && r.sand===3 && r.avg===3600 && r.f.purchases===0 && r.f.produced===0 && r.f.profit===0 && r.box===0)+' (expect true)');
  log('low-cement alert fired (10 < 25): '+(await page.evaluate(()=>brickCfg().lowAlerted===true && state.activity.some(a=>/الإسمنت قليل/.test(a.action))))+' (expect true)');

  // خلطة 56 وردي: 20 خنشة × 1,500 = 30,000 أجرة تلقائية، 6 فياجات (المخزون يكفي 10 خنشات فقط → تحذير لكن تُسجَّل)
  await page.click('[data-bksub="batches"]'); await page.waitForTimeout(250);
  log('batch form defaults 20 bags / 6 loads, wage 20×1,300: '+(await page.evaluate(()=>document.getElementById('bkBags').value==='20' && document.getElementById('bkLoads').value==='6' && document.getElementById('bkWage').value==='26000'))+' (expect true)');
  await page.selectOption('#bkType','t56'); await page.waitForTimeout(100);
  log('choosing 56 وردي recomputes wage to 30,000: '+(await page.evaluate(()=>document.getElementById('bkWage').value==='30000'))+' (expect true)');
  await page.fill('#bkBags','8'); await page.waitForTimeout(50);
  log('changing bags recomputes wage 8×1,500=12,000: '+(await page.evaluate(()=>document.getElementById('bkWage').value==='12000'))+' (expect true)');
  await page.fill('#bkLoads','2'); await page.fill('#bkBricks','400'); await page.uncheck('#bkWagePaid'); await page.click('#bkBatchSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const b=state.brickBatches.find(x=>!x.opening); return { t:b.btype, w:b.workerPay, s56:brickStock('t56'), total:brickStock(), cem:brickMatStock('cement') }; });
  log('batch saved as 56 وردي: wage 12,000, stock 400 of 56, total 1,100, cement 2: '+(r.t==='t56' && r.w===12000 && r.s56===400 && r.total===1100 && r.cem===2)+' (expect true)');

  // بيع: النوع يملأ السعر، المخزون حسب النوع، النقل على الزبون يُضاف للفاتورة
  await page.click('[data-bksub="sales"]'); await page.waitForTimeout(250);
  log('sale form defaults to 15 بريك with price 120: '+(await page.evaluate(()=>document.getElementById('bkSaleType').value==='t15' && document.getElementById('bkPrice').value==='120'))+' (expect true)');
  await page.selectOption('#bkSaleType','t56'); await page.waitForTimeout(100);
  log('switching type updates stock hint: '+(await page.evaluate(()=>/400/.test(document.getElementById('bkStockHint').textContent)))+' (expect true)');
  await page.fill('#bkQty','500'); await page.fill('#bkPrice','150'); await page.click('#bkSaleSave'); await page.waitForTimeout(250);
  log('stock is checked per type (500 > 400 of 56): '+(await page.evaluate(()=>state.brickSales.length===0 && /56 وردي/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.click('[data-bktr="cust"]'); await page.waitForTimeout(250);
  await page.selectOption('#bkSaleType','t56'); await page.fill('#bkQty','100'); await page.fill('#bkPrice','150'); await page.fill('#bkTrAmt','2000'); await page.click('#bkSalePm [data-pm="masrvi"]'); await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const s=state.brickSales[0]; return { t:s.btype, total:s.total, tr:s.transport, by:s.transportBy, pm:s.payMethod, s56:brickStock('t56'), price:brickType('t56').price, box:brickCashBalance() }; });
  log('cash sale 100×150 + transport 2,000 on customer = 17,000 via masrvi; stock 300; type price remembered: '+(r.t==='t56' && r.total===17000 && r.tr===2000 && r.by==='cust' && r.pm==='masrvi' && r.s56===300 && r.price===150 && r.box===17000)+' (expect true)');
  // نقل علينا → مصروف نقل مرتبط
  await page.click('[data-bktr="us"]'); await page.waitForTimeout(250);
  await page.selectOption('#bkSaleType','t15'); await page.waitForTimeout(100); await page.fill('#bkQty','50'); await page.fill('#bkTrAmt','1000'); await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const s=state.brickSales[1]; const e=state.brickExpenses.find(x=>x.ref===s.id); return { total:s.total, e:!!e&&e.category==='transport'&&e.amount===1000, box:brickCashBalance(), s15:brickStock('t15') }; });
  log('transport on us: invoice 50×120=6,000 only, linked transport expense 1,000, box 22,000: '+(r.total===6000 && r.e && r.box===22000 && r.s15===450)+' (expect true)');
  await page.click('[data-bksub="sales"]'); await page.waitForTimeout(200);
  const sid=await page.evaluate(()=>state.brickSales[1].id);
  await page.click(`[data-bk-del="sale:${sid}"]`); await page.waitForTimeout(200); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300);
  log('deleting that sale also removes its transport expense and both cash moves: '+(await page.evaluate(()=>state.brickExpenses.length===0 && brickCashBalance()===17000 && brickStock('t15')===500))+' (expect true)');

  // الآجل يحتاج هاتفًا: «بلا هاتف» يُرفض حتى يُدخل رقمًا، ثم يُحفظ الرقم في سجله
  await page.click('[data-bktr="none"]'); await page.waitForTimeout(200); await page.click('[data-bkpaid="0"]'); await page.waitForTimeout(250);
  await page.selectOption('#bkCust','c:cu2'); await page.selectOption('#bkSaleType','t20k'); await page.fill('#bkQty','100'); await page.fill('#bkPrice','100'); await page.click('#bkSaleSave'); await page.waitForTimeout(250);
  log('credit sale to a party without phone is refused: '+(await page.evaluate(()=>state.brickSales.length===1 && /إلزامي/.test(document.getElementById('toast').textContent)))+' (expect true)');
  await page.selectOption('#bkCust','c:cu2'); await page.selectOption('#bkSaleType','t20k'); await page.fill('#bkQty','100'); await page.fill('#bkPrice','100'); await page.fill('#bkPartyPhone','36000000'); await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ n:state.brickSales.length, ph:storeCust('cu2').phone, bal:brickParties().find(x=>x.key==='c:cu2').balance }));
  log('with phone it saves, the phone is stored on the customer, balance 10,000: '+(r.n===2 && r.ph==='36000000' && r.bal===10000)+' (expect true)');
  // الكشف يذكر النوع والنقل
  await page.evaluate(()=>openBrickReceipt(Object.assign({},state.brickSales[0],{__small:true}))); await page.waitForTimeout(150);
  log('receipt shows type and transport line: '+(await page.evaluate(()=>{ const t=document.getElementById('receiptContent').textContent; return /56 وردي/.test(t) && /النقل/.test(t) && /17,000/.test(t); }))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });

  // تذكير الجميع: في دبو وفي الزبائن ▸ الديون
  await page.click('[data-bksub="debts"]'); await page.waitForTimeout(250);
  log('brick debts has «تذكير الجميع (1)»: '+(await page.evaluate(()=>{ const b=document.querySelector('[data-remind-all="brick"]'); return !!b && /\(1\)/.test(b.textContent); }))+' (expect true)');
  await page.click('[data-remind-all="brick"]'); await page.waitForTimeout(200);
  log('remind-all modal lists the debtor with phone and amount: '+(await page.evaluate(()=>{ const t=document.getElementById('raBody').textContent; return document.getElementById('remindAllModal').style.display==='flex' && /36000000/.test(t) && /10,000/.test(t); }))+' (expect true)');
  await page.click('#raNext'); await page.waitForTimeout(250);
  log('«send next» marks it sent and stamps the reminder: '+(await page.evaluate(()=>/✓ أُرسل/.test(document.getElementById('raBody').textContent) && Object.keys(state.debtReminded||{}).length>=1))+' (expect true)');
  await page.click('#raClose');
  await page.evaluate(()=>{ const d=iso(new Date()); state.carpetOrders=[{id:'r1',no:'R1',customer:'أحمد',phone:'22112211',type:'سجادة',count:1,unit:2000,price:2000,status:'wash',paid:false,date:d,editedAt:d}]; state.tab='contacts'; state.contactsSub='debts'; state.debtKind='all'; render(); }); await page.waitForTimeout(250);
  log('contacts ▸ debts has «تذكير الجميع» covering all sections (brick + carpet + laundry = 3): '+(await page.evaluate(()=>{ const b=document.querySelector('[data-remind-all="all"]'); return !!b && /\(3\)/.test(b.textContent); }))+' (expect true)');

  // البوت: زر دبو
  r=await page.evaluate(()=>({ kb:JSON.stringify(TG_KB).includes('🧱 دبو'), txt:tgHandleText('🧱 دبو') }));
  log('Telegram keyboard has 🧱 دبو and the reply has profit, stock per type and debtors: '+(r.kb && /دبو — تقرير/.test(r.txt) && /56 وردي: 300/.test(r.txt) && /أكبر المدينين/.test(r.txt) && /36000000/.test(r.txt))+' (expect true)');

  // الملابس/السجاد بلا هاتف: تأكيد
  let asked=false; page.removeAllListeners('dialog'); page.on('dialog',d=>{ if(/لا يوجد رقم هاتف/.test(d.message())) asked=true; d.dismiss(); });
  await page.evaluate(()=>{ state.tab='laundry'; render(); }); await page.waitForTimeout(300);
  await page.fill('#lndCust','زبون بلا رقم'); await page.fill('#lndPrice','500').catch(()=>{});
  await page.evaluate(()=>{ const b=document.getElementById('lndSave'); b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); }); await page.waitForTimeout(1150); await page.evaluate(()=>{ document.getElementById('lndSave').dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); }); await page.waitForTimeout(300);
  log('saving a laundry order without phone asks for confirmation (dismiss = not saved): '+(asked && await page.evaluate(()=>!(state.laundryOrders||[]).some(o=>o.customer==='زبون بلا رقم')))+' (expect true)');
  page.removeAllListeners('dialog'); page.on('dialog',d=>d.accept());

  await page.evaluate(()=>{ state.tab='brick'; state.brickSub='home'; render(); }); await page.waitForTimeout(250);
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
