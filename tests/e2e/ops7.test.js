const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram|anon auth/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:900} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date()); const ago=(n)=>{ const x=new Date(); x.setDate(x.getDate()-n); return iso(x); };
    state.carOps=[{id:'a1',no:'A1',vehicle:'سيارة صغيرة',wash:'غسيل',price:1000,paid:true,paidDate:d,payMethod:'cash',date:d,by:'سيدي',editedAt:d}];
    state.carpetOrders=[{id:'k1',no:'K1',customer:'ب',phone:'44001122',country:'222',type:'سجادة',count:1,unit:700,price:700,status:'ready',paid:false,readyDate:ago(5),date:ago(6),by:'سيدي',editedAt:d},
                        {id:'k2',no:'K2',customer:'ج',phone:'',type:'لحاف',count:2,unit:300,price:600,status:'wash',paid:false,date:ago(4),by:'أحمد',editedAt:d}];
    state.laundryOrders=[{id:'l1',no:'L1',customer:'أ',phone:'44556677',country:'222',status:'wash',paid:true,paidDate:d,payMethod:'cash',date:d,by:'أحمد',editedAt:d},
                         {id:'l2',no:'L2',customer:'س',phone:'',type:'قميص',service:'كي',count:1,unit:100,price:100,status:'ready',paid:false,readyDate:d,date:d,by:'أحمد',editedAt:d}];
    applyLinesToOrder(state.laundryOrders[0],[{type:'قميص',service:'كي',count:4,unit:100},{type:'بنطلون',service:'كي',count:6,unit:150}],'lnd');
    state.expenses=[{id:'e1',amount:300,reason:'ماء',category:'أخرى',payMethod:'cash',date:d,editedAt:d}]; state.storeCash=[]; state.storeSales=[]; state.workers=[]; state.meters=[];
    state.closings=[]; state.recurring=[]; state.autoClosingSent={}; state.alerts={readyDays:3,workDays:2};
    save(); render(); });

  // ===== (ملابس حسب النوع) =====
  const lcnt = await page.evaluate(()=>laundryCounts(()=>true));
  log('laundry counts by type (قميص 5, بنطلون 6): '+(lcnt['قميص']===5&&lcnt['بنطلون']===6)+' (expect true)');
  log('dashboard shows laundry panel: '+/ملابس اليوم حسب النوع/.test(await page.textContent('main'))+' (expect true)');

  // ===== 3) overdue =====
  const ov = await page.evaluate(()=>overdueOrders().map(x=>x.o.no+':'+x.why));
  log('overdue: '+JSON.stringify(ov));
  log('K1 ready 5d + K2 late 4d flagged, L2 fresh not: '+(ov.includes('K1:ready')&&ov.includes('K2:late')&&!ov.some(x=>x.startsWith('L2')))+' (expect true)');
  log('alert panel on dashboard: '+(await page.isVisible('.ov-panel'))+' (expect true)');
  await page.evaluate(()=>{ window._opened=[]; window.open=(u)=>{ window._opened.push(u); return null; }; });
  await page.click('[data-ov-wa="rug:k1"]'); await page.waitForTimeout(100);
  log('overdue WA button opens chat: '+(await page.evaluate(()=>/wa\.me\/22244001122/.test(window._opened[0]||'')))+' (expect true)');
  await page.evaluate(()=>{ state.alerts={readyDays:10,workDays:10}; render(); });
  log('higher thresholds hide panel: '+!(await page.isVisible('.ov-panel'))+' (expect true)');
  await page.evaluate(()=>{ state.alerts={readyDays:3,workDays:2}; });
  // status -> ready stamps readyDate
  await page.click('[data-tab="carpets"]'); await page.waitForTimeout(200); await page.click('[data-status="k2"]'); await page.waitForTimeout(200);
  log('readyDate stamped on ready: '+(await page.evaluate(()=>state.carpetOrders[1].status==='ready'&&!!state.carpetOrders[1].readyDate))+' (expect true)');

  // ===== 1) cash count at closing =====
  await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(200); await page.click('#openClosing'); await page.waitForTimeout(200);
  log('cash count box in closing: '+(await page.isVisible('#ccSave'))+' (expect true)');
  const exp = await page.evaluate(()=>periodSummary(ymd(new Date()),ymd(new Date())).pay.cash.net);
  log('expected cash = 1000+1300-300 = 2000: '+(exp===2000)+' (expect true) ['+exp+']');
  await page.fill('#ccActual','1800'); await page.fill('#ccNote','ناقص'); await page.click('#ccSave'); await page.waitForTimeout(250);
  const c = await page.evaluate(()=>state.closings[0]);
  log('closing saved: diff −200: '+(!!c&&c.expected===2000&&c.actual===1800&&c.diff===-200&&c.by==='مالك')+' (expect true)');
  log('modal shows عجز: '+/عجز 200/.test(await page.textContent('#receiptContent'))+' (expect true)');
  await page.fill('#ccActual','2000'); await page.click('#ccSave'); await page.waitForTimeout(250);
  log('re-save updates same record (no duplicate): '+(await page.evaluate(()=>state.closings.length===1&&state.closings[0].diff===0))+' (expect true)');
  log('closing text includes count: '+(await page.evaluate(()=>/جرد الصندوق/.test(cashCountText(ymd(new Date())))))+' (expect true)');
  await page.click('#receiptClose');
  log('cloud copy carries closings: '+(await page.evaluate(()=>cloudCopy().closings.length===1))+' (expect true)');

  // ===== 2) worker stats =====
  const ws = await page.evaluate(()=>workerStats(()=>true).map(w=>w.name+':'+w.n+':'+w.amt));
  log('worker stats: '+JSON.stringify(ws));
  log('أحمد 3 ops 2000, سيدي 2 ops 1700: '+(ws.includes('أحمد:3:2000')&&ws.includes('سيدي:2:1700'))+' (expect true)');
  await page.click('[data-tab="reports"]'); await page.waitForTimeout(250);
  const rp = await page.textContent('main');
  log('reports show workers + closings panels: '+(/إنتاجية العمّال/.test(rp)&&/جرد الصندوق/.test(rp)&&/🏆/.test(rp))+' (expect true)');

  // ===== 4) recurring expenses =====
  await page.click('[data-tab="expenses"]'); await page.waitForTimeout(200);
  await page.fill('#recName','إيجار'); await page.fill('#recAmt','5000'); await page.fill('#recDay','1'); await page.click('#recPm [data-pm="bankily"]'); await page.click('#recAdd'); await page.waitForTimeout(250);
  const re = await page.evaluate(()=>({n:state.recurring.length, auto:state.expenses.filter(e=>e.recurringId).map(e=>({id:e.id,amt:e.amount,pm:e.payMethod,day:ymd(e.date)}))}));
  log('recurring added + this month expense created once: '+(re.n===1&&re.auto.length===1&&re.auto[0].amt===5000&&re.auto[0].pm==='bankily'&&/-01$/.test(re.auto[0].day))+' (expect true) '+JSON.stringify(re.auto));
  log('applyRecurring again adds nothing: '+(await page.evaluate(()=>applyRecurring()===0))+' (expect true)');
  log('deterministic id (same on every device): '+(await page.evaluate(()=>state.expenses.find(e=>e.recurringId).id==='rec_'+state.recurring[0].id+'_'+monthKey(new Date())))+' (expect true)');
  // delete the auto expense -> tombstone prevents re-adding
  await page.evaluate(()=>{ const e=state.expenses.find(x=>x.recurringId); tomb(e.id); state.expenses=state.expenses.filter(x=>x.id!==e.id); });
  log('deleted auto expense not re-added: '+(await page.evaluate(()=>applyRecurring()===0&&!state.expenses.some(e=>e.recurringId)))+' (expect true)');
  await page.click('[data-rec-toggle]'); await page.waitForTimeout(150);
  log('toggle stops it: '+(await page.evaluate(()=>state.recurring[0].active===false))+' (expect true)');

  // ===== 5) auto telegram closing =====
  await page.evaluate(()=>{ window._tg=[]; window.fetch=async(u,o)=>{ if(/telegram/.test(u)) window._tg.push(JSON.parse(o.body)); return {ok:true,json:async()=>({})}; };
    state.notify={telegram:{enabled:true,token:'t',chatId:'1'}}; state.autoClosing={enabled:true,time:'00:00',since:'2000-01-01'}; state.autoClosingSent={}; });
  await page.evaluate(()=>autoClosingTick()); await page.waitForTimeout(100);
  const tg = await page.evaluate(()=>({n:window._tg.length, txt:(window._tg[0]||{}).text||'', sent:Object.keys(state.autoClosingSent)}));
  log('auto closing sent once for today: '+(tg.n===1&&tg.sent[0]===(await page.evaluate(()=>ymd(new Date()))))+' (expect true)');
  log('message has closing + cash count, no asterisks: '+(/تقفيل/.test(tg.txt)&&/جرد الصندوق/.test(tg.txt)&&!/\*/.test(tg.txt))+' (expect true)');
  await page.evaluate(()=>autoClosingTick());
  log('second tick does not resend: '+(await page.evaluate(()=>window._tg.length===1))+' (expect true)');
  await page.evaluate(()=>{ state.autoClosing.time='23:59'; state.autoClosingSent={}; autoClosingTick(); });
  const y = await page.evaluate(()=>{ const d=new Date(); d.setDate(d.getDate()-1); return ymd(d); });
  log('before the hour -> sends yesterday: '+(await page.evaluate(k=>Object.keys(state.autoClosingSent)[0]===k, y))+' (expect true)');
  log('sent-log survives sync merge: '+(await page.evaluate(()=>{ const r=JSON.parse(JSON.stringify(cloudCopy())); r.autoClosingSent={}; applyRemote(r); return Object.keys(state.autoClosingSent).length===1; }))+' (expect true)');

  // ===== 6) Excel export =====
  await page.evaluate(()=>{ state.autoClosing.enabled=false; });
  const csv = await page.evaluate(()=>exportCSV('2000-01-01', ymd(new Date())));
  log('csv has BOM + sep + sections: '+(csv.charCodeAt(0)===0xFEFF&&csv.includes('sep=,')&&csv.includes('السيارات')&&csv.includes('الملابس')&&csv.includes('جرد الصندوق')&&csv.includes('الملخص'))+' (expect true)');
  log('csv rows contain data: '+(csv.includes('A1')&&csv.includes('قميص ×4')&&csv.includes('دخل بنكيلي'))+' (expect true)');
  await page.evaluate(()=>{ navigator.canShare=()=>false; });
  await page.click('[data-tab="reports"]'); await page.waitForTimeout(200);
  const [dl] = await Promise.all([ page.waitForEvent('download',{timeout:8000}), page.click('#exportExcel') ]);
  log('excel button downloads .csv: '+/\.csv$/.test(dl.suggestedFilename())+' (expect true) ['+dl.suggestedFilename()+']');

  // ===== 7) security rules file + settings status =====
  const rules=fs.readFileSync('firestore.rules','utf8');
  log('firestore.rules present with auth check: '+(/request\.auth != null/.test(rules)&&/appState\/main/.test(rules)&&/backups\/\{day\}/.test(rules))+' (expect true)');
  await page.evaluate(()=>openSettings('all')); await page.waitForTimeout(250);
  log('settings has alerts/auto/excel/security sections: '+((await page.isVisible('#alReady'))&&(await page.isVisible('#acEnabled'))&&(await page.isVisible('#xlExport'))&&(await page.isVisible('#authStatus')))+' (expect true)');
  await page.click('#tgUnlock'); await page.fill('#codeInput','32720707'); await page.click('#codeOk'); await page.waitForTimeout(200);
  await page.fill('#alReady','5'); await page.check('#acEnabled'); await page.fill('#acTime','21:30'); await page.click('#setSave'); await page.waitForTimeout(200);
  log('settings saved: '+(await page.evaluate(()=>state.alerts.readyDays===5&&state.autoClosing.enabled&&state.autoClosing.time==='21:30'&&state.autoClosing.since===ymd(new Date())))+' (expect true)');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
