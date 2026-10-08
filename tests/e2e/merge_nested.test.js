// 2.23.0 — دمج العمّال (دفعات/مستحقات/غياب) وزبائن الولاء بلا فقدان بين الأجهزة، والاسترجاع يعيد الدفعات الناقصة.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:1100,height:900} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);

  // جهاز المشرف (محلي): عامل «أحمد» عليه دفعة 5,000 سُجّلت الآن، وغياب اليوم؛ زبون لوحة 1111 بثلاثة أختام
  const r = await page.evaluate(()=>{
    const now=iso(new Date()); const old=iso(new Date(Date.now()-3600000)); const older=iso(new Date(Date.now()-7200000));
    state.workers=[{id:'w1',name:'أحمد',role:'غسّال',monthly:30000,start:older,absent:[now],payments:[{id:'p1',amount:5000,note:'سلفة',date:now}],credits:[],editedAt:now},
                   {id:'w2',name:'بكر',role:'كوّاء',monthly:20000,start:older,absent:[],payments:[],credits:[{id:'c1',amount:1000,note:'مكافأة',date:now}],editedAt:old}];
    state.customers={'1111':{plate:'1111',stamps:3,totalWashes:3,freeWashes:0,lastVisit:now,editedAt:now},'2222':{plate:'2222',stamps:1,totalWashes:1,freeWashes:0,lastVisit:older,editedAt:older}};
    save();
    // النسخة البعيدة (جهاز المالك): العامل أحمد بدفعة أخرى p2 وبدون p1 و editedAt أحدث؛ بكر بدون المكافأة c1 لكن بغياب أمس؛ الزبون 1111 بختمين (أقدم)؛ زبون 3333 جديد
    const remote=JSON.parse(JSON.stringify(cloudCopy()));
    const newer=iso(new Date(Date.now()+1000));
    remote.workers=[{id:'w1',name:'أحمد',role:'غسّال',monthly:32000,start:older,absent:[],payments:[{id:'p2',amount:2000,note:'',date:old}],credits:[],editedAt:newer},
                    {id:'w2',name:'بكر',role:'كوّاء',monthly:20000,start:older,absent:[old],payments:[],credits:[],editedAt:newer}];
    remote.customers={'1111':{plate:'1111',stamps:2,totalWashes:2,freeWashes:0,lastVisit:old,editedAt:old},'2222':{plate:'2222',stamps:2,totalWashes:2,freeWashes:0,lastVisit:now,editedAt:now},'3333':{plate:'3333',stamps:1,totalWashes:1,freeWashes:0,lastVisit:now,editedAt:now}};
    applyRemote(remote);
    const w1=state.workers.find(x=>x.id==='w1'), w2=state.workers.find(x=>x.id==='w2');
    return { w1pay:w1.payments.map(p=>p.id).sort(), w1monthly:w1.monthly, w1abs:w1.absent.length, w2cred:w2.credits.map(c=>c.id), w2abs:w2.absent.length,
             c1:state.customers['1111'].stamps, c2:state.customers['2222'].stamps, c3:!!state.customers['3333'], n:state.workers.length };
  });
  log('worker payments from both devices kept (p1+p2): '+(JSON.stringify(r.w1pay)==='["p1","p2"]')+' (expect true)');
  log('scalar fields from the newer copy (monthly 32,000): '+(r.w1monthly===32000)+' (expect true) | absence kept: '+(r.w1abs===1)+' (expect true)');
  log('credit added locally survives a newer remote without it: '+(JSON.stringify(r.w2cred)==='["c1"]')+' (expect true) | remote absence merged: '+(r.w2abs===1)+' (expect true)');
  log('loyalty: newer local stamps (3) win over older remote (2): '+(r.c1===3)+' (expect true) | newer remote wins for 2222: '+(r.c2===2)+' (expect true) | new remote customer added: '+r.c3+' (expect true) | no duplicate workers: '+(r.n===2)+' (expect true)');

  // دمج متكرر لا يُضاعف
  const again = await page.evaluate(()=>{ const remote=JSON.parse(JSON.stringify(cloudCopy())); applyRemote(remote); applyRemote(remote); const w1=state.workers.find(x=>x.id==='w1'); return w1.payments.length===2 && w1.absent.length===1; });
  log('re-merge is idempotent: '+again+' (expect true)');

  // الاسترجاع من نسخة يعيد دفعة ناقصة لعامل موجود
  const rest = await page.evaluate(()=>{ const snap=JSON.parse(JSON.stringify(cloudCopy())); const w1=state.workers.find(x=>x.id==='w1'); w1.payments=w1.payments.filter(p=>p.id!=='p1'); w1.credits=[]; save(); const pv=restorePreview(snap); const n=restoreMissing(snap); const w=state.workers.find(x=>x.id==='w1'); return { n, pv, has:w.payments.some(p=>p.id==='p1') }; });
  log('restoreMissing brings back the missing worker payment: '+(rest.has && rest.n>=1)+' (expect true) | preview counted it: '+(rest.pv>=1)+' (expect true)');

  // تسجيل دفعة من الواجهة يختم editedAt على العامل (شرط الفوز في الدمج)
  await page.evaluate(()=>{ state.tab='expenses'; state.expSub='workers'; render(); }); await page.waitForTimeout(300);
  const before=await page.evaluate(()=>state.workers.find(x=>x.id==='w1').editedAt);
  await page.waitForTimeout(1100);
  await page.fill('[data-payin="w1"]','700'); await page.click('[data-paybtn="w1"]'); await page.waitForTimeout(300);
  const after=await page.evaluate(()=>{ const w=state.workers.find(x=>x.id==='w1'); return { ed:w.editedAt, n:w.payments.length }; });
  log('UI payment stamps editedAt and adds payment: '+(after.ed>before && after.n===3)+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
