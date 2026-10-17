// 2.40.0 — المتجر بمجموعات، كشف الزبون دفترًا بالرصيد الجاري والصافي فقط، زرّا عليه/له في البطاقة، و«ما الجديد» بعد التحديث مع جولة.
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
  // ===== المتجر: مجموعات
  let r=await page.evaluate(()=>{ state.tab='store'; state.storeSub='pos'; render(); const top=[...document.querySelectorAll('.seg:not(.inner-seg) [data-ssub]')].map(b=>b.textContent.trim()); const inner=[...document.querySelectorAll('.inner-seg [data-ssub]')].map(b=>b.dataset.ssub); return {top,inner}; });
  log('store has 4 groups (البيع والشراء · المواد · الزبائن والديون · الصندوق): '+(r.top.length===4 && /البيع والشراء/.test(r.top[0]) && /الزبائن والديون/.test(r.top[2]))+' (expect true)');
  log('«البيع والشراء» holds POS + purchase + sales in one place: '+(JSON.stringify(r.inner)==='["pos","purchases","sales"]')+' (expect true)');
  await page.click('.inner-seg [data-ssub="purchases"]'); await page.waitForTimeout(200);
  log('switching inside the group keeps the same top tab: '+(await page.evaluate(()=>state.storeSub==='purchases' && document.querySelector('.seg:not(.inner-seg) [data-ssub="pos"]').classList.contains('on') && !!document.getElementById('purSave')))+' (expect true)');
  r=await page.evaluate(()=>{ state.storeSub='debts'; render(); return [...document.querySelectorAll('.inner-seg [data-ssub]')].map(b=>b.dataset.ssub); });
  log('«الزبائن والديون» holds debts + all customers: '+(JSON.stringify(r)==='["debts","customers"]')+' (expect true)');
  // ===== الكشف: دفتر بالرصيد الجاري والصافي فقط
  await page.evaluate(()=>{ const d=(n)=>iso(new Date(Date.now()-n*864e5));
    state.storeCustomers=[{id:'cu1',name:'يحي سيدا',phone:'22227268',country:'222',editedAt:d(9)}];
    state.storeSales=[]; state.storeCash=[]; state.carOps=[]; state.carpetOrders=[]; state.laundryOrders=[];
    state.storeDebts=[{id:'m1',customerId:'cu1',dir:'for',amount:26400,paidAmount:0,note:'رصيد قديم',date:d(5),editedAt:d(5)},{id:'m2',customerId:'cu1',dir:'on',amount:4800,paidAmount:0,note:'تمر',date:d(4),editedAt:d(4)},{id:'m3',customerId:'cu1',dir:'on',amount:500,paidAmount:0,note:'6',date:d(1),editedAt:d(1)}];
    state.tab='contacts'; state.contactsSub='debts'; state.debtKind='all'; render(); });
  r=await page.evaluate(()=>{ const n=custNet(storeCust('cu1')); openDirStatement(storeCust('cu1')); const t=document.getElementById('receiptContent').textContent.replace(/\s+/g,' '); document.getElementById('receiptModal').style.display='none'; return {net:n.net,t}; });
  log('ledger shows each move with «كان ← صار» and one final net «له عندنا 21,100»: '+(r.net===-21100 && /كان 0 ← صار له 26,400/.test(r.t) && /كان له 26,400 ← صار له 21,600/.test(r.t) && /صار له 21,100/.test(r.t) && /له عندنا 21,100/.test(r.t) && !/المستحقّ عليه/.test(r.t))+' (expect true)');
  // ===== زرّا عليه/له في البطاقة + تعديل/حذف
  await page.evaluate(()=>{ state.storeDebts.push({id:'m4',customerId:'cu1',dir:'on',amount:30000,paidAmount:0,note:'بضاعة',date:iso(new Date()),editedAt:iso(new Date())}); render(); });
  r=await page.evaluate(()=>{ const c=document.querySelector('.debtor-card'); return { amt:c.querySelector('.dc-amt').textContent.replace(/\s+/g,' '), qd:!!c.querySelector('[data-qd^="on|"]')&&!!c.querySelector('[data-qd^="for|"]'), ed:!!c.querySelector('[data-dc-edit="cu1"]'), del:!!c.querySelector('[data-dc-del="cu1"]') }; });
  log('debtor card shows only the net 8,900 «عليه» (35,300 − 26,400): '+(/8,900/.test(r.amt) && /عليه/.test(r.amt))+' (expect true)');
  log('card has «➕ عليه», «➕ له», ✏️ edit and 🗑️ delete: '+(r.qd && r.ed && r.del)+' (expect true)');
  await page.click('.debtor-card [data-qd^="for|"]'); await page.waitForTimeout(150); await page.fill('#qdAmt','8900'); await page.fill('#qdNote','تسوية'); await page.click('#qdSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ n:custNet(storeCust('cu1')).net, x:state.storeDebts.find(x=>x.note==='تسوية') }));
  log('«➕ له» from the card adds a credit with description → net becomes 0: '+(r.n===0 && r.x && r.x.dir==='for' && r.x.amount===8900)+' (expect true)');
  await page.evaluate(()=>{ state.debtKind='all'; render(); });
  await page.evaluate(()=>{ const b=document.querySelector('[data-dc-del="cu1"]'); if(b) b.click(); });
  await page.waitForTimeout(200);
  log('a customer with open balances cannot be deleted: '+(await page.evaluate(()=>!!storeCust('cu1') && /لا يمكن حذف/.test(document.getElementById('toast').textContent)))+' (expect true)');
  // ===== بطاقة الولاء: ضبط يدوي لبطاقة سابقة
  await page.evaluate(()=>{ state.customers={}; state.tab='cars'; render(); });
  await page.fill('#carPlate','566'); await page.waitForTimeout(150);
  await page.click('#loyaltyBox [data-lstamp="3"]'); await page.waitForTimeout(200);
  r=await page.evaluate(()=>({ s:(state.customers['566']||{}).stamps, note:document.getElementById('loyaltyBox').textContent, act:state.activity.some(a=>/تعديل بطاقة ولاء/.test(a.action)) }));
  log('tapping the 3rd circle sets 3 washes → «متبقٍ 1» then free; logged: '+(r.s===3 && /متبقٍ 1 غسلة/.test(r.note) && r.act)+' (expect true)');
  await page.click('#loyaltyBox [data-lstamp="3"]'); await page.waitForTimeout(150);
  log('tapping the last filled circle again lowers it to 2: '+(await page.evaluate(()=>state.customers['566'].stamps===2))+' (expect true)');
  await page.click('#loyaltyBox [data-lstamp="4"]'); await page.waitForTimeout(150);
  log('4 washes → the next wash is free: '+(await page.evaluate(()=>state.customers['566'].stamps===4 && /مجانية/.test(document.getElementById('loyaltyBox').textContent)))+' (expect true)');
  log('the loyalty table has an ✏️ edit button per customer: '+(await page.evaluate(()=>{ render(); return !!document.querySelector('[data-lset="566"]'); }))+' (expect true)');
  // ===== العمّال: بطاقة ملوّنة مختصرة، له/عليه بنافذة، تعديل العامل والراتب (من اليوم فقط)
  await page.evaluate(()=>{ const d=new Date(); d.setDate(1); state.workers=[{id:'wa',name:'حمد',role:'غسيل سيارات',phone:'',monthly:31000,start:iso(d),absent:[],payments:[],credits:[],editedAt:iso(new Date())},{id:'wb',name:'سالم',role:'كوّاء',monthly:20000,start:iso(d),absent:[],payments:[],credits:[]}]; state.tab='expenses'; state.expSub='workers'; render(); });
  r=await page.evaluate(()=>{ const cs=[...document.querySelectorAll('.wcard')]; const c=cs[0]; return { n:cs.length, col:[getComputedStyle(cs[0]).borderTopColor,getComputedStyle(cs[1]).borderTopColor], noInputs:!document.querySelector('[data-payin],[data-creditin]'), btns:[...c.querySelectorAll('.r-btn .rb-ic')].map(x=>Math.round(x.getBoundingClientRect().width)), amt:c.querySelector('.dc-amt').textContent }; });
  log('each worker card has its own color, no long input rows, equal round buttons: '+(r.n===2 && r.col[0]!==r.col[1] && r.noInputs && r.btns.length===4 && new Set(r.btns).size===1)+' (expect true)');
  const before=await page.evaluate(()=>wBalance(state.workers[0]));
  await page.click('[data-wq="pay|wa"]'); await page.waitForTimeout(150); await page.fill('#wqAmt','1000'); await page.fill('#wqNote','سلفة'); await page.click('#wqSave'); await page.waitForTimeout(250);
  await page.click('[data-wq="credit|wa"]'); await page.waitForTimeout(150); await page.fill('#wqAmt','300'); await page.fill('#wqNote','مكافأة'); await page.click('#wqSave'); await page.waitForTimeout(250);
  r=await page.evaluate(b=>({ d:Math.round(wBalance(state.workers[0])-b), p:state.workers[0].payments[0], c:state.workers[0].credits[0] }),before);
  log('«➖ عليه» 1,000 سلفة and «➕ له» 300 مكافأة are recorded with notes (balance −700): '+(r.d===-700 && r.p.note==='سلفة' && r.c.note==='مكافأة')+' (expect true)');
  const acc0=await page.evaluate(()=>accruedDue(state.workers[0]));
  await page.click('[data-wedit="wa"]'); await page.waitForTimeout(150); await page.fill('#weName','حمد ولد أحمد'); await page.fill('#weMonthly','62000'); await page.click('#weSave'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>{ const w=state.workers[0]; const today=ymd(new Date()); const dim=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate(); return { name:w.name, m:w.monthly, h:(w.salaryHist||[]).length, acc:accruedDue(w), dim, act:state.activity.some(a=>/تعديل عامل/.test(a.action)&&/31,000 ← 62,000/.test(a.detail||"")) }; });
  log('editing changes the name and salary, logged «31,000 ← 62,000»: '+(r.name==='حمد ولد أحمد' && r.m===62000 && r.h===1 && r.act)+' (expect true)');
  log('the new salary counts from today only (earlier days keep the old rate): '+(Math.abs(r.acc-(acc0+31000/r.dim))<1)+' (expect true)');
  // ===== ما الجديد
  await page.evaluate(()=>{ localStorage.removeItem('sadaqa_seen_ver'); window._forceWhatsNew=true; _wnShown=false; maybeShowWhatsNew(); }); await page.waitForTimeout(200);
  r=await page.evaluate(()=>{ const m=document.getElementById('whatsNewModal'); return { open:m.style.display==='flex', title:m.querySelector('#wnTitle').textContent, n:m.querySelectorAll('.wn-item').length, go:m.querySelectorAll('[data-wn-go]').length, v:window.APP_VERSION }; });
  log('after an update «ما الجديد» opens for the new version with its changes and «أرني» buttons: '+(r.open && r.title.includes(r.v) && r.n>=5 && r.go>=4)+' (expect true)');
  await page.click('#wnTourBtn'); await page.waitForTimeout(500);
  r=await page.evaluate(()=>({ tab:state.tab, sub:state.storeSub, spot:!!document.querySelector('.wn-spot'), tip:document.getElementById('wnTip').style.display==='flex', t:document.getElementById('wnTipT').textContent, seen:localStorage.getItem('sadaqa_seen_ver') }));
  log('the tour goes to the first changed place, highlights it and explains: '+(r.tab==='store' && r.sub==='pos' && r.spot && r.tip && /البيع والشراء/.test(r.t))+' (expect true)');
  await page.click('#wnNext'); await page.waitForTimeout(500);
  log('«التالي» moves to the next change (store customers & debts): '+(await page.evaluate(()=>state.storeSub==='debts' && /الزبائن والديون/.test(document.getElementById('wnTipT').textContent)))+' (expect true)');
  await page.click('#wnEnd'); await page.waitForTimeout(200);
  log('«تخطي الجولة» ends it; seen version saved so it does not pop again: '+(await page.evaluate(()=>document.getElementById('wnTip').style.display==='none' && !document.querySelector('.wn-spot') && localStorage.getItem('sadaqa_seen_ver')===window.APP_VERSION && (_wnShown=false, maybeShowWhatsNew(), document.getElementById('whatsNewModal').style.display!=='flex')))+' (expect true)');
  await page.evaluate(()=>{ openSettings('all'); }); await page.waitForTimeout(150); await page.click('#btnWhatsNew'); await page.waitForTimeout(200);
  log('settings ▸ «🎉 ما الجديد» reopens the list anytime: '+(await page.evaluate(()=>document.getElementById('whatsNewModal').style.display==='flex'))+' (expect true)');
  await page.click('#wnSkip'); await page.waitForTimeout(100);
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
