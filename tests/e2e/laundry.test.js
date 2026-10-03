const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(/i;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 850 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => { if (!IGNORE.test(e.message)) errors.push('PAGEERROR: ' + e.message); });

  const log = (...a) => console.log(...a);

  await page.goto('http://localhost:8123/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // login as owner
  await page.fill('#lockName', 'مالك تجريبي');
  await page.fill('#lockInput', '0707');
  await page.click('#lockEnter');
  await page.waitForTimeout(600);

  // go to laundry tab
  await page.click('[data-tab="laundry"]');
  await page.waitForTimeout(400);
  const head = await page.textContent('.screen-head h2').catch(()=>null);
  log('screen head:', head);

  // fill form: pick type بنطلون, service غسيل وكي
  await page.fill('#lndCust', 'زبون ملابس');
  await page.fill('#lndPhone', '22334455');
  // pick a type button (second one)
  await page.click('[data-lndtype="بنطلون"]');
  await page.selectOption('#lndService', 'غسيل وكي');
  await page.fill('#lndPrice', '150');
  await page.fill('#lndCount', '3');
  await page.waitForTimeout(200);
  const total = await page.textContent('#lndTotal');
  log('total (expect 450):', total);

  // save via hold (bindHold uses pointer events, 1000ms)
  const box = await page.$('#lndSave');
  const bb = await box.boundingBox();
  await page.mouse.move(bb.x + bb.width/2, bb.y + bb.height/2);
  await page.dispatchEvent('#lndSave', 'pointerdown', { pointerId: 1, bubbles: true });
  await page.waitForTimeout(1300);
  await page.dispatchEvent('#lndSave', 'pointerup', { pointerId: 1, bubbles: true });
  await page.waitForTimeout(500);

  let cards = await page.$$('.grid.orders .order');
  log('order cards after save (expect >=1):', cards.length);
  const cardText = cards.length ? await cards[0].textContent() : '';
  log('card text incl status/no:', cardText.replace(/\s+/g,' ').slice(0,160));

  // advance status: wash -> iron
  await page.click('[data-lnd-status]');
  await page.waitForTimeout(400);
  let st1 = await page.textContent('[data-lnd-status]');
  log('status button after 1 advance (expect → قيد الكي or جاهز):', st1.trim());

  // advance status: iron -> ready
  await page.click('[data-lnd-status]');
  await page.waitForTimeout(400);
  let st2 = await page.textContent('[data-lnd-status]');
  log('status button after 2 advances:', st2.trim());

  // pay
  await page.click('[data-lnd-pay]');
  await page.waitForTimeout(400);
  const payVisible = await page.isVisible('#payModal');
  log('pay modal visible:', payVisible);
  await page.click('#payOk');
  await page.waitForTimeout(400);
  const payBtnTxt = await page.textContent('[data-lnd-pay]');
  log('pay button after paying (expect إلغاء الدفع):', payBtnTxt.trim());

  // dashboard income
  await page.click('[data-tab="dashboard"]');
  await page.waitForTimeout(400);
  const dashText = await page.textContent('.screen');
  const hasLaundryInc = /ملابس/.test(dashText);
  log('dashboard mentions ملابس:', hasLaundryInc);

  // reports
  await page.click('[data-tab="reports"]');
  await page.waitForTimeout(400);
  const repText = await page.textContent('.screen');
  log('reports mentions مغسلة الملابس:', /مغسلة الملابس/.test(repText));
  log('reports mentions الملابس bar:', /الملابس/.test(repText));

  // receipt
  await page.click('[data-tab="laundry"]');
  await page.waitForTimeout(300);
  await page.click('[data-lnd-receipt]');
  await page.waitForTimeout(300);
  const rcptVisible = await page.isVisible('#receiptModal');
  const rcptText = await page.textContent('#receiptContent');
  log('receipt modal visible:', rcptVisible, '| mentions مغسلة الملابس:', /مغسلة الملابس/.test(rcptText));

  log('\n=== CONSOLE/PAGE ERRORS (filtered) ===');
  log(errors.length ? errors.join('\n') : 'NONE ✅');

  await browser.close();
})().catch(e => { console.error('TEST CRASH:', e); process.exit(1); });
