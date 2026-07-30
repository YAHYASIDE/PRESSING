const path=require('path');
let chromium; try{({chromium}=require('playwright'));}catch(e){({chromium}=require('/opt/node22/lib/node_modules/playwright'));}
const URL='file://'+path.resolve(__dirname,'..','index.html');
const R={};
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/favicon|ERR_CONNECTION/.test(m.text()))errs.push('CONSOLE '+m.text());});
  await p.goto(URL); await p.waitForTimeout(400);
  await p.evaluate(()=>{ startSetup(); const d=_setup.draft;
    d.types={carwash:true,laundry:true,carpet:true,'oil-change':true,shop:true}; d.name='مغسلة النور';
    d._mgrName='خالد'; d._mgrPhone='22334455'; d._mgrCountry='222'; d._address='ن';
    d._adminName='خالد'; d._username='k'; d._pass='1234'; d._confirm='1234'; finishSetup('dashboard'); });
  await p.waitForTimeout(150);
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(500);

  // choose a service -> form + subscriptions appear
  await p.click('#welcomeBody .wc-card[data-wc-svc="carwash"]'); await p.waitForTimeout(200);
  R.detail = await p.evaluate(()=>({
    hasName: !!document.getElementById('wcName'),
    hasPhone: !!document.getElementById('wcPhone'),
    subs: document.querySelectorAll('#welcomeDetail .wc-sub').length,   // 7 membership plans
    hasSubmit: !!document.getElementById('wcSubmit'),
  }));

  // try submit with empty -> blocked (toast, no request created)
  await p.click('#wcSubmit'); await p.waitForTimeout(120);
  R.blockedEmpty = await p.evaluate(()=>(state.serviceRequests||[]).length);   // 0

  // fill + pick a subscription + submit
  await p.fill('#wcName','سالم'); await p.fill('#wcPhone','22778899');
  await p.click('#welcomeDetail .wc-sub[data-wc-plan="gold"]'); await p.waitForTimeout(80);
  R.planSelected = await p.$$eval('#welcomeDetail .wc-sub.on', e=>e.length);
  await p.click('#wcSubmit'); await p.waitForTimeout(150);
  R.afterSubmit = await p.evaluate(()=>{
    const rq=(state.serviceRequests||[]);
    return { count:rq.length, last: rq[rq.length-1]||null, doneShown: !!document.querySelector('#welcomeDetail .wc-done') };
  });

  // staff: login -> operations center shows the request
  await p.click('#welcomeLoginBtn'); await p.waitForTimeout(120);
  await p.evaluate(()=>{ document.getElementById('lockName').value='خالد'; document.getElementById('lockInput').value=(state.lock||{}).pin; });
  await p.click('#lockEnter'); await p.waitForTimeout(200);
  await p.evaluate(()=>{ state.tab='dashboard'; render(); }); await p.waitForTimeout(150);
  R.staffSees = await p.evaluate(()=>({
    reqRows: document.querySelectorAll('.ops-req-row').length,
    pending: App.core.customerRequests().length,
    hasName: /سالم/.test((document.querySelector('.ops-req-main b')||{}).textContent||''),
  }));

  // mark done -> disappears
  await p.click('.ops-req-done'); await p.waitForTimeout(150);
  R.afterDone = await p.evaluate(()=>({ pending: App.core.customerRequests().length, rows: document.querySelectorAll('.ops-req-row').length }));

  const fail=[];
  const ok=(c,m)=>{ if(!c) fail.push(m); };
  ok(R.detail.hasName&&R.detail.hasPhone,'service detail shows name + phone fields');
  ok(R.detail.subs===7,'service detail shows the 7 subscription plans');
  ok(R.detail.hasSubmit,'service detail has a submit button');
  ok(R.blockedEmpty===0,'empty submit is blocked (no request)');
  ok(R.planSelected===1,'a subscription can be selected');
  ok(R.afterSubmit.count===1 && R.afterSubmit.last && R.afterSubmit.last.name==='سالم' && R.afterSubmit.last.plan==='gold','submit creates a request capturing name/phone/service/plan');
  ok(R.afterSubmit.doneShown,'success confirmation shown');
  ok(R.staffSees.reqRows===1 && R.staffSees.pending===1 && R.staffSees.hasName,'staff see the request in the Operations Center');
  ok(R.afterDone.pending===0 && R.afterDone.rows===0,'marking done clears the request');
  if(errs.length) fail.push('console/page errors: '+errs.join(' | '));
  await b.close();
  if(fail.length){ console.error('✗ RECEPTION FAILED:'); fail.forEach(x=>console.error('  - '+x)); process.exit(1); }
  console.log('✓ RECEPTION PASSED — customer intake (name+phone+subscription), request created, staff see it, mark-done clears it.');
})();
