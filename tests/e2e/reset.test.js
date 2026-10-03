const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1100,height:900} });
  const page = await ctx.newPage();
  const errors=[];
  page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1400);
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(500);

  // seed financials + setup
  await page.evaluate(()=>{
    const d=iso(new Date());
    state.carOps=[{id:'c1',no:'S1',vehicle:'سيارة صغيرة',wash:'غسيل خارجي',price:1000,paid:true,paidDate:d,date:d}];
    state.carpetOrders=[{id:'r1',no:'R1',type:'سجاد',count:1,unit:500,price:500,status:'done',paid:true,paidDate:d,date:d}];
    state.laundryOrders=[{id:'l1',no:'L1',type:'قميص',service:'كي',count:1,unit:100,price:100,status:'done',paid:true,paidDate:d,date:d}];
    state.expenses=[{id:'e1',amount:200,category:'عام',reason:'test',date:d}];
    state.storeProducts=[{id:'p1',name:'صابون',buyPrice:100,sellPrice:150,stock:20,minStock:0,editedAt:d}];
    state.storeCustomers=[{id:'sc1',name:'مغسلتنا',isLaundry:true,editedAt:d}];
    state.storeSales=[{id:'s1',no:'SS1',customerId:'sc1',customerName:'مغسلتنا',items:[{productId:'p1',name:'صابون',qty:2,price:150}],total:300,paidAmount:300,paid:true,date:d,editedAt:d}];
    state.storeCash=[{id:'ca1',type:'in',amount:300,reason:'بيع',date:d,editedAt:d}];
    state.customers={'ABC':{plate:'ABC',stamps:3,totalWashes:3,freeWashes:1,lastVisit:d}};
    state.users=[{id:'u1',name:'عامل',pin:'1111',active:true}];
    state.managers=[{id:'m1',name:'مدير',pass:'2222',active:true}];
    state.vehiclePrices['سيارة صغيرة']=1000;
    save(); render();
  });

  // before
  const before = await page.evaluate(()=>({
    carOps:state.carOps.length, carpet:state.carpetOrders.length, lnd:state.laundryOrders.length,
    exp:state.expenses.length, sales:state.storeSales.length, cash:state.storeCash.length,
    products:state.storeProducts.length, storeCusts:state.storeCustomers.length,
    users:state.users.length, managers:state.managers.length,
    vehPrice:state.vehiclePrices['سيارة صغيرة'], loyaltyStamps:state.customers['ABC'].stamps,
    group: (function(){ const F=()=>true; return (carIncome(F)+carpetIncome(F)+laundryIncome(F)) + storeProfit(F); })()
  }));
  log('BEFORE:', JSON.stringify(before));

  // reset financials
  await page.evaluate(()=>resetFinancials()); await page.waitForTimeout(300);

  const after = await page.evaluate(()=>({
    carOps:state.carOps.length, carpet:state.carpetOrders.length, lnd:state.laundryOrders.length,
    exp:state.expenses.length, sales:state.storeSales.length, cash:state.storeCash.length,
    products:state.storeProducts.length, storeCusts:state.storeCustomers.length,
    users:state.users.length, managers:state.managers.length,
    vehPrice:state.vehiclePrices['سيارة صغيرة'], loyaltyStamps:state.customers['ABC'].stamps,
    cashbox: cashboxBalance(), receivables: totalReceivables(),
    orderSeq:state.orderSeq, storeSeq:state.storeSeq,
    tombstones: Object.keys(state.deleted||{}).length
  }));
  log('AFTER :', JSON.stringify(after));

  // checks
  const ok = after.carOps===0 && after.carpet===0 && after.lnd===0 && after.exp===0 &&
    after.sales===0 && after.cash===0 && after.cashbox===0 && after.receivables===0 &&
    after.products===1 && after.storeCusts===1 && after.users===1 && after.managers===1 &&
    after.vehPrice===1000 && after.loyaltyStamps===0 && after.orderSeq===0 && after.storeSeq===0;
  log('RESET CORRECT (cleared financials, kept setup, zeroed loyalty):', ok);

  // dashboard profit should be 0
  await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(300);
  const dash=(await page.textContent('.screen')).replace(/\s+/g,' ');
  const m=dash.match(/الربح المجمّع[^\d-]*(-?[\d,]+)/);
  log('dashboard group profit after reset:', m?m[1]:'?');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
