# Changelog — Washly

All notable changes to the Washly platform. Dates are release order, not calendar
dates. The app is a mobile-first, offline-capable, Arabic RTL business-management
platform for car wash, laundry, carpet cleaning, oil change and retail.

## SaaS v1.0 — Enterprise Edition (incremental)

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
