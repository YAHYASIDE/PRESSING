// 2.60.0 — فاتورة المغاسل = صورة المالك نفسها (assets/invoice-wash.jpg) مع الكتابة في الخانات؛ اختيار «هذه فقط / كل فواتير الزبون»؛ صفحات بخمسة أسطر؛ PDF/صورة.
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
  await page.evaluate(()=>{ const d=iso(new Date()), y=iso(new Date(Date.now()-864e5));
    state.carOps=[{id:'c1',no:'C1',vehicle:'هايلوكس',plate:'AAYHG',wash:'غسيل خارجي',price:4000,paid:true,payMethod:'cash',phone:'27186595',custName:'تجربة شركة',date:d,editedAt:d},
      {id:'c2',no:'C2',vehicle:'لاندكروزر',plate:'AAYHG',wash:'غسيل خارجي',price:3000,paid:false,phone:'27186595',custName:'تجربة شركة',date:y,editedAt:y},
      {id:'c3',no:'C3',vehicle:'سيارة صغيرة',plate:'X1',wash:'غسيل داخلي',price:300,paid:true,payMethod:'bankily',phone:'36756522',date:d,editedAt:d}];
    state.carpetOrders=[{id:'r1',no:'R1',customer:'سالم',phone:'22110000',type:'سجاد',count:2,unit:1500,price:3000,paid:false,status:'wash',date:d,editedAt:d}];
    state.laundryOrders=[{id:'l1',no:'L1',customer:'سالم',phone:'22110000',items:[{type:'قميص',service:'كي',count:3,unit:100,price:300},{type:'بنطلون',service:'غسيل',count:2,unit:200,price:400}],type:'قميص، بنطلون',count:5,price:700,paid:true,payMethod:'masrvi',status:'ready',date:d,editedAt:d}];
    state.dateFrom='1970-01-01'; state.dateTo=ymd(new Date()); state.tab='cars'; render(); });
  await page.waitForTimeout(300);
  // سيارة لها غسلتان → الاختيار
  await page.click('[data-car-receipt="c1"]'); await page.waitForTimeout(300);
  log('🧾 on a customer with 2 washes asks «هذه الغسلة فقط / كل غسلات الزبون»: '+(await page.isVisible('#winvModal [data-winv="one"]') && await page.isVisible('#winvModal [data-winv="all"]'))+' (expect true)');
  await page.click('#winvModal [data-winv="one"]'); await page.waitForSelector('#receiptContent .winv-page',{timeout:8000});
  let r=await page.evaluate(async()=>{ const im=document.querySelector('#receiptContent .winv-page'); await im.decode(); return { n:document.querySelectorAll('#receiptContent .winv-page').length, w:im.naturalWidth, h:im.naturalHeight, no:document.querySelector('#receiptContent .rcpt-no').textContent }; });
  log('one wash = one invoice image of the owner template size 1024×1536: '+(r.n===1&&r.w===1024&&r.h===1536&&r.no==='C1')+' (expect true) '+JSON.stringify(r));
  // الرسم نفسه: علامة ✓ في خانة «سيارات» و«نقدا»
  r=await page.evaluate(async()=>{ const d=winvData('car',[state.carOps[0]],false); const img=await winvTpl(); const c=document.createElement('canvas'); c.width=1024; c.height=1536; const x=c.getContext('2d');
    washInvDraw(x,img,{rows:[]}); const blank=Array.from(x.getImageData(246,604,1,1).data); washInvDraw(x,img,d); const car=Array.from(x.getImageData(246,604,1,1).data), cash=Array.from(x.getImageData(966,1089,1,1).data);
    const dark=p=>p[0]<80&&p[2]>100; return { blankDark:dark(blank), car:dark(car), cash:dark(cash), d:{name:d.name,total:d.total,pm:d.pm,rows:d.rows.length} }; });
  log('the template gets a ✓ in «سيارات» and «نقدا», name and total filled: '+(!r.blankDark && r.car && r.cash && r.d.name==='تجربة شركة' && r.d.total==='4,000' && r.d.pm==='cash')+' (expect true) '+JSON.stringify(r));
  r=await page.evaluate(async()=>{ const b=await receiptPdfBlob(); const t=await b.text(); return { pdf:t.startsWith('%PDF'), pages:(t.match(/\/Type\s*\/Page[^s]/g)||[]).length }; });
  log('PDF of the invoice = 1 page: '+(r.pdf&&r.pages===1)+' (expect true) '+JSON.stringify(r));
  r=await page.evaluate(async()=>{ const b=await receiptImageBlob(); return b&&b.type; });
  log('«📤 صورة» uses the same white invoice image: '+(r==='image/jpeg')+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  // كل الغسلات: 7 غسلات → صفحتان
  await page.evaluate(()=>{ const base=state.carOps[0]; for(let i=0;i<5;i++){ const d=iso(new Date(Date.now()-(i+2)*864e5)); state.carOps.push(Object.assign({},base,{id:'cx'+i,no:'CX'+i,price:1000+i*100,date:d,editedAt:d})); } render(); });
  await page.click('[data-car-receipt="c1"]'); await page.waitForTimeout(300); await page.click('#winvModal [data-winv="all"]'); await page.waitForSelector('#receiptContent .winv-page',{timeout:8000});
  r=await page.evaluate(async()=>{ const d=winvData('car',winvSame('car',state.carOps[0]),true); const b=await receiptPdfBlob(); const t=await b.text(); return { imgs:document.querySelectorAll('#receiptContent .winv-page').length, rows:d.rows.length, total:d.total, no:d.no, line:d.lines[0], pages:(t.match(/\/Type\s*\/Page[^s]/g)||[]).length }; });
  log('all 7 washes = 2 pages of 5 rows (images and PDF), total and remaining written: '+(r.imgs===2&&r.rows===7&&r.pages===2&&r.total==='13,000'&&/المتبقي عليه 3,000/.test(r.line)&&r.no==='CS-27186595')+' (expect true) '+JSON.stringify(r));
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; });
  // زبون بغسلة واحدة → لا اختيار، الفاتورة مباشرة
  await page.click('[data-car-receipt="c3"]'); await page.waitForSelector('#receiptContent .winv-page',{timeout:8000});
  log('a customer with one wash opens the invoice directly: '+(!(await page.isVisible('#winvModal [data-winv="all"]')))+' (expect true)');
  r=await page.evaluate(()=>winvData('car',[state.carOps[2]],false).pm); log('bankily payment is ticked as bankily: '+(r==='bankily')+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; state.tab='carpets'; render(); }); await page.waitForTimeout(250);
  // السجاد والملابس
  await page.click('[data-receipt="r1"]'); await page.waitForTimeout(300); if(await page.isVisible('#winvModal [data-winv="mix"]')) await page.click('#winvModal [data-winv="one"]'); await page.waitForSelector('#receiptContent .winv-page',{timeout:8000});
  r=await page.evaluate(()=>{ const d=winvData('rug',[state.carpetOrders[0]],false); return {k:d.kinds[0],rows:d.rows,line:d.lines[0]}; });
  log('carpet invoice uses the same image, ticks «سجاد», qty 2 × 1,500: '+(r.k==='rug'&&r.rows[0].q==='2'&&r.rows[0].u==='1,500'&&r.rows[0].tot==='3,000'&&/غير مدفوع/.test(r.line))+' (expect true) '+JSON.stringify(r.rows));
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; state.tab='laundry'; render(); }); await page.waitForTimeout(250);
  await page.click('[data-lnd-receipt="l1"]'); await page.waitForTimeout(300); if(await page.isVisible('#winvModal [data-winv="mix"]')) await page.click('#winvModal [data-winv="one"]'); await page.waitForSelector('#receiptContent .winv-page',{timeout:8000});
  r=await page.evaluate(()=>{ const d=winvData('lnd',[state.laundryOrders[0]],false); return {rows:d.rows.length,pm:d.pm,pmName:d.pmName}; });
  log('laundry invoice: one row per item and «أخرى: مصرفي»: '+(r.rows===2&&r.pm==='masrvi'&&r.pmName==='مصرفي')+' (expect true) '+JSON.stringify(r));
  // الإيصال الحراري الصغير ما زال متاحًا
  await page.evaluate(()=>{ document.getElementById('receiptModal').style.display='none'; state.tab='cars'; render(); }); await page.waitForTimeout(250);
  await page.click('[data-car-receipt="c1"]'); await page.waitForTimeout(250); await page.click('#winvModal [data-winv="small"]'); await page.waitForTimeout(250);
  log('«🖨️ إيصال صغير» still opens the old thermal receipt: '+(await page.evaluate(()=>!!document.querySelector('#receiptContent .rcpt:not(.winv) .rcpt-no')))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
