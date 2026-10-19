---
name: bug-hunt
description: «🔎 فاحص الأخطاء» for مغاسيل صداقة — hunt real bugs on the owner's LIVE data without writing anything: every card vs its statement, cash boxes, stock, orphan records, duplicate phones, invalid amounts, sync, plus a sweep of every screen (crashes, console errors, NaN/undefined, side-scroll at 360px, Arabic digits, ISO dates). Use when the owner's message STARTS WITH the digit «7» (e.g. «7» or «7 دبو»), or says «افحص التطبيق», «ابحث عن الأخطاء», «فاحص الأخطاء», «هناك خطأ في الحسابات», «الرقم في البطاقة غير الكشف», or after any report that a number looks wrong. Not for new features.
---

# 🔎 فاحص الأخطاء — find bugs on real data, then fix what the owner picks

The owner's Oct 2026 choice («الاثنين معًا»): a repeatable bug hunt (this skill) **and** an in-app button
(الإعدادات ▸ 📱 التطبيق ▸ «🩺 فحص الحسابات» = `auditChecks()` in `index.html`). Both use the SAME checks,
so a bug found here is something he can re-check himself on his phone after the fix.
Everything the owner reads is in **Arabic**. Follow `.claude/skills/pressing-app/SKILL.md` for building/testing/releasing.

**Trigger rule:** a message whose first character is **7** = run this skill. Text after «7» narrows it
(«7 دبو» → focus on دبو screens/records; «7 يحي» → that customer). Plain «7» = everything.

## 1. Run the hunter (read-only — never writes to Firestore)

```bash
python3 -m http.server 8123 >/dev/null 2>&1 &        # if not already serving
node tests/audit/live_audit.js --out "$SCRATCH/audit"  # live data (Firestore REST read only)
node tests/audit/live_audit.js --file data.json         # or a saved copy / an exported backup
```
- The page's Firestore/Google calls are blocked and `save()`/`cloudPush` are disabled, so nothing is written.
- Output: an Arabic list (❌ errors first, then ⚠️ warnings) + `audit.json`. **Never commit `audit.json`
  or the data** (customer names/phones) — keep them in the scratchpad.

## 2. Understand each finding before touching code

For every ❌, open the records behind it (`node -e` on the saved JSON) and find the **cause**, not just the symptom:
- «كشف X لا يطابق رصيده» → `custLedger(c)` added «⚖️ تسوية سجلات قديمة»: some record is marked paid/changed
  without the matching movement (e.g. a «له» debt paid with no `storeCash` out, an old مقاصة, a deleted debt).
  Read `state.activity` around that time to tell the owner what happened.
- card ≠ statement in دبو / عامل → compare `brickPartyRows` / `brickPorterJobs` with `brickParties` / `brickPersonBalance`.
- orphan record / duplicate phone / negative stock / negative box → usually **data**, not code: explain and
  suggest the fix in the app (edit the phone, record an «إيداع», delete the wrong record) — don't patch data silently.
- crash / console error / NaN / side-scroll / Arabic digits / ISO date on a screen → **code** bug: fix it.
Also verify suspicions the checks can't see (e.g. "the card shows X") by rendering that screen with the real
data (pattern in `tests/audit/live_audit.js`) and screenshotting it.

## 3. Report, ask, fix

1. Arabic report: what was checked (numbers + screens), each finding with its **cause** in simple words and
   whether it's a code bug or a data problem, with screenshots when useful.
2. `AskUserQuestion` (recommended first): which to fix now. Code bugs he confirms → fix + add the case to a
   test (`tests/e2e/audit.test.js` for audit rules, or the feature's suite) → `bash tests/run.sh` → release.
   Data problems → tell him exactly where to tap; never change his records without his explicit OK.
3. **A new kind of bug = a new check.** Add it to `auditChecks()` (so his in-app button catches it next time)
   and to `tests/e2e/audit.test.js`. Screen-level checks go in `tests/audit/live_audit.js`.
4. Re-run the hunter after the release: the report should be clean (or only the data items he chose to keep).

## Checks today (keep this list in sync with `auditChecks()` and the sweep)
Numbers: customer statement = balance · دبو party statement = card · دبو worker/porter statement = card ·
amounts are valid numbers ≥ 0 · paid ≤ total · stock ≥ 0 (store, bricks per type, cement, sand) · cash boxes ≥ 0 ·
records point to existing people · cash moves point to existing records · no duplicate ids · no two customers
(or suppliers) with one phone · valid dates · local save / cloud upload / document size.
Screens (`live_audit.js`): every tab and sub-tab at 360px with all dates — opens without crash, no console
errors, no NaN/undefined/[object Object], no side-scroll, no Arabic-Indic digits, no ISO dates; every
statement (store, customer, supplier, دبو party, دبو worker, laundry worker) opens; Settings open.
