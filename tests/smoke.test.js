/* tests/smoke.test.js — canonical production smoke test.
 *
 * Loads the app from disk, completes setup, enables every feature module,
 * seeds data across all business types, then renders every tab and sub-screen
 * on both a mobile (390px) and desktop (1280px) viewport. Asserts ZERO
 * console/page errors throughout. Exits non-zero on any error so it can gate a
 * release.
 *
 * Run:  node tests/smoke.test.js
 * Requires Playwright + a Chromium build. In this repo's environment:
 *   PLAYWRIGHT_BROWSERS_PATH is preconfigured; just `node tests/smoke.test.js`.
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const viewports = [
    { vp: { width: 390, height: 844 }, label: 'mobile' },
    { vp: { width: 1280, height: 800 }, label: 'desktop' },
  ];

  for (const V of viewports) {
    const p = await b.newPage({ viewport: V.vp });
    p.on('pageerror', e => errs.push(`[${V.label}] PAGEERR ` + e.message));
    p.on('console', m => {
      if (m.type() === 'error' && !/ERR_CONNECTION_RESET|favicon/.test(m.text()))
        errs.push(`[${V.label}] CONSOLE ` + m.text());
    });

    await p.goto(INDEX); await p.waitForTimeout(400);

    // complete the setup wizard for a multi-activity business
    await p.evaluate(() => {
      startSetup(); _setup.i = 1;
      _setup.draft._mgrName = 'مدير'; _setup.draft._mgrPhone = '22112233'; _setup.draft._mgrPass = '1234';
      _setup.draft.name = 'مغسلة الاختبار';
      _setup.draft.types = { 'car-wash': true, 'carpet': true, 'laundry': true, 'oil-change': true, 'shop': true };
      finishSetup('dashboard');
    });
    await p.waitForTimeout(200);

    // enable every optional feature module so all UI paths render
    await p.evaluate(() => {
      (App.config.FEATURE_MODULES || []).forEach(f => {
        state.business.features = state.business.features || {};
        state.business.features[f.key] = true;
      });
      if (typeof saveLocal === 'function') saveLocal();
    });

    // seed data across POS, CRM, operations, membership + packages
    await p.evaluate(() => {
      state.dateFrom = '1970-01-01'; state.dateTo = ymd(new Date());
      const veh = Object.keys(state.vehiclePrices)[0];
      const w = App.services.createCarWash({ vehicle: veh, plate: '1234', phone: '22556677', country: '222', wash: 'شامل', price: 250, dateStr: todayStr(), by: 'مدير', photosBefore: [], photosAfter: [] });
      App.services.setCarStage({ id: w.op.id, stage: 'washing' });
      App.services.crmSync();
      const c = App.core.crmCustomers()[0];
      if (App.services.buyMembership) App.services.buyMembership(c.id, 'gold');
      if (App.services.buyPackage) App.services.buyPackage(c.id, 'w10');
    });

    // every primary tab
    const tabs = ['dashboard', 'pos', 'cars', 'crm', 'carpets', 'expenses', 'reports', 'accounting', 'inventory'];
    const seen = {};
    for (const t of tabs) {
      await p.evaluate((tab) => { state.tab = tab; state.opDetail = null; state.crmSel = null; render(); }, t);
      await p.waitForTimeout(200);
      seen[t] = await p.$$eval('.screen', e => e.length > 0);
    }

    // sub-screens: op detail, CRM profile tabs, report tabs, accounting tabs, subscription
    await p.evaluate(() => { state.tab = 'cars'; state.opDetail = state.carOps[0].id; render(); }); await p.waitForTimeout(150);
    await p.evaluate(() => { state.opDetail = null; state.tab = 'crm'; state.crmSel = App.core.crmCustomers()[0].id; render(); }); await p.waitForTimeout(150);
    for (const s of ['timeline', 'vehicles', 'membership', 'info']) { await p.evaluate((x) => { state.crmTab = x; render(); }, s); await p.waitForTimeout(100); }
    await p.evaluate(() => { state.crmSel = null; state.tab = 'reports'; render(); }); await p.waitForTimeout(120);
    for (const rt of await p.$$eval('[data-rep-tab]', els => els.map(e => e.getAttribute('data-rep-tab')))) { await p.evaluate((r) => { state.repTab = r; render(); }, rt); await p.waitForTimeout(100); }
    await p.evaluate(() => { state.tab = 'accounting'; render(); }); await p.waitForTimeout(120);
    for (const at of await p.$$eval('[data-acc-tab]', els => els.map(e => e.getAttribute('data-acc-tab')))) { await p.evaluate((a) => { state.accTab = a; render(); }, at); await p.waitForTimeout(100); }
    await p.evaluate(() => { state.tab = 'subscription'; render(); }); await p.waitForTimeout(120);

    // fullscreen TV queue board
    await p.evaluate(() => openQueueDisplay()); await p.waitForTimeout(250);
    await p.evaluate(() => closeQueueDisplay()); await p.waitForTimeout(100);

    // settings modal
    await p.evaluate(() => { if (typeof openSettings === 'function') openSettings(); }); await p.waitForTimeout(120);

    const missing = tabs.filter(t => !seen[t]);
    if (missing.length) errs.push(`[${V.label}] tabs failed to render: ${missing.join(', ')}`);
    console.log(`[${V.label}] all ${tabs.length} tabs + sub-screens rendered`);
    await p.close();
  }

  await b.close();
  if (errs.length) {
    console.error(`\n✗ SMOKE FAILED — ${errs.length} error(s):`);
    errs.forEach(e => console.error('  ' + e));
    process.exit(1);
  }
  console.log('\n✓ SMOKE PASSED — every page renders on mobile + desktop with zero console errors.');
})();
