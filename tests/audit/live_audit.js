// 🔎 فاحص الأخطاء — يفحص التطبيق على البيانات الحقيقية دون أن يكتب شيئًا في السحابة.
// الاستعمال:  node tests/audit/live_audit.js [--file data.json] [--out DIR] [--width 360]
//   بلا --file: يقرأ appState/main من Firestore (قراءة فقط). كل طلبات Firestore من الصفحة تُمنع، و save() معطّل.
// المخرجات: تقرير عربي على الشاشة + audit.json في DIR (لا تضعه في المستودع: فيه أسماء الزبائن).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', process.env.AUDIT_OUT || '/tmp'), W = +arg('--width', 360);
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me|telegram|googleapis/i;
(async () => {
  let data;
  if (arg('--file')) data = JSON.parse(fs.readFileSync(arg('--file'), 'utf8'));
  else {
    const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8'), pid = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
    const d = await (await fetch(`https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/appState/main`)).json();
    if (!d.fields) { console.error('تعذّرت قراءة البيانات من Firestore:', JSON.stringify(d).slice(0, 300)); process.exit(2); }
    data = JSON.parse(d.fields.data.stringValue);
  }
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: W, height: 800 } })).newPage();
  const errs = []; let where = 'load';
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push({ where, t: m.text() }); });
  page.on('pageerror', e => { if (!IGNORE.test(e.message)) errs.push({ where, t: e.message }); });
  page.on('dialog', d => d.dismiss());
  await page.route('**/*firestore*/**', r => r.abort()); await page.route('**/*googleapis*/**', r => r.abort());
  await page.goto('http://localhost:8123/index.html', { waitUntil: 'load' }); await page.waitForTimeout(1200);
  if (await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName', 'مالك'); await page.fill('#lockInput', '0707'); await page.click('#lockEnter'); await page.waitForTimeout(500);
  const ver = await page.evaluate(R => { Object.assign(state, R); runMigrations(); window.save = () => {}; window.cloudPush = () => {}; _unsyncedSince = 0; render(); return APP_VERSION; }, data);
  // 1) الأرقام والسجلات
  const audit = await page.evaluate(() => auditChecks());
  // 2) كل الشاشات: أخطاء، تجاوز أفقي، NaN/undefined، أرقام عربية، تواريخ ISO ظاهرة
  const screens = await page.evaluate(() => {
    const L = [['dashboard'], ['cars'], ['laundry'], ['carpets'], ['reports'], ...BRICK_SUBS.map(s => ['brick', 'brickSub', s.k]),
      ...['pos', 'products', 'debts', 'customers', 'cashbox'].map(k => ['store', 'storeSub', k]), ...['debts', 'suppliers', 'customers'].map(k => ['contacts', 'contactsSub', k]),
      ...['general', 'storemat', 'meters', 'workers', 'daily'].map(k => ['expenses', 'expSub', k])];
    state.dateFrom = '1970-01-01'; state.dateTo = ymd(new Date());
    return L.map(([tab, sk, sv]) => ({ tab, sk, sv }));
  });
  const found = [];
  for (const s of screens) {
    where = s.tab + (s.sv ? '▸' + s.sv : '');
    const r = await page.evaluate(s => { try { state.tab = s.tab; if (s.sk) state[s.sk] = s.sv; render(); } catch (e) { return { crash: e.message }; }
      const m = document.getElementById('main'), t = m.innerText, over = [...m.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > innerWidth + 2 || b.left < -2) && !e.closest('.tbl-wrap,.tbl,.seg,.chips,.inner-seg'); }).length;
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1, over, nan: /NaN|undefined|\[object Object\]/.test(t) ? (t.match(/.{0,30}(NaN|undefined|\[object Object\]).{0,30}/) || [''])[0] : '', arabicDigits: /[٠-٩]/.test(t), iso: (t.match(/\b20\d\d-\d\d-\d\d\b/) || [''])[0] }; }, s);
    if (r.crash) found.push({ lvl: 'err', where, t: 'الشاشة لا تُفتح', d: r.crash });
    else { if (r.overflow) found.push({ lvl: 'warn', where, t: 'الشاشة تنزاح أفقيًا على عرض ' + W, d: r.over + ' عنصر خارج العرض' });
      if (r.nan) found.push({ lvl: 'err', where, t: 'نص غير صالح ظاهر (NaN/undefined)', d: r.nan.trim() });
      if (r.arabicDigits) found.push({ lvl: 'warn', where, t: 'أرقام عربية ظاهرة (٠-٩)', d: '' });
      if (r.iso) found.push({ lvl: 'warn', where, t: 'تاريخ بصيغة ISO ظاهر', d: r.iso }); }
  }
  // 3) كل الكشوف تُفتح بلا خطأ
  where = 'الكشوف';
  const st = await page.evaluate(() => { const bad = []; const tryIt = (n, f) => { try { f(); const t = document.getElementById('receiptContent').innerText; if (/NaN|undefined/.test(t)) bad.push(n + ': NaN/undefined في الكشف'); } catch (e) { bad.push(n + ': ' + e.message); } };
    storeParties().forEach(P => tryIt('متجر «' + P.name + '»', () => openPartyStatement(P.key)));
    (state.storeCustomers || []).forEach(c => tryIt('زبون «' + c.name + '»', () => openDirStatement(c)));
    (state.suppliers || []).forEach(s => tryIt('مورّد «' + s.name + '»', () => openSupplierStatement(s)));
    brickParties().forEach(x => tryIt('دبو «' + x.name + '»', () => openBrickStatement(x.type, x.id)));
    (state.brickPorters || []).forEach(p => tryIt('عامل دبو «' + p.name + '»', () => openPorterStatement(p.id)));
    (state.workers || []).forEach(w => tryIt('عامل «' + w.name + '»', () => openWorkerStatement(w.id)));
    document.getElementById('receiptModal').style.display = 'none'; return bad; });
  st.forEach(t => found.push({ lvl: 'err', where: 'الكشوف', t: 'كشف لا يعمل', d: t }));
  // 4) الإعدادات كلها
  where = 'الإعدادات';
  await page.evaluate(() => { try { openSettings('all'); } catch (e) {} }); await page.waitForTimeout(300);
  await page.evaluate(() => { const m = document.getElementById('settingsModal'); if (m) m.style.display = 'none'; });
  errs.forEach(e => found.push({ lvl: 'err', where: e.where, t: 'خطأ في الكونسول', d: e.t.slice(0, 200) }));
  const all = [...audit.issues.map(x => ({ lvl: x.lvl, where: x.area, t: x.t, d: x.d })), ...found];
  const nE = all.filter(x => x.lvl === 'err').length, nW = all.length - nE;
  console.log(`🔎 فاحص الأخطاء — الإصدار ${ver} — ${new Date().toISOString().slice(0, 16)}`);
  console.log(`فحوص الحسابات: ${audit.n} (سليم ${audit.ok.length}) · شاشات: ${screens.length} · عرض ${W}px`);
  console.log(nE || nW ? `❌ ${nE} خطأ · ⚠️ ${nW} تنبيه` : '✅ لا أخطاء');
  all.forEach(x => console.log(`${x.lvl === 'err' ? '❌' : '⚠️'} [${x.where}] ${x.t}${x.d ? ' — ' + x.d : ''}`));
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify({ ver, at: new Date().toISOString(), audit, found: all }, null, 1));
  await browser.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });
