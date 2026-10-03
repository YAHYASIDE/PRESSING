const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1100,height:900} });
  const page = await ctx.newPage();
  const errors=[];
  page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1400);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(500);

  // seed everything via app internals for determinism
  await page.evaluate(()=>{
    state.storeProducts=[]; state.storeSales=[]; state.storeCustomers=[]; state.storeCash=[]; state.storePurchases=[];
    const pid='p1'; state.storeProducts.push({id:pid,name:'صابون',buyPrice:100,sellPrice:150,stock:100,minStock:0,unit:'حبة',editedAt:iso(new Date())});
    const cid='c1'; state.storeCustomers.push({id:cid,name:'مغسلتنا',isLaundry:true,editedAt:iso(new Date())});
    const d=iso(new Date());
    // internal sale to laundry (credit): 1 x 150
    state.storeSales.push({id:'s1',no:'S1',customerId:cid,customerName:'مغسلتنا',items:[{productId:pid,name:'صابون',qty:1,price:150}],total:150,paidAmount:0,paid:false,date:d,editedAt:d});
    // external sale (cash): 1 x 150
    state.storeSales.push({id:'s2',no:'S2',customerId:null,customerName:'زبون نقدي',items:[{productId:pid,name:'صابون',qty:1,price:150}],total:150,paidAmount:150,paid:true,date:d,editedAt:d});
    save(); render();
  });
  await page.waitForTimeout(300);

  // dashboard combined card
  await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(300);
  const dash=(await page.textContent('.screen')).replace(/\s+/g,' ');
  log('dashboard has الربح المجمّع:', /الربح المجمّع/.test(dash));
  log('dashboard has ربح المتجر:', /ربح المتجر/.test(dash));

  // reports unified panel
  await page.click('[data-tab="reports"]'); await page.waitForTimeout(300);
  const panel = await page.evaluate(()=>{
    const panels=[...document.querySelectorAll('.panel')];
    const p=panels.find(x=>/الربح الموحّد/.test(x.textContent));
    return p?p.textContent.replace(/\s+/g,' ').trim():null;
  });
  log('--- unified panel text ---');
  log(panel);
  // expectations: ربح المغسلة -150, ربح المتجر 100, مجمّع -50, داخلي 150, مبيعات 300, خارجي 150
  const checks = {
    'laundry profit -150': /-150/.test(panel),
    'store margin 100': /100/.test(panel),
    'group -50': /-50/.test(panel),
    'store sales 300': /300/.test(panel),
  };
  log('checks:', JSON.stringify(checks));

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
