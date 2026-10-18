// 2.54.0 — الكشف كملف PDF حقيقي + إرسال الكشف كتابةً (كامل أو جزئي) إلى واتساب الزبون.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram|googleapis/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:860} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  await page.route('**/fonts.googleapis.com/**', r=>r.abort()); await page.route('**/fonts.gstatic.com/**', r=>r.abort());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const now=Date.now(), d=n=>new Date(now-n*864e5).toISOString();
    state.storeCustomers=[{id:'cu1',name:'سالم',phone:'33110000',country:'222',editedAt:d(0)}];
    state.storeSales=[{id:'s1',no:'S-1',customerId:'cu1',customerName:'سالم',items:[{name:'صابون'}],total:8000,paidAmount:3000,paid:false,date:d(40),editedAt:d(40)},{id:'s2',no:'S-2',customerId:'cu1',customerName:'سالم',items:[{name:'كلور'}],total:2000,paidAmount:0,paid:false,date:d(2),editedAt:d(2)}];
    state.storeDebts=[{id:'md1',customerId:'cu1',dir:'for',amount:1000,paidAmount:0,paid:false,note:'دفع مقدّمًا',date:d(1),editedAt:d(1)}];
    state.storeCash=[{id:'c1',type:'in',amount:3000,reason:'دفعة من سالم',customerId:'cu1',payMethod:'cash',date:d(10),editedAt:d(10)}];
    state.suppliers=[]; state.storePurchases=[]; state.tab='store'; state.storeSub='debts'; state.debtView=null; save(); render(); });
  await page.waitForTimeout(300);
  await page.click('.party-card [data-dc-stmt="cu1"]'); await page.waitForTimeout(300);
  let r=await page.evaluate(()=>({ pdf:getComputedStyle(document.getElementById('receiptPdf')).display!=='none', txt:getComputedStyle(document.getElementById('receiptText')).display!=='none', img:!!document.getElementById('receiptImg') }));
  log('the statement window has «📄 PDF», «📤 صورة» and «💬 كتابةً»: '+(r.pdf && r.txt && r.img)+' (expect true)');
  r=await page.evaluate(async()=>{ const b=await receiptPdfBlob(); const u=new Uint8Array(await b.arrayBuffer()); const head=String.fromCharCode(...u.slice(0,8)); const tail=String.fromCharCode(...u.slice(-7)); const txt=new TextDecoder('latin1').decode(u); const m=txt.match(/\/Type \/Pages \/Count (\d+)/); return { type:b.type, size:b.size, head, tail, pages:m?+m[1]:0, jpg:/\/Filter \/DCTDecode/.test(txt), xref:/startxref\n\d+\n%%EOF/.test(txt), name:rcptDocName() }; });
  log('PDF is a real file (%PDF-1.4 … %%EOF, JPEG page, A4): '+(r.type==='application/pdf' && /^%PDF-1\.4/.test(r.head) && /%%EOF/.test(r.tail) && r.pages>=1 && r.jpg && r.xref && r.size>5000)+' (expect true) '+JSON.stringify({size:r.size,pages:r.pages}));
  log('PDF file name is «كشف-حساب-سالم-…» with a Latin date: '+(/^كشف-حساب-سالم-\d{2}-\d{2}-\d{4}$/.test(r.name))+' (expect true) '+r.name);
  // 💬 كتابةً — كامل
  await page.click('#receiptText'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>({ open:getComputedStyle(document.getElementById('stTextModal')).display!=='none', t:document.getElementById('stPreview').value, who:document.getElementById('stWho').textContent }));
  log('«💬 كتابةً» opens with the full statement text (all 4 movements + balance now): '+(r.open && /كشف حساب — سالم/.test(r.t) && /S-1/.test(r.t) && /S-2/.test(r.t) && /دفعة من سالم/.test(r.t) && /دفع مقدّمًا/.test(r.t) && /الرصيد الآن: عليه لنا 6,000/.test(r.t) && /4 حركة/.test(r.t) && !/[٠-٩]/.test(r.t))+' (expect true)');
  // جزئي
  await page.click('[data-stmode="part"]'); await page.waitForTimeout(150);
  await page.click('[data-stq="7"]'); await page.waitForTimeout(150);
  r=await page.evaluate(()=>({ n:document.querySelectorAll('#stRows [data-st-i]').length, checked:document.querySelectorAll('#stRows [data-st-i]:checked').length, t:document.getElementById('stPreview').value }));
  log('partial «آخر 7 أيام» keeps only the recent movements, says «جزء» and still shows the balance: '+(r.n===4 && r.checked===2 && /S-2/.test(r.t) && !/S-1/.test(r.t) && /جزء: 2 من 4/.test(r.t) && /الرصيد الآن: عليه لنا 6,000/.test(r.t))+' (expect true) '+JSON.stringify({n:r.n,c:r.checked}));
  log('each movement in the partial list shows its text next to the checkbox: '+(await page.evaluate(()=>[...document.querySelectorAll('#stRows .st-row span')].every(x=>x.getBoundingClientRect().width>80)))+' (expect true)');
  await page.click('[data-stq="none"]'); await page.waitForTimeout(100);
  await page.check('#stRows [data-st-i="0"]'); await page.waitForTimeout(100);
  r=await page.evaluate(()=>document.getElementById('stPreview').value);
  log('hand-picking one movement sends only it: '+(/S-1/.test(r) && !/S-2/.test(r) && /جزء: 1 من 4/.test(r))+' (expect true)');
  await page.evaluate(()=>{ window._opened=[]; window.open=(u)=>{ window._opened.push(u); return null; }; });
  await page.click('#stWa'); await page.waitForTimeout(150);
  r=await page.evaluate(()=>window._opened[0]||'');
  log('«💬 إرسال واتساب» opens the customer chat with the text: '+(/^https:\/\/wa\.me\/22233110000\?text=/.test(r) && decodeURIComponent(r).includes('S-1'))+' (expect true) '+r.slice(0,40));
  await page.click('#stClose');
  // إيصال عادي: لا زر كتابةً
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; openTestReceipt(); }); await page.waitForTimeout(200);
  log('a normal receipt has PDF but no «كتابةً»: '+(await page.evaluate(()=>getComputedStyle(document.getElementById('receiptText')).display==='none' && getComputedStyle(document.getElementById('receiptPdf')).display!=='none'))+' (expect true)');
  // كشف دبو والمورّد لهما «كتابةً» أيضًا
  await page.evaluate(()=>{ const d=iso(new Date()); state.brickSales=[{id:'b1',no:'BS-1',btype:'t15',qty:100,unitPrice:180,total:18000,paidAmount:0,paid:false,partyType:'cust',partyId:'cu1',customerId:'cu1',customerName:'سالم',date:d,editedAt:d}]; openBrickStatement('cust','cu1'); });
  await page.waitForTimeout(200);
  log('the دبو statement also has «كتابةً» with its movements: '+(await page.evaluate(()=>{ const ok=getComputedStyle(document.getElementById('receiptText')).display!=='none'; openStText(); return ok && /BS-1/.test(document.getElementById('stPreview').value) && /عليه لنا 18,000/.test(document.getElementById('stPreview').value); }))+' (expect true)');
  log('buttons fit at 390px (no overflow): '+(await page.evaluate(()=>{ document.getElementById('stTextModal').style.display='none'; return document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.rcpt-acts button')].every(b=>b.scrollWidth<=b.clientWidth+2); }))+' (expect true)');
  // كشف حساب العامل: نفس النافذة (PDF/صورة/كتابةً)
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; const d=new Date(); d.setDate(1); const t=iso(new Date());
    state.workers=[{id:'wa',name:'حمد',role:'غسيل سيارات',phone:'44556677',monthly:31000,start:iso(d),absent:[],payments:[{id:'p1',amount:5000,note:'سلفة',date:t}],credits:[{id:'c1',amount:2000,note:'مكافأة',date:t}],editedAt:t}];
    state.tab='expenses'; state.expSub='workers'; render(); });
  await page.waitForTimeout(250); await page.click('[data-wstate="wa"]'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>{ const c=document.getElementById('receiptContent').textContent, w=state.workers[0], bal=Math.round(wBalance(w));
    return { open:document.getElementById('receiptModal').style.display==='flex', head:/كشف حساب عامل — حمد/.test(c), rows:/مكافأة/.test(c)&&/سلفة/.test(c)&&/مستحق راتب/.test(c), pdf:getComputedStyle(document.getElementById('receiptPdf')).display!=='none', txt:getComputedStyle(document.getElementById('receiptText')).display!=='none', bal, total:c.includes(money(Math.abs(bal))), oldHidden:getComputedStyle(document.getElementById('wsModal')).display==='none' }; });
  log('worker statement opens in the receipt window with PDF and «كتابةً»: '+(r.open && r.head && r.rows && r.pdf && r.txt && r.total && r.oldHidden)+' (expect true) '+JSON.stringify(r));
  r=await page.evaluate(async()=>{ const b=await receiptPdfBlob(); const u=new Uint8Array(await b.arrayBuffer()); return { pdf:String.fromCharCode(...u.slice(0,5))==='%PDF-', name:rcptDocName() }; });
  log('worker PDF is built and named «كشف-حساب-حمد-…»: '+(r.pdf && /^كشف-حساب-حمد-/.test(r.name))+' (expect true) '+r.name);
  r=await page.evaluate(()=>{ openStText(); const t=document.getElementById('stPreview').value, w=state.workers[0], bal=Math.round(wBalance(w)); return { t, ok:/كشف حساب عامل — حمد/.test(t)&&/مكافأة/.test(t)&&/سلفة/.test(t)&&t.includes('له عندنا '+money(bal)), who:document.getElementById('stWho').textContent }; });
  log('worker text: salary due + bonus + advance, balance «له عندنا»: '+(r.ok && /44556677/.test(r.who))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('stTextModal').style.display='none'; document.getElementById('receiptModal').style.display='none';
    const t=iso(new Date()); state.brickPorters=[{id:'po1',name:'دبيته',phone:'33445566',role:'porter',editedAt:t}]; state.brickLoads=[{id:'l1',no:'H1',porterId:'po1',kind:'bricks',qty:1000,rate:10,amount:10000,paidAmount:4000,paid:false,date:t,editedAt:t}]; openPorterStatement('po1'); });
  r=await page.evaluate(()=>{ const ok=getComputedStyle(document.getElementById('receiptText')).display!=='none'; openStText(); const t=document.getElementById('stPreview').value; return ok && /دبيته/.test(t) && /له عندنا 6,000/.test(t); });
  log('دبو worker/porter statement has «كتابةً» with the right balance (له 6,000): '+r+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
