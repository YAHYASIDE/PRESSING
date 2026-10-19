// 2.58.0 — 🩺 فحص الحسابات (auditChecks) + زر «افحص الآن» في الإعدادات: يكشف الكشف غير المطابق، المخزون السالب، العمليات لأشخاص محذوفين، الأرقام المكرّرة، المبالغ غير الصالحة.
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
  // بيانات سليمة
  let r=await page.evaluate(()=>{ const d=iso(new Date()); _unsyncedSince=0;
    state.storeCustomers=[{id:'c1',name:'أحمد',phone:'22110000',editedAt:d},{id:'c2',name:'سالم',phone:'22110001',editedAt:d}];
    state.storeDebts=[{id:'d1',customerId:'c1',dir:'on',amount:3000,paidAmount:0,paid:false,note:'سلفة',date:d,editedAt:d},{id:'d2',customerId:'c2',dir:'for',amount:5000,paidAmount:2000,paid:false,note:'له',date:d,editedAt:d}];
    state.storeCash=[{id:'m1',type:'out',amount:2000,reason:'تسديد دين له — سالم',customerId:'c2',payMethod:'cash',date:d,editedAt:d},{id:'m0',type:'in',amount:9000,reason:'إيداع',payMethod:'cash',date:d,editedAt:d}];
    state.storeSales=[]; state.storePurchases=[]; state.suppliers=[]; state.storeProducts=[{id:'p1',name:'صابون',stock:5,price:100,buyPrice:80,editedAt:d}];
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickLoads','brickOrders','brickWaste','brickPorters'].forEach(k=>state[k]=[]);
    const a=auditChecks(); return {n:a.n, issues:a.issues.map(x=>x.t)}; });
  log('clean data: no issues at all: '+(r.issues.length===0 && r.n>=12)+' (expect true) '+JSON.stringify(r));
  // بيانات بها أخطاء
  r=await page.evaluate(()=>{ const d=iso(new Date());
    state.storeDebts.find(x=>x.id==='d2').paidAmount=5000; // «له» معلَّم مسدَّدًا بالكامل والمدفوع فعلًا 2,000 فقط
    state.storeProducts[0].stock=-3;
    state.storeSales=[{id:'s1',no:'S1',customerId:'gone',customerName:'محذوف',items:[],total:1000,paidAmount:0,paid:false,date:d,editedAt:d}];
    state.storeCustomers.push({id:'c3',name:'أحمد 2',phone:'22110000',editedAt:d});
    state.expenses=(state.expenses||[]).concat([{id:'e1',category:'مواد',reason:'x',amount:NaN,date:d,editedAt:d}]);
    state.brickCash=[{id:'bc1',type:'out',amount:5000,reason:'دفعة كبيرة',date:d,editedAt:d}];
    const a=auditChecks(); return a.issues.map(x=>x.lvl+'|'+x.t+'|'+x.d); });
  const has=re=>r.some(x=>re.test(x));
  log('ledger mismatch found with the reason (paid «له» without a cash move): '+has(/^err\|كشف «سالم» لا يطابق رصيده\|.*بلا حركة صندوق/)+' (expect true)');
  log('negative stock found: '+has(/مخزون سالب: «صابون»/)+' (expect true)');
  log('credit sale for a deleted customer found: '+has(/^err\|فاتورة بالدين لزبون محذوف/)+' (expect true)');
  log('two customers with the same phone found: '+has(/^warn\|رقم واحد لعدّة زبائن: 22110000\|أحمد · أحمد 2/)+' (expect true)');
  log('invalid amount (NaN) found: '+has(/^err\|رقم غير صالح في expenses/)+' (expect true)');
  log('negative brick cash box found with the biggest payment: '+has(/^warn\|صندوق دبو سالب.*\|.*دفعة كبيرة/)+' (expect true)');
  log('errors come before warnings: '+(r.findIndex(x=>x.startsWith('warn'))>r.map(x=>x.startsWith('err')).lastIndexOf(true))+' (expect true)');
  // الزر في الإعدادات
  await page.evaluate(()=>{ openSettings('app'); }); await page.waitForTimeout(300);
  log('«🩺 فحص الحسابات» is in Settings ▸ App: '+(await page.isVisible('#btnAudit'))+' (expect true)');
  await page.click('#btnAudit'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ sum:document.querySelector('#auditOut .audit-sum').textContent, rows:document.querySelectorAll('#auditOut .audit-row').length, errRows:document.querySelectorAll('#auditOut .audit-row.err').length, go:document.querySelectorAll('#auditOut [data-audit-go]').length }));
  log('button shows the summary and one row per issue: '+(/خطأ/.test(r.sum) && r.rows>=6 && r.errRows>=3 && r.go>=2)+' (expect true) '+JSON.stringify(r));
  const goIdx=await page.evaluate(()=>_auditRes.issues.findIndex(x=>/مخزون سالب/.test(x.t)));
  await page.click(`#auditOut [data-audit-go="${goIdx}"]`); await page.waitForTimeout(300);
  log('«📍 افتح» closes settings and opens the right screen: '+(await page.evaluate(()=>getComputedStyle(document.getElementById('settingsModal')).display==='none' && state.tab==='store' && state.storeSub==='products'))+' (expect true)');
  // نص التاريخ القديم في الصندوق يُعرض بالفرنسية
  r=await page.evaluate(()=>{ state.storeCash.push({id:'t1',type:'in',amount:100,reason:'تحويل دخل المغسلة 2026-10-17',kind:'lndTransfer',day:'2026-10-17',pm:{cash:100},date:iso(new Date()),editedAt:iso(new Date())}); state.tab='store'; state.storeSub='cashbox'; render(); const t=document.getElementById('main').innerText; return {fr:t.includes('تحويل دخل المغسلة 17/10/2026'), iso:/2026-10-17/.test(t)}; });
  log('old ISO date inside a cash reason is shown as DD/MM/YYYY: '+(r.fr && !r.iso)+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
