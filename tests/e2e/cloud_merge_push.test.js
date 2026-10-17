// 2.34.0 — الحفظ السحابي «ادمج ثم اكتب»: جهاز لم يستلم تسجيلات المشرف لا يمحوها عند الحفظ؛ وتاريخ كامل ظاهر على البطاقات.
// (Firebase غير متاح في الاختبار: نُحاكي معاملة الحفظ باستدعاء window.mergeForPush مع نسخة الخادم كما تفعل المعاملة.)
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

  // جهاز المالك: عنده سيارة K1 فقط ولم يستلم شيئًا من المشرف
  const r=await page.evaluate(()=>{ const d=iso(new Date());
    state.carOps=[{id:'own1',no:'K1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1000,paid:true,payMethod:'cash',paidDate:d,date:d,by:'مالك',editedAt:d}];
    state.laundryOrders=[]; save();
    // نسخة الخادم (رفعها المشرف): فيها سيارتان وطلب ملابس من اليوم وأمس لم تصل لهذا الجهاز
    const server=JSON.parse(JSON.stringify(cloudCopy())); const y=iso(new Date(Date.now()-864e5));
    server.carOps=[{id:'sup1',no:'K6',vehicle:'سيارة كبيرة',wash:'غسيل خارجي',price:3000,paid:true,payMethod:'bankily',paidDate:d,date:d,by:'أنفع',editedAt:d},{id:'sup2',no:'K5',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1500,paid:true,paidDate:y,date:y,by:'أنفع',editedAt:y}];
    server.laundryOrders=[{id:'supL',no:'L9',customer:'زبون المشرف',phone:'22000000',type:'قميص',service:'كي',count:2,unit:100,price:200,status:'wash',paid:false,date:d,by:'أنفع',editedAt:d}];
    let pushes=0; const realPush=window.cloudPush; window.cloudReady=true; window.cloudPush=()=>{ pushes++; };
    // ما تفعله معاملة الحفظ: تقرأ نسخة الخادم وتدمجها ثم تكتب الناتج
    const written=window.mergeForPush(server);
    window.cloudPush=realPush;
    return { written:written.carOps.map(o=>o.no).sort(), lnd:(written.laundryOrders||[]).map(o=>o.no), local:state.carOps.map(o=>o.no).sort(), pushes, pulled:_lastPullOk>0 };
  });
  log('the write contains the owner record AND the supervisor records (nothing erased): '+(JSON.stringify(r.written)==='["K1","K5","K6"]' && JSON.stringify(r.lnd)==='["L9"]')+' (expect true)');
  log('this device also received the supervisor records: '+(JSON.stringify(r.local)==='["K1","K5","K6"]')+' (expect true)');
  log('merging inside a save does not trigger another push (no loop): '+(r.pushes===0)+' (expect true) | counts as a receive: '+r.pulled+' (expect true)');
  // حذف من هذا الجهاز لا يعود بعد الدمج (tombstone)
  const r2=await page.evaluate(()=>{ const server=JSON.parse(JSON.stringify(cloudCopy())); tomb('sup2'); state.carOps=state.carOps.filter(o=>o.id!=='sup2'); save(); const out=window.mergeForPush(server); return out.carOps.map(o=>o.no).sort(); });
  log('a record deleted here stays deleted when merged with an older server copy: '+(JSON.stringify(r2)==='["K1","K6"]')+' (expect true)');
  // فشل الحفظ يُعاد تلقائيًا بعد 20 ثانية
  const r3=await page.evaluate(()=>{ window.onCloudPushErr(new Error('unavailable')); return typeof _pushRetryT!=='undefined' && !!_pushRetryT && /unavailable/.test(_lastPushErr.msg); });
  log('a failed save schedules an automatic retry and shows the error in health: '+r3+' (expect true)');

  // التاريخ الكامل على البطاقات
  await page.evaluate(()=>{ state.tab='cars'; state.dateFrom=state.dateTo=ymd(new Date()); render(); }); await page.waitForTimeout(250);
  const today=await page.evaluate(()=>ymd(new Date()));
  log('car cards show a full date chip: '+(await page.evaluate(t=>{ const c=[...document.querySelectorAll('.car-card .date-chip')]; return c.length>=2 && c.every(x=>x.textContent.includes(frDay(t))); },today))+' (expect true)');
  await page.evaluate(()=>{ state.tab='laundry'; render(); }); await page.waitForTimeout(250);
  log('laundry cards show a full date chip: '+(await page.evaluate(t=>{ const c=[...document.querySelectorAll('.order .no .date-chip')]; return c.length>=1 && c[0].textContent.includes(frDay(t)); },today))+' (expect true)');
  log('no horizontal overflow at 400px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
