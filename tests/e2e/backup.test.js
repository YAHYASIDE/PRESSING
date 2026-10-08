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
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  // seed data
  await page.evaluate(()=>{ const d=iso(new Date());
    state.carOps=[{id:uid(),no:'A1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:100,paid:true,paidDate:d,date:d,editedAt:d},{id:uid(),no:'A2',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:200,paid:true,paidDate:d,date:d,editedAt:d}];
    state.suppliers=[{id:uid(),name:'م1',editedAt:d}]; save(); render(); });
  // take backup now (local; cloud is unreachable in the sandbox)
  const ok = await page.evaluate(()=>takeBackup(true));
  log('backup taken: '+ok+' (expect true)');
  const list = await page.evaluate(async()=>(await backupSources()).map(b=>b.id+':'+b.n+':'+(b.local?'L':'')));
  log('backup list:', JSON.stringify(list));
  const today=await page.evaluate(()=>ymd(new Date())); log('today listed: '+list.some(x=>x.startsWith(today))+' (expect true)');
  // simulate data loss: delete one car op with tombstone + a supplier
  const lostId = await page.evaluate(()=>{ const id=state.carOps[0].id; tomb(id); state.carOps=state.carOps.filter(x=>x.id!==id); state.suppliers=[]; save(); return id; });
  // preview + restore
  const snap = await page.evaluate(()=>loadBackup(ymd(new Date())));
  const n = await page.evaluate(s=>restorePreview(s), snap);
  log('missing found: '+(n===2)+' (expect true) ['+n+']');
  const added = await page.evaluate(s=>restoreMissing(s), snap);
  const st = await page.evaluate(id=>({ back: state.carOps.some(x=>x.id===id), sup: state.suppliers.length, cars: state.carOps.length }), lostId);
  log('restored count 2: '+(added===2)+' (expect true) | car back: '+st.back+' (expect true) | supplier back: '+(st.sup===1)+' (expect true) | no duplicates: '+(st.cars===2)+' (expect true)');
  // restored record must survive a merge even though another device still holds the old tombstone
  const survive = await page.evaluate(id=>{ const remote=JSON.parse(JSON.stringify(cloudCopy())); remote.carOps=remote.carOps.filter(x=>x.id!==id); remote.deleted=Object.assign({},remote.deleted,{["rec:"+id]:Date.now()-60000}); applyRemote(remote); return state.carOps.some(x=>x.id===id); }, lostId);
  log('restored record survives old tombstone from other device: '+survive+' (expect true)');
  // a genuine new delete still propagates
  const delOk = await page.evaluate(()=>{ const id=state.carOps[1].id; const remote=JSON.parse(JSON.stringify(cloudCopy())); tomb(id); state.carOps=state.carOps.filter(x=>x.id!==id); remote.deleted=Object.assign({},remote.deleted,state.deleted); applyRemote(remote); return !state.carOps.some(x=>x.id===id); });
  log('normal delete still propagates: '+delOk+' (expect true)');
  // second restore finds nothing new except the newly deleted one
  // settings UI renders list
  await page.evaluate(()=>openSettings('all')); await page.waitForTimeout(900);
  log('settings backup list shown: '+/سجل/.test(await page.textContent('#bkList'))+' (expect true)');
  // shrink guard: a much smaller snapshot does not overwrite today's local backup
  const guard = await page.evaluate(async()=>{ const d=iso(new Date()); for(let i=0;i<20;i++) state.expenses.push({id:uid(),amount:1,category:'x',reason:'r',date:d,editedAt:d}); await takeBackup(true); const big=(await localBackupGet(ymd(new Date()))).n; state.expenses=[]; _lastBackupAt=0; await takeBackup(false); const after=(await localBackupGet(ymd(new Date()))).n; return {big,after}; });
  log('shrink guard keeps bigger backup: '+(guard.after===guard.big)+' (expect true) ['+guard.big+'→'+guard.after+']');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
