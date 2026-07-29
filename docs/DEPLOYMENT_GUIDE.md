# Deployment Guide — Washly v1.0

Washly is a **static single-page application**. There is no server, no database
and no runtime dependencies. Any static web host works.

You can deploy in two ways:

- **Production bundle (recommended):** deploy the pre-built `dist/` folder — one
  minified JS + one minified CSS (72 asset requests collapsed to 2), plus a
  service worker and PWA manifest for offline use and install. This is what
  `DEPLOYMENT_REPORT.md` measures.
- **Source (dev / zero-tooling):** deploy the repository root and let the browser
  load the ~72 individual source files. Works identically; just slower on first
  load and without the service worker.

---

## 1. What you are deploying

**Production bundle** — build it, then deploy `dist/`:

```bash
npm install      # dev-only: esbuild + sharp (build tools)
npm run build    # writes dist/
```
```
dist/
  index.html                  # 2 asset refs + service-worker registration
  assets/app.<hash>.min.js     # all JS, bundled + minified, cache-busted
  assets/app.<hash>.min.css    # all CSS, bundled + minified, cache-busted
  assets/icon-192.png          # PWA icons (generated from the app logo)
  assets/icon-512.png
  manifest.json                # PWA manifest
  sw.js                        # service worker (offline app shell)
```

**Source** — the repository root:
```
index.html            # entry point (loads all CSS + JS in order)
assets/css/*.css       # stylesheets
assets/js/**/*.js       # application code (plain classic scripts; no bundler)
```

Nothing else is required at runtime. There are no environment variables, secrets
or API keys baked into the app.

> **Do not reorder or lazy-load the `<script>` tags in source `index.html`.** They
> are classic (non-module) scripts that publish onto a shared `window.App`
> namespace and must load in declared order (config → state → core → repositories
> → services → ui → pages → `app.js`). `build.js` preserves this order exactly and
> disables identifier minification so global names survive bundling.

---

## 2. Requirements

- **Serve over HTTPS.** The app uses the Web Audio, Fullscreen, Clipboard and
  FileReader APIs; browsers restrict some of these to secure contexts.
- **Modern evergreen browser** (Chrome/Edge/Safari/Firefox, last 2 versions).
  The UI is mobile-first and tested at 390px and 1280px widths.
- **No CORS/back-end config** — every asset is same-origin and relative.

---

## 3. Hosting options

### Option A — GitHub Pages (recommended for this repo)
1. Push `main` to GitHub.
2. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a
   branch*, Branch = `main`, Folder = `/ (root)`.
3. Wait for the Pages build; the site is served at
   `https://<owner>.github.io/<repo>/`.
4. Because the app uses **relative** asset paths, it works from a sub-path with
   no configuration.

Optional CI (drop-in) — `.github/workflows/pages.yml`:
```yaml
name: Deploy Pages
on: { push: { branches: [main] } }
permissions: { pages: write, id-token: write, contents: read }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deploy.outputs.page_url }}" }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-pages-artifact@v3
        with: { path: "." }
      - id: deploy
        uses: actions/deploy-pages@v4
```

### Option B — Netlify / Vercel / Cloudflare Pages
- New project → connect the repo → **no build command**, publish directory = `.`
  (repository root). Deploy.

### Option C — Nginx / Apache / any static server
```nginx
server {
  listen 443 ssl;
  root /var/www/washly;         # folder containing index.html
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```
Copy the repository contents into `root`. No rewrite rules beyond the SPA
fallback above are needed (the app has a single entry point).

### Option D — Local / kiosk (offline)
- Open `index.html` directly, or run `python3 -m http.server` in the repo folder.
- For a wall-mounted TV queue board, open the app, sign in, then tap
  **📺 شاشة العرض** in the Operations Center for fullscreen mode.

---

## 4. Air-gapped / fully-offline deployments

The only external request the app makes is the **Google Fonts** stylesheet in
`index.html`. It degrades gracefully to system fonts, but for a guaranteed
offline look:

1. Download the Tajawal font files.
2. Place them under `assets/fonts/` and add an `@font-face` block to
   `assets/css/base.css`.
3. Remove the three `fonts.googleapis.com` / `fonts.gstatic.com` `<link>` tags
   from `index.html`.

After this the app has **zero** third-party network dependencies.

---

## 5. First-run configuration

1. Load the site. The **setup wizard** starts automatically on a fresh install.
2. Choose activities, create the first **manager** user, and set the business
   name/logo.
3. Set the app unlock code and the meter code in **Settings** (do not ship with
   the defaults — see the production checklist).

---

## 6. Updating a live deployment

- Push the new commit; **re-run `npm run build`** and deploy the new `dist/`.
- **User data is untouched** by an update — it lives in the browser's
  localStorage, not in the deployed files. There is no migration downtime; the
  app runs idempotent store migrations on load.
- **Bundle updates propagate automatically.** Asset filenames are content-hashed,
  so a changed bundle is a new URL the browser must fetch. The service worker
  (`sw.js`) also changes each build, so browsers install the new worker, drop the
  old cache (`washly-v*`), and serve the new shell on the next load — no manual
  hard-refresh needed for bundle deployments.
- For **source** (unbundled) deployments there is no service worker; tell users to
  hard-refresh if a browser serves stale cached files.

---

## 7. Rollback

Because the deployment is just static files, rollback = redeploy the previous
commit. User data is version-tolerant (migrations only add stores, never drop
them), so moving back one release is safe.
