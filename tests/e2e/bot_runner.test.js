// اختبار بوت GitHub (Node فقط، بلا متصفح): Firestore وTelegram وهميان
const { run } = require('../../bot/bot.js');
(async () => {
  const log=(...a)=>console.log(...a); const errors=[];
  const d=new Date().toISOString(); const nowSec=Math.floor(Date.now()/1000);
  const appState={ carOps:[{id:'a1',no:'A1',vehicle:'سيارة صغيرة',wash:'غسيل',plate:'1234AB',price:1000,paid:true,paidDate:d,payMethod:'bankily',date:d,by:'سيدي'}],
    laundryOrders:[{id:'l1',no:'L1',customer:'أحمد',type:'قميص',service:'كي',count:4,unit:100,price:400,status:'wash',paid:true,paidDate:d,date:d}],
    expenses:[{id:'e1',amount:300,reason:'ماء',category:'أخرى',date:d}], notify:{telegram:{enabled:true,token:'8738937218:AAHsQhwbhcXYZabcdefghijklmnopqrstuv',chatId:'5811975790'}},
    tgLastUpdate:100, autoClosing:{enabled:true,time:'00:00',since:'2000-01-01'}, autoClosingSent:{} };
  let botDoc=null; const sent=[]; let updates=[
    {update_id:101,message:{chat:{id:5811975790},date:nowSec-600,text:'📊 اليوم'}},
    {update_id:102,message:{chat:{id:999},date:nowSec-600,text:'📊 اليوم'}},
    {update_id:103,message:{chat:{id:5811975790},date:nowSec-500,text:'🚗 السيارات'}},
    {update_id:104,message:{chat:{id:5811975790},date:nowSec-10,text:'📅 أمس'}} ];
  const calls=[];
  const fetch=async(url,o)=>{ calls.push(((o&&o.method)||'GET')+' '+url);
    const J=(x,status)=>({status:status||200,json:async()=>x});
    if(/identitytoolkit/.test(url)) return J({error:{message:'ADMIN_ONLY_OPERATION'}},400);
    if(/appState\/main/.test(url)) return J({fields:{data:{stringValue:JSON.stringify(appState)},ts:{integerValue:'1'}}});
    if(/bot\/state/.test(url)){ if(o&&o.method==='PATCH'){ botDoc=JSON.parse(o.body).fields; return J({}); } return botDoc?J({fields:botDoc}):J({error:{code:404}},404); }
    if(/getUpdates/.test(url)){ const off=JSON.parse(o.body).offset; return J({ok:true,result:updates.filter(u=>u.update_id>=off)}); }
    if(/sendMessage/.test(url)){ sent.push(JSON.parse(o.body)); return J({ok:true}); }
    return J({});
  };
  const r1=await run({fetch, log:()=>{}});
  log('run ok: '+(r1.status==='ok')+' (expect true) '+JSON.stringify(r1));
  log('replied to 101 and 103, ignored foreign 102: '+(r1.replied===2&&r1.ignored===1)+' (expect true)');
  log('fresh message 104 left for an open device: '+(r1.skippedFresh===1&&r1.lastUpdate===103)+' (expect true)');
  log('reply text correct: '+(/السيارات: 1 غسلة — 1,000/.test(sent[0].text)&&/1234AB/.test(sent[1].text)&&!!sent[0].reply_markup)+' (expect true)');
  log('only owner chat: '+sent.every(s=>String(s.chat_id)==='5811975790')+' (expect true)');
  log('auto closing sent once: '+(r1.closing&&sent.some(s=>/تقفيل تلقائي/.test(s.text)))+' (expect true)');
  log('progress saved to bot/state (lastUpdate 103 + closingSent): '+(!!botDoc&&botDoc.lastUpdate.integerValue==='103'&&Object.keys(botDoc.closingSent.mapValue.fields).length===1)+' (expect true)');
  log('never wrote appState/main: '+!calls.some(u=>/appState\/main/.test(u)&&!/^GET /.test(u))+' (expect true)');
  // run again later: 104 is old now -> replied; no second closing
  const n=sent.length; updates[3].message.date=nowSec-400;
  const r2=await run({fetch, log:()=>{}});
  log('second run replies to 104 only, no duplicate closing: '+(r2.replied===1&&!r2.closing&&sent.length===n+1&&/📊 ملخص/.test(sent[n].text)&&!sent[n].text.includes('اليوم ('))+' (expect true)');
  log('third run does nothing: '+((await run({fetch, log:()=>{}})).replied===0)+' (expect true)');
  // app already answered (tgLastUpdate ahead) -> bot skips
  appState.tgLastUpdate=200; updates.push({update_id:150,message:{chat:{id:5811975790},date:nowSec-900,text:'📊 اليوم'}});
  log('respects app progress (no reply to 150): '+((await run({fetch, log:()=>{}})).replied===0)+' (expect true)');
  // disabled telegram -> no calls
  appState.notify.telegram.enabled=false; const c0=calls.length; const r3=await run({fetch, log:()=>{}});
  log('disabled -> exits quietly: '+(r3.status==='disabled'&&!calls.slice(c0).some(u=>/telegram/.test(u)))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
