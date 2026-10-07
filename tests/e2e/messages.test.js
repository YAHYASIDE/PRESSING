const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram|anon auth/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:900} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  const lastMsg=async()=>decodeURIComponent((await page.evaluate(()=>window._opened.pop()||'')).split('text=')[1]||'');
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ window._opened=[]; window.open=(u)=>{ window._opened.push(u); return null; };
    state.shopInfo={name:'مغسلة النور',phone:'30000000',address:'',footer:''}; state.thanksMsg='شكرًا لكم'; state.adMsg='عرض الشهر 🎁'; state.msgTpl={}; state.debtMsg='يا {الاسم} عليك {المبلغ}';
    const d=iso(new Date());
    state.laundryOrders=[{id:'l1',no:'L1',customer:'أحمد',phone:'44556677',country:'222',type:'قميص',service:'كي',count:2,unit:100,price:200,status:'ready',paid:false,date:d}];
    state.carpetOrders=[{id:'k1',no:'K1',customer:'سالم',phone:'44556688',country:'222',type:'سجاد داكن',count:1,unit:6000,price:6000,dims:{l:6,m2:1000},status:'ready',paid:true,date:d}];
    state.carOps=[{id:'a1',no:'S1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',plate:'1234AB',phone:'44556699',country:'222',price:1000,paid:true,date:d}];
    state.customers={'1234AB':{plate:'1234AB',phone:'44556699',country:'222',stamps:3,totalWashes:3,freeWashes:0}};
    state.suppliers=[{id:'s1',name:'مورّد المنظفات',phone:'22000000',country:'222'}]; state.storePurchases=[{id:'p1',no:'P1',supplierId:'s1',supplier:'مورّد المنظفات',items:[],total:9000,paid:false,paidAmount:0,date:d}];
    runMigrations(); save(); render(); });
  // migration of old debtMsg
  log('old debtMsg migrated into msgTpl.debt: '+(await page.evaluate(()=>state.msgTpl.debt==='يا {الاسم} عليك {المبلغ}'&&!('debtMsg' in state)))+' (expect true)');
  // header uses shop info from settings
  await page.evaluate(()=>openLndWa(state.laundryOrders[0]));
  let m=await lastMsg();
  log('laundry message uses shop name/phone from settings + items + footer: '+(m.includes('*مغسلة النور*')&&m.includes('الهاتف: 30000000')&&m.includes('قميص × 2')&&m.includes('رقم الطلب: L1')&&m.includes('المبلغ المستحق: 200')&&m.includes('شكرًا لكم')&&m.includes('عرض الشهر 🎁'))+' (expect true)');
  await page.evaluate(()=>openWa(state.carpetOrders[0])); m=await lastMsg();
  log('carpet message has length + paid: '+(m.includes('سجاد داكن 6 م')&&m.includes('مدفوع'))+' (expect true)');
  await page.evaluate(()=>openCarChat(state.carOps[0])); m=await lastMsg();
  log('car message has vehicle + plate: '+(m.includes('رقم الطلب: S1')&&m.includes('سيارة صغيرة · 1234AB'))+' (expect true)');
  await page.evaluate(()=>openWaCust(state.customers['1234AB'])); m=await lastMsg();
  log('loyalty message: '+(m.includes('لديك 3 من 5')&&m.includes('بعد 1 غسلات'))+' (expect true)');
  log('supplier WA link carries a message with balance: '+(await page.evaluate(()=>{ state.tab='contacts'; state.contactsSub='suppliers'; render(); const a=[...document.querySelectorAll('a.wa-btn')].find(x=>/wa\.me\/22222000000/.test(x.href)); return !!a&&decodeURIComponent(a.href).includes('المستحقّ لكم عندنا: 9,000'); }))+' (expect true)');
  // settings section
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(300);
  log('messages section lists 9 editable templates: '+((await page.$$('[data-msgtpl]')).length===9)+' (expect true)');
  log('debt textarea shows migrated text: '+((await page.inputValue('[data-msgtpl="debt"]'))==='يا {الاسم} عليك {المبلغ}')+' (expect true)');
  await page.click('[data-msg-prev="lnd"]'); await page.waitForTimeout(100);
  log('preview renders a filled example: '+/مغسلة النور[\s\S]*قميص[\s\S]*شكرًا لكم/.test(await page.textContent('#msgPrev_lnd'))+' (expect true)');
  // edit header to a different name/number, edit car template, save
  await page.fill('[data-msgtpl="head"]','مغاسيل صداقة — فرع 2\nهاتف 99999999\n----');
  await page.fill('[data-msgtpl="car"]','{رأس}\nسيارتك {المركبة} جاهزة ✅ ({رقم الطلب})\n{الذيل}');
  await page.click('#setSave'); await page.waitForTimeout(200);
  log('custom templates saved (only changed ones): '+(await page.evaluate(()=>Object.keys(state.msgTpl).sort().join(',')==='car,debt,head'))+' (expect true)');
  await page.evaluate(()=>openCarChat(state.carOps[0])); m=await lastMsg();
  log('car message now uses custom header + text: '+(m.startsWith('مغاسيل صداقة — فرع 2\nهاتف 99999999')&&m.includes('سيارتك سيارة صغيرة جاهزة ✅ (S1)')&&m.includes('شكرًا لكم'))+' (expect true)');
  log('templates sync to cloud: '+(await page.evaluate(()=>cloudCopy().msgTpl.car.includes('جاهزة ✅')))+' (expect true)');
  // reset to default
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(200);
  await page.click('[data-msg-reset="car"]'); await page.click('#setSave'); await page.waitForTimeout(200);
  log('reset removes override: '+(await page.evaluate(()=>!('car' in state.msgTpl)))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
