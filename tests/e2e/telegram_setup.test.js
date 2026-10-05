const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram|anon auth/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:900} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  const TOKEN='8738937218:AAHsQhwbhcXYZabcdefghijklmnopqrstuv';
  await page.evaluate(()=>{ window._calls=[]; window.fetch=async(u,o)=>{ window._calls.push(u);
    if(/getUpdates/.test(u)) return {json:async()=>({ok:true,result:[{update_id:1,message:{chat:{id:987654321,first_name:'يحيى',username:'yahya'},text:'hi'}}]})};
    if(/sendMessage/.test(u)){ const b=JSON.parse(o.body); return {json:async()=>(String(b.chat_id)==='987654321'?{ok:true}:{ok:false,description:'Bad Request: chat not found'})}; }
    return {json:async()=>({})}; }; });
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(250);
  await page.click('#tgUnlock'); await page.fill('#codeInput','32720707'); await page.click('#codeOk'); await page.waitForTimeout(200);
  log('token field is LTR plain: '+(await page.evaluate(()=>{ const cs=getComputedStyle(document.getElementById('tgToken')); return cs.direction==='ltr'&&cs.letterSpacing==='normal'; }))+' (expect true)');
  // the user's mistake: token in both fields
  await page.fill('#tgToken',TOKEN); await page.fill('#tgChat',TOKEN); await page.click('#tgTest'); await page.waitForTimeout(150);
  log('token-in-chat-id detected: '+/وضعت التوكن مكانه/.test(await page.textContent('#tgStatus'))+' (expect true)');
  log('no request sent with bad values: '+(await page.evaluate(()=>!window._calls.some(u=>/sendMessage/.test(u))))+' (expect true)');
  // auto fetch chat id
  await page.click('#tgFetchChat'); await page.waitForTimeout(200);
  log('chat id fetched automatically: '+((await page.inputValue('#tgChat'))==='987654321')+' (expect true)');
  log('status names the chat: '+/يحيى/.test(await page.textContent('#tgStatus'))+' (expect true)');
  await page.click('#tgTest'); await page.waitForTimeout(200);
  log('test message ok: '+/✅ وصلت/.test(await page.textContent('#tgStatus'))+' (expect true)');
  // telegram error text surfaced
  await page.fill('#tgChat','123456'); await page.click('#tgTest'); await page.waitForTimeout(200);
  log('telegram error explained: '+/Chat ID غير صحيح/.test(await page.textContent('#tgStatus'))+' (expect true)');
  // save refuses invalid when enabled, accepts valid
  await page.check('#tgEnabled'); await page.fill('#tgChat','abc'); await page.click('#setSave'); await page.waitForTimeout(150);
  log('save blocked with invalid chat id: '+(await page.evaluate(()=>getComputedStyle(document.getElementById('settingsModal')).display!=='none'))+' (expect true)');
  await page.fill('#tgChat','987654321'); await page.click('#setSave'); await page.waitForTimeout(200);
  log('saved valid config: '+(await page.evaluate(()=>state.notify.telegram.enabled&&state.notify.telegram.chatId==='987654321'&&state.notify.telegram.token.length>30))+' (expect true)');
  log('bad token rejected by validator: '+(await page.evaluate(()=>!!tgValidate('sQhwbhc:8738937218','987654321')))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
