# Architecture & Conventions

This project is a classic-script (no build tools, no framework) application split
into layers that share one global root, `App`. Every file publishes its members
onto its layer namespace (`App.core.*`, `App.services.*`, …). This document is the
contract every layer must honour. It is normative: reviews reject code that
violates it.

Reference implementation throughout: **`App.services.createCarWash`**
(`assets/js/services/car-wash.js`) and its caller in `bindScreen`
(`assets/js/app.js`).

---

## 0. The layers at a glance

```
App.pages     per-screen render (returns HTML strings)         ── presentation
App.ui        DOM, events, dialogs, rendering, notifications    ── presentation / orchestration
App.services  use-cases: validate → decide → mutate → Result   ── application
App.core      pure domain rules, deterministic calculations     ── domain
App.repositories  persistence I/O (ports + adapters)            ── infrastructure
App.store     the in-memory state object                        ── data
App.config    constants, lookup tables, codes                   ── data (immutable)
```

**The golden rule — dependencies point downward only:**

```
pages ─▶ ui ─▶ services ─▶ core ─▶ (config, store)
                    │
                    └─▶ repositories ─▶ (store, config)
```

A layer may use the layers below it and never the layers above it.

---

## 1. Layer responsibilities

### `App.config`
- **Responsibilities:** immutable constants, lookup tables, enums-as-data, codes.
  Examples: `CUR`, `LOGO`, `VEHICLE_PRICES`, `PIECE_PRICES`, `VEH_IMG`, `PIECE_IMG`,
  `WASH_TYPES`, `EXP_CATS`, `SHOP_NAME`, `SHOP_PHONE`, `VEH_LETTER`, `COUNTRIES`,
  `SECRET_CODE`, `ROLES`, and the **Feature Modules registry**
  (`FEATURE_MODULES`, `LOYALTY_STRATEGIES`, `LOYALTY_FIELDS`, `defaultFeatures`).
- **Allowed dependencies:** none. `config` is a leaf.
- **Forbidden dependencies:** everything (no `store`, `core`, `services`, `ui`,
  `pages`, `repositories`, no DOM, no functions with side effects).

#### Feature Modules (optional business features)
- Optional features (loyalty today; inventory, reservations, branches, … next)
  are declared **once** in `config/features.js` (`FEATURE_MODULES`). Per-shop
  on/off + configuration lives in `state.features[key]`; a migration backfills
  new modules and rule fields so old saves keep working.
- The gate is `App.core.featureEnabled(key)` / `featureCfg(key)`. Every piece of
  a module's UI and logic must sit behind that gate, so a disabled module leaves
  **no** calculation, card, column, or control anywhere in the app.
- Settings ▸ *الميزات الإضافية* renders the registry generically (toggle +, for
  configurable modules, a schema-driven panel — see `pages/features.js`);
  changes apply live via `app.js bindFeatureModules()`.
- **Adding a module is two steps:** (1) add a `FEATURE_MODULES` entry (+ default
  flag in `defaultFeatures`), (2) wrap its UI/logic in `featureEnabled('key')`.
  The toggle UI, persistence, and migration need no changes.

#### Business Configuration layer (Release 5)
- `state.business` is the single source of truth for *what this business is*:
  `name`, `logo`, `country`, `currency`, `language`, `timezone`, `types`
  (car-wash / carpet / laundry), `services`, `paymentMethods`, `features`, and
  `workingHours`. Catalogs + `defaultBusiness()` live in `config/business.js`.
- The **Setup Wizard** (`pages/setup.js` render + `app.js` orchestration) writes
  this object once. First launch — an unconfigured business — opens the wizard
  instead of the dashboard (`applySetup` in `render`); a migration marks
  pre-existing installs (those with operational data) configured so they are
  never sent through it.
- **Release 5.1 — fast onboarding:** the wizard is now FOUR steps (activities →
  manager → business info → success) and runs *before* the lock screen — it
  creates the first user (role manager) and logs them in. Everything not asked
  (currency, country, language, timezone, working hours, services, payment
  methods, features) uses `defaultBusiness()` defaults and is editable later in
  **Settings ▸ Business Settings** (`pages/business-settings.js`). Two new
  first-class business types — `oil-change`, `shop` — live in `business.types`.
- **Trial + subscriptions (Release 5.1):** `state.subscription` holds
  `{trialStart, plan, active}`; `core.trialInfo()`/`subscribed()` drive the
  dashboard trial card and the Subscription page (`pages/subscription.js`, three
  plans, no gateway yet). The card hides once `subscribed()`.
- **Nothing about the business is hardcoded anymore.** Modules read via core
  accessors: `bizServices()` (the service catalog → the wash `<select>`),
  `bizPayMethods()` (the payment selector everywhere), `bizCurrency()` (via
  `money()`), `bizName()`/`bizPhone()` (header, receipts, WhatsApp), `bizTypeOn()`
  + `tabVisible()` (which screens/tabs appear). The wizard's feature choices are
  applied into the Feature Modules engine, and the loyalty step reuses the same
  loyalty engine — no duplication.

### `App.store`
- **Responsibilities:** hold the single in-memory application state object
  (`state`) and load-time temporal reference (`now`). Pure data container.
- **Allowed dependencies:** none. `store` is a leaf.
- **Forbidden dependencies:** everything. The store must not import behaviour.
- **Note (debt):** `store` is the global singleton the whole app mutates. The
  long-term target is to reach it only through `repositories`; until then, direct
  `state.*` access is tolerated *below* the UI but must never live in `config` or
  `core` definitions of constants.

### `App.core`
- **Responsibilities:** pure domain rules and deterministic calculations —
  formatting, dates, financial aggregation, wages, meters, loyalty math, phone/
  WhatsApp message building, order-state classification, id/number helpers,
  domain enums (`STATUS`, `NEXT`). Given the same inputs, the same output.
- **Release 4 additions:** `nextAction(op)` maps an operation's current stage to
  the single guided next step (`{kind,label,to}`), so the UI never asks a worker
  to pick a stage; `roleDef()/can(cap)/roleTabs()` resolve the active role
  (`App.config.ROLES[state.role]`) into capabilities and visible tabs.
- **Allowed dependencies:** `App.config`, `App.store` (read-only).
- **Forbidden dependencies:** `App.repositories`, `App.services`, `App.ui`,
  `App.pages`, the DOM/`document`, `render()`, `toast()`, dialogs, network.
- **Note (debt):** several core functions currently *read* the global `state`/`now`
  instead of receiving them as arguments (e.g. `carIncome`, `utilityCost`,
  `wagesRange`). This is tolerated but non-ideal; new core code should take data
  as parameters. Also `vehIcon`/`pieceIcon` return `App.ui.I` icons and should
  migrate to `ui` (a known cross-layer leak, see §8).

### `App.repositories`
- **Responsibilities:** I/O only — persist and retrieve data through a **port**.
  Today: the `StateStore` port + the `localStateStore` adapter
  (`assets/js/repositories/persistence.js`), and the `save`/`load`/backup facade
  (`assets/js/repositories/state-facade.js`). This is the seam a future Firebase
  adapter plugs into (see §7 of `docs/MIGRATION.md`).
- **Allowed dependencies:** `App.store` (the data it persists), `App.config`.
- **Forbidden dependencies:** business rules (`core`/`services` logic), `App.ui`,
  `App.pages`. A repository decides nothing; it moves bytes.
- **Note (debt):** the current facade's `importData`/`resetAllData`/`exportData`
  call `render()`/`applyTheme()`/`toast()` — a violation to be removed by having
  the UI trigger the refresh after the repository call.

### `App.services`
- **Responsibilities:** application use-cases. One function = one business
  transaction: receive a DTO, **validate**, **generate identifiers**, **update the
  store** (directly or via repositories), and **return a typed Result**. All
  business rules live here or in `core`.
- **Allowed dependencies:** `App.core`, `App.config`, `App.store`,
  `App.repositories`.
- **Forbidden dependencies:** `App.ui`, `App.pages`, the DOM/`document`,
  `render()`, `toast()`, dialogs, `console`-driven UI. See the Service Contract (§2).

### `App.ui`
- **Responsibilities:** everything that touches the browser — reading DOM values,
  authorization/confirmation dialogs (`gateDate`, `requireCode`), notifications
  (`toast`), the render pipeline (`render`, `renderNav`, screen dispatch), theme,
  photos, modals, and the event wiring in `bindScreen`. The UI *orchestrates*: it
  collects inputs, resolves gates, calls a service, presents the result.
- **Allowed dependencies:** `App.services`, `App.core`, `App.config`, `App.store`,
  `App.repositories`, `App.pages` (render dispatch), and the DOM.
- **Forbidden dependencies:** **business rules.** The UI must not validate domain
  invariants, compute prices/loyalty, or mutate domain entities inline — it
  delegates to `App.services`/`App.core`. See the UI Contract (§3).

### `App.pages`
- **Responsibilities:** pure presentation — each `screen*` function reads state and
  returns an HTML **string**. Read-only view of the world.
- **Allowed dependencies:** `App.core`, `App.config`, `App.store` (read), `App.ui`
  (presentation primitives like `svg`, `recThumbs`).
- **Forbidden dependencies:** `App.services`, `App.repositories`, `render()` calls,
  DOM **writes**, event binding, and any business rule. Pages describe *what to
  show*, never *what to do*. (Event binding for the markup pages emit lives in
  `App.ui.bindScreen`.)

---

## 2. Service contract

Every `App.services.*` function **must**:

- **accept a single plain DTO** (a data object, not DOM nodes, not event objects);
- **perform its own validation** and return a failure Result on bad input;
- **generate identifiers** it needs (`uid`, `carNo`, `orderNo`) — never receive them from the DOM;
- **update the store** (and/or call repositories) to persist the change;
- **return a typed Result object** (§2.1).

Every `App.services.*` function **must never**:

- read the DOM or `document`;
- call `render()`;
- call `toast()` or show any notification;
- open, close, or read a dialog/modal;
- reference `App.ui` or `App.pages`;
- perform navigation or focus management.

If a service needs a value that lives in the DOM, that value is a **DTO field**.
If a service wants to tell the user something, it puts it in the **Result** and the
UI decides how to present it.

### 2.1 Typed Result object

A Result is a discriminated object keyed on `ok`:

```
Result<T> =
  | { ok: false, error: string }        // stable machine-readable error code
  | { ok: true,  ...payload }           // the created/updated entity + UI flags
```

- `error` is a **stable code** (`"invalid_phone"`, `"invalid_price"`), not a
  human sentence — the UI maps codes to localized messages.
- On success, the payload carries the domain entity plus any **flags** the UI needs
  to choose a message or next step (never the message text itself).

---

## 3. UI contract

The UI (`App.ui`, including `bindScreen`) **is responsible for**:

- collecting DOM values into a DTO;
- authorization (past-date/code gates: `gateDate`, `gateDay`, `requireCode`);
- confirmation dialogs;
- rendering (`render`) and re-rendering after a change;
- notifications (`toast`) and message localization.

The UI **must never**:

- contain business rules (validation of domain invariants, pricing, loyalty,
  status transitions, wage math);
- mutate domain entities inline;
- reach into another use-case's internals.

The canonical UI handler shape is exactly five steps:

```
1. collect form values → DTO
2. resolve authorization / gates
3. call App.services.<useCase>(dto)
4. handle the returned Result (toasts / follow-up UI)
5. render()
```

---

## 4. Core contract

`App.core` contains **only**:

- pure functions and deterministic calculations;
- domain enums/derivations (`STATUS`, `NEXT`, `orderState`, financial/wage/meter math).

`App.core` contains **no**:

- DOM or `document`;
- rendering;
- repositories or I/O;
- UI (`toast`, dialogs, `App.ui`).

A core function is testable with plain inputs and no browser. (Current debt: some
core functions read the global `state`; new code should take it as a parameter.)

---

## 5. Repository contract

`App.repositories` perform **I/O only**: read from and write to a storage backend
through a port. A repository:

- exposes a stable port shape (today `read(key)` / `write(key, obj)`; future
  per-entity `list/upsert/remove/subscribe`);
- contains **no business rules** — no validation, no pricing, no derivations;
- does not touch `App.ui` or `App.pages`.

Swapping localStorage for Firebase must require changing **only** an adapter in
this layer.

---

## 6. Dependency rule table

| Layer | Allowed → (may depend on) | Forbidden → (must not touch) |
|---|---|---|
| **config** | — (leaf) | store, core, repositories, services, ui, pages, DOM |
| **store** | — (leaf) | config-behaviour, core, repositories, services, ui, pages, DOM |
| **core** | config, store *(read)* | repositories, services, ui, pages, DOM, render, toast, dialogs, network |
| **repositories** | store, config | core-rules, services, ui, pages (I/O only, no rules, no UI) |
| **services** | core, config, store, repositories | ui, pages, DOM/document, render, toast, dialogs, navigation |
| **ui** | services, core, config, store, repositories, pages, DOM | business rules (validation, pricing, loyalty, status/wage math) |
| **pages** | core, config, store *(read)*, ui *(primitives)* | services, repositories, render(), DOM writes, event binding, business rules |

Reading the table: an edge is legal only if it goes **left-to-right down the
stack**. Any right-to-left (upward) edge is a violation.

---

## 7. Reference implementation — `createCarWash`

### 7.1 The DTO (UI → service boundary)

```js
// built by bindScreen from form fields — a plain object, no DOM nodes
{
  vehicle, plate, phone, country, wash, price,
  dateStr, deferred, by, photosBefore, photosAfter
}
```

### 7.2 The service (`App.services.createCarWash`) — validate → generate → update → Result

```js
App.services.createCarWash = function (input) {
  // ...normalize DTO...
  const existing = plate ? state.customers[plate] : null;      // reads store
  const free = !!(existing && existing.stamps === 4);          // domain rule
  const price = +input.price;

  // validation → failure Result (no toast, no DOM)
  if (!validPhone(phone)) return { ok: false, error: "invalid_phone" };
  if (!free && !(price > 0)) return { ok: false, error: "invalid_price" };

  // update store
  if (!free) state.vehiclePrices[vehicle] = price;
  // ...loyalty card update...

  // generate identifiers + create entity
  const op = { id: uid(), no: carNo(vehicle), /* ... */ date: chosenDateIso(dateStr) };
  state.carOps.push(op);

  // typed success Result — flags, not messages
  return { ok: true, op, free, deferred, cardComplete };
};
```

Note what is **absent**: no `document`, no `getElementById`, no `render`, no
`toast`, no modal. Only `App.core` (`validPhone`, `uid`, `carNo`, `chosenDateIso`,
`iso`) and `App.store` (`state`).

### 7.3 The UI caller (`bindScreen.doCarSave`) — the five-step shape

```js
const doCarSave = () => {
  // 1. collect form values → DTO   (the only DOM reads)
  const input = {
    vehicle: cv.value,
    plate: plateInp.value.trim(),
    phone: document.getElementById("carPhone").value.trim(),
    /* ...country, wash, price, dateStr, deferred... */
    by: currentUser,
    photosBefore: [...pendingCarBefore],
    photosAfter: [...pendingCarAfter]
  };
  // 2. resolve the authorization gate
  gateDate(input.dateStr, () => {
    // 3. call the service
    const res = App.services.createCarWash(input);
    // 4. handle the Result (UI maps codes → messages)
    if (!res.ok) { toast(res.error === "invalid_phone" ? "أدخل رقم هاتف صحيح" : "أدخل سعرًا صحيحًا"); return; }
    pendingCarBefore.length = 0; pendingCarAfter.length = 0;
    if (res.free) toast("🎁 غسلة مجانية — اكتملت البطاقة");
    else if (res.deferred) toast("تم الحفظ — دفع مؤجّل (غير مدفوع)");
    else if (res.cardComplete) toast("تم الحفظ — الغسلة القادمة مجانية");
    else toast("تم حفظ العملية");
    // 5. render
    render();
  });
};
```

### 7.4 Checklist for the next service

- [ ] Lives in its own file under `assets/js/services/`, registered on `App.services`.
- [ ] Takes one DTO; the UI does all `getElementById`.
- [ ] Validates and returns `{ ok:false, error }` on bad input.
- [ ] Generates its own ids; does not receive them from the DOM.
- [ ] Updates the store (or a repository); no `render`/`toast`/dialog/`document`.
- [ ] Returns `{ ok:true, ...entity, ...flags }`.
- [ ] The caller follows the five-step UI shape and owns every gate, toast, and render.

---

## 8. Known deviations (tech debt to retire, not new licence)

These exist today and are documented so they are fixed deliberately, not copied:

- `repositories` → `ui`: `importData`/`resetAllData`/`exportData` call
  `render`/`applyTheme`/`toast`. Move the refresh to the UI caller.
- `core` → `ui`: `vehIcon`/`pieceIcon` return `App.ui.I` icons; relocate to `ui`.
- `core` reads global `state`/`now` instead of parameters.
- `ui.render` ↔ `pages`: the render dispatcher depends on pages while pages depend
  on ui primitives (acceptable for now; the eventual render rework resolves it).
- Rendering is still full-`innerHTML` + `bindScreen` (out of scope until the
  render layer is reworked).

New code must comply with §1–§7; it must not add to §8.
