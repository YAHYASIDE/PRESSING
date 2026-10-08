---
name: taste
description: «ذوق» — premium, anti-slop UI polish for مغاسيل صداقة (single index.html, Arabic RTL, phone-first PWA). Use when the owner's message STARTS WITH the digit «6» (e.g. «6 شاشة السيارات مزدحمة»), or writes «/taste», «حسّن الواجهة», «الشكل», «التصميم», «ذوق». Audit the named screen with the redesign checklist, apply targeted CSS/markup upgrades that break nothing, keep all ids/classes the tests rely on, run the full test suite, show before/after screenshots, then release. Not for new features or money logic.
---

# ذوق — UI taste skill for مغاسيل صداقة

Adapted from **leonxlnx/taste-skill** (MIT). The owner's app is a product UI (forms, lists, cash
numbers) used on phones by a supervisor and the owner, in Arabic RTL with Latin digits. So the
primary reference is `references/redesign.md` (audit-then-fix for existing apps). `references/taste-v2.md`
is for landing-like surfaces only (the lock screen, receipts, reports pages); `minimalist.md` and
`soft.md` are aesthetic directions to pick from when the owner asks for a "feel".

**Trigger rule (this repo):** a message whose first character is the digit **6** means
«حسّن واجهة ما يلي». Strip the «6» and treat the rest as the target (a screen, a panel, a modal, or
"الكل"). No target = ask which screen, with the three most crowded ones as options.

## Hard limits (never violated by a taste pass)
- One `index.html`, no build tools, no new CDN scripts; fonts only via the existing Tajawal link.
- Keep every `id`, `data-*` attribute and class name that `tests/e2e/*.test.js` or `bot/app-vm.js`
  reference. Add classes; do not rename or remove.
- Do not touch money logic, sync, merge, ids, closed-day flows, or the Firebase block.
- RTL stays RTL; digits stay Latin (`ar-u-nu-latn`); currency label unchanged; both themes
  (light + `state.dark`) must stay legible; `prefers-reduced-motion` respected.
- Phone first: 360–430px wide, one hand, thumb reach; no horizontal scroll.
- No emoji as the only icon for a primary action (the app already uses inline SVG icons in `I`).
- Version bump in both `sw.js` and `index.html`; `bash tests/run.sh` must be ALL GREEN.

## Procedure
1. **Read** the target: `grep -n` the screen function (`screenX`/`bindX`) and its CSS block; take a
   phone screenshot (Playwright, 400×900, deviceScaleFactor 2) as **before**.
2. **Design read (one line, Arabic):** who uses it, what the one job of the screen is, what the eye
   should land on first. Pick dials from `references/taste-v2.md` §1 (variance low, motion 1–2,
   density by screen: lists dense, forms calm).
3. **Audit** with `references/redesign.md`: typography (scale, weights, tabular numbers on money),
   color (one accent, semantic colors for paid/unpaid/ready only), spacing (8px grid, consistent
   card padding), hierarchy (one primary button per view, secondary actions quieter or folded),
   states (empty, loading, disabled, pressed), AI tells (gradient-everything, equal-weight cards,
   uppercase labels everywhere, centered everything).
4. **Fix** in place: token-level CSS first (`:root` variables), then component rules, then the
   smallest markup changes. Fold rarely-used actions; never delete an action.
5. **Verify**: `bash tests/run.sh` (all suites), **after** screenshot in light and dark, 400px and
   desktop; check no overflow (`scrollWidth <= innerWidth`).
6. **Release**: version bump, CLAUDE.md note under the version, commit, push branch, fast-forward
   `main`, confirm Pages + APK, send before/after screenshots and the owner's update step.

## Output to the owner (Arabic)
- One line: the design read.
- Three to six bullets: what changed and why, in plain words (no CSS names).
- Before/after screenshots.
- The update step: «الإعدادات ▸ 📱 التطبيق ▸ 🔄 تحديث التطبيق الآن».
