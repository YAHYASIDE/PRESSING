# Changelog — Washly

All notable changes to the Washly platform. Dates are release order, not calendar
dates. The app is a mobile-first, offline-capable, Arabic RTL business-management
platform for car wash, laundry, carpet cleaning, oil change and retail.

## SaaS v1.0 — Enterprise Edition (incremental)

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
