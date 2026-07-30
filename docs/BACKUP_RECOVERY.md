# Backup & Recovery — Washly v1.0

Washly stores **all** business data in the browser's `localStorage` on the
device that runs it. There is no server copy. This makes backups simple but
makes them **your responsibility** — if the browser profile is cleared and there
is no export, the data is gone.

---

## Where the data lives

- **Store:** `localStorage`
- **Key:** `sadaqa_laundry_v1`
- **Shape:** a **container** — `{ __v:2, activeId, lastActiveId, workspaces:{ <id>: … } }`
  — holding one fully isolated **workspace per business/branch**. Each workspace
  is a complete JSON object with that business's own collections (car operations,
  carpet orders, invoices, customers, vehicles, inventory, journal, expenses,
  workers, meters, memberships, settings, sequences). The live app operates on
  whichever workspace is active; switching swaps the whole dataset.

Everything the app shows is derived from these objects. Aggregates (revenue,
balances, MRR, tiers) are **not** stored separately — they are recomputed — so a
backup of the container is a complete, self-consistent backup of **all**
businesses. (Older single-business installs and backups are migrated to this
container format automatically on load/import.)

---

## Backing up (export)

**In the app:** Settings → النسخة الاحتياطية → **تصدير البيانات**.

This downloads `washly-backup-YYYY-MM-DD.json` — the entire container (**every
business/branch**), pretty-printed. Store it somewhere off the device (cloud
drive, email to the owner, USB).

### Recommended cadence
- **Daily** for an active shop (end of day).
- **Before every app update** and before **Settings → مسح كل البيانات**.
- After any bulk change (importing customers, large inventory intake).

> Tip: the export is a plain file. It can be scripted/automated if the app is
> opened in a controlled kiosk browser, but the built-in button is the supported
> path.

---

## Restoring (import)

**In the app:** Settings → النسخة الاحتياطية → **استيراد** → choose a
`washly-backup-*.json` (or older `sadaqa-backup-*.json`) file.

On import the app replaces the in-memory state with the file's contents, saves,
and re-renders. **Import overwrites current data** — export the current state
first if you might need it.

### Moving between devices
1. On the source device: **Export**.
2. Transfer the JSON file.
3. On the target device: open the app (complete setup once if it's fresh),
   then **Import**.

Because there is no multi-device sync, treat one device as the source of truth
and use export/import for the handoff.

---

## Recovery scenarios

| Situation | Recovery |
|---|---|
| Accidental **مسح كل البيانات** | Import the most recent backup. Reset keeps only theme/lock/meter-code; all business data is gone otherwise. |
| Browser cache/profile cleared | Import the most recent backup. Without one, data is unrecoverable. |
| Device lost/broken | Import the latest off-device backup on a new device. |
| "**تعذّر الحفظ — مساحة التخزين ممتلئة**" toast | Storage is full and **new writes are failing**. Export a backup immediately, then reduce data (remove old records) or move to a device with more storage. Do not keep operating until saves succeed again. |
| Corrupted/invalid backup file | The app rejects it ("ملف غير صالح") and leaves current data untouched. Use an earlier backup. |
| App update misbehaves | Redeploy the previous version; user data is untouched by deploys and is version-tolerant (migrations only add stores). |

---

## Storage limits & hygiene

- `localStorage` is capped by the browser (typically ~5 MB per origin). Photos
  attached to operations are the main consumer.
- The **save-failure toast** is the early-warning signal — act on it the first
  time it appears.
- Periodically export-then-prune old completed operations if a busy shop
  approaches the limit.

---

## Integrity checks

A good backup restores to a consistent ledger. After a restore, sanity-check in
**Accounting**:
- **Trial Balance** totals: total debit = total credit.
- **Balance Sheet**: shows `balanced: true` (assets = liabilities + equity).

If both hold, the financial data restored cleanly.
