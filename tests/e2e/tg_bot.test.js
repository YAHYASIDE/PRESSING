const { chromium } = require('/opt/node22/lib/node_modules/playwright');
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
  const TOKEN='8738937218:AAHsQhwbhcXYZabcdefghijklmnopqrstuv', CHAT='5811975790';
  await page.evaluate(({TOKEN,CHAT})=>{ const d=iso(new Date()); const y=new Date(); y.setDate(y.getDate()-1); const yd=iso(y);
    state.workers=[]; state.meters=[]; state.storeCash=[]; state.storeSales=[]; state.recurring=[]; state.closings=[];
    state.carOps=[{id:'a1',no:'A1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',plate:'1234AB',price:1000,paid:true,paidDate:d,payMethod:'bankily',date:d,by:'سيدي',editedAt:d},{id:'a2',no:'A2',vehicle:'شاحنة',wash:'غسيل',price:2500,paid:true,paidDate:yd,date:yd,by:'سيدي',editedAt:yd}];
    state.carpetOrders=[{id:'k1',no:'K1',customer:'محمد',type:'سجادة',count:3,unit:500,price:1500,status:'wash',paid:false,date:d,editedAt:d}];
    state.laundryOrders=[{id:'l1',no:'L1',customer:'أحمد',phone:'44556677',status:'wash',paid:true,paidDate:d,date:d,editedAt:d}];
    applyLinesToOrder(state.laundryOrders[0],[{type:'قميص',service:'كي',count:4,unit:100},{type:'بنطلون',service:'كي',count:6,unit:150}],'lnd');
    state.expenses=[{id:'e1',amount:300,reason:'ماء',category:'أخرى',date:d,editedAt:d}];
    state.notify={telegram:{enabled:true,token:TOKEN,chatId:CHAT}}; state.tgLastUpdate=0; save(); render(); }, {TOKEN,CHAT});

  // ===== القفل بكود البوت =====
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(250);
  log('telegram fields locked by default: '+(await page.evaluate(()=>document.getElementById('tgFields').disabled&&document.getElementById('tgToken').matches(':disabled')))+' (expect true)');
  await page.click('#tgUnlock'); await page.fill('#codeInput','1111'); await page.click('#codeOk'); await page.waitForTimeout(200);
  log('wrong code keeps lock: '+(await page.evaluate(()=>document.getElementById('tgFields').disabled))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('codeModal').style.display='none'; });
  // save while locked must NOT change bot config even if fields had other values
  await page.click('#setSave'); await page.waitForTimeout(200);
  log('save while locked keeps config: '+(await page.evaluate(({TOKEN,CHAT})=>state.notify.telegram.token===TOKEN&&state.notify.telegram.chatId===CHAT&&state.notify.telegram.enabled,{TOKEN,CHAT}))+' (expect true)');
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(200);
  await page.click('#tgUnlock'); await page.fill('#codeInput','32720707'); await page.click('#codeOk'); await page.waitForTimeout(200);
  log('correct code 32720707 unlocks: '+(await page.evaluate(()=>!document.getElementById('tgFields').disabled))+' (expect true)');
  log('pin field shows 32720707: '+((await page.inputValue('#tgPinSet'))==='32720707')+' (expect true)');
  await page.click('#setClose');

  // ===== ردود البوت (دالة نقية) =====
  const R = await page.evaluate(()=>({ help:tgHandleText('/start'), today:tgHandleText('📊 اليوم'), yest:tgHandleText('📅 أمس'), cars:tgHandleText('🚗 السيارات'), carsY:tgHandleText('السيارات أمس'), lnd:tgHandleText('👕 الملابس'), exp:tgHandleText('💸 المصروفات'), debts:tgHandleText('📌 الديون'), close:tgHandleText('🧾 التقفيل'), unknown:tgHandleText('بلا بلا'),
    date:tgHandleText(ymd(new Date())), dmy:(()=>{ const d=new Date(); return tgHandleText(String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()); })(),
    range:tgHandleText('من '+ymd(new Date(Date.now()-864e5))+' إلى '+ymd(new Date())), month:tgHandleText(monthKey(new Date())), ask:tgHandleText('🗓️ تاريخ'), askThen:tgHandleText(ymd(new Date())) }));
  log('help lists usage: '+/أهلًا/.test(R.help)+' (expect true)');
  log('today: 1 car, 3 rug pieces, 10 laundry pieces: '+(/السيارات: 1 غسلة/.test(R.today)&&/3 قطعة/.test(R.today)&&/10 قطعة/.test(R.today))+' (expect true)');
  log('today income/expense/profit: '+(/دخل المغسلة: 2,300/.test(R.today)&&/المصروفات: 300/.test(R.today)&&/ربح المغسلة: 2,000/.test(R.today))+' (expect true)');
  log('today bank split: '+/بنكي: 1,000/.test(R.today)+' (expect true)');
  log('yesterday: 1 car 2,500: '+(/السيارات: 1 غسلة — 2,500/.test(R.yest))+' (expect true)');
  log('cars list has plate+method: '+(/1234AB/.test(R.cars)&&/بنكيلي/.test(R.cars)&&/المجموع: 1,000/.test(R.cars))+' (expect true)');
  log('cars yesterday list: '+(/شاحنة/.test(R.carsY)&&!/1234AB/.test(R.carsY))+' (expect true)');
  log('laundry list items: '+(/قميص ×4/.test(R.lnd)&&/10 قطعة/.test(R.lnd))+' (expect true)');
  log('expenses list: '+(/ماء/.test(R.exp)&&/الإجمالي: 300/.test(R.exp))+' (expect true)');
  log('debts: '+(/محمد — 1,500/.test(R.debts))+' (expect true)');
  log('closing text no asterisks: '+(/تقفيل اليوم/.test(R.close)&&!/\*/.test(R.close))+' (expect true)');
  log('unknown -> hint: '+/لم أفهم/.test(R.unknown)+' (expect true)');
  log('ISO date -> summary: '+/📊 ملخص/.test(R.date)+' (expect true) | dd/mm/yyyy: '+/📊 ملخص/.test(R.dmy)+' (expect true)');
  log('range + month: '+(/←/.test(R.range)&&/📊 ملخص/.test(R.month))+' (expect true)');
  log('date prompt then date: '+(/أرسل التاريخ/.test(R.ask)&&/📊 ملخص/.test(R.askThen))+' (expect true)');

  // ===== الاستقصاء والرد (fetch وهمي) =====
  await page.evaluate(({CHAT})=>{ window._sent=[]; window._updates=[{update_id:101,message:{chat:{id:+CHAT},text:'📊 اليوم'}},{update_id:102,message:{chat:{id:999},text:'📊 اليوم'}}];
    window.fetch=async(u,o)=>{ if(/getUpdates/.test(u)){ const off=+(u.match(/offset=(\d+)/)||[])[1]||0; return {json:async()=>({ok:true,result:window._updates.filter(x=>x.update_id>=off)})}; }
      if(/sendMessage/.test(u)){ window._sent.push(JSON.parse(o.body)); return {json:async()=>({ok:true})}; } return {json:async()=>({})}; };
    tgSetResponder(true); }, {CHAT});
  await page.evaluate(()=>tgPoll()); await page.waitForTimeout(300);
  const S = await page.evaluate(()=>({n:window._sent.length, to:String((window._sent[0]||{}).chat_id), kb:!!((window._sent[0]||{}).reply_markup||{}).keyboard, txt:(window._sent[0]||{}).text||'', last:state.tgLastUpdate}));
  log('replied once, only to owner chat, with keyboard: '+(S.n===1&&S.to==='5811975790'&&S.kb&&/📊 ملخص/.test(S.txt))+' (expect true)');
  log('offset advanced to 102 (synced): '+(S.last===102)+' (expect true)');
  await page.evaluate(()=>tgPoll()); await page.waitForTimeout(200);
  log('no duplicate reply on next poll: '+(await page.evaluate(()=>window._sent.length===1))+' (expect true)');
  await page.evaluate(()=>{ tgSetResponder(false); window._updates.push({update_id:103,message:{chat:{id:5811975790},text:'🚗 السيارات'}}); });
  await page.evaluate(()=>tgPoll()); await page.waitForTimeout(200);
  log('non-responder device stays silent: '+(await page.evaluate(()=>window._sent.length===1))+' (expect true)');
  log('responder flag is local only: '+(await page.evaluate(()=>!('tgResponder' in cloudCopy())&&localStorage.getItem('sadaqa_tg_responder')==='0'))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
