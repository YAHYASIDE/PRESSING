// 2.38.0 — تفاصيل الديون محفوظة إلى الأبد: لا حذف تلقائي، والحذف اليدوي بالكود يُعلّم السجل «محذوفًا» ويبقى بتفاصيله في «🗂️ السجل» وكشف الحساب ويمكن استعادته.
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
  await page.evaluate(()=>{ const old=(d)=>iso(new Date(Date.now()-d*864e5));
    state.storeCustomers=[{id:'cu1',name:'يحي سيدا',phone:'22227268',country:'222',editedAt:old(400)},{id:'cu2',name:'سيدي محمد',phone:'33227268',country:'222',editedAt:old(400)}];
    state.storeSales=[]; state.storeCash=[]; state.suppliers=[]; state.storePurchases=[];
    state.storeDebts=[{id:'d1',customerId:'cu1',dir:'on',amount:500,paidAmount:0,paid:false,note:'6 لترات',date:old(2),by:'yahya',editedAt:old(2)},
      {id:'d2',customerId:'cu1',dir:'on',amount:400,paidAmount:0,paid:false,note:'سواف',date:old(40),by:'أنفع',editedAt:old(40)},
      {id:'d3',customerId:'cu2',dir:'on',amount:10000,paidAmount:0,paid:false,note:'وصف طويل للدين',date:old(380),by:'yahya',editedAt:old(380)},
      {id:'d4',customerId:'cu2',dir:'for',amount:2000,paidAmount:2000,paid:true,note:'تسجيل بنكلي',date:old(3),by:'أنفع',editedAt:old(1)}];
    state.tab='store'; state.storeSub='debts'; state.debtView='all'; save(); render(); });
  await page.waitForTimeout(300);
  const txt=()=>page.evaluate(()=>document.querySelector('main').textContent);
  let t=await txt();
  log('debts from 2 days, 40 days and 1 year ago all show with their details: '+(/6 لترات/.test(t) && /سواف/.test(t) && /وصف طويل للدين/.test(t) && /10,000/.test(t))+' (expect true)');
  await page.click('[data-debtview="hist"]'); await page.waitForTimeout(200); t=await txt();
  log('«🗂️ السجل» lists every debt incl. the fully paid one with its status: '+((await page.$$('.hist-row')).length===4 && /تسجيل بنكلي/.test(t) && /مسدَّد/.test(t))+' (expect true)');
  await page.evaluate(()=>{ window.prompt=()=>'خطأ في التسجيل'; });
  await page.click('[data-md-del="d2"]'); await page.waitForTimeout(200); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300);
  let r=await page.evaluate(()=>{ const x=state.storeDebts.find(x=>x.id==='d2'); return { kept:!!x, del:x&&x.cancelled, by:x&&x.cancelledBy, why:x&&x.cancelReason, note:x&&x.note, amt:x&&x.amount, date:x&&x.date, tomb:!!state.deleted['rec:d2'], bal:custBalance('cu1') }; });
  log('manual delete keeps the record with all details + who/why, no tombstone: '+(r.kept && r.del && r.by==='مالك' && r.why==='خطأ في التسجيل' && r.note==='سواف' && r.amt===400 && !!r.date && !r.tomb)+' (expect true)');
  log('deleted debt no longer counts (balance 500): '+(r.bal===500)+' (expect true)');
  t=await txt();
  log('history shows it as deleted with who and why: '+(/حذفه مالك/.test(t) && /خطأ في التسجيل/.test(t) && !!(await page.$('[data-md-restore="d2"]')))+' (expect true)');
  await page.evaluate(()=>openCustStatement(storeCust('cu1'))); await page.waitForTimeout(150);
  log('customer statement still shows the deleted debt (struck, for the record): '+/ديون محذوفة[\s\S]*سواف/.test(await page.textContent('#receiptContent'))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  r=await page.evaluate(()=>{ const remote=JSON.parse(JSON.stringify(cloudCopy())); remote.storeDebts=remote.storeDebts.map(x=>x.id==='d2'?Object.assign({},x,{cancelled:false,editedAt:iso(new Date(Date.now()-40*864e5))}):x);
    applyRemote(remote); const x=state.storeDebts.find(x=>x.id==='d2'); const out=cloudCopy().storeDebts.find(x=>x.id==='d2'); return { still:x&&x.cancelled, inCloud:!!out&&out.cancelled&&out.note==='سواف' }; });
  log('an older copy from another device does not undo the delete; the cloud copy keeps the details: '+(r.still && r.inCloud)+' (expect true)');
  await page.click('[data-md-restore="d2"]'); await page.waitForTimeout(200); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const x=state.storeDebts.find(x=>x.id==='d2'); return { back:x&&!x.cancelled, hist:(x.cancelHist||[]).length, bal:custBalance('cu1') }; });
  log('restore brings it back (balance 900) and remembers the delete/restore history: '+(r.back && r.hist===1 && r.bal===900)+' (expect true)');
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockInput')){ if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch'); await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(500); }
  r=await page.evaluate(()=>({ n:state.storeDebts.length, notes:state.storeDebts.map(x=>x.note).join('|') }));
  log('after closing and reopening the app all 4 debts and their details are still there: '+(r.n===4 && /6 لترات/.test(r.notes) && /سواف/.test(r.notes) && /وصف طويل للدين/.test(r.notes) && /تسجيل بنكلي/.test(r.notes))+' (expect true)');
  r=await page.evaluate(()=>{ _clockOffset+=400*864e5; state.tab='store'; state.storeSub='debts'; state.debtView='hist'; render(); return { n:document.querySelectorAll('.hist-row').length, all:state.storeDebts.length, y:new Date().getFullYear() }; });
  log('a year later nothing is removed automatically (history still 4): '+(r.n===4 && r.all===4 && r.y>=2027)+' (expect true)');
  await page.evaluate(()=>{ _clockOffset-=400*864e5; const d=iso(new Date()); state.brickLedger=[{id:'bl1',partyType:'cust',partyId:'cu1',dir:'on',kind:'cash',amount:3000,note:'سلفة طوب',cash:true,payMethod:'cash',date:d,by:'مالك',editedAt:d}]; state.brickCash=[{id:'bm1',type:'out',amount:3000,reason:'سلفة',ref:'bl1',payMethod:'cash',date:d,by:'مالك',editedAt:d}]; state.tab='brick'; state.brickSub='debts'; window.prompt=()=>''; save(); render(); });
  await page.waitForTimeout(250);
  await page.click('[data-bk-del="ledger:bl1"]'); await page.waitForTimeout(200); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const x=state.brickLedger.find(x=>x.id==='bl1'); return { kept:!!x&&x.cancelled&&x.note==='سلفة طوب', cash:state.brickCash.length, bal:brickCashBalance(), shown:/محذوف — سلفة طوب/.test(document.querySelector('main').textContent) }; });
  log('دبو: deleting a ledger entry keeps its details (shown as deleted), its cash move is reversed: '+(r.kept && r.cash===0 && r.bal===0 && r.shown)+' (expect true)');
  await page.click('[data-bk-lrestore="bl1"]'); await page.waitForTimeout(200); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ back:!state.brickLedger[0].cancelled, bal:brickCashBalance() }));
  log('دبو: restoring brings the entry and its cash move back (box −3,000): '+(r.back && r.bal===-3000)+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
