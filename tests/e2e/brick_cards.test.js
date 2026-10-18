// 2.50.0 — بطاقات «الديون والحسابات» و«العمّال والحمّالون» في دبو بنفس شكل بطاقات الزبائن في المتجر (personCardHTML).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:390,height:860} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=iso(new Date());
    ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickLoads'].forEach(k=>state[k]=[]);
    state.storeCustomers=[{id:'cu1',name:'محمد',phone:'22334455',country:'222',editedAt:d}]; state.suppliers=[{id:'su1',name:'حمد و باي',phone:'',editedAt:d}];
    state.brickPorters=[{id:'po1',name:'دبيته',phone:'33445566',role:'porter',editedAt:d}];
    state.brickSales=[{id:'s2',no:'BS2',btype:'t15',qty:100,unitPrice:180,total:18000,paidAmount:0,paid:false,partyType:'cust',partyId:'cu1',customerId:'cu1',customerName:'محمد',phone:'22334455',date:d,editedAt:d}];
    state.brickPurchases=[{id:'p1',no:'BP1',material:'cement',name:'إسمنت',unit:'خنشة',qty:10,unitCost:3300,total:33000,paid:false,paidAmount:0,supplierId:'su1',date:d,editedAt:d}];
    state.brickLoads=[{id:'l1',porterId:'po1',kind:'bricks',qty:1000,rate:10,amount:10000,paidAmount:0,paid:false,date:d,editedAt:d}];
    state.tab='brick'; state.brickSub='debts'; save(); render(); });
  await page.waitForTimeout(300);
  let r=await page.evaluate(()=>{ const cs=[...document.querySelectorAll('main .person-card')]; const m=cs.find(c=>/محمد/.test(c.textContent)), s=cs.find(c=>/حمد و باي/.test(c.textContent)), p=cs.find(c=>/دبيته/.test(c.textContent));
    const btns=c=>c?[...c.querySelectorAll('.r-btn small')].map(x=>x.textContent):[];
    return { n:cs.length, mAv:!!(m&&m.querySelector('.dc-av')), mAmt:m&&m.querySelector('.dc-amt').textContent, mBtns:btns(m), wa:m&&(m.querySelector('.r-btn.wa')||{}).href||'', mini:!!(m&&m.querySelector('.dc-mini [data-bk-ladd]')), noQd:!document.querySelector('main .person-card [data-qd]'),
      sAmt:s&&s.querySelector('.dc-amt').textContent, sBadge:s&&/مورّد/.test(s.textContent), sBtns:btns(s), pAmt:p&&p.querySelector('.dc-amt').textContent, pBtns:btns(p), overflow:document.documentElement.scrollWidth>innerWidth }; });
  log('debts tab: customer, supplier and porter all use the store-style card: '+(r.n===3 && r.mAv)+' (expect true) '+r.n);
  log('customer card: one number «18,000 عليه» + round buttons واتساب/اتصال/تحصيل/كشف: '+(/18,000\s*عليه/.test(r.mAmt) && r.mBtns.join(',')==='تذكير,اتصال,تحصيل,كشف')+' (expect true) '+r.mBtns);
  log('WhatsApp button carries the reminder text: '+/text=/.test(r.wa)+' (expect true)');
  log('«➕ قيد» sits in the small row (no store-only quick debt buttons): '+(r.mini && r.noQd)+' (expect true)');
  log('supplier card: «33,000 له» + مورّد badge + تسديد له/كشف: '+(/33,000\s*له/.test(r.sAmt) && r.sBadge && r.sBtns.join(',')==='تسديد له,كشف')+' (expect true) '+r.sBtns);
  log('porter card: «10,000 له» + دفع له/كشف: '+(/10,000\s*له/.test(r.pAmt) && r.pBtns.join(',')==='واتساب,اتصال,دفع له,كشف')+' (expect true) '+r.pBtns);
  log('no horizontal overflow: '+(!r.overflow)+' (expect true)');
  await page.click('main .person-card [data-bk-ladd="c:cu1"]'); await page.waitForTimeout(250);
  log('«➕ قيد» opens the entry form for that person: '+(await page.evaluate(()=>{ const s=document.getElementById('bkLParty'); return !!s && s.value==='c:cu1'; }))+' (expect true)');
  await page.evaluate(()=>{ _bkDraft.lopen=false; render(); });
  await page.click('main .person-card [data-bk-pcollect]'); await page.waitForTimeout(250);
  log('«تحصيل» opens the payment window: '+(await page.evaluate(()=>getComputedStyle(document.getElementById('storePayModal')).display!=='none'))+' (expect true)');
  await page.evaluate(()=>{ document.getElementById('storePayModal').style.display='none'; state.brickSub='porters'; render(); }); await page.waitForTimeout(250);
  log('porters tab uses the same card: '+(await page.evaluate(()=>{ const c=document.querySelector('main .person-card'); return !!c && /دبيته/.test(c.textContent) && /حمّال/.test(c.textContent); }))+' (expect true)');
  // 2.51.0 — تبويبات دبو صفّان من المربعات الملوّنة
  r=await page.evaluate(()=>{ const seg=document.querySelector('.seg.bk-tiles'), B=[...seg.querySelectorAll('[data-bksub]')], tops=new Set(B.map(b=>Math.round(b.getBoundingClientRect().top))), on=seg.querySelector('.on');
    return { n:B.length, rows:tops.size, noScroll:seg.scrollWidth<=seg.clientWidth+1, icon:B.every(b=>b.querySelector('.bt-ic')&&b.querySelector('.bt-ic').getBoundingClientRect().width>=30), colored:new Set(B.map(b=>getComputedStyle(b).backgroundColor)).size>=6, onBg:getComputedStyle(on).backgroundColor, onC:getComputedStyle(on).color, h:B[0].getBoundingClientRect().height }; });
  log('brick tabs: 8 colored square tiles in 2 rows, no side scrolling, icons ≥30px: '+(r.n===8 && r.rows===2 && r.noScroll && r.icon && r.colored && r.h>=60)+' (expect true) '+JSON.stringify(r));
  log('active tile is filled with its color and white text: '+(r.onC==='rgb(255, 255, 255)' && r.onBg!=='rgba(0, 0, 0, 0)')+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
