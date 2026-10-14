// 2.36.0 — لا «رمش»: الاستلام من السحابة لا يُعيد الرفع ولا يُعيد الرسم إن لم يتغيّر شيء (كان الرفع يولّد استلامًا ← حلقة لا تنتهي).
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
  await page.waitForTimeout(1200); // الرفع التلقائي بعد الدخول
  const r=await page.evaluate(async()=>{ const d=iso(new Date()); window._remoteApplied=true; // الاستلام الأول بعد الفتح يرسم دائمًا
    state.carOps=[{id:'own1',no:'K1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1000,paid:true,payMethod:'cash',paidDate:d,date:d,by:'مالك',editedAt:d}]; save();
    let pushes=0, renders=0; const realPush=window.cloudPush, realRender=window.render; window.cloudReady=true;
    window.cloudPush=()=>{ pushes++; }; window.render=function(){ renders++; return realRender.apply(this,arguments); };
    const out={};
    // 1) استلام نسخة مطابقة (ما رفعناه نحن يعود إلينا): لا رفع ولا رسم
    applyRemote(JSON.parse(JSON.stringify(cloudCopy()))); out.same={pushes,renders};
    // 2) السحابة فيها سجل جديد من المشرف: يُرسم مرة، ولا رفع (السحابة عندها كل شيء)
    pushes=0; renders=0; const srv=JSON.parse(JSON.stringify(cloudCopy())); srv.carOps.push({id:'sup1',no:'K6',vehicle:'سيارة كبيرة',wash:'غسيل خارجي',price:3000,paid:true,paidDate:d,date:d,by:'المشرف',editedAt:d});
    applyRemote(srv); out.newRemote={pushes,renders,has:state.carOps.some(o=>o.id==='sup1')};
    // 3) هذا الجهاز عنده سجل ليس في السحابة: يرفع مرة واحدة
    pushes=0; renders=0; const srv2=JSON.parse(JSON.stringify(cloudCopy())); state.carOps.push({id:'own2',no:'K2',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1000,paid:true,paidDate:d,date:d,by:'مالك',editedAt:d});
    applyRemote(srv2); out.localMore={pushes};
    // 4) معاملة الحفظ: لا كتابة إن كانت السحابة مطابقة
    out.txSame=window.mergeForPush(JSON.parse(JSON.stringify(cloudCopy())))===null;
    const srv3=JSON.parse(JSON.stringify(cloudCopy())); srv3.carOps=srv3.carOps.filter(o=>o.id!=='own2'); out.txWrite=!!window.mergeForPush(srv3);
    // 5) محاكاة السحابة الحقيقية: كل رفع يعود كاستلام — يجب أن يتوقف بعد رفع واحد
    pushes=0; renders=0; window.cloudPush=(data)=>{ pushes++; if(pushes<30) setTimeout(()=>applyRemote(JSON.parse(JSON.stringify(data))),20); };
    state.carOps.push({id:'own3',no:'K3',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1000,paid:true,paidDate:d,date:d,by:'مالك',editedAt:d}); save();
    await new Promise(res=>setTimeout(res,2500)); out.loop={pushes,renders};
    window.cloudPush=realPush; window.render=realRender; return out; });
  log('receiving an identical copy: no upload and no redraw (no flicker): '+(r.same.pushes===0 && r.same.renders===0)+' (expect true)');
  log('receiving a supervisor record: shown (one redraw) without uploading back: '+(r.newRemote.has && r.newRemote.renders===1 && r.newRemote.pushes===0)+' (expect true)');
  log('this device has a record the cloud lacks: uploads once: '+(r.localMore.pushes===1)+' (expect true)');
  log('save transaction skips the write when the cloud already matches, writes when it does not: '+(r.txSame && r.txWrite)+' (expect true)');
  log('upload→receive echo stops after one upload (was an endless loop): pushes '+r.loop.pushes+' renders '+r.loop.renders+': '+(r.loop.pushes===1 && r.loop.renders<=2)+' (expect true)');
  const w=await page.evaluate(()=>{ window._forceSyncWarn=true; const rr=window.cloudReady; window.cloudReady=false; _unsyncedSince=Date.now()-100000; syncWarnUpdate();
    const el=document.getElementById('syncWarn'); const shown=el.style.display==='flex' && /غير متصل بالسحابة/.test(el.textContent) && /لا يظهر على الأجهزة الأخرى/.test(el.textContent);
    window.cloudReady=true; _unsyncedSince=Date.now()-200000; _lastPushErr={ts:Date.now(),msg:'permission-denied'}; syncWarnUpdate(); const why=/منذ 3 دقيقة/.test(el.textContent) && /permission-denied/.test(el.textContent);
    window.onCloudPushOk(); const hidden=el.style.display==='none'; window.cloudReady=rr; window._forceSyncWarn=false; return {shown,why,hidden}; });
  log('a device that cannot reach the cloud shows a clear warning bar: '+w.shown+' (expect true)');
  log('the bar says for how long and why (the cloud error): '+w.why+' (expect true)');
  log('the bar disappears once an upload succeeds: '+w.hidden+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
