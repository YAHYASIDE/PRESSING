// 2.69.0 — «صور المواد تُمحى»: كانت الصورة على الجهاز الذي أضافها فقط. الآن نسخة مصغّرة في السحابة (backups/pimg_{id})
// و state.prodImgAt مُزامن؛ كل جهاز يجلب الناقص، والصور القديمة المحلية تُرفع تلقائيًا، والحذف يصل لكل الأجهزة.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), os=require('os'), fs=require('fs');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:360,height:800} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  // سحابة وهمية للصور
  await page.evaluate(()=>{ window._CLOUD={}; window.cloudReady=true;
    window.cloudImgPut=async(id,o)=>{ window._CLOUD[id]=JSON.parse(JSON.stringify(o)); };
    window.cloudImgGet=async(id)=>window._CLOUD[id]||null; window.cloudImgDel=async(id)=>{ delete window._CLOUD[id]; };
    state.storeProducts=[]; state.prodImgAt={}; localStorage.removeItem('sadaqa_pimg_v'); state.tab='store'; state.storeSub='products'; render(); });
  await page.waitForTimeout(200);
  // صورة حقيقية من الهاتف (PNG كبيرة)
  const png=path.join(os.tmpdir(),'pimg_test.png');
  const buf=await page.evaluate(()=>{ const c=document.createElement('canvas'); c.width=1200; c.height=900; const g=c.getContext('2d'); g.fillStyle='#3a7'; g.fillRect(0,0,1200,900); g.fillStyle='#fff'; g.fillRect(200,200,400,300); return c.toDataURL('image/png').split(',')[1]; });
  fs.writeFileSync(png,Buffer.from(buf,'base64'));
  await page.fill('#prodName','شيبس'); await page.fill('#prodSell','100');
  await page.setInputFiles('.prodImgInp',png); await page.waitForTimeout(500);
  await page.click('#prodSave'); await page.waitForTimeout(300); await page.evaluate(()=>_pimgQ); await page.waitForTimeout(200);
  let r=await page.evaluate(()=>{ const p=state.storeProducts.find(x=>x.name==='شيبس'); const c=window._CLOUD[p.id]; return { id:p.id, local:!!p.image, cloud:!!(c&&c.img), small:c&&c.img.length<60000, at:state.prodImgAt[p.id]>0, inMain:!JSON.stringify(cloudCopy()).includes('data:image') }; });
  log('adding a product with a photo uploads a small copy to the cloud (not in the main document): '+(r.local&&r.cloud&&r.small&&r.at&&r.inMain)+' (expect true) '+JSON.stringify(r));
  const pid=r.id;
  // جهاز آخر / هاتف مسح ذاكرته: لا صورة محليًا
  r=await page.evaluate(async id=>{ const p=storeProd(id); p.image=''; localStorage.removeItem('sadaqa_pimg_v'); const x=await prodImgSync(); return { x, back:!!storeProd(id).image }; },pid);
  log('another phone (or a phone that lost its storage) gets the photo back from the cloud: '+(r.back && r.x.changed===1)+' (expect true) '+JSON.stringify(r));
  // صورة قديمة محلية لم تُرفع أبدًا تُرفع تلقائيًا
  r=await page.evaluate(async()=>{ const img=storeProd(state.storeProducts[0].id).image; state.storeProducts.push({id:'old1',name:'قديمة',sellPrice:50,buyPrice:0,stock:1,image:img,editedAt:iso(new Date())}); const x=await prodImgSync(); return { x, cloud:!!window._CLOUD.old1, at:state.prodImgAt.old1>0 }; });
  log('old photos saved only on this phone are uploaded automatically: '+(r.cloud && r.at && r.x.up===1)+' (expect true)');
  // المزامنة تحتفظ بالأحدث في prodImgAt
  r=await page.evaluate(id=>{ const remote=JSON.parse(JSON.stringify(cloudCopy())); remote.prodImgAt={}; remote.prodImgAt[id]=1; remote.prodImgAt.x9=5; applyRemote(remote); return { keep:state.prodImgAt[id]>1, other:state.prodImgAt.x9===5 }; },pid);
  log('merging with another device keeps the newest photo stamp per product: '+(r.keep && r.other)+' (expect true)');
  // الحذف يصل للأجهزة الأخرى
  r=await page.evaluate(async id=>{ const at=state.prodImgAt[id]; prodImgRemoved(id); await _pimgQ; const gone=!window._CLOUD[id];
    storeProd(id).image='data:image/jpeg;base64,xx'; _pimgVerSet(id,at); const x=await prodImgSync(); return { gone, cleared:!storeProd(id).image }; },pid);
  log('removing a photo removes it on every device: '+(r.gone && r.cleared)+' (expect true)');
  log(errors.length?'ERRORS:\n'+errors.join('\n'):'ERRORS: NONE ✅');
  await browser.close();
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
