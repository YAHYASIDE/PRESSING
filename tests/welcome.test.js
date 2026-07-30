/* tests/welcome.test.js — customer-facing welcome screen is the first view.
 *
 * Verifies the redesigned startup flow: on open the app shows the premium
 * welcome (business + services), NOT the employee login. Login is reached only
 * via the "Employee Login" button, and logout returns to the welcome.
 *
 * Run:  node tests/welcome.test.js
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');

const fail = [];
const ok = (c, m) => { if (!c) fail.push(m); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_CONNECTION/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto(INDEX); await p.waitForTimeout(400);

  // configure a business, then reload so we hit the normal "returning" startup
  await p.evaluate(() => {
    startSetup(); const d = _setup.draft;
    d.types = { carwash: true, carpet: true, laundry: true, 'oil-change': true, shop: true };
    d.name = 'مغسلة النور';
    d._mgrName = 'خالد'; d._mgrPhone = '22334455'; d._mgrCountry = '222'; d._address = 'ن';
    d._adminName = 'خالد'; d._username = 'khaled'; d._pass = '1234'; d._confirm = '1234';
    finishSetup('dashboard');
  });
  await p.waitForTimeout(150);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(500);

  // 1) first view is the WELCOME, not the login
  const open = await p.evaluate(() => ({
    welcome: getComputedStyle(document.getElementById('welcomeScreen')).display !== 'none',
    login: getComputedStyle(document.getElementById('lockScreen')).display !== 'none',
    cards: document.querySelectorAll('#welcomeBody .wc-card').length,
    name: /النور/.test((document.querySelector('.wc-name') || {}).textContent || ''),
    logo: !!document.querySelector('.wc-logo-ring img'),
    loginBtn: !!document.getElementById('welcomeLoginBtn'),
  }));
  ok(open.welcome, 'first view must be the welcome screen');
  ok(!open.login, 'login must NOT be the first screen');
  ok(open.cards === 5, 'welcome shows all 5 service cards');
  ok(open.name && open.logo, 'welcome shows business name + logo');
  ok(open.loginBtn, 'welcome has an Employee Login button');

  // 2) choosing a service shows a detail panel
  await p.click('#welcomeBody .wc-card[data-wc-svc="carwash"]'); await p.waitForTimeout(120);
  const chose = await p.evaluate(() => ({
    on: document.querySelectorAll('#welcomeBody .wc-card.on').length,
    detail: (document.getElementById('welcomeDetail') || {}).classList.contains('show'),
  }));
  ok(chose.on === 1 && chose.detail, 'choosing a service selects it and shows detail');

  // 3) Employee Login -> separate login screen (welcome hidden), with a back button
  await p.click('#welcomeLoginBtn'); await p.waitForTimeout(150);
  const toLogin = await p.evaluate(() => ({
    welcome: getComputedStyle(document.getElementById('welcomeScreen')).display !== 'none',
    login: getComputedStyle(document.getElementById('lockScreen')).display !== 'none',
    back: !!document.getElementById('lockBack'),
  }));
  ok(!toLogin.welcome && toLogin.login, 'Employee Login opens the separate login screen');
  ok(toLogin.back, 'login screen has a back-to-welcome control');

  // 4) back -> welcome again
  await p.click('#lockBack'); await p.waitForTimeout(120);
  ok(await p.$eval('#welcomeScreen', e => getComputedStyle(e).display !== 'none'), 'back returns to welcome');

  // 5) login -> app (single business, no selector)
  await p.click('#welcomeLoginBtn'); await p.waitForTimeout(120);
  await p.evaluate(() => { document.getElementById('lockName').value = 'خالد'; document.getElementById('lockInput').value = (state.lock || {}).pin; });
  await p.click('#lockEnter'); await p.waitForTimeout(200);
  const afterLogin = await p.evaluate(() => ({
    welcome: getComputedStyle(document.getElementById('welcomeScreen')).display !== 'none',
    login: getComputedStyle(document.getElementById('lockScreen')).display !== 'none',
    dash: !!document.querySelector('.screen'),
  }));
  ok(!afterLogin.welcome && !afterLogin.login && afterLogin.dash, 'login enters the app');

  // 6) logout -> back to WELCOME (not login)
  await p.click('#logoutBtn'); await p.waitForTimeout(150);
  const afterLogout = await p.evaluate(() => ({
    welcome: getComputedStyle(document.getElementById('welcomeScreen')).display !== 'none',
    login: getComputedStyle(document.getElementById('lockScreen')).display !== 'none',
  }));
  ok(afterLogout.welcome && !afterLogout.login, 'logout returns to the welcome screen, not the login');

  await b.close();
  if (errs.length) fail.push('console/page errors: ' + errs.join(' | '));
  if (fail.length) { console.error('✗ WELCOME FAILED:'); fail.forEach(f => console.error('  - ' + f)); process.exit(1); }
  console.log('✓ WELCOME PASSED — welcome-first startup, service selection, separate login, and logout-to-welcome all verified.');
})();
