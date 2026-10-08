// 2.17.0 — الإعدادات بملء الشاشة مع شريط أيقونات: كل أيقونة تعرض الأقسام المتشابهة فقط، وتذكّر آخر تبويب.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IGNORE = /gstatic|firebase|firestore|cloud|net::|Failed to load|ERR_|favicon|CONNECT|installations|BloomFilter|Fetch API|Access-Control|CORS|the server responded|400 \(|403 \(|wa\.me/i;
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:400,height:820} })).newPage();
  const errors=[]; page.on('console',m=>{ if(m.type()==='error'&&!IGNORE.test(m.text())) errors.push('C:'+m.text()); });
  page.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errors.push('P:'+e.message); });
  page.on('dialog', d=>d.accept());
  const log=(...a)=>console.log(...a);
  await page.goto('http://localhost:8123/index.html',{waitUntil:'load'}); await page.waitForTimeout(1200);
  if(await page.isVisible('#lockSwitch')) await page.click('#lockSwitch');
  await page.fill('#lockName','مالك'); await page.fill('#lockInput','0707'); await page.click('#lockEnter'); await page.waitForTimeout(400);
  await page.evaluate(()=>{ try{ localStorage.removeItem('sadaqa_settings_tab'); }catch(e){} openSettings(); }); await page.waitForTimeout(600);

  const vis=async(sel)=>page.isVisible(sel);
  log('settings opens on the app tab by default: '+(await page.evaluate(()=>document.getElementById('settingsModal').classList.contains('stab-app') && document.querySelector('#stabs .stab.on').dataset.stab==='app'))+' (expect true)');
  log('6 icon tabs present: '+((await page.$$('#stabs .stab')).length===6)+' (expect true)');
  log('full screen on phone: '+(await page.evaluate(()=>{ const r=document.querySelector('#settingsModal .modal-box').getBoundingClientRect(); return Math.round(r.width)===window.innerWidth && Math.round(r.height)===window.innerHeight; }))+' (expect true)');
  log('app tab shows update + health, hides backups: '+((await vis('#btnUpdate')) && (await vis('#healthAdmin')) && !(await vis('#backupAdmin')) && !(await vis('#tgFields')))+' (expect true)');
  log('every section is assigned to a tab: '+(await page.evaluate(()=>[...document.querySelectorAll('#settingsModal .modal-box>.set-sec')].every(s=>!!s.dataset.stab)))+' (expect true)');

  await page.click('#stabs [data-stab="backup"]'); await page.waitForTimeout(300);
  log('backup tab groups daily backups, 5-min snapshots, Drive, storage, export: '+((await vis('#backupAdmin')) && (await vis('#snapAdmin')) && (await vis('#driveAdmin')) && (await vis('#storageAdmin')) && (await vis('#btnExport')) && !(await vis('#btnUpdate')))+' (expect true)');
  await page.click('#stabs [data-stab="accounts"]'); await page.waitForTimeout(300);
  log('accounts tab: lock pin, workers, managers, biometric: '+((await vis('#lockPinSet')) && (await vis('#mgrCreate')) && !(await vis('#backupAdmin')))+' (expect true)');
  await page.click('#stabs [data-stab="prices"]'); await page.waitForTimeout(300);
  log('prices tab: catalog + tariff: '+((await vis('#tarElecSet')) && (await vis('#catalogAdmin')) && !(await vis('#lockPinSet')))+' (expect true)');
  await page.click('#stabs [data-stab="msgs"]'); await page.waitForTimeout(300);
  log('messages tab: templates + receipt: '+((await vis('[data-msgtpl="debt"]')) && !(await vis('#catalogAdmin')))+' (expect true)');
  await page.click('#stabs [data-stab="alerts"]'); await page.waitForTimeout(300);
  log('alerts tab: telegram + overdue: '+((await vis('#tgUnlock')) && !(await vis('[data-msgtpl="debt"]')))+' (expect true)');
  log('save/close bar still present: '+((await vis('#setSave')) && (await vis('#setClose')))+' (expect true)');

  // يتذكّر آخر تبويب
  await page.click('#setCloseTop'); await page.waitForTimeout(200);
  log('top close works: '+!(await vis('#settingsModal'))+' (expect true)');
  await page.evaluate(()=>openSettings()); await page.waitForTimeout(400);
  log('reopen restores last tab (alerts): '+(await page.evaluate(()=>document.querySelector('#stabs .stab.on').dataset.stab==='alerts'))+' (expect true)');
  // عرض الكل (للاختبارات/البحث)
  await page.evaluate(()=>settingsTab('all')); await page.waitForTimeout(200);
  log('all view shows every section: '+((await vis('#backupAdmin')) && (await vis('#btnUpdate')) && (await vis('#tgUnlock')))+' (expect true)');
  await page.click('#setClose');

  log('\nERRORS:', errors.length?errors.join('\n'):'NONE ✅');
  await browser.close();
})().catch(e=>{console.error('CRASH',e);process.exit(1);});
