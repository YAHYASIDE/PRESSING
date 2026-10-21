// 2.63.0 — الفاتورة: عمليات الزبون السابقة (الهاتف/اللوحة/الاسم، وكل الخدمات معًا) + «عليه من قبل» + المشاركة والحفظ داخل الـ APK
// (Capacitor Filesystem + Share) + «💬 كتابةً» للفاتورة.
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
  await page.evaluate(()=>{ const d=iso(new Date()), y=iso(new Date(Date.now()-3*864e5));
    state.carOps=[{id:'c1',no:'D11',plate:'AAYHG',custName:'تجربة شركة',phone:'27186595',vehicle:'دراجة نارية',wash:'غسيل خارجي',price:500,paid:true,payMethod:'cash',date:d,editedAt:d},
                  {id:'c0',no:'D05',plate:'aayhg',custName:'تجربة شركة',phone:'',vehicle:'دراجة نارية',wash:'غسيل كامل',price:1000,paid:false,date:y,editedAt:y},
                  {id:'c9',no:'D09',plate:'ZZ 1',custName:'آخر',phone:'22110000',vehicle:'سيارة',wash:'غسيل',price:700,paid:true,date:d,editedAt:d}];
    state.carpetOrders=[{id:'r1',no:'R01',customer:'تجربة شركة',phone:'27186595',type:'سجاد',count:2,price:2000,paid:false,status:'ready',date:y,editedAt:y}];
    state.laundryOrders=[]; state.tab='cars'; state.dateFrom='1970-01-01'; state.dateTo='2999-12-31'; save(); render(); });
  await page.waitForTimeout(300);
  let r=await page.evaluate(()=>({ same:winvSame('car',state.carOps[0]).map(x=>x.id), all:winvAllKinds('car',state.carOps[0]).map(i=>i.k+':'+i.x.id) }));
  log('previous washes are found by plate too (no phone on the old one, different letter case): '+(r.same.join()==='c0,c1')+' (expect true) '+JSON.stringify(r));
  log('all services of the customer (car + rug by phone): '+(r.all.length===3&&r.all.includes('rug:r1'))+' (expect true)');
  r=await page.evaluate(()=>winvData('car',[state.carOps[0]],false).lines.join(' | '));
  log('single invoice notes show «عليه من قبل» 3,000 (old wash + carpet): '+/عليه من قبل: 3,000/.test(r)+' (expect true) '+r);
  await page.click('[data-car-receipt="c1"]'); await page.waitForTimeout(300);
  log('choice window has «هذه فقط», «كل غسلاته», «كل عمليات الزبون»: '+(await page.isVisible('#winvModal [data-winv="one"]')&&await page.isVisible('#winvModal [data-winv="all"]')&&await page.isVisible('#winvModal [data-winv="mix"]'))+' (expect true)');
  await page.click('#winvModal [data-winv="mix"]'); await page.waitForSelector('#receiptContent .winv-page',{timeout:8000});
  r=await page.evaluate(()=>{ const d=winvDataMix(winvAllKinds('car',state.carOps[0])); return { rows:d.rows.length, kinds:d.kinds.join(), total:d.total, txt:getComputedStyle(document.getElementById('receiptText')).display!=='none' }; });
  log('mixed invoice: 3 rows, car+rug, total 3,500, and «💬 كتابةً» is shown: '+(r.rows===3&&r.kinds==='car,rug'&&r.total==='3,500'&&r.txt)+' (expect true) '+JSON.stringify(r));
  await page.click('#receiptText'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>document.getElementById('stPreview').textContent||document.getElementById('stPreview').value||'');
  log('text version lists the operations and what is left: '+(/R01/.test(r)&&/D05/.test(r)&&/3,000/.test(r))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('stTextModal').style.display='none'; });
  // APK الجديد: Capacitor + Filesystem + Share
  await page.evaluate(()=>{ window._fsCalls=[]; window._shCalls=[]; try{ Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true}); }catch(e){}
    window.Capacitor={isNativePlatform:()=>true,Plugins:{Filesystem:{writeFile:async o=>{ _fsCalls.push(o); return {uri:'file:///cache/'+o.path}; }},Share:{share:async o=>{ _shCalls.push(o); }}}}; });
  await page.click('#receiptImg'); await page.waitForTimeout(800);
  r=await page.evaluate(()=>({ fs:_fsCalls.length, dir:_fsCalls[0]&&_fsCalls[0].directory, b64:!!(_fsCalls[0]&&_fsCalls[0].data&&_fsCalls[0].data.length>1000), sh:_shCalls.length, files:_shCalls[0]&&_shCalls[0].files }));
  log('APK: «📤 صورة» writes the JPEG to cache and opens the share sheet with it: '+(r.fs>=1&&r.dir==='CACHE'&&r.b64&&r.sh===1&&r.files&&/^file:/.test(r.files[0]))+' (expect true) '+JSON.stringify({fs:r.fs,sh:r.sh}));
  await page.click('#receiptPdf'); await page.waitForTimeout(800);
  r=await page.evaluate(()=>({ sh:_shCalls.length, pdf:_fsCalls.some(c=>/\.pdf$/.test(c.path)) }));
  log('APK: «📄 PDF» is shared as a file too: '+(r.sh===2&&r.pdf)+' (expect true)');
  r=await page.evaluate(async()=>{ const ok=await saveFileAny(new Blob(['x'],{type:'text/plain'}),'a.txt'); return { ok, doc:_fsCalls.some(c=>c.directory==='DOCUMENTS'&&c.path==='Sadaqa/a.txt') }; });
  log('APK: download saves into Documents/Sadaqa: '+(r.ok&&r.doc)+' (expect true)');
  // APK قديم بلا الإضافات: لا انهيار، ويظهر عرض الصورة + رسالة واضحة عند التنزيل
  await page.evaluate(()=>{ window.Capacitor={isNativePlatform:()=>true,Plugins:{}}; }); await page.click('#receiptImg'); await page.waitForTimeout(800);
  log('old APK: falls back to the image view (and «💬 كتابةً» stays available): '+(await page.isVisible('#rcptImgDl')&&await page.evaluate(()=>getComputedStyle(document.getElementById('receiptText')).display!=='none'))+' (expect true)');
  await page.click('#rcptImgDl'); await page.waitForTimeout(300);
  log('old APK: download explains that the new APK is needed: '+(await page.evaluate(()=>/APK/.test(document.getElementById('toast')?document.getElementById('toast').textContent:document.body.textContent)))+' (expect true)');
  // زبون بلا عمليات سابقة: تفتح الفاتورة مباشرة مع توضيح
  await page.evaluate(()=>{ delete window.Capacitor; document.getElementById('receiptModal').style.display='none'; });
  await page.click('[data-car-receipt="c9"]'); await page.waitForSelector('#receiptContent .winv-page',{timeout:8000});
  log('customer with one wash: opens directly with «لا توجد عمليات سابقة»: '+(!(await page.isVisible('#winvModal [data-winv="all"]'))&&await page.evaluate(()=>/لا توجد عمليات سابقة/.test(document.body.textContent)))+' (expect true)');
  log(errors.length?'ERRORS: '+errors.join(' | '):'ERRORS: NONE ✅');
  await browser.close();
})();
