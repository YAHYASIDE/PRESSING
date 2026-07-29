# Deployment Report — Washly v1.0.0

**Artifact:** `dist/` (static bundle) · **Version:** `1.0.0`
**Verified:** headless Chromium (Chrome engine) over `http://localhost` serving `dist/`.
**Method:** automated Playwright harness (`build.js` produces `dist/`; the harness
loads it over HTTP, exercises every page, and measures real browser metrics).

> Reproduce: `npm install && npm run build && npm run serve`, then load the served
> URL. The verification harness used for this report is in the project scratchpad.

---

## Summary

| Area | Result |
|---|---|
| Production bundle built | ✅ 72 asset requests → **2** |
| Every asset loads (no 4xx/5xx) | ✅ 0 bad responses |
| Debug logs removed | ✅ none present (source **and** bundle) |
| Development helpers removed | ✅ none present |
| Cache strategy | ✅ service worker precaches shell, cache-first |
| Offline behavior | ✅ reload while offline boots + renders, data intact |
| Backup / restore | ✅ round-trips; ledger stays balanced |
| Install (PWA) criteria | ✅ valid manifest + 192/512 icons + controlling SW |
| Printing | ✅ chrome hidden, printable region shown |
| Responsive layout | ✅ 390px & 1280px; **0px** horizontal overflow |
| First-load performance | ✅ FCP 240 ms, LCP 516 ms (see caveat) |
| Console errors (all pages, both viewports) | ✅ 0 |

---

## 1. Production bundle

`build.js` concatenates the app's **53 JS** and **19 CSS** files *in their exact
`index.html` load order* into one JS + one CSS file, minified with esbuild
(whitespace + syntax only — identifier renaming is **disabled** because the
classic-script architecture shares global names across files and inline
`onclick=` handlers, which a renamer would break). Filenames are content-hashed
for safe cache-busting, and a `manifest.json` + service worker are emitted.

```
dist/
  index.html                 (2 asset refs instead of 72; + SW registration)
  assets/app.<hash>.min.js    bundled + minified JS
  assets/app.<hash>.min.css   bundled + minified CSS
  assets/icon-192.png         PWA icon (from the app logo)
  assets/icon-512.png         PWA icon, maskable
  manifest.json               PWA manifest
  sw.js                       service worker (offline shell)
```

## 2. Size & request measurements (task 12)

Over-the-wire is what matters; a real host (GitHub Pages, nginx, Cloudflare)
gzips automatically. Both raw and gzip shown.

| Asset | Before (source) | After (bundle) |
|---|---|---|
| **JS requests** | 53 files | **1** |
| **CSS requests** | 19 files | **1** |
| **App-code requests** | **72** | **2** |
| **Total JS** (raw) | 445.6 KB | 438.6 KB |
| **Total JS** (gzip, on the wire) | 178.0 KB | **159.7 KB** |
| **Total CSS** (raw) | 119.8 KB | 100.4 KB |
| **Total CSS** (gzip, on the wire) | 25.0 KB | **18.9 KB** |
| **App code, gzip total** | ~203 KB / 72 requests | **~178.6 KB / 2 requests** |

Notes:
- ~33 KB of the JS is base64-embedded WebP seed imagery (logo + category
  thumbnails) — incompressible, which is why raw JS gzips only to ~160 KB.
- The dominant real-world win is **72 → 2 requests**: on mobile networks each
  request costs a round-trip, so collapsing 72 into 2 removes seconds of
  connection latency on first load. Minification additionally cut ~18 KB gzip
  off JS and ~6 KB off CSS.

## 3. Loading performance (tasks 11, 13)

Measured on the served bundle in headless Chromium:

| Metric | Value |
|---|---|
| **First Paint** | **240 ms** |
| **First Contentful Paint** | **240 ms** |
| **Largest Contentful Paint** | **516 ms** |
| DOMContentLoaded | 194 ms |
| `load` event | ~12.8 s — **see caveat** |

**Optimization applied:** the Google Fonts stylesheet was made
**non-render-blocking** (`media="print"` + `onload` swap, with a `<noscript>`
fallback). Before this change first paint was **~12.9 s** in this environment
because the render-blocking font `<link>` stalled paint; after, first paint is
**240 ms**. Text paints immediately in the system fallback stack
(`Segoe UI, Tahoma, Arial`) and upgrades to Tajawal when the font arrives.

**Caveat on `load` (honest):** the ~12.8 s `load` event is an artifact of this
test environment's outbound proxy delaying the cross-origin font fetch. It does
**not** block paint or interactivity (FCP/LCP above are unaffected). On a normal
network the font resolves in well under a second and `load` follows FCP closely.
For a guaranteed-fast, fully-offline install, self-host the font (see the
deployment guide) — the app already degrades cleanly without it.

## 4. Asset loading (task 2)

Every request during a cold load returned a success status — **0 responses ≥
400**. With the bundle the app boots from **4 total requests** (document + 1 JS +
1 CSS + the async font). The lone `ERR_CONNECTION_RESET` observed in this
environment is the proxy resetting the cross-origin font and is non-fatal
(system-font fallback).

## 5. Cache strategy & offline (tasks 5, 6)

- **Service worker registers and controls the page** (`navigator.serviceWorker.controller` set after first load).
- **Precache:** the SW `install` step caches the app shell (index, bundled JS/CSS,
  manifest, both icons) — **7 entries** confirmed in the cache.
- **Runtime:** cache-first for same-origin GETs, network fallback that repopulates
  the cache; the cross-origin font is intentionally passed through (never cached),
  so offline simply uses the system font.
- **Offline reload test:** with the network forced offline, a full reload **boots
  the app, renders a screen, and preserves previously entered data** (a seeded
  operation survived) with **zero page errors**.

## 6. Backup / restore (task 7)

Automated round-trip: created an operation → exported state JSON → wiped all data
(1 → 0 records) → imported the JSON (0 → 1) → the specific record returned. After
restore, **Trial Balance debits = credits** and the **Balance Sheet balances** —
the financial ledger restored consistently. See `docs/BACKUP_RECOVERY.md`.

## 7. Printing (task 9)

Emulating print media with the app's print flow active: the header and side nav
are hidden and only the printable region (receipt/report/document) remains
visible; dedicated `@media print` rules are present. "Save as PDF" from the
browser print dialog is the supported PDF path and produces a clean document.

## 8. Responsive layout (task 10)

Every page and sub-screen renders on **390 px (mobile)** and **1280 px
(desktop)** with **0 console errors**. Mobile shows **0 px horizontal overflow**
(no sideways scroll). RTL layout holds on both.

## 9. Debug logs & dev helpers (tasks 3, 4)

Audited source and the built bundle: **no** `console.log/debug/info/warn/trace`,
**no** `debugger`, **no** debug globals or backdoors. The only `confirm()` is the
intentional "wipe all data" safety prompt. Nothing to remove — hygiene was already
clean from the RC1 pass.

## 10. Installation (task 8) — scope & honesty

The app meets **PWA installability criteria**, verified in Chromium:
- `manifest.json` linked and valid: `name`, `short_name`, `start_url`, `scope`,
  `display: standalone`, theme/background colors.
- Icons **192×192** and **512×512** (maskable), generated from the app logo,
  served with `200 image/png`. (The source logo is 140 px; the build upscales it
  onto a padded brand canvas so Chrome/Android will surface the install prompt.)
- A **registered, controlling service worker** with an offline fallback.
- Served from a **secure context** (HTTPS in production; `localhost` here).

**Not performed:** installation on physical **Chrome / Edge / Android** hardware —
that requires real devices this environment does not have. Edge and Android Chrome
share the same Chromium engine and installability rules verified here, so the
criteria hold, but a final manual "Add to Home Screen" on a real handset is left
as a pre-launch confirmation step in `PRODUCTION_CHECKLIST.md`.

---

## Recommendations before public launch

1. **Self-host the Tajawal font** to remove the only third-party request and make
   the installed PWA fully offline with correct typography (see deployment guide).
2. **Do a physical install pass** on one Android phone + desktop Edge/Chrome to
   confirm the home-screen icon and standalone window look right.
3. **Serve over HTTPS with gzip/brotli** (default on GitHub Pages/Netlify/CDNs) —
   the numbers above assume gzip.
4. **Keep `dist/` regenerated** (`npm run build`) whenever source changes; the
   content-hashed filenames guarantee clients pick up new code.

## Verdict

The bundle is deployable. All automated deployment-quality checks pass: single
clean build, no dead/debug code, fast first paint, working offline shell,
verified backup/restore, correct print output, responsive with no overflow, and
valid PWA install criteria. Remaining items are the physical-device install pass
and optional font self-hosting — both documented and gated in the checklist.
