# Washly — Administrator Guide

For managers/administrators who configure and operate the platform. Settings are
reached via the **⚙️ gear** in the header (protected by the settings/meter code).

## 1. Business configuration (Settings ▸ إعدادات النشاط)
Everything about the business is configurable and is the single source of truth
(`state.business`):
- **Business activities** — car wash / carpet / laundry / oil-change / shop.
  These decide which screens appear.
- **Currency, country, language, timezone.**
- **Working hours & days.**
- **Services** — the catalog offered at reception/POS.
- **Payment methods** — including custom methods; this drives the payment
  selector everywhere.
- **Business name & logo.**
- **Tax** — enable a VAT rate + label; applied automatically in the POS and shown
  on receipts.

## 2. Feature Modules (Settings ▸ الميزات الإضافية)
Toggle optional modules on/off — disabled modules disappear completely:
- **POS**, **Loyalty** (4 strategies: stamp / points / discount / coupon),
  **Employees**, **Inventory**, **Accounting**, plus placeholders (Reservations,
  Notifications, Branches). Loyalty has a schema-driven config panel.

## 3. Roles & permissions
Roles are defined in `config/constants.js` (`ROLES`): **Manager**, **Admin**,
**Cashier**, **Worker**. Each role defines:
- `tabs` — which nav screens are visible.
- `caps` — capabilities (settings, delete, workers, finance, receive, operate,
  collect). Unauthorized actions are hidden, not just disabled.
Roles are chosen at the lock screen; the manager account is created during
onboarding.

## 4. Accounting administration
- The **Chart of Accounts** (`config/accounting.js`) defines assets, liabilities,
  equity, revenue and expense accounts and the posting maps (payment method →
  cash account, expense category → account).
- Every sale, payment, refund, expense and inventory movement posts an automatic
  **balanced double-entry**. Review them in **Accounting ▸ القيود**; verify with
  **ميزان المراجعة** (trial balance) and the **الميزانية** (balance sheet).

## 5. Inventory administration
- Set each product's **reorder point** (حد التنبيه) and **expiry**; low-stock and
  expiring items surface in the Operations Center and Inventory ▸ تنبيهات.
- Receiving uses **weighted-average costing** so the on-hand valuation always
  equals the booked inventory balance.

## 6. Subscriptions & trial
- New businesses get a **3-day trial**. The dashboard trial card and the
  **Subscription** page show days remaining and the plans (Monthly / 6-Months /
  Yearly). Payment gateway is pending; buttons show "Coming Soon".

## 7. Security
- **PIN/password lock** on every launch; the code cannot be disabled, only
  changed (Settings ▸ كود فتح التطبيق). A separate **meter/settings code** gates
  admin actions.
- **Session timeout** auto-locks after inactivity (longer if the app itself
  opened WhatsApp/share).
- **Audit log** records sensitive actions (sales, refunds, stock adjustments, oil
  changes, logins) — viewable in the Operations Center.
- **Role permissions** hide unauthorized screens and actions.

## 8. Backup / restore / data
Settings ▸ النسخة الاحتياطية:
- **تصدير البيانات** downloads a full JSON backup; **استيراد** restores it.
- **مسح كل البيانات** wipes the device (irreversible; confirm carefully).
- Reports export to **CSV** (Excel).
Data persists locally (`localStorage`, key `sadaqa_laundry_v1`).

## 9. Deployment
- Static site — deployed via **GitHub Pages** from the `main` branch. No server
  required; the app runs entirely client-side and offline-capable.
- To update: merge to `main`; Pages redeploys automatically.

## 10. Migrations & upgrades
`core/domain.js runMigrations()` runs on every launch and is **idempotent**: it
ensures all stores exist, backfills new fields, and marks pre-existing installs
as configured (so returning users are never forced through onboarding). A
one-time `backfillAccounting()` seeds books from existing records on upgrade.
