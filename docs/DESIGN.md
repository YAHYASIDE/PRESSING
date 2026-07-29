# Product Design System — Mobile First

This product is **mobile-first**. Design every workflow for a phone; desktop only
*expands* the phone layout (via `min-width` queries — never the reverse).

## The 8 rules (normative)

1. **No long forms.** Multi-input flows become step-by-step wizards.
2. **Reception is a wizard.** One decision per step, not one giant form.
3. **One-handed use.** Primary actions live at the bottom (FAB, wizard nav, bottom nav) within thumb reach; tap targets ≥ 44px.
4. **Bottom navigation is primary on phones.** The sidebar becomes a fixed, safe-area-aware bottom bar.
5. **Compact cards.** A card shows only a summary line at rest.
6. **Details on tap.** Full content (stepper, actions, photos) reveals only when a card is tapped.
7. **One-screen rule.** The user rarely scrolls more than one screen; secondary content collapses.
8. **Native feel.** Sheets, FABs, steppers, bottom nav — not a desktop page shrunk down.

## Reusable primitives (`assets/css/mobile.css`)

| Class | Purpose |
|---|---|
| `.fab` | Floating primary action, bottom, above the nav (rule 3). |
| `.wizard` / `.wiz-sheet` / `.wiz-panel` / `.wiz-nav` / `.wiz-dots` | Full-screen step sheet on phones → centered modal on desktop (rules 1–2). |
| `.scroll-x` | Horizontal, thumb-scrollable chip/filter strip. |
| `nav.side` (mobile override) | Fixed bottom navigation with safe-area inset (rule 4). |
| `.press` / 44px min targets | Touch ergonomics (rule 3). |

## Card pattern (rules 5–6)

```
.op-card
  .op-summary   ← the whole tap target (icon · id/plate · stage badge · price · chevron)
  .op-detail    ← max-height:0 at rest; .op-card.open reveals stepper + actions + photos
```
The summary toggles `.op-card.open` in place (no re-render), so the list and scroll
position are preserved.

## Reference implementation

The **Cars** screen follows all eight rules:
- Board of **compact cards**; tapping one expands its **6-stage workflow** + actions.
- A **FAB (+)** opens the **reception wizard** (Vehicle → Customer → Service/Payment →
  Photos/Notes) with bottom-anchored Back / Next / Save.
- **Stage filter chips** in a horizontal scroll strip.
- **Loyalty** collapses into a tap-to-expand section (rule 7).
- On desktop (`min-width: 821px`) the card list becomes a grid and the wizard a
  centered modal — same components, expanded.

## Rule for new screens (Release 3+)

Start from the phone. Build with the primitives above. A screen is done only when it
is comfortable one-handed, its cards are compact with details-on-tap, its primary
action is a bottom FAB or bottom-anchored button, and it needs no horizontal scroll
except deliberate `.scroll-x` strips. Desktop is an afterthought that only widens it.
