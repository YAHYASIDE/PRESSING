// 2.14.0 — نسخ كل 5 دقائق محليًا (لا تُحذف تلقائيًا)، Google Drive (مُحاكى)، ولوحة «💾 المساحة».
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1100,height:900} });
  const page = await ctx.newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);

  // ===== Google Drive وهمي =====
  const drive={ files:[], folder:null, uploads:0, expired:false };
  await page.route('https://www.googleapis.com/**', async route=>{
    const req=route.request(), url=req.url(), m=req.method();
    const json=(o,status)=>route.fulfill({status:status||200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'},body:JSON.stringify(o)});
    if(m==='OPTIONS') return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
    if(drive.expired) return json({error:'expired'},401);
    if(/\/upload\/drive\/v3\/files/.test(url)){ drive.uploads++; const body=req.postData()||''; const meta=JSON.parse(body.split('\r\n\r\n')[1].split('\r\n')[0]); const data=body.split('\r\n\r\n')[2].split('\r\n--')[0]; const f={id:'f'+drive.uploads,name:meta.name,size:String(data.length),createdTime:new Date().toISOString(),data}; drive.files.unshift(f); return json({id:f.id,name:f.name}); }
    if(/\/drive\/v3\/files\/f\d+\?alt=media/.test(url)){ const id=url.match(/files\/(f\d+)/)[1]; const f=drive.files.find(x=>x.id===id); return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:f.data}); }
    if(/\/drive\/v3\/files\?/.test(url) && m==='POST'){ drive.folder='fold1'; return json({id:'fold1'}); }
    if(/\/drive\/v3\/files\?/.test(url)){ const q=decodeURIComponent(url); if(/mimeType='application\/vnd.google-apps.folder'/.test(q)) return json({files:drive.folder?[{id:drive.folder}]:[]}); return json({files:drive.files.map(f=>({id:f.id,name:f.name,size:f.size,createdTime:f.createdTime}))}); }
    return json({},404);
  });

  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date()); state.carOps=[{id:'c1',no:'A1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1000,paid:true,paidDate:d,date:d,editedAt:d}]; save(); });
  await page.waitForTimeout(300);

  // ===== نسخ كل 5 دقائق محليًا =====
  const r1=await page.evaluate(()=>takeSnapshot(true));
  log('first snapshot saved: '+(r1==='ok')+' (expect true)');
  const r2=await page.evaluate(()=>takeSnapshot(true));
  log('forced snapshot again (no change) still saves a new one: '+(r2==='ok')+' (expect true)');
  await page.evaluate(()=>{ _lastSnapAt=0; });
  const r3=await page.evaluate(()=>takeSnapshot(false));
  log('auto snapshot skipped when nothing changed: '+(r3==='same')+' (expect true)');
  await page.evaluate(()=>{ const d=iso(new Date()); state.carOps.push({id:'c2',no:'A2',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:500,paid:true,paidDate:d,date:d,editedAt:d}); save(); _lastSnapAt=0; });
  await page.waitForTimeout(100);
  const r4=await page.evaluate(()=>takeSnapshot(false));
  const nSnaps=await page.evaluate(async()=>(await snapAll()).length);
  log('auto snapshot saved after a change: '+(r4==='ok')+' (expect true) | total snapshots 3 (none deleted): '+(nSnaps===3)+' (expect true)');
  await page.evaluate(()=>{ _lastSnapAt=0; });
  log('within 5 minutes → wait: '+((await page.evaluate(()=>{ _lastSnapAt=Date.now(); return takeSnapshot(false); }))==='wait')+' (expect true)');

  // استرجاع من نسطة: احذف c2 ثم استرجع من آخر نسخة
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(1000);
  const snapTxt=await page.textContent('#snapAdmin');
  log('snapshot panel shows count 3: '+/عدد النسخ: 3/.test(snapTxt)+' (expect true)');
  log('snapshot panel lists entries with restore: '+((await page.$$('#snapAdmin [data-snap-restore]')).length===3)+' (expect true)');
  await page.evaluate(()=>{ state.carOps=state.carOps.filter(x=>x.id!=='c2'); save(); });
  await page.click('#snapAdmin [data-snap-restore]'); await page.waitForTimeout(300);
  await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(400);
  log('restore from 5-min snapshot brings c2 back: '+(await page.evaluate(()=>!!state.carOps.find(x=>x.id==='c2')))+' (expect true)');
  await page.click('#snapClean'); await page.waitForTimeout(200);
  log('cleanup with nothing older than 30 days just toasts: '+/لا توجد نسخ أقدم/.test(await page.textContent('#toast'))+' (expect true)');

  // ===== المساحة =====
  const st=await page.textContent('#storageAdmin');
  log('storage panel shows localStorage bar: '+/localStorage/.test(st)+' (expect true) | shows snapshots count: '+/نسخ كل 5 دقائق: 3/.test(st)+' (expect true)');
  const bars=await page.$$('#storageAdmin div[style*="height:10px"]');
  log('storage panel has at least one bar: '+(bars.length>=1)+' (expect true)');
  log('no near-full warning on small data: '+!/قاربت على الامتلاء/.test(st)+' (expect true)');

  // ===== Google Drive =====
  await page.evaluate(()=>{ window.driveSignIn=async()=>({token:'tok1',email:'test@gmail.com',exp:Date.now()+3600000}); });
  log('drive panel starts unlinked: '+/غير مرتبط بعد/.test(await page.textContent('#driveAdmin'))+' (expect true)');
  await page.click('#driveConnect'); await page.waitForTimeout(600);
  const d1=await page.textContent('#driveAdmin');
  log('drive linked shows email: '+/test@gmail\.com/.test(d1)+' (expect true) | folder created: '+(drive.folder==='fold1')+' (expect true)');
  log('upload toggle on by default after linking: '+(await page.evaluate(()=>driveCfg().on===true && document.getElementById('driveOn').checked))+' (expect true)');
  const u1=await page.evaluate(()=>driveUpload(true));
  log('manual upload ok: '+(u1==='ok')+' (expect true) | file received by Drive: '+(drive.uploads===1)+' (expect true)');
  log('uploaded file name pattern: '+/^sadaqa-backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/.test(drive.files[0].name)+' (expect true)');
  log('uploaded content is the app data: '+(JSON.parse(drive.files[0].data).carOps.length===2)+' (expect true)');
  const u2=await page.evaluate(()=>driveUpload(false));
  log('auto upload skipped when unchanged: '+(u2==='same')+' (expect true) | no extra file: '+(drive.uploads===1)+' (expect true)');
  await page.evaluate(()=>{ const d=iso(new Date()); state.expenses.push({id:'e1',amount:50,note:'ماء',category:'عام',date:d,editedAt:d}); save(); });
  const u3=await page.evaluate(()=>driveUpload(false));
  log('auto upload after change creates a NEW file (old kept): '+(u3==='ok' && drive.uploads===2 && drive.files.length===2)+' (expect true)');
  // tick يحترم 5 دقائق
  log('driveTick waits 5 minutes between uploads: '+(await page.evaluate(async()=>{ const before=driveCfg().count; await driveTick(); return driveCfg().count===before; }))+' (expect true)');
  await page.evaluate(()=>{ driveSet({last:0,lastHash:'x'}); });
  await page.evaluate(()=>driveTick()); await page.waitForTimeout(300);
  log('driveTick uploads when 5 minutes passed and data changed: '+(drive.uploads===3)+' (expect true)');
  // القائمة والاسترجاع من Drive
  await page.evaluate(()=>renderDriveAdmin()); await page.waitForTimeout(500);
  const items=await page.$$('#driveList [data-drive-restore]');
  log('drive list shows uploaded files: '+(items.length===3)+' (expect true)');
  await page.evaluate(()=>{ state.expenses=state.expenses.filter(x=>x.id!=='e1'); save(); });
  await items[0].click(); await page.waitForTimeout(400);
  await page.fill('#codeInput','070752'); await page.click('#codeOk'); await page.waitForTimeout(400);
  log('restore from Drive file brings e1 back: '+(await page.evaluate(()=>!!state.expenses.find(x=>x.id==='e1')))+' (expect true)');
  // انتهاء الجلسة
  drive.expired=true;
  const u4=await page.evaluate(()=>driveUpload(true));
  log('401 marks session expired: '+(u4==='expired' && (await page.evaluate(()=>!driveTokenOk())))+' (expect true)');
  await page.evaluate(()=>renderDriveAdmin()); await page.waitForTimeout(300);
  log('panel asks to relink: '+/انتهت الجلسة/.test(await page.textContent('#driveAdmin'))+' (expect true) | upload button disabled: '+(await page.evaluate(()=>document.getElementById('driveNow').disabled))+' (expect true)');
  drive.expired=false;
  await page.click('#driveConnect'); await page.waitForTimeout(500);
  log('relink restores token: '+(await page.evaluate(()=>driveTokenOk()))+' (expect true)');
  await page.click('#driveOff'); await page.waitForTimeout(200);
  log('unlink clears config: '+(await page.evaluate(()=>!driveCfg().email && !driveCfg().on))+' (expect true)');
  // رسائل الخطأ المترجمة
  log('error translation: '+(await page.evaluate(()=>/غير مفعّل في Firebase/.test(driveErr('auth/operation-not-allowed',{})) && /Authorized domains/.test(driveErr('auth/unauthorized-domain',{}))))+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
