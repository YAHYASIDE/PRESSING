# Washly — Developer / API Guide

Washly is a client-side app with no HTTP backend; its "API" is the in-process
`window.App` namespace and its layered modules. This guide is the contract for
extending the platform. See `docs/ARCHITECTURE.md` for the layering rules.

## Namespace layout
```
App.config        immutable constants, catalogs, chart of accounts, defaults
App.store         { state, now } — the single mutable state object
App.core          pure domain rules & derivations (no DOM, no side effects)
App.repositories  persistence ports/adapters (localStorage)
App.services      use-cases: the only writers of business data; typed Results
App.ui            render/bind, presentation helpers, CSV/QR utilities
App.pages         per-screen render functions (pure string → HTML)
```
Dependency rule: `pages → services → core`; `pages → ui`; `services →
repositories`. `config` and `store` are leaves.

## Service contract
Services take a **plain DTO** and return a **typed Result**:
`{ ok:false, error:"..." }` or `{ ok:true, ... }`. They never touch the DOM,
`render()`, toasts or dialogs. They are the only place business data is mutated.

### Accounting (`services/accounting.js`)
- `postEntry({date, ref, memo, source, lines:[{account,debit,credit}]})` — the
  only writer of `state.journal`; validates a **balanced** double entry.
- `postSale`, `postCollection`, `postExpense`, `reverseEntry(id)`.
- Statements are pure in `core/accounting.js`: `accountBalance(code, filter)`,
  `ledgerFor`, `trialBalance(filter)`, `plStatement(filter)`, `balanceSheet`,
  `cashSummary`.

### Inventory (`services/inventory.js`)
- `addProduct`, `updateProduct`, `deleteProduct`, `receiveStock`,
  `adjustStock`, `consumeStock`, `addSupplier`, `addCategory`.
- Every movement posts to accounting; `consumeStock` posts COGS.
- Pure queries in `core/inventory.js`: `invProducts`, `invStatus`, `invLowStock`,
  `invExpiring`, `invValue`, …

### POS (`services/pos.js`)
- `finalizeInvoice(dto)` — the **single** invoice-posting path (used by POS
  checkout and Oil-Change). Computes totals/tax, posts the balanced sale entry,
  consumes inventory, links the customer, pushes to `state.invoices`.
- `checkoutInvoice()` (reads `state.pos`), `holdInvoice`, `resumeInvoice`,
  `cancelHeld`, `duplicateInvoice`, `refundInvoice(id, amount)`.
- Cart math is pure in `core/pos.js`: `cartSubtotal`, `cartDiscountAmt`,
  `cartNet`, `cartTaxAmt`, `cartTotal`, `paymentsDue`, `invNo`.

### CRM / Vehicles / Oil (`services/crm.js`)
- `crmSync()` (idempotent id + vehicle backfill), `saveCustomer`, `addVehicle`,
  `updateVehicle`, `deleteVehicle`, `oilChange(dto)`.
- Derivations in `core/crm.js`: `crmCustomers`, `customerOfPlate`, `custVehicles`,
  `custRevenue`, `custBalance`, `custVisitCount`, `custTimeline`, `vehOilDue`.

### Operations / Search / Reports (pure, `core/*.js`)
- `opsStats()`, `opsReminders()` — live dashboard aggregates.
- `globalSearch(q)` — grouped results with a `go` navigation target.
- `repSales`, `repTopProducts`, `repTopServices`, `repTopCustomers`,
  `repCustomerSegments`, `repInventory`, `repMonthlySeries` — report data.
- `App.core.toCSV(header, rows)` (pure) + `App.ui.exportCSV(name, header, rows)`.

### Audit (`services/audit.js`)
- `App.services.audit(action, detail)` — append-only trail (capped).

## Business configuration & features
- `App.core.businessConfigured()`, `bizName`, `bizPhone`, `bizCurrency`,
  `bizServices`, `bizPayMethods`, `bizTypeOn(key)`, `tabVisible(id)`.
- `App.core.featureEnabled(key)`, `featureCfg(key)` gate every optional module.

## Adding a new module (checklist)
1. **config** entry (a `FEATURE_MODULES` flag if optional; any catalogs).
2. **core** pure derivations.
3. **service** — the only writer; DTO in, Result out; post to accounting/inventory
   via the existing services (never duplicate posting logic — reuse
   `finalizeInvoice` / `postEntry`).
4. **page** render function; register on `App.pages`.
5. **wiring** in `app.js`: nav item, render route, `tabVisible` gate, `bindScreen`
   handlers; add any `state` fields + a migration to ensure they exist.
6. Keep the **single source of truth** — store transactions, derive aggregates.

## State & persistence
- All state lives in `App.store.state`; `save()`/`load()` persist to
  `localStorage` via `App.repositories.stateStore`.
- `render()` re-renders `#main` and re-binds via `bindScreen()`. Keep field ids
  stable so re-binding continues to work.
