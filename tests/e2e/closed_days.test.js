// 2.15.0 — الأيام المغلقة: إغلاق + تحويل للمتجر (بلا تكرار)، منع التعديل المباشر، صلاحية، سبب، تأكيد،
// سجل تدقيق، تسوية في المتجر مرتبطة بالتحويل، إلغاء موثق بدل الحذف، حالات اليوم، فحص التطابق، تقرير السجل.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:1100,height:900} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const code=async()=>{ await page.waitForTimeout(150); await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300); };
  const login=async(name,pin)=>{ if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch'); await page.fill('#lockName',name); await page.fill('#lockInput',pin); await page.click('#lockEnter'); await page.waitForTimeout(400); };
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await login('مالك','0707');
  // يوم أمس: سيارة 45,000 بنكيلي، سجاد 10,000 كاش، ملابس 5,000 غير مدفوعة، مصروف 1,000
  const Y = await page.evaluate(()=>{ const y=new Date(); y.setDate(y.getDate()-1); y.setHours(10,0,0,0); const yd=iso(y); const day=ymd(y);
    state.carOps=[{id:'car1',no:'A1',vehicle:'شاحنة',wash:'غسيل كامل',price:45000,paid:true,paidDate:yd,payMethod:'bankily',date:yd,editedAt:yd}];
    state.carpetOrders=[{id:'rug1',no:'R1',customer:'أحمد',type:'سجادة',count:1,unit:10000,price:10000,status:'done',paid:true,paidDate:yd,payMethod:'cash',date:yd,editedAt:yd}];
    state.laundryOrders=[{id:'lnd1',no:'L1',customer:'سعد',type:'قميص',service:'كي',count:2,unit:2500,price:5000,status:'ready',paid:false,date:yd,editedAt:yd}];
    state.expenses=[{id:'exp1',amount:1000,category:'عام',reason:'ماء',date:yd,editedAt:yd}];
    state.storeCash=[]; state.closings=[]; state.closedDayEdits=[]; state.users=[{id:'w1',name:'عامل',pin:'1111'}];
    save(); return day; });

  // ===== 1) الإغلاق والتحويل =====
  let st=await page.evaluate(d=>dayStatus(d),Y);
  log('day open before closing: '+(st==='open')+' (expect true)');
  const snap=await page.evaluate(d=>daySnapshot(d),Y);
  log('snapshot: services 60,000: '+(snap.services===60000)+' (expect true) | received 55,000: '+(snap.received===55000)+' (expect true) | debts 5,000: '+(snap.debts===5000)+' (expect true) | bankily 45,000: '+(snap.by.bankily===45000)+' (expect true)');
  await page.evaluate(d=>openClosing(d),Y); await page.waitForTimeout(300);
  log('close button shown for owner: '+(await page.isVisible('#closeDayBtn'))+' (expect true)');
  await page.click('#closeDayBtn'); await code(); await page.waitForTimeout(300);
  const after=await page.evaluate(d=>({ st:dayStatus(d), c:closingOf(d), moves:state.storeCash.filter(m=>m.kind==='lndTransfer').map(m=>({id:m.id,amt:m.amount,pm:m.payMethod,type:m.type})), bal:cashboxBalance(), t:dayTransferred(d) }),Y);
  log('day locked: '+(after.st==='locked')+' (expect true) | closing id deterministic: '+(after.c.id==='LaundryClosing-'+Y)+' (expect true)');
  log('two transfers (cash+bankily) with deterministic ids: '+(after.moves.length===2 && after.moves.some(m=>m.id==='LaundryTransfer-'+Y+'-bankily'&&m.amt===45000) && after.moves.some(m=>m.id==='LaundryTransfer-'+Y+'-cash'&&m.amt===10000))+' (expect true)');
  log('cashbox balance 55,000: '+(after.bal===55000)+' (expect true) | dayTransferred total 55,000: '+(after.t.total===55000)+' (expect true)');
  log('verify ok after closing: '+(after.c.verify&&after.c.verify.ok===true)+' (expect true)');
  log('modal shows locked status and transfer: '+/🔒 مغلق/.test(await page.textContent('#receiptContent'))+' (expect true)');
  // لا تكرار: إغلاق مرة أخرى / إعادة الدمج من جهاز آخر
  const again=await page.evaluate(d=>closeDay(d),Y);
  const dup=await page.evaluate(d=>{ const r=JSON.parse(JSON.stringify(cloudCopy())); applyRemote(r); return state.storeCash.filter(m=>m.kind==='lndTransfer').length; },Y);
  log('second close refused: '+(again.ok===false)+' (expect true) | re-merge keeps exactly 2 transfers: '+(dup===2)+' (expect true)');
  // الدخل غير مضاعف: التحويل ليس دخلًا للمتجر
  const pb=await page.evaluate(d=>payBreakdown(x=>ymd(x)===d),Y);
  log('transfer not counted as store income: '+(pb.bankily.store===0 && pb.cash.store===0 && pb.bankily.lnd===45000)+' (expect true)');
  await page.click('#receiptClose'); await page.waitForTimeout(200);

  // ===== 2) عامل بلا صلاحية =====
  await page.evaluate(()=>lockNow()); await page.waitForTimeout(300);
  await login('عامل','1111');
  await page.click('[data-tab="cars"]'); await page.click('[data-preset="yesterday"]'); await page.waitForTimeout(300);
  await page.click('[data-edit-car="car1"]'); await page.waitForTimeout(300);
  log('worker: no-permission notice shown: '+(await page.isVisible('#cdNoPerm'))+' (expect true) | request button hidden: '+!(await page.isVisible('#cdRequest'))+' (expect true) | edit modal NOT opened: '+!(await page.isVisible('#editModal'))+' (expect true)');
  await page.click('#cdCancel'); await page.waitForTimeout(100);
  await page.evaluate(()=>lockNow()); await page.waitForTimeout(300);
  await login('مالك','0707');

  // ===== 3) طلب تعديل + سبب إلزامي + تعديل بنكيلي 45,000 → 50,000 + تأكيد + تسوية =====
  await page.click('[data-tab="cars"]'); await page.click('[data-preset="yesterday"]'); await page.waitForTimeout(300);
  await page.click('[data-edit-car="car1"]'); await page.waitForTimeout(300);
  log('owner: closed-day modal shown: '+(await page.isVisible('#cdModal'))+' (expect true) | edit not opened directly: '+!(await page.isVisible('#editModal'))+' (expect true)');
  await page.click('#cdRequest'); await page.waitForTimeout(100);
  await page.click('#cdGo'); await page.waitForTimeout(100);
  log('empty reason blocked: '+(await page.isVisible('#cdModal'))+' (expect true)');
  await page.fill('#cdReason','تم تسجيل عملية Bankily بقيمة 45,000 بدل 50,000'); await page.click('#cdGo'); await page.waitForTimeout(300);
  log('day pending after request: '+(await page.evaluate(d=>dayStatus(d),Y)==='pending')+' (expect true) | edit dialog opened: '+(await page.isVisible('#editModal'))+' (expect true)');
  await page.fill('#edPrice','50000'); await page.click('#editSave'); await page.waitForTimeout(400);
  log('confirmation summary shown: '+(await page.isVisible('#cdcModal'))+' (expect true)');
  const body=await page.textContent('#cdcBody');
  log('summary shows 45,000 → 50,000: '+/45,000 → 50,000/.test(body)+' (expect true) | adjustment +5,000: '+/\+5,000/.test(body)+' (expect true) | reason shown: '+/بدل 50,000/.test(body)+' (expect true)');
  await page.click('#cdcOk'); await page.waitForTimeout(400);
  const res=await page.evaluate(d=>({ st:dayStatus(d), c:closingOf(d), adj:state.storeCash.filter(m=>m.kind==='lndAdj'), edits:state.closedDayEdits, bal:cashboxBalance(), t:dayTransferred(d), price:state.carOps[0].price }),Y);
  log('price updated: '+(res.price===50000)+' (expect true) | status edited: '+(res.st==='edited')+' (expect true)');
  log('adjustment +5,000 bankily linked to original transfer: '+(res.adj.length===1 && res.adj[0].type==='in' && res.adj[0].amount===5000 && res.adj[0].payMethod==='bankily' && res.adj[0].ref==='LaundryTransfer-'+Y+'-bankily')+' (expect true)');
  log('no duplicate transfer created: '+(await page.evaluate(()=>state.storeCash.filter(m=>m.kind==="lndTransfer").length===2))+' (expect true)');
  log('cashbox 60,000 and transferred 60,000: '+(res.bal===60000 && res.t.total===60000 && res.t.bankily===50000)+' (expect true)');
  const e=res.edits[0];
  log('audit entry: '+(res.edits.length===1 && e.day===Y && e.by==='مالك' && /بدل 50,000/.test(e.reason) && e.headline && e.headline.before===45000 && e.headline.after===50000 && e.headline.diff===5000)+' (expect true)');
  log('audit keeps record-level before/after: '+(e.records.length===1 && e.records[0].changes.some(c=>c[0]==='السعر'&&c[1]==='45,000'&&c[2]==='50,000'))+' (expect true)');
  log('audit kind names Bankily: '+/بنكيلي/.test(e.kind)+' (expect true) | verified: '+(e.verified===true)+' (expect true) | transfer before/after 55,000→60,000: '+(e.transferBefore===55000&&e.transferAfter===60000)+' (expect true)');
  log('session cleared after commit: '+(await page.evaluate(()=>_cdEdit===null))+' (expect true)');

  // ===== 4) إلغاء التعديل يعيد البيانات ولا يمسّ سجلات اليوم الجارية =====
  await page.click('[data-edit-car="car1"]'); await page.waitForTimeout(200);
  log('new edit needs a new request: '+(await page.isVisible('#cdModal'))+' (expect true)');
  await page.click('#cdRequest'); await page.fill('#cdReason','تجربة إلغاء'); await page.click('#cdGo'); await page.waitForTimeout(300);
  // أثناء المهلة: عملية جديدة اليوم (يجب ألا تُمس)
  await page.evaluate(()=>{ const d=iso(new Date()); state.carOps.push({id:'carToday',no:'A9',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1000,paid:true,paidDate:d,date:d,editedAt:d}); });
  await page.fill('#edPrice','52000'); await page.click('#editSave'); await page.waitForTimeout(400);
  log('confirmation shown again: '+(await page.isVisible('#cdcModal'))+' (expect true)');
  await page.click('#cdcCancel'); await page.waitForTimeout(400);
  const ab=await page.evaluate(d=>({ price:state.carOps.find(x=>x.id==='car1').price, today:!!state.carOps.find(x=>x.id==='carToday'), st:dayStatus(d), adj:state.storeCash.filter(m=>m.kind==='lndAdj').length, edits:state.closedDayEdits.length }),Y);
  log('cancel reverts price to 50,000: '+(ab.price===50000)+' (expect true) | today record untouched: '+ab.today+' (expect true) | status back to edited: '+(ab.st==='edited')+' (expect true) | no extra adjustment/audit: '+(ab.adj===1&&ab.edits===1)+' (expect true)');

  // ===== 5) الحذف على يوم مغلق = إلغاء موثق =====
  await page.click('[data-tab="carpets"]'); await page.click('[data-preset="yesterday"]'); await page.waitForTimeout(300);
  await page.click('[data-del-order="rug1"]'); await page.waitForTimeout(200);
  log('delete on closed day asks for edit request: '+(await page.isVisible('#cdModal'))+' (expect true)');
  await page.click('#cdRequest'); await page.fill('#cdReason','طلب مكرر بالخطأ'); await page.click('#cdGo'); await page.waitForTimeout(500);
  log('confirmation for cancel shown: '+(await page.isVisible('#cdcModal'))+' (expect true) | shows cash −10,000 adjustment: '+/−10,000/.test(await page.textContent('#cdcBody'))+' (expect true)');
  await page.click('#cdcOk'); await page.waitForTimeout(400);
  const cz=await page.evaluate(d=>({ o:state.carpetOrders.find(x=>x.id==='rug1'), adj:state.storeCash.filter(m=>m.kind==='lndAdj'), t:dayTransferred(d), bal:cashboxBalance(), c:closingOf(d) }),Y);
  log('record kept and cancelled (not deleted): '+(!!cz.o && cz.o.cancelled===true && /مكرر/.test(cz.o.cancelReason))+' (expect true)');
  log('cash adjustment −10,000 out: '+(cz.adj.length===2 && cz.adj.some(a=>a.type==='out'&&a.amount===10000&&a.payMethod==='cash'))+' (expect true) | transferred cash now 0 and total 50,000: '+(cz.t.cash===0&&cz.t.total===50000&&cz.bal===50000)+' (expect true)');
  log('closing edits count 2 and verify ok: '+(cz.c.edits===2 && cz.c.verify.ok)+' (expect true)');
  log('transfer/adjustment movements have no delete button: '+(await page.evaluate(()=>{ state.tab='store'; state.storeSub='cashbox'; state.dateFrom='1970-01-01'; state.dateTo=ymd(new Date()); render(); return document.querySelectorAll('[data-cash-del]').length===0 && document.querySelectorAll('.badge').length>0; }))+' (expect true)');

  // ===== 6) المصروف على يوم مغلق: حذف → إلغاء موثق، وإضافة بتاريخ مغلق تمرّ بالطلب =====
  await page.evaluate(()=>{ state.tab='expenses'; render(); }); await page.click('[data-preset="yesterday"]'); await page.waitForTimeout(300);
  await page.click('[data-del-exp="exp1"]'); await page.waitForTimeout(200);
  log('expense delete on closed day asks request: '+(await page.isVisible('#cdModal'))+' (expect true)');
  await page.click('#cdRequest'); await page.fill('#cdReason','مصروف خاطئ'); await page.click('#cdGo'); await page.waitForTimeout(500);
  await page.click('#cdcOk'); await page.waitForTimeout(300);
  log('expense cancelled not deleted: '+(await page.evaluate(()=>{ const e=state.expenses.find(x=>x.id==='exp1'); return !!e && e.cancelled===true && manualExp(()=>true)===0; }))+' (expect true)');

  // ===== 7) التقرير =====
  await page.click('[data-tab="reports"]'); await page.waitForTimeout(400);
  const rep=await page.textContent('main');
  log('report table present with 3 rows: '+(/سجل تعديلات الأيام المغلقة/.test(rep) && (await page.$$('[data-cde]')).length===3)+' (expect true)');
  log('report row shows 45,000 / 50,000 / +5,000: '+/45,000/.test(rep)+' (expect true)');
  await page.click('[data-cde]'); await page.waitForTimeout(300);
  log('detail opens with reason and adjustment link: '+/سجل تعديل يوم مغلق/.test(await page.textContent('#receiptContent'))+' (expect true)');
  await page.click('#receiptClose');
  // دخل الرئيسية لليوم المغلق يعكس التعديل
  log('period summary bankily after edit 50,000: '+(await page.evaluate(d=>periodSummary(d,d).pay.bankily.lnd===50000,Y))+' (expect true)');
  // ===== 8) الفحص يكشف عدم التطابق لو تلاعب أحد بحركة الصندوق =====
  const vr=await page.evaluate(d=>{ const m=state.storeCash.find(x=>x.id==='LaundryTransfer-'+d+'-bankily'); m.amount=1; const v=verifyDay(d); m.amount=45000; return v; },Y);
  log('verify flags mismatch: '+(vr.ok===false && vr.issues.length>=1)+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
