// 2.67.0 — «كان ← صار» (الرصيد قبل العملية وبعدها) في كل كشف وكل قائمة عمليات.
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
  await page.evaluate(()=>{ const t=ms=>new Date(Date.now()-ms).toISOString();
    ['storeSales','storeDebts','storePurchases','storeCash','brickSales','brickLedger','brickCash','dailyCosts','dailyCostPays'].forEach(k=>state[k]=[]);
    state.storeCustomers=[{id:'c1',name:'سالم',phone:'22334455',country:'222',editedAt:t(0)}];
    state.storeDebts=[{id:'d1',customerId:'c1',dir:'on',amount:1000,paidAmount:0,note:'سكر',date:t(5e8),editedAt:t(0)},{id:'d2',customerId:'c1',dir:'for',amount:300,paidAmount:0,note:'بنكلي',date:t(4e8),editedAt:t(0)},{id:'d3',customerId:'c1',dir:'on',amount:500,paidAmount:0,note:'كوكا',date:t(3e8),editedAt:t(0)}];
    state.suppliers=[{id:'s1',name:'حمد',phone:'44556677',editedAt:t(0)}];
    state.storePurchases=[{id:'p1',no:'P1',supplier:'حمد',supplierId:'s1',items:[{name:'صابون',qty:1,cost:3000}],total:3000,paidAmount:1000,paid:false,date:t(6e8),editedAt:t(0)}];
    state.storeCash=[{id:'m1',type:'out',amount:1000,reason:'تسديد للمورّد حمد',ref:'s1',payMethod:'cash',date:t(2e8),editedAt:t(0)}];
    state.workers=[{id:'w1',name:'حمد',role:'كوّاء',start:t(0),monthly:0,absent:[],payments:[{id:'x1',amount:400,note:'سلفة',date:t(2e8)}],credits:[{id:'x2',amount:1000,note:'مكافأة',date:t(3e8)}],editedAt:t(0)}];
    state.dailyCosts=[{id:'dc1',name:'الإيجار',monthly:31000,start:new Date(Date.now()-3*864e5).toISOString().slice(0,10),active:true,salaryHist:[],date:t(0),editedAt:t(0)}];
    state.dailyCostPays=[{id:'dp1',costId:'dc1',amount:1000,payMethod:'cash',date:t(1e8),editedAt:t(0)}];
    state.brickSales=[{id:'b1',no:'BS1',btype:'t15',qty:10,unitPrice:200,total:2000,paidAmount:0,paid:false,partyType:'cust',partyId:'c1',customerId:'c1',customerName:'سالم',date:t(5e8),editedAt:t(0)}];
    state.brickLedger=[{id:'l1',partyType:'cust',partyId:'c1',dir:'for',kind:'cash',amount:500,qty:0,note:'دفعة',date:t(4e8),editedAt:t(0)}];
    state.dateFrom='1970-01-01'; state.dateTo='2999-12-31'; state.tab='store'; state.storeSub='debts'; state.debtView='all'; save(); render(); });
  await page.waitForTimeout(300);
  // (1) بطاقة المتجر ▸ الزبائن والديون: كل عملية بسطر «كان ← صار»
  let r=await page.evaluate(()=>{ const P=storeParties().find(p=>p.cust&&p.cust.id==='c1'); const t=document.querySelector(`[data-debt-toggle="sp:${P.key}"]`); t.click();
    const rows=[...document.querySelectorAll(`[data-debt-det="sp:${P.key}"] .party-item`)]; return { n:rows.length, lines:rows.map(x=>(x.querySelector('.run-line')||{}).textContent||'') }; });
  log('store card: every operation shows «كان ← صار» and the last one ends at the net (عليه 1,200): '+(r.n===3&&r.lines.every(l=>/كان .*← صار/.test(l))&&/صار عليه 1,200/.test(r.lines[2])&&/كان 0/.test(r.lines[0]))+' (expect true) '+JSON.stringify(r.lines));
  // (2) كشف المورّد صار دفترًا برصيد جارٍ
  r=await page.evaluate(()=>{ openSupplierStatement(supplierById('s1')); const t=document.getElementById('receiptContent').innerText; return { led:!!document.querySelector('#receiptContent .rcpt.ledger'), bal:document.querySelectorAll('#receiptContent .lg-bal').length, fin:/له علينا 2,000/.test(t) }; });
  log('supplier statement: ledger with «كان ← صار» for each move and balance له 2,000: '+(r.led&&r.bal>=2&&r.fin)+' (expect true) '+JSON.stringify(r));
  // (3) كشف المصروف باليومية
  r=await page.evaluate(()=>{ openDcStatement('dc1'); return { led:!!document.querySelector('#receiptContent .rcpt.ledger'), bal:document.querySelectorAll('#receiptContent .lg-bal').length }; });
  log('daily-cost statement: ledger with running balance: '+(r.led&&r.bal>=2)+' (expect true) '+JSON.stringify(r));
  // (4) النسخة النصية «💬 كتابةً» تذكر الرصيد بعد كل حركة
  await page.evaluate(()=>{ openSupplierStatement(supplierById('s1')); }); await page.click('#receiptText'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>{ const e=document.getElementById('stPreview'); return e.value||e.textContent||''; });
  log('text version: each line ends with «← صار …»: '+((r.match(/← صار/g)||[]).length>=2)+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('stTextModal').style.display='none'; document.getElementById('receiptModal').style.display='none'; });
  // (5) دفتر برصيد سابق: إن لم تبدأ الحركات من صفر يظهر «رصيد سابق» ويطابق آخر رصيد الرصيد الآن
  r=await page.evaluate(()=>{ document.getElementById('receiptContent').innerHTML=ledgerRcptHTML({head:'x',rows:[{d:new Date().toISOString(),t:'دفع',dr:0,cr:200}],final:800}); const t=document.getElementById('receiptContent').innerText; return { open:/رصيد سابق/.test(t), last:/صار عليه 800/.test(t) }; });
  log('ledger with an opening balance shows «رصيد سابق» and ends at the current balance: '+(r.open&&r.last)+' (expect true)');
  // (6) عمليات العامل
  await page.evaluate(()=>{ state.tab='expenses'; state.expSub='workers'; render(); }); await page.waitForTimeout(200);
  await page.click('.wcard [data-debt-toggle="wk:w1"]'); await page.waitForTimeout(150);
  r=await page.evaluate(()=>[...document.querySelectorAll('[data-debt-det="wk:w1"] .run-line')].map(x=>x.textContent));
  log('worker operations show «كان ← صار» (له): '+(r.length===2&&r.every(l=>/كان .*← صار/.test(l))&&r.some(l=>/صار له 600/.test(l)))+' (expect true) '+JSON.stringify(r));
  // (7) كشف دبو بالصورة: أعمدة «الرصيد قبل / الرصيد بعد»
  r=await page.evaluate(async()=>{ const rows=brickPartyRows('cust','c1'); let d=null; const orig=window.openWashInvoice; window.openWashInvoice=(k,dd)=>{ d=dd; }; openBrickStatementImg('cust','c1'); window.openWashInvoice=orig; return { hdr:d&&d.hdr&&d.hdr.q, rows:d&&d.rows.map(x=>[x.q,x.u]) }; });
  log('brick statement image has «الرصيد قبل / الرصيد بعد» for every line: '+(r.hdr==='الرصيد قبل'&&r.rows.length===2&&r.rows[1][1]==='عليه 1,500')+' (expect true) '+JSON.stringify(r));
  // (8) الزبائن ▸ الديون
  await page.evaluate(()=>{ state.tab='contacts'; state.contactsSub='debts'; state.debtKind='all'; render(); }); await page.waitForTimeout(200);
  r=await page.evaluate(()=>{ const t=document.querySelector('.debtor-card [data-debt-toggle]'); if(t) t.click(); return [...document.querySelectorAll('.debtor-card .run-line')].length; });
  log('customers ▸ debts cards also show «كان ← صار»: '+(r>=1)+' (expect true) '+r);
  log(errors.length?'ERRORS: '+errors.join(' | '):'ERRORS: NONE ✅');
  await browser.close();
})();
