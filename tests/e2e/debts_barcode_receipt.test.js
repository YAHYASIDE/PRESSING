const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|jsdelivr|zxing/i;
(async () => {
  const browser = await chromium.launch({ args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'] });
  const ctx = await browser.newContext({ viewport:{width:1100,height:900} });
  const page = await ctx.newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ window._opened=[]; window.open=(u)=>{ window._opened.push(u); return null; }; });

  // ===== تذكير الديون =====
  await page.evaluate(()=>{ const d=iso(new Date()); const old=new Date(); old.setDate(old.getDate()-10); const o=iso(old);
    state.storeCustomers=[{id:'c1',name:'أحمد',phone:'44556677',country:'222',editedAt:d},{id:'cl',name:'المغسلة',isLaundry:true,editedAt:d}];
    state.carOps=[{id:uid(),no:'A1',vehicle:'سيارة صغيرة',wash:'غسيل',price:300,phone:'44556677',country:'222',paid:false,paidDate:null,date:o,editedAt:o}];
    state.laundryOrders=[{id:uid(),no:'L1',customer:'أحمد',phone:'44556677',country:'222',type:'قميص',service:'كي',count:1,unit:200,price:200,status:'wash',paid:false,date:d,editedAt:d},
                         {id:uid(),no:'L2',customer:'سارة',phone:'33445566',country:'222',type:'فستان',service:'غسيل',count:1,unit:500,price:500,status:'wash',paid:false,date:d,editedAt:d},
                         {id:uid(),no:'L3',customer:'مدفوع',phone:'22000000',country:'222',type:'قميص',service:'كي',count:1,unit:100,price:100,status:'done',paid:true,paidDate:d,date:d,editedAt:d}];
    state.carpetOrders=[];
    state.storeSales=[{id:uid(),no:'S1',customerId:'c1',customerName:'أحمد',items:[],total:150,paidAmount:0,paid:false,date:d,editedAt:d},
                      {id:uid(),no:'S2',customerId:'cl',customerName:'المغسلة',items:[],total:999,paidAmount:0,paid:false,date:d,editedAt:d}];
    state.debtMsg=''; save(); render(); });
  const deb = await page.evaluate(()=>debtors().map(d=>({n:d.name,t:d.total,c:d.count,days:d.days,cust:d.custId})));
  log('debtors:', JSON.stringify(deb));
  const ahmed=deb.find(d=>d.n==='أحمد');
  log('أحمد grouped by phone (cars+laundry+store = 650): '+(!!ahmed&&ahmed.t===650)+' (expect true)');
  log('أحمد oldest 10 days: '+(!!ahmed&&ahmed.days===10)+' (expect true)');
  log('unsaved سارة listed: '+deb.some(d=>d.n==='سارة'&&d.t===500)+' (expect true)');
  log('laundry partner excluded: '+!deb.some(d=>d.n==='المغسلة')+' (expect true) | paid excluded: '+!deb.some(d=>d.n==='مدفوع')+' (expect true)');
  await page.click('[data-tab="contacts"]'); await page.waitForTimeout(150);
  await page.click('[data-csub="debts"]'); await page.waitForTimeout(200);
  log('debts tab shows cards: '+((await page.$$('[data-debt-wa]')).length===2)+' (expect true)');
  await page.click('[data-debt-wa]'); await page.waitForTimeout(200);
  const url = await page.evaluate(()=>window._opened.pop()||'');
  const msg = decodeURIComponent((url.split('text=')[1]||''));
  log('reminder goes to 22244556677: '+url.includes('wa.me/22244556677')+' (expect true)');
  log('message filled (name+amount): '+(msg.includes('أحمد')&&msg.includes('650'))+' (expect true)');
  log('reminded timestamp shown: '+/آخر تذكير/.test(await page.textContent('main'))+' (expect true)');
  // custom template via settings
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(300);
  await page.fill('[data-msgtpl="debt"]','يا {الاسم} عليك {المبلغ} منذ {الأيام} يوم');
  await page.click('#setSave'); await page.waitForTimeout(200);
  const m2 = await page.evaluate(()=>debtMessage(debtors().find(d=>d.name==='أحمد')));
  log('custom template applied: '+(m2==='يا أحمد عليك 650 منذ 10 يوم')+' (expect true) ['+m2+']');
  // remindedAt survives a stale remote
  const kept = await page.evaluate(()=>{ const r=JSON.parse(JSON.stringify(cloudCopy())); r.debtReminded={}; applyRemote(r); return Object.keys(state.debtReminded||{}).length===1; });
  log('reminder log survives sync merge: '+kept+' (expect true)');

  // ===== الباركود =====
  await page.evaluate(()=>{ state.storeProducts=[{id:'p1',name:'صابون',buyPrice:100,sellPrice:150,stock:3,minStock:0,barcode:'6281000000011',editedAt:iso(new Date())},{id:'p2',name:'معطر',buyPrice:50,sellPrice:90,stock:5,minStock:0,editedAt:iso(new Date())}]; storeCart.length=0; state.tab='store'; state.storeSub='pos'; save(); render(); });
  await page.waitForTimeout(150);
  // keyboard-wedge scanner typing into the search box
  await page.fill('#posSearch','6281000000011'); await page.press('#posSearch','Enter'); await page.waitForTimeout(200);
  log('scan via search+Enter adds to cart: '+(await page.evaluate(()=>storeCart.length===1&&storeCart[0].productId==='p1'))+' (expect true)');
  log('search cleared after scan: '+(await page.evaluate(()=>document.getElementById('posSearch').value===''))+' (expect true)');
  // fast wedge with no focused input
  await page.evaluate(()=>document.activeElement&&document.activeElement.blur());
  await page.keyboard.type('6281000000011',{delay:5}); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  log('global scanner keystrokes add qty 2: '+(await page.evaluate(()=>storeCart[0].qty===2))+' (expect true)');
  // camera scanner modal + manual entry
  await page.click('#posScan'); await page.waitForTimeout(600);
  log('scanner modal opens: '+(await page.isVisible('#scanModal'))+' (expect true)');
  await page.fill('#scanManual','6281000000011'); await page.press('#scanManual','Enter'); await page.waitForTimeout(200);
  log('manual entry in scanner adds qty 3: '+(await page.evaluate(()=>storeCart[0].qty===3))+' (expect true)');
  await page.waitForTimeout(1600);
  await page.fill('#scanManual','6281000000011'); await page.press('#scanManual','Enter'); await page.waitForTimeout(200);
  log('stock limit respected (still 3): '+(await page.evaluate(()=>storeCart[0].qty===3))+' (expect true)');
  await page.click('#scanClose'); await page.waitForTimeout(150);
  log('scanner closes + camera released: '+(await page.evaluate(()=>getComputedStyle(document.getElementById('scanModal')).display==='none'&&_scan===null))+' (expect true)');
  // unknown barcode -> offer to create product with barcode prefilled
  await page.evaluate(()=>handleScannedCode('999888777','pos')); await page.waitForTimeout(250);
  log('unknown code opens product form prefilled: '+(await page.evaluate(()=>state.storeSub==='products'&&document.getElementById('prodBarcode').value==='999888777'))+' (expect true)');
  await page.fill('#prodName','مادة جديدة'); await page.fill('#prodSell','40'); await page.fill('#prodStock','2');
  await page.click('#prodSave'); await page.waitForTimeout(200);
  log('new product saved with barcode: '+(await page.evaluate(()=>!!findByBarcode('999888777')&&findByBarcode('999888777').name==='مادة جديدة'))+' (expect true)');
  // duplicate barcode blocked
  await page.fill('#prodName','نسخة'); await page.fill('#prodBarcode','6281000000011'); await page.click('#prodSave'); await page.waitForTimeout(200);
  log('duplicate barcode blocked: '+(await page.evaluate(()=>!state.storeProducts.some(p=>p.name==='نسخة')))+' (expect true)');
  // barcode is synced (not stripped by cloudCopy)
  log('barcode in cloud copy: '+(await page.evaluate(()=>cloudCopy().storeProducts.some(p=>p.barcode==='6281000000011')))+' (expect true)');

  // ===== الإيصال =====
  await page.evaluate(()=>{ state.shopInfo={name:'مغسلة الاختبار',phone:'11112222',address:'نواكشوط',footer:'نراكم قريبًا'}; save(); });
  const d=await page.evaluate(()=>iso(new Date()));
  await page.evaluate(()=>openCarReceipt({id:'x',no:'C-7',vehicle:'سيارة صغيرة',wash:'غسيل كامل',price:1000,plate:'1234AB',paid:true,date:iso(new Date())}));
  let rt = await page.textContent('#receiptContent');
  log('car receipt uses shop info: '+(rt.includes('مغسلة الاختبار')&&rt.includes('11112222')&&rt.includes('نواكشوط')&&rt.includes('نراكم قريبًا'))+' (expect true)');
  log('car receipt shows number + paid: '+(rt.includes('C-7')&&rt.includes('مدفوع'))+' (expect true)');
  await page.click('#receiptClose');
  await page.evaluate(()=>openLndReceipt(state.laundryOrders[0])); rt=await page.textContent('#receiptContent');
  log('laundry receipt unified header: '+(rt.includes('مغسلة الاختبار')&&/مغسلة الملابس/.test(rt))+' (expect true)');
  await page.click('#receiptClose');
  // thermal print layout at 58mm
  await page.evaluate(()=>{ setRcptWidth('58'); openSaleReceipt(state.storeSales[0]); });
  await page.evaluate(()=>{ window.print=()=>{}; });
  const pr = await page.evaluate(()=>{ printReceipt(); return { css:document.getElementById('rcptPageStyle').textContent, cls:document.body.className }; });
  log('page size 58mm: '+/@page\{size:58mm \d+mm/.test(pr.css)+' (expect true) | body class: '+/rcpt-w58/.test(pr.cls)+' (expect true)');
  await page.emulateMedia({media:'print'});
  await page.evaluate(()=>{ document.body.classList.add('printing-receipt','rcpt-w58'); });
  const w = await page.evaluate(()=>document.querySelector('#receiptContent .rcpt').getBoundingClientRect().width);
  log('58mm content ~48mm wide (≈181px): '+(Math.abs(w-181)<4)+' (expect true) ['+Math.round(w)+']');
  const hidden = await page.evaluate(()=>getComputedStyle(document.querySelector('.app')).display==='none');
  log('rest of the app hidden when printing: '+hidden+' (expect true)');
  await page.evaluate(()=>{ document.body.classList.remove('printing-receipt','rcpt-w58'); }); await page.emulateMedia({media:'screen'});
  await page.click('#receiptClose');
  // settings: width select + test receipt
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(250);
  log('width setting reflects device choice: '+(await page.evaluate(()=>document.getElementById('rcptWidthSet').value==='58'))+' (expect true)');
  await page.selectOption('#rcptWidthSet','80'); await page.click('#rcptTestBtn'); await page.waitForTimeout(150);
  log('test receipt opens (80mm): '+/80 ملم/.test(await page.textContent('#receiptContent'))+' (expect true)');
  log('width is per-device (not synced): '+(await page.evaluate(()=>localStorage.getItem('sadaqa_rcpt_w')==='80'&&!('rcptWidth' in cloudCopy())))+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
