# Washly · واشلي — Release Notes v1.0

**Release candidate:** `1.0.0-rc.1`
**Type:** Mobile-first, offline-capable, Arabic (RTL) business-management platform
**Segments:** Car wash · Laundry · Carpet cleaning · Oil change · Retail shop

Washly is a single-page web application that runs entirely in the browser with
no backend and no build step. All data lives on the device (localStorage) and is
portable via JSON export/import. This document summarizes what ships in v1.0.

---

## Highlights

- **One platform, five business types.** Enable only the activities a shop runs;
  everything else disappears from the UI. Nothing about the business is hardcoded —
  services, payment methods, currency, working hours and features are all
  configuration.
- **Double-entry accounting under the hood.** Every sale, refund, oil change,
  membership and package posts through a single invoice path (`finalizeInvoice`)
  into a balanced ledger. All financial reports are pure derivations of that
  ledger — no figure is stored twice.
- **Full operations flow.** Receive → wash → dry → ready → deliver, with a live
  operations center, kanban-style queues, pickup codes/QR, and a fullscreen
  customer-facing TV queue board.
- **Recurring revenue.** Memberships and prepaid service packages with expiry,
  remaining-balance tracking and MRR reporting.

---

## Modules

### Setup & onboarding
- Guided setup wizard: choose activities, create the first manager user, set
  business name/logo. 3-day free trial flow with an upgrade path.

### Point of Sale (POS)
- Mixed cart of inventory products **and** business services, product search,
  favorites, discounts and coupons, tax, split/multi-method payment, store credit.
- Invoice lifecycle: checkout, hold/resume, cancel, refund/partial refund,
  reprint, duplicate. Receipts carry a QR code, logo and VAT breakdown.

### Customer CRM & Vehicle Registry
- Rich customer profiles (contact fields, tags, credit limit, account manager),
  a unified activity timeline, and per-vehicle specs with maintenance history.
- Loyalty tiers (VIP → Silver → Gold → Diamond) derived automatically from
  lifetime spend.

### Oil Change
- Consumes inventory (COGS), posts to the ledger, tracks mileage and schedules
  the next-service reminder.

### Inventory
- Products, categories, suppliers, low-stock alerts and stock movements.
  Weighted-average costing keeps on-hand valuation equal to the booked ledger
  balance.

### Accounting
- Chart of accounts, auto-posted journal, Overview · P&L · Balance Sheet ·
  Trial Balance.

### Operations Center, Search & Audit
- Live "today" tiles (revenue, profit, expenses, queues, balances), actionable
  reminders, global search across all entities, and an append-only audit log.

### Reports & Analytics
- Financial, Sales, Customers, Inventory and Analytics reports with a 6-month
  revenue/profit chart. CSV export (Excel-compatible, UTF-8 BOM) and print.

### Car-wash industry features
- Digital vehicle inspection checklist with good/fair/damaged scale, fuel level,
  damage notes and dual (customer + employee) on-canvas signatures → printable
  report.
- Pickup system: 4-digit code + QR generated when an operation is ready, with a
  verify-and-hand-over action.

### Membership Platform & Queue Display
- Seven configurable membership plans and five prepaid service packages, sold
  through the single invoice path.
- Dashboard membership KPIs: Active Members, Expiring Soon, MRR, Package balance,
  Loyalty Redemptions, Average Customer Value.
- Fullscreen TV queue board: three live columns, queue numbers, live clock,
  completed-today counter, dark theme, auto-refresh and a sound alert when a car
  turns ready.

---

## Platform & quality

- **Architecture:** layered `window.App` namespace (config · store · core ·
  repositories · services · ui · pages) with a strict dependency rule and a typed
  service Result contract. See `docs/ARCHITECTURE.md`.
- **Persistence:** whole-state localStorage behind a repository port that is ready
  to swap for a cloud adapter without touching callers.
- **Localization:** Arabic RTL throughout; currency and formatting driven by
  business configuration.
- **Testing:** headless Playwright suites cover accounting, inventory, POS, CRM,
  operations, reports, industry features, membership/queue, and a full
  cross-page render sweep (mobile + desktop) that asserts zero console errors.

---

## Known limitations (v1.0)

- **Client-side only.** There is no multi-device sync yet; each device holds its
  own data. Move data between devices with JSON export/import. A cloud adapter
  seam exists (`App.repositories.stateStore`) but is not wired to a backend.
- **Fonts** load from Google Fonts (CDN) with a system-font fallback; a fully
  air-gapped deployment should self-host the font (see the production checklist).
- **Single business per install.** Multi-branch consolidation is not part of v1.0.

## RC → GA checklist

See `PRODUCTION_CHECKLIST.md` for the go-live gate, `docs/DEPLOYMENT_GUIDE.md`
for hosting, and `docs/BACKUP_RECOVERY.md` for data safety.
