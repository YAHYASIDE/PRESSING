// 2.24.0 — ديون يدوية في «المتجر ▸ الديون»: دين «عليه» يُحصَّل مع ديون المتجر، دين «له» يُسدَّد من الصندوق، وصف، زبون جديد، كشف حساب، مزامنة.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
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

  // زبون محفوظ «سالم» عليه فاتورة بالدين 3,000 قديمة
  await page.evaluate(()=>{ const d=iso(new Date(Date.now()-2*864e5)); state.storeCustomers=[{id:'cu1',name:'سالم',phone:'22334455',country:'222',by:'مالك',editedAt:d}];
    state.storeSales=[{id:'s1',no:'S-1',customerId:'cu1',customerName:'سالم',items:[],total:3000,paidAmount:0,paid:false,date:d,by:'مالك',editedAt:d}]; state.storeCash=[]; state.storeDebts=[];
    state.tab='store'; state.storeSub='debts'; state.debtView='debt'; save(); render(); });
  await page.waitForTimeout(300);
  log('form folded by default with an add button: '+(await page.isVisible('#mdOpen'))+' (expect true)');
  await page.click('#mdOpen'); await page.waitForTimeout(200);
  log('form opens with direction seg + customer select + amount + note: '+((await page.isVisible('[data-mddir="on"]')) && (await page.isVisible('#mdCust')) && (await page.isVisible('#mdAmt')) && (await page.isVisible('#mdNote')))+' (expect true)');
  // تحقق: بلا وصف يُرفض
  await page.selectOption('#mdCust','cu1'); await page.fill('#mdAmt','2000'); await page.click('#mdSave'); await page.waitForTimeout(200);
  log('description is required: '+(await page.evaluate(()=>(state.storeDebts||[]).length===0 && /وصف/.test(document.getElementById('toast').textContent)))+' (expect true)');
  // دين «عليه» 2,000 بوصف «سلفة» دون صندوق
  await page.fill('#mdNote','سلفة'); await page.click('#mdSave'); await page.waitForTimeout(300);
  let r=await page.evaluate(()=>({ n:state.storeDebts.length, x:state.storeDebts[0], bal:custBalance('cu1'), recv:totalReceivables(), cash:state.storeCash.length, d:debtors().find(d=>d.custId==='cu1') }));
  log('manual debt «on» saved with note, no cash move: '+(r.n===1 && r.x.dir==='on' && r.x.amount===2000 && r.x.note==='سلفة' && r.cash===0)+' (expect true)');
  log('customer balance 5,000 (3,000 invoice + 2,000 manual) and receivables 5,000: '+(r.bal===5000 && r.recv===5000)+' (expect true)');
  log('debtors list shows store debt 5,000 with a manual item: '+(r.d && r.d.by.store===5000 && r.d.n.store===2 && r.d.items.some(it=>it.mdId))+' (expect true)');
  const card=await page.evaluate(()=>document.querySelector('.grid.orders').textContent);
  log('card shows the manual debt with its description: '+/دين يدوي سلفة/.test(card.replace(/\s+/g,' '))+' (expect true) | total 5,000: '+/5,000/.test(card)+' (expect true)');
  log('form closed after save: '+(await page.isVisible('#mdOpen'))+' (expect true)');

  // دين «له» 1,500 بوصف «دفع مقدّمًا» عبر الصندوق (بنكيلي) → حركة وارد
  await page.click('#mdOpen'); await page.waitForTimeout(150); await page.click('[data-mddir="for"]'); await page.waitForTimeout(150);
  await page.selectOption('#mdCust','cu1'); await page.fill('#mdAmt','1500'); await page.fill('#mdNote','دفع مقدّمًا'); await page.check('#mdCash'); await page.waitForTimeout(100);
  log('pay-method picker appears when cash is checked: '+(await page.isVisible('#mdPm'))+' (expect true)');
  await page.click('#mdPm [data-pm="bankily"]'); await page.click('#mdSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ x:state.storeDebts[1], credit:custCredit('cu1'), bal:custBalance('cu1'), m:state.storeCash[0], cc:custCreditors() }));
  log('manual debt «for» saved with cash-in movement (bankily 1,500, ref=debt): '+(r.x.dir==='for' && r.m && r.m.type==='in' && r.m.amount===1500 && r.m.payMethod==='bankily' && r.m.ref===r.x.id)+' (expect true)');
  log('credit 1,500 is separate from his debt (balance still 5,000): '+(r.credit===1500 && r.bal===5000)+' (expect true) | listed among customer creditors: '+(r.cc.length===1 && r.cc[0].bal===1500)+' (expect true)');
  log('same card shows what he owes (5,000), his credit (1,500) and the net «عليه لنا 3,500»: '+(await page.evaluate(()=>{ const t=document.querySelector('.grid.orders').textContent; return document.querySelectorAll('.party-card').length===1 && /عليه لنا\s*5,000/.test(t) && /له عندنا\s*1,500/.test(t) && /عليه لنا 3,500/.test(t); }))+' (expect true)');

  // الدائنون — علينا: بطاقة الزبون + زر تسديد له
  await page.click('[data-debtview="cred"]'); await page.waitForTimeout(250);
  log('creditors view shows the customer card with pay button: '+((await page.isVisible('[data-cc-pay="cu1"]')) && /دفع مقدّمًا/.test(await page.textContent('.grid.orders')))+' (expect true)');
  await page.click('[data-cc-pay="cu1"]'); await page.waitForTimeout(200);
  log('pay modal opens with 1,500 due: '+((await page.isVisible('#storePayModal')) && (await page.inputValue('#storePayAmt'))==='1500')+' (expect true)');
  await page.fill('#storePayAmt','1000'); await page.click('#storePayOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ credit:custCredit('cu1'), x:state.storeDebts[1], out:state.storeCash.filter(m=>m.type==='out'), balance:cashboxBalance() }));
  log('paying 1,000 back: credit left 500, cash-out movement, box 1,500−1,000=500: '+(r.credit===500 && r.x.paidAmount===1000 && r.out.length===1 && r.out[0].amount===1000 && r.balance===500)+' (expect true)');

  // تحصيل من الزبون 4,000 → يسدّد الفاتورة القديمة 3,000 أولًا ثم 1,000 من الدين اليدوي
  await page.click('[data-debtview="debt"]'); await page.waitForTimeout(250);
  await page.click('[data-dc-pay="cu1"]'); await page.waitForTimeout(200); await page.fill('#storePayAmt','4000'); await page.click('#storePayOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ bal:custBalance('cu1'), s:state.storeSales[0], x:state.storeDebts[0], inMoves:state.storeCash.filter(m=>m.type==='in').length }));
  log('collection allocates oldest first: invoice paid, manual debt 1,000 left, balance 1,000: '+(r.s.paid===true && r.x.paidAmount===1000 && r.x.paid===false && r.bal===1000)+' (expect true)');
  await page.click('[data-dc-pay="cu1"]'); await page.waitForTimeout(200); await page.fill('#storePayAmt','1000'); await page.click('#storePayOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ bal:custBalance('cu1'), x:state.storeDebts[0], d:debtors().find(d=>d.custId==='cu1') }));
  log('fully collected: manual debt marked paid and customer leaves the debtors list: '+(r.bal===0 && r.x.paid===true && !r.d)+' (expect true)');

  // كشف الحساب يذكر الديون اليدوية
  await page.evaluate(()=>openCustStatement(storeCust('cu1'))); await page.waitForTimeout(200);
  const st=await page.textContent('#receiptContent');
  log('store statement lists manual debts (on + for) and credit left 500: '+(/ديون يدوية عليه/.test(st) && /سلفة/.test(st) && /ديون له عندنا/.test(st) && /دفع مقدّمًا/.test(st) && /له عندنا/.test(st))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; openDirStatement(storeCust('cu1')); }); await page.waitForTimeout(200);
  const st2=await page.textContent('#receiptContent');
  log('directory statement lists them too: '+(/دين عليه: سلفة/.test(st2) && /دين له: دفع مقدّمًا/.test(st2))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });

  // زبون جديد من داخل النموذج + دين عليه عبر الصندوق (سلفة نقدية) → حركة صادر
  await page.evaluate(()=>{ state.tab='store'; state.storeSub='debts'; state.debtView='debt'; render(); }); await page.waitForTimeout(200);
  await page.click('#mdOpen'); await page.waitForTimeout(150); await page.click('[data-mddir="on"]'); await page.waitForTimeout(150);
  await page.selectOption('#mdCust','__new'); await page.waitForTimeout(200);
  log('choosing «new customer» reveals name/phone fields: '+((await page.isVisible('#mdNewName')) && (await page.isVisible('#mdNewPhone')))+' (expect true)');
  // الرجوع إلى زبون محفوظ يخفي خانات الزبون الجديد (كانت تبقى ظاهرة)
  await page.selectOption('#mdCust','cu1'); await page.waitForTimeout(150);
  log('switching back to a saved customer hides the new-customer fields: '+(!(await page.isVisible('#mdNewName')))+' (expect true)');
  await page.selectOption('#mdCust','__new'); await page.waitForTimeout(150);
  // اسم موجود بلا هاتف → يُربط بالزبون المحفوظ بدل تكراره
  await page.fill('#mdNewName','سالم'); await page.fill('#mdAmt','100'); await page.fill('#mdNote','اختبار تكرار'); await page.click('#mdSave'); await page.waitForTimeout(300);
  log('existing name without phone is linked, not duplicated: '+(await page.evaluate(()=>state.storeCustomers.filter(c=>c.name==='سالم').length===1 && state.storeDebts.some(x=>x.note==='اختبار تكرار'&&x.customerId==='cu1')))+' (expect true)');
  await page.click('#mdOpen'); await page.waitForTimeout(150); await page.click('[data-mddir="on"]'); await page.waitForTimeout(150);
  await page.selectOption('#mdCust','__new'); await page.waitForTimeout(150);
  await page.fill('#mdNewName','خالد'); await page.fill('#mdNewPhone','33445566'); await page.fill('#mdAmt','700'); await page.fill('#mdNote','سلفة نقدية'); await page.check('#mdCash'); await page.click('#mdSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const c=state.storeCustomers.find(x=>x.name==='خالد'); const x=state.storeDebts.find(y=>c&&y.customerId===c.id); const m=state.storeCash.find(m=>x&&m.ref===x.id); return { c:!!c, phone:c&&c.phone, x:!!x, cashOut:m&&m.type==='out'&&m.amount===700&&m.payMethod==='cash', bal:c?custBalance(c.id):-1, box:cashboxBalance() }; });
  log('new customer created with phone and a 700 cash loan (cash-out movement): '+(r.c && r.phone==='33445566' && r.x && r.cashOut && r.bal===700)+' (expect true) | box 500+4,000+1,000−700=4,800: '+(r.box===4800)+' (expect true)');
  log('debtors list now has خالد with 700 store debt: '+(await page.evaluate(()=>{ const d=debtors().find(d=>d.name==='خالد'); return !!d && d.by.store===700; }))+' (expect true)');

  // المزامنة: نسخة بعيدة بلا الديون اليدوية لا تمحوها، ودين بعيد جديد يُضاف
  r=await page.evaluate(()=>{ const remote=JSON.parse(JSON.stringify(cloudCopy())); const mine=state.storeDebts.length; remote.storeDebts=[{id:'rd1',customerId:'cu1',dir:'on',amount:900,paidAmount:0,paid:false,note:'من جهاز آخر',date:iso(new Date()),by:'مشرف',editedAt:iso(new Date())}]; applyRemote(remote); return { n:state.storeDebts.length, mine, has:state.storeDebts.some(x=>x.id==='rd1'), inCloud:Array.isArray(cloudCopy().storeDebts) && cloudCopy().storeDebts.length===state.storeDebts.length }; });
  log('merge keeps local manual debts and adds the remote one: '+(r.n===r.mine+1 && r.has)+' (expect true) | included in the cloud copy: '+r.inCloud+' (expect true)');
  // الحذف بالكود + tombstone
  await page.evaluate(()=>{ state.tab='store'; state.storeSub='debts'; state.debtView='debt'; render(); }); await page.waitForTimeout(200);
  await page.click('[data-md-del="rd1"]'); await page.waitForTimeout(200);
  await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300);
  log('delete needs the code and leaves a tombstone: '+(await page.evaluate(()=>!state.storeDebts.some(x=>x.id==='rd1') && !!state.deleted['rec:rd1']))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
