# Conservative migration to a layered architecture

No build tools, no framework, no TypeScript. The app stays as **classic `<script>`
files sharing one global scope**, loads in the same order, and behaves exactly as
before. We only change *structure*, incrementally, one bounded commit at a time.

## Goals

1. Preserve the current JavaScript runtime and classic scripts.
2. Keep the application fully functional at every commit.
3. Gradually eliminate bare global state.
4. Introduce five layers: **core · services · repositories · ui · pages**.
5. Prepare a Firebase seam without implementing Firebase.
6. Do not change the UI. Do not rewrite rendering yet.

## The mechanism: one namespace, aliases during transition

`app.namespace.js` (loaded first) creates a single root:

```
App.config  App.core  App.repositories  App.services  App.ui  App.pages
```

Each file publishes its members onto its layer (`App.core.finance = {...}`), while
the existing bare globals stay as **aliases** so inline `onclick=` handlers and
cross-file calls keep resolving. Once every caller of a symbol uses `App.*`, the
bare-global alias is deleted — that is how global state is eliminated *gradually*
instead of in one risky sweep.

### Layer dependency rule

`pages → services → core`, and `pages → ui`, and `services → repositories`.
Dependencies point downward only. Nothing below `pages` touches the DOM except `ui`.

## Commit sequence

| # | Commit | Scope | Status |
|---|--------|-------|--------|
| 1 | Namespace root + this plan | `app.namespace.js`, `docs/MIGRATION.md` | done |
| 2 | Repositories layer + persistence port | `repositories/persistence.js`; `save/load` delegate to it | done |
| 3 | Layer folders | move files into `core/ ui/ repositories/ services/ pages/`; rewire script order | done |
| 4 | Register modules into `App.*` | each file also publishes onto its layer namespace; globals kept as aliases | planned |
| 5 | Extract services from `bindScreen` | mutation use-cases → `services/`; `bindScreen` calls them | planned |
| 6 | Retire globals layer-by-layer | delete bare-global aliases once callers use `App.*` | planned |

## Firebase seam (prepared, not implemented)

`App.repositories` defines the persistence **ports** (interfaces). Today the only
adapter is `App.repositories.localStateStore` (localStorage, whole-state). The
Firebase phase adds a second adapter implementing the SAME port shape (and the
documented per-entity `Repository` contract) with no change to `core`, `services`,
`ui`, or `pages`. Swapping the adapter is the migration.

## Non-goals for this phase

- No rendering rewrite (still full-innerHTML `render()` + `bindScreen`).
- No UI/markup/CSS changes.
- No Firebase code.
- No framework, bundler, or TypeScript.
