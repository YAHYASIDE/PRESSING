// 2.59.0 — 🔁 الحساب بين دبو والمتجر: «🏪 المتجر» طرف في دبو و«🧱 دبو» طرف في المتجر (قرار المجلس + المالك).
// قيد واحد يحرّك الصندوقين (حركتان مشتقّتان بمعرّف ثابت) ولا يغيّر أي ربح؛ الرصيد بين الوحدتين محسوب.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:860} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const code=async()=>{ await page.waitForSelector('#codeInput',{state:'visible'}); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(250); };
  const editSave=async()=>{ await page.click('#editSave'); await page.waitForTimeout(250); };
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  const snap=()=>page.evaluate(()=>{ const T=ymd(new Date()), S=periodSummary(T,T); return { store:Math.round(cashboxBalance()), brick:Math.round(brickCashBalance()), ux:uxBalance(), group:Math.round(S.group), brickProfit:Math.round(S.brick), inc:Math.round(S.pay.cash.inc), net:Math.round(S.pay.cash.net) }; });
  await page.evaluate(()=>{ const d=iso(new Date());
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickLoads','brickOrders','brickWaste','unitXfers','storeSales','storeDebts','storePurchases','storeCustomers'].forEach(k=>state[k]=[]);
    state.storeCash=[{id:'m0',type:'in',amount:100000,reason:'إيداع',payMethod:'cash',date:d,editedAt:d}];
    state.tab='brick'; state.brickSub='debts'; save(); render(); });
  await page.waitForTimeout(300);
  const s0=await snap();
  let r=await page.evaluate(()=>{ const c=[...document.querySelectorAll('main .person-card')].find(x=>x.textContent.includes('المتجر')); return { card:!!c, on:!!document.querySelector('main [data-ux-q="brick|on"]'), for_:!!document.querySelector('main [data-ux-q="brick|for"]'), stmt:!!document.querySelector('main [data-ux-stmt="brick"]') }; });
  log('دبو ▸ الديون has the «🏪 المتجر» card with ➕ عليه / ➕ له / كشف: '+(r.card&&r.on&&r.for_&&r.stmt)+' (expect true)');
  // المتجر أعطى دبو 50,000 من الدرج
  await page.click('main [data-ux-q="brick|for"]'); await page.waitForTimeout(250);
  log('«➕ له» opens with «المال انتقل بين الدرجين» ticked: '+(await page.evaluate(()=>document.getElementById('re_cash').checked))+' (expect true)');
  await page.fill('#re_amount','50000'); await page.fill('#re_note','سلفة لشراء إسمنت'); await editSave();
  let s1=await snap();
  log('store gave دبو 50,000: store box −50,000, دبو box +50,000, دبو owes the store 50,000: '+(s1.store===s0.store-50000 && s1.brick===s0.brick+50000 && s1.ux===50000)+' (expect true) '+JSON.stringify([s0,s1]));
  log('no profit changed and store cash income unchanged (only the drawer net): '+(s1.group===s0.group && s1.brickProfit===s0.brickProfit && s1.inc===s0.inc && s1.net===s0.net-50000)+' (expect true)');
  r=await page.evaluate(()=>{ const c=[...document.querySelectorAll('main .person-card')].find(x=>x.textContent.includes('المتجر')); return c.querySelector('.dc-amt').textContent; });
  log('دبو card shows «50,000 له» (the store is owed): '+/50,000\s*له/.test(r)+' (expect true) '+r);
  await page.evaluate(()=>{ state.tab='store'; state.storeSub='debts'; state.debtView='all'; render(); }); await page.waitForTimeout(250);
  r=await page.evaluate(()=>{ const c=[...document.querySelectorAll('main .person-card')].find(x=>x.textContent.includes('دبو')); return c?c.querySelector('.dc-amt').textContent:''; });
  log('the same entry shows in المتجر ▸ الديون as «🧱 دبو — 50,000 عليه»: '+/50,000\s*عليه/.test(r)+' (expect true) '+r);
  r=await page.evaluate(()=>{ state.storeSub='cashbox'; render(); const t=document.getElementById('main').innerText; return t.includes('🔁 إلى دبو'); });
  log('store cash box lists the move «🔁 إلى دبو»: '+r+' (expect true)');
  // دين فقط من جهة المتجر: دبو له على المتجر 20,000 (زبون دفع ثمن طوب في درج المتجر وسُجّل قبلًا)
  await page.evaluate(()=>{ state.storeSub='debts'; render(); }); await page.waitForTimeout(200);
  await page.click('main [data-ux-q="store|for"]'); await page.waitForTimeout(250);
  await page.uncheck('#re_cash'); await page.fill('#re_amount','20000'); await editSave();
  log('debt-only entry needs a description: '+(await page.evaluate(()=>uxBalance()===50000 && getComputedStyle(document.getElementById('editModal')).display!=='none'))+' (expect true)');
  await page.fill('#re_note','زبون دفع ثمن طوب في المتجر'); await editSave();
  let s2=await snap();
  log('debt-only: balance 50,000 − 20,000 = 30,000 and boxes unchanged: '+(s2.ux===30000 && s2.store===s1.store && s2.brick===s1.brick)+' (expect true)');
  // التسديد من جهة المتجر: دبو يردّ 30,000
  await page.click('main [data-ux-q="store|in"]'); await page.waitForTimeout(250);
  log('«تحصيل» is prefilled with the balance 30,000: '+(await page.evaluate(()=>document.getElementById('re_amount').value==='30000'))+' (expect true)');
  await editSave();
  let s3=await snap();
  log('after collecting: balance 0, store box +30,000, دبو box −30,000: '+(s3.ux===0 && s3.store===s2.store+30000 && s3.brick===s2.brick-30000 && s3.group===s0.group)+' (expect true) '+JSON.stringify(s3));
  // تعديل وحذف واستعادة
  const id=await page.evaluate(()=>state.unitXfers[0].id);
  await page.evaluate(()=>{ _uxOpen=true; render(); }); await page.waitForTimeout(200);
  await page.click(`main [data-rec-edit="uxf:${id}"]`); await page.waitForTimeout(250);
  await page.fill('#re_amount','60000'); await editSave();
  r=await page.evaluate((id)=>({ ux:uxBalance(), mv:state.storeCash.find(m=>m.id==='UX-'+id+'-s').amount, bm:state.brickCash.find(m=>m.id==='UX-'+id+'-b').amount }), id);
  log('editing the first entry to 60,000 updates both box moves and the balance: '+(r.ux===10000 && r.mv===60000 && r.bm===60000)+' (expect true) '+JSON.stringify(r));
  await page.click(`main [data-ux-del="${id}"]`); await code();
  r=await page.evaluate((id)=>({ ux:uxBalance(), gone:!state.storeCash.some(m=>m.id==='UX-'+id+'-s')&&!state.brickCash.some(m=>m.id==='UX-'+id+'-b'), kept:!!state.unitXfers.find(x=>x.id===id&&x.cancelled) }), id);
  log('delete (with code) removes the box moves, keeps the entry struck: '+(r.ux===-50000 && r.gone && r.kept)+' (expect true) '+JSON.stringify(r));
  await page.click(`main [data-ux-restore="${id}"]`); await code();
  log('restore brings it back: '+(await page.evaluate(()=>uxBalance()===10000))+' (expect true)');
  // الكشف
  await page.click('main [data-ux-stmt="store"]'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const t=document.getElementById('receiptContent').textContent; return { fin:/عليه لنا\s*10,000/.test(t), rows:document.querySelectorAll('#receiptContent .lg-row').length }; });
  log('statement from the store side: «عليه لنا 10,000» with 3 rows: '+(r.fin && r.rows===3)+' (expect true) '+JSON.stringify(r));
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  // مزامنة: قيد من جهاز آخر + دمج مرتين بلا تكرار
  r=await page.evaluate(()=>{ const d=iso(new Date()), R=JSON.parse(JSON.stringify(cloudCopy())); R.unitXfers.push({id:'remoteX',no:'U-R',dir:'b2s',amount:5000,cash:true,payMethod:'bankily',note:'من هاتف المشرف',date:d,by:'أنفع',editedAt:d});
    applyRemote(JSON.parse(JSON.stringify(R))); applyRemote(JSON.parse(JSON.stringify(R)));
    return { ux:uxBalance(), s:state.storeCash.filter(m=>m.id==='UX-remoteX-s').length, b:state.brickCash.filter(m=>m.id==='UX-remoteX-b').length, pm:(state.storeCash.find(m=>m.id==='UX-remoteX-s')||{}).payMethod }; });
  log('entry from another phone builds both moves once (no duplicates after 2 merges): '+(r.ux===5000 && r.s===1 && r.b===1 && r.pm==='bankily')+' (expect true) '+JSON.stringify(r));
  log('audit finds no problem: '+(await page.evaluate(()=>auditChecks().issues.filter(x=>x.lvl==='err').length===0))+' (expect true)');
  // تصفير دبو يحذف القيود كاملة مع حركة المتجر
  r=await page.evaluate(()=>{ const st=cashboxBalance(); BRICK_RESET_KEYS.forEach(k=>state[k]=[]); save(); return { ux:uxBalance(), noStoreMoves:!state.storeCash.some(m=>m.kind==='unitXfer'), store:Math.round(cashboxBalance()) }; });
  log('دبو reset removes the entries and their store-side moves too: '+(r.ux===0 && r.noStoreMoves && r.store===100000)+' (expect true) '+JSON.stringify(r));
  // العامل لا يرى البطاقة
  r=await page.evaluate(()=>{ currentRole='worker'; state.tab='brick'; state.brickSub='debts'; render(); return !document.querySelector('main [data-ux-q]'); });
  log('worker does not see the internal account card: '+r+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
