const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:420,height:900} });
  const page = await ctx.newPage();
  const errors=[];
  page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  const log=(...a)=>console.log(...a);

  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(300);

  // session 1: generate a batch of ids
  const s1 = await page.evaluate(()=>Array.from({length:5},()=>uid()));
  log('session1 ids:', s1.join(', '));

  // reload (new session) -> old code would reset counter to 100 and reuse id101...
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1200);
  const s2 = await page.evaluate(()=>Array.from({length:5},()=>uid()));
  log('session2 ids:', s2.join(', '));

  const all=[...s1,...s2]; const uniq=new Set(all);
  log('NO collisions across reload:', uniq.size===all.length, '(expect true)');
  log('none match the old "id101..id106" pattern:', !all.some(x=>/^id\d+$/.test(x)), '(expect true)');

  // also confirm a real saved record keeps its id after a sync/merge round
  const rid = await page.evaluate(()=>{
    const d=iso(new Date());
    const o={id:uid(),no:'T1',vehicle:Object.keys(state.vehiclePrices)[0],wash:state.washTypes[0],plate:'ZZ',price:50,paid:true,paidDate:d,date:d,editedAt:d};
    state.carOps.push(o); save();
    // simulate a remote snapshot that does NOT contain this new record (stale server)
    const remote=JSON.parse(JSON.stringify(cloudCopy())); remote.carOps=(remote.carOps||[]).filter(x=>x.id!==o.id);
    applyRemote(remote);
    return { id:o.id, stillThere: state.carOps.some(x=>x.id===o.id) };
  });
  log('record survives merge against a stale remote:', rid.stillThere, '(expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
