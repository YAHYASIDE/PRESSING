# Production Checklist — Washly v1.0

Gate for promoting `1.0.0` to a live deployment. Work top-to-bottom; do not
go live with an unchecked **Blocker**.

---

## Blockers (must be done)

- [ ] **Change the default access codes.** On first run, set a non-default app
      unlock code and meter code in **Settings**. The seed default (`0707`) must
      not survive to production.
- [ ] **Serve over HTTPS.** Web Audio (queue alert), Fullscreen (TV board),
      FileReader (import) and Clipboard need a secure context.
- [ ] **Smoke test green.** `node tests/smoke.test.js` passes (every page renders
      on mobile + desktop, zero console errors).
- [ ] **Backup drilled.** Export a backup, wipe the browser profile, re-import,
      and confirm data returns (see `docs/BACKUP_RECOVERY.md`). Do this once
      before trusting a real shop's data to the app.
- [ ] **Data-loss warning verified.** Confirm the app warns when localStorage is
      full (it surfaces a toast and blocks silent loss).

## Strongly recommended

- [ ] **Self-host the font** for a guaranteed-offline install (removes the only
      third-party request; see the deployment guide). Otherwise verify the
      system-font fallback looks acceptable.
- [ ] **Pin/scope the deployment URL.** Relative asset paths mean it runs from any
      sub-path; confirm the final URL loads all CSS/JS (check the network tab for
      404s).
- [ ] **Set an update story.** Because assets are cached by the browser, plan how
      users get a new version (hard refresh, or cache-busting query strings on the
      `<script>`/`<link>` tags at deploy time).
- [ ] **Decide the data-portability policy.** This is a single-device app; if a
      shop uses more than one device, document the export/import handoff for staff.

## Functional review (spot-check on a real device)

- [ ] Setup wizard completes and creates the first manager.
- [ ] POS: mixed product+service cart, discount/coupon, split payment, hold/resume,
      refund, reprint. Receipt QR scans.
- [ ] Car wash flow: receive → washing → drying → ready → deliver; pickup code +
      QR generated at *ready*; verify hands over.
- [ ] Inspection: checklist + both signatures capture; printable report opens.
- [ ] Oil change: posts to ledger, decrements inventory, sets next-service reminder.
- [ ] CRM: profile, timeline, vehicles, membership tab; loyalty tier badge updates.
- [ ] Membership + package: buy (posts an invoice), redeem decrements balance,
      auto-renew toggles.
- [ ] Reports: every tab renders; CSV export opens in a spreadsheet with correct
      Arabic (UTF-8 BOM).
- [ ] Accounting: Trial Balance balances; Balance Sheet `balanced: true`.
- [ ] Queue board: fullscreen, auto-refresh, sound alert on a car turning ready.

## Non-functional

- [ ] **Performance:** first paint is fast (static files, no bundler). Confirm no
      404 blocks render; confirm the font `display=swap` doesn't flash-hide text.
- [ ] **Memory:** the queue board runs a 4s timer; it is cleared on close
      (`closeQueueDisplay`). Confirm long TV sessions stay flat in memory.
- [ ] **Responsive:** check 360–414px phones and a desktop; RTL layout holds,
      no horizontal scroll.
- [ ] **Accessibility:** icon-only buttons have `title`/`aria-label`; `lang="ar"`
      and `dir="rtl"` set; color contrast acceptable in light and dark themes.
- [ ] **Print:** receipts and the inspection report print cleanly (print CSS
      hides chrome). "Save as PDF" from the browser print dialog is the supported
      PDF path — verify it produces a clean one-page document.

## Sign-off

- [ ] Version string reads `1.0.0` in **Settings** and on the welcome screen.
- [ ] `RELEASE_NOTES_v1.md`, `docs/DEPLOYMENT_GUIDE.md` and
      `docs/BACKUP_RECOVERY.md` reviewed by whoever operates the deployment.
- [ ] Rollback plan understood (redeploy previous commit; user data is
      version-tolerant).
