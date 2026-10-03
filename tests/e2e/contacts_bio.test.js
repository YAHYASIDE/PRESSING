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
  const lockVisible=()=>page.evaluate(()=>getComputedStyle(document.getElementById('lockScreen')).display!=='none');

  // Virtual fingerprint authenticator
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', { options:{ protocol:'ctap2', transport:'internal', hasResidentKey:true, hasUserVerification:true, isUserVerified:true, automaticPresenceSimulation:true } });

  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  await page.evaluate(()=>{ try{ localStorage.removeItem('sadaqa_bio'); localStorage.removeItem('sadaqa_session'); }catch(e){} });
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(1600);

  // ===== FINGERPRINT =====
  log('bio available:', await page.evaluate(()=>bioAvailable()));
  log('post-login offer banner shown:', await page.evaluate(()=>getComputedStyle(document.getElementById('bioOffer')).display!=='none'));
  await page.click('#bioOfferYes'); await page.waitForTimeout(800);
  const bio = await page.evaluate(()=>JSON.parse(localStorage.getItem('sadaqa_bio')||'null'));
  log('bio enabled for:', bio&&bio.u, '| role:', bio&&bio.r);
  // lock -> auto fingerprint prompt should log back in
  await page.evaluate(()=>lockNow()); await page.waitForTimeout(150);
  log('lock bio button visible:', await page.evaluate(()=>getComputedStyle(document.getElementById('lockBio')).display!=='none'));
  await page.waitForTimeout(1500);
  log('auto fingerprint unlocked:', !(await lockVisible()), '| role:', await page.evaluate(()=>currentRole));
  // lock again, use the button explicitly
  await page.evaluate(()=>{ lockNow(); }); await page.waitForTimeout(1500); // auto already tried once per lock? reset by unlock, so it auto-tries again
  if(await lockVisible()){ await page.click('#lockBio'); await page.waitForTimeout(1200); }
  log('button fingerprint unlocked:', !(await lockVisible()));
  // settings shows enabled + disable works
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(500);
  log('settings shows enabled:', /مفعّلة على هذا الجهاز/.test(await page.textContent('#bioAdmin')));
  await page.click('#bioOffBtn'); await page.waitForTimeout(300);
  log('disabled -> bio cleared:', await page.evaluate(()=>localStorage.getItem('sadaqa_bio')===null));
  await page.click('#setClose');

  // ===== SUPPLIERS =====
  await page.evaluate(()=>{ state.storeProducts=[{id:'p1',name:'صابون',buyPrice:100,sellPrice:150,stock:5,minStock:0,image:'data:image/jpeg;base64,AAAA',editedAt:iso(new Date())}]; state.suppliers=[]; state.storePurchases=[]; state.storeCash=[]; state.storeSales=[]; state.storeCustomers=[]; save(); render(); });
  await page.click('[data-tab="contacts"]'); await page.waitForTimeout(200);
  log('contacts head:', (await page.textContent('.screen-head h2')).trim());
  await page.click('[data-csub="suppliers"]'); await page.waitForTimeout(200);
  await page.fill('#spName','مورّد الصابون'); await page.fill('#spPhone','22334455'); await page.fill('#spCategory','منظفات');
  await page.click('#spSave'); await page.waitForTimeout(200);
  log('supplier added:', await page.evaluate(()=>state.suppliers.length));
  // unpaid purchase via store
  await page.click('[data-tab="store"]'); await page.click('[data-ssub="purchases"]'); await page.waitForTimeout(200);
  await page.fill('#purSupplier','مورّد الصابون'); await page.selectOption('#purProd','p1');
  await page.fill('#purQty','10'); await page.fill('#purCost','100'); await page.click('#purAdd'); await page.waitForTimeout(150);
  await page.uncheck('#purPaid'); await page.click('#purSave'); await page.waitForTimeout(250);
  const link = await page.evaluate(()=>{ const s=state.suppliers[0]; return { linked: state.storePurchases[0].supplierId===s.id, bal: supplierBalance(s), suppliers: state.suppliers.length }; });
  log('purchase linked to supplier:', link.linked, '| balance owed:', link.bal, '(expect 1000) | no duplicate supplier:', link.suppliers===1);
  await page.click('[data-tab="contacts"]'); await page.waitForTimeout(150);
  await page.click('[data-csub="suppliers"]'); await page.waitForTimeout(150);
  await page.click('[data-sp-pay]'); await page.waitForTimeout(200);
  await page.fill('#storePayAmt','600'); await page.click('#storePayOk'); await page.waitForTimeout(250);
  const after = await page.evaluate(()=>({ bal: supplierBalance(state.suppliers[0]), cash: cashboxBalance() }));
  log('after paying 600 -> balance:', after.bal, '(expect 400) | cashbox:', after.cash, '(expect -600)');
  await page.click('[data-sp-stmt]'); await page.waitForTimeout(200);
  log('supplier statement opens:', /كشف حساب مورّد/.test(await page.textContent('#receiptContent')));
  await page.click('#receiptClose');

  // ===== CUSTOMERS =====
  await page.evaluate(()=>{ const d=iso(new Date()); state.laundryOrders=[
      {id:'l1',no:'L1',customer:'أحمد',phone:'44556677',country:'222',type:'قميص',service:'كي',count:2,unit:100,price:200,status:'done',paid:true,paidDate:d,date:d},
      {id:'l2',no:'L2',customer:'أحمد',phone:'44556677',country:'222',type:'بنطلون',service:'كي',count:1,unit:150,price:150,status:'wash',paid:false,date:d},
      {id:'l3',no:'L3',customer:'سارة',phone:'33445566',country:'222',type:'فستان',service:'غسيل',count:1,unit:300,price:300,status:'wash',paid:false,date:d}];
    save(); render(); });
  await page.click('[data-csub="customers"]'); await page.waitForTimeout(200);
  log('detected customers from orders:', await page.evaluate(()=>detectedCustomers().map(d=>d.name).join(',')));
  await page.fill('#dcName','أحمد'); await page.fill('#dcPhone','44556677'); await page.click('#dcSave'); await page.waitForTimeout(200);
  const ca = await page.evaluate(()=>{ const c=state.storeCustomers.find(x=>x.name==='أحمد'); const a=customerActivity(c); return {orders:a.orders, spent:a.spent, due:a.due}; });
  log('أحمد activity -> orders:', ca.orders, '(2) spent:', ca.spent, '(200) due:', ca.due, '(150)');
  log('أحمد no longer in detected:', await page.evaluate(()=>!detectedCustomers().some(d=>d.phone==='44556677')));
  // duplicate phone blocked
  await page.fill('#dcName','نسخة'); await page.fill('#dcPhone','44556677'); await page.click('#dcSave'); await page.waitForTimeout(150);
  log('duplicate phone blocked:', await page.evaluate(()=>state.storeCustomers.length===1));
  // import سارة
  await page.click('[data-dc-import]'); await page.waitForTimeout(200);
  log('imported from orders:', await page.evaluate(()=>state.storeCustomers.map(c=>c.name).join(',')));
  await page.click('[data-dc-stmt]'); await page.waitForTimeout(200);
  log('customer statement opens:', /كشف حساب/.test(await page.textContent('#receiptContent')));
  await page.click('#receiptClose');

  // ===== SYNC FIX: local store data survives a stale remote =====
  const sync = await page.evaluate(()=>{
    const d=iso(new Date());
    state.storeSales.push({id:uid(),no:'SX',customerId:null,customerName:'نقدي',items:[],total:77,paidAmount:77,paid:true,date:d,editedAt:d});
    const n=state.storeSales.length;
    const remote=JSON.parse(JSON.stringify(cloudCopy())); remote.storeSales=[]; remote.suppliers=[]; remote.storePurchases=[];
    applyRemote(remote);
    return { salesKept: state.storeSales.length===n, suppliersKept: state.suppliers.length===1, purchasesKept: state.storePurchases.length===1, imageKept: !!(state.storeProducts[0]&&state.storeProducts[0].image) };
  });
  log('stale-remote merge keeps -> sales:', sync.salesKept, '| suppliers:', sync.suppliersKept, '| purchases:', sync.purchasesKept, '| product image:', sync.imageKept);

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
