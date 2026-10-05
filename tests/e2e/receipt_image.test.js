const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:900} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date()); const o={id:'x1',no:'L2026-10-001',customer:'محمد لمين',phone:'22227268',country:'222',status:'wash',paid:false,date:d,editedAt:d};
    applyLinesToOrder(o,[{type:'بنطلون',service:'غسيل وكي',count:1,unit:500},{type:'دشداشة/ثوب',service:'غسيل وكي',count:5,unit:500}],'lnd');
    state.laundryOrders=[o]; save(); openLndReceipt(o); });
  log('send-image button shown next to print: '+(await page.isVisible('#receiptImg'))+' (expect true)');
  await page.click('#receiptImg'); await page.waitForSelector('#rcptImgOut',{timeout:15000});
  const info = await page.evaluate(async()=>{ const img=document.getElementById('rcptImgOut'); await img.decode();
    const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight; const x=c.getContext('2d'); x.drawImage(img,0,0);
    const px=x.getImageData(0,0,c.width,c.height).data; let dark=0; for(let i=0;i<px.length;i+=16){ if(px[i]<120&&px[i+1]<120&&px[i+2]<120) dark++; }
    return { w:img.naturalWidth, h:img.naturalHeight, dark, type:window._lastReceiptBlob&&window._lastReceiptBlob.type, size:window._lastReceiptBlob&&window._lastReceiptBlob.size }; });
  log('png produced: '+(info.type==='image/png'&&info.size>5000)+' (expect true) ['+info.size+' bytes]');
  log('image is 2x width (760px): '+(info.w===760)+' (expect true) ['+info.w+'x'+info.h+']');
  log('image has text (not blank): '+(info.dark>500)+' (expect true) ['+info.dark+']');
  log('download link offered: '+(await page.isVisible('#rcptImgDl'))+' (expect true) | name: '+((await page.getAttribute('#rcptImgDl','download'))==='فاتورة-L2026-10-001.png')+' (expect true)');
  await page.screenshot({path: process.env.SHOT||'/dev/null'}).catch(()=>{});
  await page.click('#rcptImgBack'); await page.waitForTimeout(100);
  log('back returns to receipt: '+/L2026-10-001/.test(await page.textContent('#receiptContent'))+' (expect true)');
  // with Web Share files support -> share is called with a PNG file
  await page.evaluate(()=>{ window._sharedFiles=null; navigator.canShare=()=>true; navigator.share=async(d)=>{ window._sharedFiles=d.files; }; });
  await page.click('#receiptImg'); await page.waitForTimeout(1500);
  const sh = await page.evaluate(()=>window._sharedFiles&&window._sharedFiles[0]&&{n:window._sharedFiles[0].name,t:window._sharedFiles[0].type});
  log('shared via Web Share as png file: '+(!!sh&&sh.t==='image/png'&&sh.n.endsWith('.png'))+' (expect true)');
  // dark mode still makes a light image
  await page.evaluate(()=>{ state.dark=true; applyTheme(); });
  await page.evaluate(()=>{ navigator.canShare=()=>false; }); await page.click('#receiptImg'); await page.waitForSelector('#rcptImgOut',{timeout:15000});
  const bg = await page.evaluate(async()=>{ const img=document.getElementById('rcptImgOut'); await img.decode(); const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight; const x=c.getContext('2d'); x.drawImage(img,0,0); const p=x.getImageData(5,5,1,1).data; return p[0]>240&&p[1]>240&&p[2]>240; });
  log('dark mode -> image background still white: '+bg+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
