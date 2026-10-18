// 2.44.0 — كشف حساب المصروفات: بطاقة لكل صنف (لا قصّ)، الضغط يفتح القيود بتعديل/حذف، «تعديل الكل» للاسم والفئة، الملغى لا يُحسب.
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
  await page.evaluate(()=>{ const d=new Date(), I=n=>{ const x=new Date(d); x.setDate(x.getDate()-n); x.setHours(9,0,0,0); return iso(x); };
    state.closings=[]; state.recurring=[{id:'r1',name:'إيجار محل',amount:90000,day:1,category:'أخرى',payMethod:'cash',active:true}];
    state.expenses=[{id:'e1',amount:1000,category:'مواد',reason:'فطور',payMethod:'cash',date:I(0),editedAt:I(0),by:'مالك'},{id:'e2',amount:1500,category:'مواد',reason:'فطور',payMethod:'bankily',date:I(1),editedAt:I(1),by:'مالك'},
      {id:'e3',amount:2000,category:'مواد',reason:'غداء',payMethod:'cash',date:I(1),editedAt:I(1)},{id:'e4',amount:500,category:'مواد',reason:'فطور',payMethod:'cash',date:I(2),editedAt:I(2),cancelled:true},
      {id:'rec_r1_2026-10',amount:90000,category:'أخرى',reason:'إيجار محل (octobre 2026)',recurringId:'r1',payMethod:'cash',date:I(3),editedAt:I(3)},{id:'rec_gone_2026-10',amount:5000,category:'أخرى',reason:'إنترنت (octobre 2026)',recurringId:'gone',payMethod:'cash',date:I(3),editedAt:I(3)}];
    runMigrations(); state.tab='expenses'; state.expSub='general'; save(); render(); });
  await page.waitForTimeout(300);
  let r=await page.evaluate(()=>{ const g=[...document.querySelectorAll('#expStmt .exs-g')]; const f=g.find(x=>/فطور/.test(x.querySelector('.exs-nm').textContent)); const nm=f.querySelector('.exs-nm'); const rc=nm.getBoundingClientRect(), box=f.getBoundingClientRect();
    return { n:g.length, ft:f.querySelector('.exs-t').textContent, fn:f.querySelector('.exs-n').textContent, inside:rc.right<=box.right+1&&rc.left>=box.left-1, wrapW:nm.scrollWidth<=nm.clientWidth+1, grand:document.querySelector('#expStmt .sum-row .big').textContent, rent:document.getElementById('expStmt').textContent };});
  log('one card per item (فطور, غداء, إيجار محل, إنترنت): '+(r.n===4)+' (expect true)');
  log('فطور = 2 entries 2,500 (the cancelled one is not counted), grand total 99,500: '+(/2,500/.test(r.ft) && /×2/.test(r.fn) && /99,500/.test(r.grand))+' (expect true)');
  log('item names are fully visible (not cut on the right): '+(r.inside && r.wrapW)+' (expect true)');
  log('the recurring rent shows its month as numbers «(10/2026)»: '+(await page.evaluate(()=>state.expenses.find(e=>e.id==='rec_r1_2026-10').reason==='إيجار محل (10/2026)' && state.expenses.find(e=>e.id==='rec_gone_2026-10').reason==='إنترنت (10/2026)' && [...document.querySelectorAll('#expStmt .exs-nm')].some(x=>x.textContent.trim().startsWith('إنترنت'))))+' (expect true)');
  // الضغط يفتح القيود
  await page.click('#expStmt .exs-g:has-text("فطور") .exs-h'); await page.waitForTimeout(150);
  r=await page.evaluate(()=>{ const f=[...document.querySelectorAll('#expStmt .exs-g')].find(x=>/فطور/.test(x.textContent)); const b=f.querySelector('.exs-body'); return { open:getComputedStyle(b).display!=='none', items:b.querySelectorAll('.exs-it').length, edit:b.querySelectorAll('[data-rec-edit]').length, del:b.querySelectorAll('[data-del-exp]').length, t:b.textContent }; });
  log('tapping «فطور» opens its 2 entries with date/amount, each with ✏️ and 🗑️: '+(r.open && r.items===2 && r.edit===2 && r.del===2 && /1,500/.test(r.t) && /بنكيلي/.test(r.t))+' (expect true)');
  // تعديل قيد واحد
  await page.click('#expStmt [data-rec-edit="exp:e2"]'); await page.waitForTimeout(250);
  if(await page.isVisible('#codeModal')){ await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(300); } // قيد يوم سابق يطلب الكود
  log('✏️ opens the edit window for that entry: '+(await page.isVisible('#editModal'))+' (expect true)');
  await page.fill('#re_amount','1800'); await page.click('#editSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ a:state.expenses.find(e=>e.id==='e2').amount, open:!!document.querySelector('#expStmt .exs-g.open'), t:[...document.querySelectorAll('#expStmt .exs-g')].find(x=>/فطور/.test(x.textContent)).querySelector('.exs-t').textContent }));
  log('editing one entry saves 1,800, the item stays open and its total becomes 2,800: '+(r.a===1800 && r.open && /2,800/.test(r.t))+' (expect true)');
  // تعديل الكل: الاسم والفئة
  await page.click('#expStmt [data-exs-edit="فطور"]'); await page.waitForTimeout(150);
  log('«✏️ تعديل الكل» opens with the name and category filled: '+(await page.evaluate(()=>document.getElementById('exgModal').style.display==='flex' && document.getElementById('exgName').value==='فطور' && document.getElementById('exgCat').value==='مواد'))+' (expect true)');
  await page.fill('#exgName','فطور العمال'); await page.fill('#exgCat','أكل'); await page.click('#exgSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({ L:state.expenses.filter(e=>e.id==='e1'||e.id==='e2').map(e=>e.reason+'|'+e.category), cancelled:state.expenses.find(e=>e.id==='e4').reason, card:[...document.querySelectorAll('#expStmt .exs-nm')].some(x=>/فطور العمال/.test(x.textContent)), cat:/أكل/.test(document.querySelector('#expStmt .cat-tot').textContent), opt:[...document.querySelectorAll('#expCat option')].some(o=>o.value==='أكل'), act:state.activity.some(a=>a.action==='تعديل صنف مصروفات') }));
  log('edit-all renames both entries to «فطور العمال» in the new category «أكل»: '+(r.L.every(x=>x==='فطور العمال|أكل') && r.card && r.cat && r.act)+' (expect true)');
  log('the new category is offered in «مصروف جديد»: '+r.opt+' (expect true)');
  // تعديل الكل للمصروف الثابت يحفظ الشهر ويحدّث القالب
  await page.click('#expStmt .exs-g:has-text("إيجار محل") .exs-h'); await page.waitForTimeout(100);
  await page.click('#expStmt [data-exs-edit="إيجار محل"]'); await page.waitForTimeout(150); await page.fill('#exgName','كراء المحل'); await page.click('#exgSave'); await page.waitForTimeout(300);
  log('renaming a recurring item keeps the month and renames its monthly template: '+(await page.evaluate(()=>state.expenses.find(e=>e.id==='rec_r1_2026-10').reason==='كراء المحل (10/2026)' && state.recurring[0].name==='كراء المحل'))+' (expect true)');
  // الحذف من الكشف
  await page.click('#expStmt .exs-g:has-text("غداء") .exs-h'); await page.waitForTimeout(100);
  await page.click('#expStmt [data-del-exp="e3"]'); await page.waitForTimeout(250);
  log('🗑️ deletes the entry from the statement: '+(await page.evaluate(()=>!state.expenses.some(e=>e.id==='e3') && ![...document.querySelectorAll('#expStmt .exs-nm')].some(x=>/غداء/.test(x.textContent))))+' (expect true)');
  log('no horizontal overflow at 390px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
