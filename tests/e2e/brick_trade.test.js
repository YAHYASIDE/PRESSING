// 2.46.0 — دبو ▸ «البيع والشراء»: أربعة أزرار، الطرف تحت الأزرار في الآجل فقط (إلزامي)، «دُفع الآن» يبدأ بـ 0، والشراء صار هنا.
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
  await page.evaluate(()=>{ const d=iso(new Date()); ['brickBatches','brickPurchases','brickSales','brickExpenses','brickCash','brickLedger','brickLoads','brickPorters'].forEach(k=>state[k]=[]);
    state.storeCustomers=[{id:'cu1',name:'محمد',phone:'22334455',country:'222',editedAt:d}]; state.suppliers=[{id:'su1',name:'مورّد الإسمنت',phone:'44556677',country:'222',editedAt:d}];
    state.brickCfg={price:150,types:[{k:"t15",name:"15 بريك",price:150,wage:1300,load:0}]};
    state.brickBatches=[{id:'b0',no:'K1',btype:'t15',opening:true,cementBags:0,sandLoads:0,bricks:1000,workerPay:0,workerPaidAmt:0,workerPaid:true,date:d,editedAt:d}];
    _bkDraft.side='sell'; _bkDraft.paid=true; state.tab='brick'; state.brickSub='sales'; state.dateFrom=state.dateTo=ymd(new Date()); save(); render(); });
  await page.waitForTimeout(300);
  let r=await page.evaluate(()=>({ tiles:[...document.querySelectorAll('.bk-modes .t-mode')].map(b=>b.textContent.trim()), sub:document.querySelector('[data-bksub="sales"]').textContent }));
  log('the tab is «البيع والشراء» with 4 buttons on top (بيع نقدي/آجل، شراء نقدي/آجل): '+(/البيع والشراء/.test(r.sub) && r.tiles.length===4 && /بيع نقدي/.test(r.tiles[0]) && /بيع آجل/.test(r.tiles[1]) && /شراء نقدي/.test(r.tiles[2]) && /شراء آجل/.test(r.tiles[3]))+' (expect true)');
  log('cash sale: no customer list, only the pay method, invoice header: '+(await page.evaluate(()=>!document.getElementById('bkCust') && !!document.getElementById('bkSalePm') && /فاتورة بيع نقدي/.test(document.querySelector('.inv-head').textContent)))+' (expect true)');
  await page.fill('#bkQty','100'); await page.click('#bkSalePm [data-pm="bankily"]'); await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const s=state.brickSales[0]; return { t:s.total, paid:s.paid, pm:s.payMethod, name:s.customerName, box:brickCashBalance() }; });
  log('cash sale 100 × 150 = 15,000 into بنكيلي, no party: '+(r.t===15000 && r.paid && r.pm==='bankily' && r.name==='زبون نقدي' && r.box===15000)+' (expect true)');
  // بيع آجل
  await page.click('[data-bkpaid="0"]'); await page.waitForTimeout(250);
  r=await page.evaluate(()=>{ const party=document.querySelector('.inv-party'), modes=document.querySelector('.bk-modes'), cust=document.getElementById('bkCust'); return { party:!!cust && party.contains(cust), below:modes.getBoundingClientRect().bottom<=party.getBoundingClientRect().top, paidNow:document.getElementById('bkSalePaidNow').value, pmHidden:document.getElementById('bkSalePmWrap').style.display==='none', head:/فاتورة بيع آجل/.test(document.querySelector('.inv-head').textContent) }; });
  log('credit sale: the customer/supplier list is right under the buttons in the invoice, «دُفع الآن» starts at 0: '+(r.party && r.below && r.paidNow==='0' && r.pmHidden && r.head)+' (expect true)');
  await page.fill('#bkQty','100'); await page.click('#bkSaleSave'); await page.waitForTimeout(250);
  log('a credit sale without a customer is refused: '+(await page.evaluate(()=>state.brickSales.length===1))+' (expect true)');
  await page.selectOption('#bkCust','c:cu1'); await page.fill('#bkQty','100'); await page.fill('#bkSalePaidNow','4000'); await page.waitForTimeout(150);
  log('typing a partial payment shows the remaining 11,000 and the pay method: '+(await page.evaluate(()=>/11,000/.test(document.getElementById('bkSaleRem').textContent) && document.getElementById('bkSalePmWrap').style.display===''))+' (expect true)');
  await page.click('#bkSaleSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const s=state.brickSales[1]; return { t:s.total, pa:s.paidAmount, out:brickOut(s), party:s.customerName, box:brickCashBalance() }; });
  log('credit sale 15,000 to محمد, paid 4,000 now, 11,000 stays his debt: '+(r.t===15000 && r.pa===4000 && r.out===11000 && r.party==='محمد' && r.box===19000)+' (expect true)');
  // شراء نقدي
  await page.click('[data-bkbuy="1"]'); await page.waitForTimeout(250);
  log('cash purchase is here too: no supplier list, pay method only: '+(await page.evaluate(()=>!document.getElementById('bkPurParty') && !!document.getElementById('bkPurPm') && /فاتورة شراء نقدي/.test(document.querySelector('.inv-head').textContent)))+' (expect true)');
  await page.fill('#bkPurQty','2'); await page.fill('#bkPurCost','3000'); await page.waitForTimeout(80);
  log('invoice total shows 6,000 live: '+(await page.evaluate(()=>/6,000/.test(document.getElementById('bkPurTotal').textContent)))+' (expect true)');
  await page.click('#bkPurSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const p=state.brickPurchases[0]; return { t:p.total, paid:p.paid, sup:p.supplier, cem:brickMatStock('cement'), box:brickCashBalance() }; });
  log('cash purchase 2 خنشة × 3,000 = 6,000 paid from the box, cement +2: '+(r.t===6000 && r.paid && !r.sup && r.cem===2 && r.box===13000)+' (expect true)');
  // شراء آجل
  await page.click('[data-bkbuy="0"]'); await page.waitForTimeout(250);
  log('credit purchase: supplier list under the buttons, «دُفع الآن» 0: '+(await page.evaluate(()=>{ const s=document.getElementById('bkPurParty'); return !!s && document.querySelector('.inv-party').contains(s) && !!s.querySelector('option[value="s:su1"]') && document.getElementById('bkPurPaidNow').value==='0'; }))+' (expect true)');
  await page.fill('#bkPurQty','10'); await page.fill('#bkPurCost','3000'); await page.click('#bkPurSave'); await page.waitForTimeout(250);
  log('a credit purchase without a supplier is refused: '+(await page.evaluate(()=>state.brickPurchases.length===1))+' (expect true)');
  await page.selectOption('#bkPurParty','s:su1'); await page.fill('#bkPurQty','10'); await page.fill('#bkPurCost','3000'); await page.fill('#bkPurPaidNow','5000'); await page.waitForTimeout(100);
  log('remaining for him shows 25,000: '+(await page.evaluate(()=>/25,000/.test(document.getElementById('bkPurRem').textContent)))+' (expect true)');
  await page.click('#bkPurSave'); await page.waitForTimeout(300);
  r=await page.evaluate(()=>{ const p=state.brickPurchases[1]; return { t:p.total, pa:p.paidAmount, out:brickOut(p), sup:p.supplier, box:brickCashBalance(), list:document.querySelectorAll('.grid.orders .order').length }; });
  log('credit purchase 30,000 from the supplier, 5,000 paid, 25,000 owed: '+(r.t===30000 && r.pa===5000 && r.out===25000 && r.sup==='مورّد الإسمنت' && r.box===8000)+' (expect true)');
  log('the list beside shows the purchases: '+(r.list===2)+' (expect true)');
  log('no horizontal overflow at 390px: '+(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))+' (expect true)');
  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
