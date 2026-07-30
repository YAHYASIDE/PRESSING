# Changelog — Washly

All notable changes to the Washly platform. Dates are release order, not calendar
dates. The app is a mobile-first, offline-capable, Arabic RTL business-management
platform for car wash, laundry, carpet cleaning, oil change and retail.

## SaaS v1.0 — Enterprise Edition (incremental)

### v1.1.0 — Multi-business / multi-branch with data isolation
- **Business/Branch selector after login.** One business opens directly; with
  more than one, a selector appears showing each business's **logo, name, branch,
  business type and the user's role**, with the last-used one highlighted.
- **Real data isolation.** Each business/branch is a fully independent workspace —
  its own customers, invoices, workers, inventory, journal and reports. The live
  `state` is whichever workspace is active; switching swaps the entire dataset, so
  no business can ever read or write another's data (verified both directions).
- **Remember last selected** — the last business is restored on the next launch.
- **Switch Business** button added to the header (shown only with >1 business),
  plus **Add Business / Branch** on the selector (runs the setup wizard for a new
  workspace). Branch name is editable in Settings ▸ Business Settings.
- **Backup/restore** now covers **all** businesses (the whole container); legacy
  single-business installs and backups migrate automatically to the new format.
- New committed test `tests/multibusiness.test.js` proves the selector, isolation,
  switching and remember-last. Existing single-business flow unchanged; full smoke
  + regression suites green.

### v1.0.1 — Setup Wizard restored to the designed flow
- **Onboarding regression fixed.** On first launch (before login) the wizard now
  runs the full designed 4-step flow:
  1. **Choose business activities** — multi-select Car Wash, Laundry, Carpet
     Cleaning, Oil Change, Shop (activities the first screen; ≥1 required).
  2. **Business Information** — Business Name (required), Logo (optional),
     Manager Name, Phone, **Address**.
  3. **Create Admin Account** — Full Name, **Username**, Password, **Confirm
     Password** (mismatch blocks the step).
  4. **Success** — shows the selected activities and business name, then enters
     the dashboard.
- Adds the previously-missing **Address**, **Username** and **Confirm Password**
  fields, splits business-info and admin-account into distinct steps, and makes
  the activities screen the literal first screen (the branded splash no longer
  precedes it).
- After finish: all info is saved (`state.business` incl. address/manager,
  `state.account` username), the wizard **never reappears** until factory reset,
  the dashboard loads per selected activities, and feature/type gating reflects
  only the chosen activities. Verified end-to-end (source + built bundle) incl.
  the factory-reset re-trigger, with zero console errors.

### v1.0.0 — Production release
- **Production bundle** (`build.js` → `dist/`): the 53 JS + 19 CSS source files
  are concatenated in load order and minified with esbuild (whitespace + syntax
  only; identifiers preserved) into one content-hashed JS + one CSS —
  **72 asset requests collapsed to 2**. App code over the wire: ~178 KB gzip.
- **PWA / offline**: generated `manifest.json` + `sw.js` service worker
  (precached app shell, cache-first). Offline reload boots and renders with data
  intact. 192/512 maskable icons generated from the app logo.
- **Loading optimization**: the Google Fonts stylesheet is now
  non-render-blocking — first paint dropped from ~12.9 s to **240 ms** (FCP
  240 ms, LCP 516 ms) with a system-font fallback.
- **Version** bumped to `1.0.0`.
- **Verified** end-to-end on the served bundle: no 404s, service worker controls
  the page, backup/restore round-trips with a balanced ledger, print output
  correct, responsive with 0px horizontal overflow, zero console errors — full
  results in `DEPLOYMENT_REPORT.md`.
- **Reproducible build**: `package.json` (`npm run build` / `serve` / `test`),
  `.gitignore`; deployment guide updated for the bundle + PWA update flow.

### RC1 — Release Candidate hardening
- **Production readiness pass** (no new business features): reviewed every page,
  workflow, modal and mobile screen across mobile + desktop viewports.
- **Dead code removed** — 15 unused JS functions/constants (`ledgerFor`,
  `invMovementsFor`, `cartCogs`, `bizCurrency`, `todayIncome`, `monthIncome`,
  `meterToday`, `meterUse`, `expenseSum`, `waLink`, `waPhoneStr`, `qrMatrix`,
  `addCategory`, `suSwitch`, `OP_QUEUES`) and ~40 unused CSS classes (dead
  car-card, chart, alert and bar components).
- **Error handling** — `saveLocal` now surfaces a warning toast when
  localStorage is full instead of silently losing data.
- **Accessibility** — `aria-label`s added to icon-only buttons; `theme-color`,
  `description` and mobile web-app meta added; product title corrected.
- **Naming/versioning** — app version unified to `1.0.0-rc.1`; the stale
  hardcoded version line in Settings now derives from `APP_VERSION`.
- **Testing** — added a committed, portable smoke test (`tests/smoke.test.js`)
  that renders every page + sub-screen on both viewports and fails on any console
  error; all regression suites re-run green after the cleanup.
- **Docs** — added `RELEASE_NOTES_v1.md`, `PRODUCTION_CHECKLIST.md`,
  `docs/DEPLOYMENT_GUIDE.md`, `docs/BACKUP_RECOVERY.md`; refreshed API/architecture
  references to match the trimmed surface.

### Part 8 — Membership Platform & Queue Display
- **Membership System** — seven configurable plans (Basic, Silver, Gold, Diamond,
  Unlimited, Family, Fleet) with price, duration, included services, discount %,
  priority-queue flag and auto-renewal. Each plan carries an expiry and a remaining
  service balance; a reminder is auto-created for the expiry date.
- **Service Packages** — prepaid bundles (5 washes, 10 washes, monthly, quarterly,
  yearly) with a live remaining balance and expiry per package.
- **Redeem** — one-tap "use a service" draws from the active membership first,
  then from a package; unlimited plans never decrement.
- **Recurring-revenue accounting** — memberships and packages are sold through the
  **existing `finalizeInvoice` path** (source `membership`/`package`), so every
  sale posts to the ledger with no duplicated posting logic. A receipt prints via
  the shared document modal.
- **Membership tab** on the customer profile: current-plan card, plan grid,
  package balance and buy buttons, auto-renew toggle.
- **Dashboard membership KPIs** — Active Members, Expiring Soon (≤7 days),
  Monthly Recurring Revenue (MRR), Package balance, Loyalty Redemptions and
  Average Customer Value — all derived, none stored twice.
- **Queue Display (TV mode)** — a fullscreen, customer-facing board opened from the
  Operations Center: three live columns (waiting / in-progress / ready-for-pickup)
  with queue number, plate/vehicle and service, a live clock, completed-today
  counter, large fonts, dark theme, auto-refresh every 4s, native fullscreen and a
  **sound alert** when a car turns ready.

### Part 7 — Car-wash industry features
- **Digital Vehicle Inspection** — a checklist (body, glass, lights, tyres,
  interior, engine) with a good/fair/damaged scale, fuel level, damage notes and
  **dual signatures** (customer + employee) captured on-canvas; generates a
  printable inspection report.
- **Pickup System** — a 4-digit pickup code + **QR** generated automatically when
  an operation is ready; a verify-and-hand-over action.
- **Loyalty Tiers** — automatic VIP → Silver → Gold → Diamond tiers by lifetime
  spend, shown as badges on customer cards/profiles.
- **Performance KPIs** — average ticket, customer lifetime value (CLV), repeat
  rate and active rate on the Customers report.

### Part 6 — Reports, Analytics & Export
- **Executive Reports** screen with sub-tabs: Financial (P&L, cash flow, balance
  sheet), Sales (invoices, payment methods, top products/services, cashiers),
  Customers (segments: repeat / inactive / lost, top spenders), Inventory
  (value, movement, low stock), Analytics (6-month revenue/profit bar chart +
  monthly growth).
- **CSV export** (Excel-compatible, UTF-8 BOM) and print per report.
- All reports are pure derivations from the single source of truth.

### Part 5 — Operations Center, Global Search & Audit Log
- **Operations Center** on the dashboard: live today tiles (revenue, profit,
  expenses, orders, car/carpet/oil queues, ready-for-pickup, cash/bank/receivable
  balances, low stock, trial) + an actionable **reminders** panel.
- **Global Search** across customers, vehicles, invoices, operations, products,
  suppliers and journal entries, with one-tap navigation.
- **Audit Log** — append-only trail of sales, refunds, stock moves, oil changes
  and logins.

### Part 4 — Customer CRM, Vehicle Registry & Oil Change
- Rich customer profiles (contact, tags, credit limit, membership) with a unified
  chronological **timeline**; derived revenue / balance / visits / avg ticket.
- **Vehicle Registry** — multiple vehicles per customer with full specs + history.
- **Oil-Change** module — consumes oil/filters from inventory, posts the sale,
  updates mileage, sets the next change and creates a reminder.

### Part 3 — Point of Sale
- Professional POS: catalog of products + services, cart with quantity/discount/
  coupon/tax, split multi-method payments, store credit, hold/resume, refund
  (full + partial), invoice history, and a printable receipt with a real **QR**.

### Part 2 — Inventory
- Products, categories, suppliers, receiving (weighted-average cost), stock
  adjustment, low-stock + expiry alerts, and movement history — every movement
  posts to accounting.

### Part 1 — Accounting
- Double-entry ledger: Chart of Accounts, journal, general ledger, trial balance,
  P&L, balance sheet, cash flow. Every sale, payment, refund, expense and
  inventory movement posts an automatic, balanced journal entry.

## Releases 1 – 5.2 (foundation)
- **5.2** — commercial polish: premium welcome landing, animated success screen,
  trial card with progress, redesigned pricing, illustrated empty states,
  branding moved to `config/app.js`, animations, mobile refinements.
- **5.1** — 4-step onboarding, first-user (manager) creation & auto-login, free
  3-day trial + subscription plans page, Business Settings editor.
- **5.0** — Business Configuration layer (`state.business`) + Setup Wizard;
  currency/services/payments/features made configurable.
- **Feature Modules** system with optional Loyalty (4 strategies).
- **4** — Operation Details screen, guided workflow, Worker Mode & roles.
- **3** — Live Operations Center for car operations (queues, live timers).
- **2** — Car reception + 6-stage workflow; mobile-first design system.
- **1** — Modern dashboard (KPIs, charts).
- **0** — Layered architecture extraction (config / store / core / repositories /
  services / ui / pages) — see `docs/ARCHITECTURE.md`.
