/* tests/multibusiness.test.js — multi-business / multi-branch data isolation.
 *
 * Verifies the Business/Branch selector and, most importantly, that each
 * business is a fully isolated workspace: data created in one is never visible
 * in another. Drives the real UI (wizard + selector), not internal shortcuts.
 *
 * Run:  node tests/multibusiness.test.js
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');

const fail = [];
const ok = (cond, msg) => { if (!cond) fail.push(msg); };

async function configureActiveBusiness(p, name, custName) {
  await p.evaluate((d) => {
    startSetup();
    const dr = _setup.draft;
    dr.types = { carwash: true, carpet: false, laundry: true, 'oil-change': false, shop: false };
    dr.name = d.name;
    dr._mgrName = 'مدير'; dr._mgrPhone = '22334455'; dr._mgrCountry = '222'; dr._address = 'ع';
    dr._adminName = 'مدير النظام'; dr._username = 'admin'; dr._pass = '1234'; dr._confirm = '1234';
    finishSetup('dashboard');
  }, { name });
  await p.waitForTimeout(120);
  await p.evaluate((d) => {
    App.services.createCarWash({ vehicle: Object.keys(state.vehiclePrices)[0], plate: 'PLT', phone: '22000000', country: '222', wash: 'شامل', price: 250, dateStr: todayStr(), by: 'مدير', photosBefore: [], photosAfter: [] });
    App.services.crmSync();
    const c = App.core.crmCustomers()[0]; if (c) c.name = d.custName;
    saveLocal();
  }, { custName });
  await p.waitForTimeout(60);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_CONNECTION/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto(INDEX); await p.waitForTimeout(400);

  // Business A (first) — single business must auto-open, no selector
  await configureActiveBusiness(p, 'نشاط أ', 'زبون-أ');
  const a = await p.evaluate(() => ({
    count: App.repositories.businessCount(),
    selector: getComputedStyle(document.getElementById('bizSelector')).display !== 'none',
    switchBtn: getComputedStyle(document.getElementById('switchBizBtn')).display !== 'none',
    custs: App.core.crmCustomers().map(c => c.name),
  }));
  ok(a.count === 1, 'A: expected 1 business');
  ok(a.selector === false, 'A: selector must NOT show for a single business');
  ok(a.switchBtn === false, 'A: switch button hidden for single business');
  ok(a.custs.length === 1 && a.custs[0] === 'زبون-أ', 'A: customer seeded');

  // Add Business B -> wizard opens for the new workspace
  await p.evaluate(() => addBusinessFlow()); await p.waitForTimeout(150);
  ok(await p.$eval('#setupScreen', e => getComputedStyle(e).display !== 'none'), 'Add: wizard opens for new business');
  await configureActiveBusiness(p, 'نشاط ب', 'زبون-ب');

  const bState = await p.evaluate(() => ({
    count: App.repositories.businessCount(),
    switchBtn: getComputedStyle(document.getElementById('switchBizBtn')).display !== 'none',
    custs: App.core.crmCustomers().map(c => c.name),
    active: (state.business || {}).name,
  }));
  ok(bState.count === 2, 'B: expected 2 businesses');
  ok(bState.switchBtn === true, 'B: switch button now visible');
  ok(bState.active === 'نشاط ب', 'B: active business is B');
  // ISOLATION: B must see ONLY its own customer
  ok(bState.custs.length === 1 && bState.custs[0] === 'زبون-ب', 'ISOLATION: B sees only B\'s data');

  // Switch Business (header) -> selector shows both with type + role
  await p.evaluate(() => switchBusinessMenu()); await p.waitForTimeout(120);
  const sel = await p.evaluate(() => ({
    shown: getComputedStyle(document.getElementById('bizSelector')).display !== 'none',
    cards: [...document.querySelectorAll('.bz-card')].map(c => ({
      name: (c.querySelector('.bz-name') || {}).textContent,
      hasType: !!(c.querySelector('.bz-type') || {}).textContent,
      hasRole: !!(c.querySelector('.bz-role') || {}).textContent,
    })),
    lastHighlighted: document.querySelectorAll('.bz-card.last').length,
  }));
  ok(sel.shown, 'Switch: selector appears');
  ok(sel.cards.length === 2, 'Switch: both businesses listed');
  ok(sel.cards.every(c => c.hasType && c.hasRole), 'Switch: cards show business type + user role');
  ok(sel.lastHighlighted === 1, 'Switch: last-used business highlighted');

  // Select A -> only A's data loads (isolation the other direction)
  const aId = await p.evaluate(() => App.repositories.businessList().find(x => x.name === 'نشاط أ').id);
  await p.evaluate((id) => enterBusiness(id), aId); await p.waitForTimeout(120);
  const entered = await p.evaluate(() => ({
    active: (state.business || {}).name,
    custs: App.core.crmCustomers().map(c => c.name),
    selectorHidden: getComputedStyle(document.getElementById('bizSelector')).display === 'none',
  }));
  ok(entered.active === 'نشاط أ', 'Enter A: active is A');
  ok(entered.custs.length === 1 && entered.custs[0] === 'زبون-أ', 'ISOLATION: A sees only A\'s data');
  ok(entered.selectorHidden, 'Enter A: selector hides');

  // Remember last: reload -> active is the last-selected (A)
  await p.reload(); await p.waitForTimeout(500);
  const reload = await p.evaluate(() => ({
    activeId: App.repositories.activeBusinessId(),
    lastId: App.repositories.lastBusinessId(),
    loaded: (state.business || {}).name,
  }));
  ok(reload.activeId === aId && reload.lastId === aId, 'Remember: last-selected business restored on reload');
  ok(reload.loaded === 'نشاط أ', 'Remember: last business data loaded');

  await b.close();
  if (errs.length) fail.push('console/page errors: ' + errs.join(' | '));
  if (fail.length) { console.error('✗ MULTI-BUSINESS FAILED:'); fail.forEach(f => console.error('  - ' + f)); process.exit(1); }
  console.log('✓ MULTI-BUSINESS PASSED — selector, isolation (both directions), switch, and remember-last all verified.');
})();
