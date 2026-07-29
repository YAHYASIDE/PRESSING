/* build.js — production bundler for Washly.
 *
 * The app is a no-framework, classic-script SPA: ~53 JS files and ~20 CSS files
 * load in a fixed order and share a global `window.App` namespace plus bare
 * globals. This script concatenates them IN THAT ORDER into one JS + one CSS
 * file and minifies with esbuild.
 *
 * IMPORTANT: identifier minification is DISABLED. Top-level names are shared
 * across former file boundaries and are also referenced from inline onclick=
 * handlers inside HTML strings (which esbuild cannot see). Renaming them would
 * break the app. We only strip whitespace and simplify syntax — semantics are
 * preserved exactly.
 *
 * Output goes to dist/ with content-hashed filenames for safe cache-busting.
 *
 *   node build.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('esbuild');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- 1. extract ordered asset lists from index.html --------------------------
const cssHrefs = [...html.matchAll(/<link rel="stylesheet" href="(assets\/css\/[^"]+)">/g)].map(m => m[1]);
const jsSrcs = [...html.matchAll(/<script src="(assets\/js\/[^"]+)"><\/script>/g)].map(m => m[1]);
console.log(`Bundling ${jsSrcs.length} JS + ${cssHrefs.length} CSS files…`);

// ---- 2. concatenate in load order -------------------------------------------
const jsRaw = jsSrcs.map(s => `/* ${s} */\n` + fs.readFileSync(path.join(ROOT, s), 'utf8')).join('\n;\n');
const cssRaw = cssHrefs.map(h => `/* ${h} */\n` + fs.readFileSync(path.join(ROOT, h), 'utf8')).join('\n');

// ---- 3. minify (whitespace + syntax only; NEVER identifiers) -----------------
const jsMin = esbuild.transformSync(jsRaw, {
  loader: 'js', minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false,
  legalComments: 'none', target: 'es2019',
}).code;
const cssMin = esbuild.transformSync(cssRaw, { loader: 'css', minify: true }).code;

// ---- 4. content-hash for cache-busting --------------------------------------
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
const jsName = `app.${hash(jsMin)}.min.js`;
const cssName = `app.${hash(cssMin)}.min.css`;

// ---- 5. write dist/ ----------------------------------------------------------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'assets', jsName), jsMin);
fs.writeFileSync(path.join(DIST, 'assets', cssName), cssMin);

// ---- 6. rewrite index.html: 73 tags -> 2, add manifest + SW ------------------
let out = html;
// drop every bundled css link, then inject one before </head>
out = out.replace(/\s*<link rel="stylesheet" href="assets\/css\/[^"]+">/g, '');
out = out.replace('</head>', `<link rel="manifest" href="manifest.json">\n<link rel="stylesheet" href="assets/${cssName}">\n</head>`);
// drop every bundled script tag, then inject one + SW registration before </body>
out = out.replace(/\s*<script src="assets\/js\/[^"]+"><\/script>/g, '');
const swReg = `<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}</script>`;
out = out.replace('</body>', `<script src="assets/${jsName}"></script>\n${swReg}\n</body>`);
fs.writeFileSync(path.join(DIST, 'index.html'), out);

// ---- 7. static PWA assets (manifest + service worker + icons) ----------------
// Generate real install icons from the app logo. Chrome/Android only surface the
// install prompt when an icon is >=192px, so we upscale the 140px logo onto a
// padded brand-colour canvas at 192 and 512 (a "maskable" safe area for Android).
const sharp = require('sharp');
const stateSrc = fs.readFileSync(path.join(ROOT, 'assets/js/state.js'), 'utf8');
const logoMatch = stateSrc.match(/const LOGO = "data:image\/webp;base64,([A-Za-z0-9+/=]+)"/);
const icons = [];
async function makeIcons() {
  if (!logoMatch) return;
  const logo = Buffer.from(logoMatch[1], 'base64');
  for (const size of [192, 512]) {
    const pad = Math.round(size * 0.14);          // maskable safe area
    const inner = size - pad * 2;
    const resized = await sharp(logo).resize(inner, inner, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
    const name = `icon-${size}.png`;
    await sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
      .composite([{ input: resized, gravity: 'centre' }]).png().toFile(path.join(DIST, 'assets', name));
    icons.push({ src: `assets/${name}`, sizes: `${size}x${size}`, type: 'image/png', purpose: size === 512 ? 'any maskable' : 'any' });
  }
}

(async () => {
  await makeIcons();

  // manifest
  const manifest = {
    name: 'واشلي · Washly', short_name: 'واشلي', lang: 'ar', dir: 'rtl',
    description: 'منصّة إدارة الأعمال لغسيل السيارات والملابس والسجاد وتغيير الزيت والمتجر.',
    start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
    background_color: '#eef3f7', theme_color: '#12507c', icons,
  };
  fs.writeFileSync(path.join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // service worker: precache the app shell, cache-first for own-origin GETs.
  const CACHE = 'washly-v1-0-0';
  const shell = ['./', 'index.html', `assets/${jsName}`, `assets/${cssName}`, 'manifest.json'].concat(icons.map(i => i.src));
  const sw = `/* Washly service worker — offline app shell (generated by build.js) */
const CACHE='${CACHE}';
const SHELL=${JSON.stringify(shell)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url); if(u.origin!==self.location.origin) return; // let CDN font pass through
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
    if(res&&res.status===200){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}
    return res;
  }).catch(()=>caches.match('index.html'))));
});
`;
  fs.writeFileSync(path.join(DIST, 'sw.js'), sw);

  // ---- 8. report -------------------------------------------------------------
  const kb = n => (n / 1024).toFixed(1) + ' KB';
  console.log('\n✓ dist/ built');
  console.log(`  JS : ${jsSrcs.length} files -> ${jsName}  (${kb(Buffer.byteLength(jsRaw))} -> ${kb(Buffer.byteLength(jsMin))})`);
  console.log(`  CSS: ${cssHrefs.length} files -> ${cssName} (${kb(Buffer.byteLength(cssRaw))} -> ${kb(Buffer.byteLength(cssMin))})`);
  console.log(`  Requests for app code: ${jsSrcs.length + cssHrefs.length} -> 2`);
  console.log(`  PWA icons: ${icons.map(i => i.sizes).join(', ') || 'none'}`);
  console.log(`  + manifest.json, sw.js`);
})();
