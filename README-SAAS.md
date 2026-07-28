# Pressing — Multi-Tenant SaaS Architecture

This repository is being converted from a single-laundry app into a multi-tenant
SaaS platform where many laundries share the same code but have **completely
isolated data**, enforced by Firebase Authentication + Firestore/Storage
Security Rules.

## Roles

| Role | Scope | Can do |
|------|-------|--------|
| **Super Admin** (platform owner) | all laundries | create/suspend laundries, provision managers, cross-tenant view (via `admin.html`) |
| **Manager** | one laundry | everything in their laundry: operations, workers, prices, branding, add team members |
| **Supervisor** | one laundry | day-to-day operations only (no settings, branding, or worker salaries) |

Identity is a real Firebase Auth account. The role + tenant are carried in
**custom claims** (`{ laundryId, role }`, or `{ superAdmin: true }`), which only
the backend can set — so a client can never escalate its own access.

## Data model (scales to hundreds of laundries, no schema change per tenant)

```
users/{uid}                      { laundryId, role, name, email }        // claims mirror (backend-written)
laundries/{laundryId}            { name, logoUrl, address, phone, lang, active, plan, ownerUid }
  ├─ carOps/{id}                 // one document per operation — concurrent writers never collide
  ├─ laundryOrders/{id}
  ├─ expenses/{id}
  ├─ workers/{id}                // manager-write, member-read
  ├─ meters/{id}
  ├─ customers/{plateKey}
  ├─ logins/{id}
  ├─ tombstones/{id}             // deletion markers (prevent resurrection)
  └─ meta/settings               // per-laundry prices, tariffs, palette, messages, counters

Storage:
  laundries/{laundryId}/branding/logo.*
  laundries/{laundryId}/photos/{collection}/{docId}/...
```

Adding laundry #N is a single `laundries/{id}` document plus its subtree — no
schema change, and every query is tenant-scoped so read/write latency is
independent of tenant count. Cross-tenant admin views use collection-group
queries. This is the standard Firestore multi-tenant pattern and scales to
thousands of tenants.

## Sync engine

Built on the per-document reconciler (see the sync commit): the web app writes
one Firestore document per record under `laundries/{TENANT}/…`, and one realtime
`onSnapshot` listener per collection merges changes back by `id`. `TENANT` comes
from the signed-in user's `laundryId` claim; the sync engine never runs until it
is set. Photos upload to Storage and only their URLs are stored in documents.

## Files

| File | Purpose |
|------|---------|
| `index.html` | the laundry web app (login gate, tenant-scoped sync, roles, branding) |
| `admin.html` | Super Admin console (provision & manage laundries) |
| `functions/index.js` | callable Cloud Functions — the only place claims/users are written |
| `firestore.rules` / `storage.rules` | tenant isolation, enforced server-side |
| `firebase.json`, `.firebaserc`, `firestore.indexes.json` | Firebase project config |
| `scripts/bootstrap-superadmin.js` | one-time first-platform-owner setup |

## Deploy

Requires the Firebase CLI (`npm i -g firebase-tools`) and Auth enabled
(Email/Password) in the Firebase console.

```bash
# 1. install backend deps
cd functions && npm install && cd ..

# 2. deploy rules + functions (+ hosting if you use it)
firebase deploy --only firestore:rules,storage,functions
# firebase deploy --only hosting        # optional: serves index.html + /admin

# 3. bootstrap the FIRST platform owner
#    (create the account first via the app/console, then:)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
  node scripts/bootstrap-superadmin.js owner@example.com
#    sign out & back in for the claim to take effect
```

Then open `admin.html`, sign in as the owner, and create the first laundry +
its manager. The manager signs into `index.html`; on first login their existing
local data (and the legacy `appState/main` document, claimed once) migrates into
their tenant subtree automatically.

## Phase status

- **Done — Phase 1: tenant data model + auth + isolation.** Firebase Auth login,
  custom-claim roles, tenant-scoped collections/Storage, security rules,
  provisioning backend, Super Admin console, automatic migration, per-laundry
  branding load, Manager-only settings gate.
- **Next — i18n (Arabic/French):** the login surface already switches AR/FR and
  flips `dir`; the full app UI strings still need extraction into an `I18N`
  dictionary with a `t()` helper. This is the largest remaining phase.
- **Next — branding editor & per-laundry settings UI:** logo upload + name/address/
  phone editing inside the Manager settings screen.
- **Next — finer role gating** of individual actions (deletions, past-day edits)
  mapped from the old PIN codes to Manager/Supervisor.
