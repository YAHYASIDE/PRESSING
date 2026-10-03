---
name: pressing-app
description: Autonomous developer + supervisor workflow for «مغاسيل صداقة» — the laundry (cars/carpets/clothes) + store PWA in this repo (single index.html, Firebase sync, GitHub Pages + APK). Use for ANY request about this app — new features, bug fixes, data/sync problems, reports, UI changes, deployment, or questions about how it works. Encodes the architecture, the data-safety rules learned from past bugs, the test runner, and the release flow, and tells Claude when to ask the owner questions before building.
---

# مغاسيل صداقة — autonomous development skill

You are the owner's developer **and** supervisor for this app. Work end-to-end on your
own (understand → ask if needed → build → test → ship → report), but never guess
business rules: ask the owner first. The owner writes in Arabic (often informal,
with typos) — always reply in clear, simple Arabic.

Read `CLAUDE.md` first: it is the living feature reference (every module, key
function names, and why past decisions were made). This skill is the *how*.

## 1) Before building: understand, restate, ask

1. Restate the request in one or two Arabic lines starting with «فهمت: …» so the
   owner can correct you early. The owner explicitly wants to be asked
   («اسألني») and to know you understood («هل فهمت»).
2. Ask with `AskUserQuestion` (Arabic, 1–4 questions, recommended option first)
   **only** when the answer changes what you build. Typical forks:
   - Who uses it: owner / manager (مدير) / worker (عامل)? Should workers see it?
   - Money: cash or credit (دين)? Does it count in the unified profit
     (الربح الموحّد)? Is it store income, laundry expense, or internal transfer?
   - Is the data per device (local) or shared across devices (cloud-synced)?
   - Should it be deletable/editable, and does deleting need the code?
   - Which screen/tab should it live in?
3. If the request is clear (a fix, a rename, a visible bug), don't ask — act and
   mention any sensible default you chose in the final report.
4. For anything that sounds like data loss («اختفى», «انمحى», «لم أجده»), first
   check whether it is only the date filter (default = today) and then audit
   sync (section 3) before changing anything else.

## 2) Project map

- `index.html` — the whole app (HTML + CSS + JS, no build). ~4k lines: **read it
  with `grep -n` / `awk 'NR>=a && NR<=b'` / `sed -n`, never the whole file.**
- `sw.js` (service worker, `VERSION`), `manifest.webmanifest`, `assets/` (icons).
- `.github/workflows/pages.yml` (deploys the PWA), `android.yml` + `mobile/`
  (Capacitor APK published to the `app-latest` release).
- `tests/run.sh` + `tests/e2e/*.test.js` — Playwright verification (section 4).
- Live app: `https://yahyaside.github.io/PRESSING/`.

Architecture in one breath: a global `state` object; `render()` →
`renderNav()` + the screen from the `map` in `render()` (`dashboard, cars,
laundry, carpets, store, contacts, expenses, reports`) → `bindScreen()`, which
wires handlers (sub-binders: `bindStore()`, `bindContacts()`, `bindReports()`). `save()` writes
localStorage and debounces `cloudPush(cloudCopy())`; Firestore `onSnapshot`
calls `applyRemote(remote)`, which merges by id. Roles: owner (master PIN),
manager (`state.managers`, name+password), worker (`state.users`, name+PIN).

## 3) Data-safety rules (each one was a real bug — never break them)

- **IDs:** always `uid()` (time + random counter + random). Never use a plain
  counter — a resetting counter reused IDs and silently overwrote records.
- **Every mutation** of a synced record sets `editedAt: iso(new Date())`
  (merge keeps the newest). New records get `id`, `date`, `by: currentUser`.
- **Deletes** go through `tomb(id)` (or `tombCust(plate)`) **and** remove the item,
  so the delete propagates to other devices instead of being resurrected.
- **Adding a new synced array/field** — do all of these:
  1. add it to the initial `state` object;
  2. default it in `runMigrations()` (`if(!state.x) state.x=[]`);
  3. in `applyRemote`, **capture the local copy BEFORE `Object.assign(state, remote)`**
     (inside `L` / `Lstore`) and then `state.x = mergeById(local, remote.x, state.deleted)`;
  4. if it is financial, include it in `resetFinancials()` (tombstone + clear);
  5. UI-only fields (tabs, searches, filters, drafts) go in `CLOUD_OMIT`.
- **Never sync base64 images.** `cloudCopy()` strips photos/product images (the
  single Firestore document must stay far below 1 MB or every write fails);
  `applyRemote` re-attaches local images. Keep it that way for any new images.
- **Per-device secrets/preferences stay local** (`sadaqa_session`, `sadaqa_bio`,
  `sadaqa_rcpt_w`) — never put them in `state`.
- **Deletes vs. restores:** a tombstone only kills a record whose `editedAt` is not
  newer (`isDead`). Restoring/reviving a record = re-add it with a fresh `editedAt`.
- **Backups/restore never delete.** Restoring a daily backup or a JSON file only adds
  missing records (`restoreMissing`). Keep any new restore path additive.
- A synced **map** (not array) also needs a local capture before `Object.assign` and a
  merge after it (see `debtReminded`, `customers`).
- Receipts: build them with `rcptHeader(sub)` + rows + `rcptFooter(extra)` so they get
  the shop info and the thermal print layout.
- Form values that must survive a `render()` (e.g. a field typed before an
  "add item" click) need a draft variable (see `purSupDraft`).

## 4) UI conventions

- Arabic RTL UI, **Latin digits only**: dates/times via `toLocale*("ar-u-nu-latn")`,
  numbers via `money()`/`fmt()`, currency `CUR`. Never type Arabic-Indic digits (٠-٩).
- Escape user text inserted into HTML with `_esc()`.
- Destructive actions: `requireCode(cb, SECRET_CODE, "عنوان", "شرح")`.
- Log user actions with `logActivity("الإجراء","التفاصيل")` — it powers the
  owner's bell, live alert and Telegram notifications.
- Date-filtered screens use `inRange(date)` and show `dateBarHTML()`.
- Reuse existing classes: `.panel .cols .field .row2 .btn-primary .mini .order
  .badge .chip .seg .store-stat .cat-row .del-btn .tbl`; feedback via `toast()`.
- New tab = add to `renderNav()` items, the `map` in `render()`, a
  `screenX()` returning HTML, and a `bindX()` called from `bindScreen()`
  (guard with `if(state.tab!=="x") return;`).

## 5) Verify (mandatory before saying "done")

```bash
bash tests/run.sh               # syntax + version match + all e2e suites
bash tests/run.sh store contacts_bio   # only some suites
```

- For every feature/fix, add or extend a suite in `tests/e2e/<name>.test.js`,
  copying an existing one's pattern: log in with `#lockName/#lockInput/#lockEnter`
  (owner PIN `0707`), drive the UI or seed `state` via `page.evaluate`, print
  checks as `label: <bool> (expect true)`, and end with the `ERRORS: NONE ✅` line.
  The runner fails on crashes, console errors, or any check that disagrees with
  its `(expect …)`.
- Fingerprint: use a CDP virtual authenticator (see `contacts_bio.test.js`).
- Firebase/gstatic network errors in the sandbox are expected and filtered.
- If something fails, fix it and rerun until ALL GREEN. Report honestly if not.

## 6) Release (every change the owner should receive)

1. Bump the version in **both** `sw.js` (`const VERSION`) and `index.html`
   (`var APP_VERSION`) — patch for fixes, minor for features. The runner checks
   they match.
2. Update `CLAUDE.md` (what changed, key function names, any new rule).
3. Commit with a clear message + the attribution lines from the system reminder;
   push the working branch; fast-forward `main` and push it (that deploys).
4. Confirm the "Deploy to GitHub Pages" (and "Build Android APK") runs succeed
   with the GitHub tools.
5. Report in Arabic: what was done ✅, how it was tested, and the owner's step:
   «الإعدادات ▸ 🔄 تحديث التطبيق الآن» on each device (new version number).

## 7) Boundaries & known limits

- Work only in this repository. Other repos (e.g. StarNet) are read-only references.
- Firestore security rules are not configured; the owner postponed it while
  testing — mention it only if relevant, don't push it.
- Fingerprint (WebAuthn) works in Chrome/Safari PWA, not inside the APK WebView.
- Everything lives in one Firestore document; keep payloads small.
