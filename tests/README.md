# Tests

Washly has no build step, so tests run the real `index.html` directly in a
headless Chromium via Playwright — the same code path a user's browser takes.

## Running

```bash
node tests/smoke.test.js
```

The environment provides Playwright + Chromium (`PLAYWRIGHT_BROWSERS_PATH` is
preconfigured). On another machine: `npm i -D playwright && npx playwright install chromium`.

## What `smoke.test.js` covers

It is the release gate. It:

1. Loads the app from disk and completes the setup wizard for a business with
   **all five activity types** enabled.
2. Turns on **every optional feature module**.
3. Seeds data across POS, CRM, operations, membership and packages.
4. Renders **every primary tab** plus sub-screens (operation detail, CRM profile
   tabs, every report tab, every accounting tab, subscription, the fullscreen
   queue board, and the settings modal) on **both** a 390px mobile viewport and a
   1280px desktop viewport.
5. Fails the process (non-zero exit) on **any** console error, page error, or a
   tab that fails to render.

A green run means every screen mounts without a runtime error on both form
factors — the single most important pre-deploy check for this app.

## Adding tests

Keep tests dependency-light and driven through the app's public surface
(`App.services.*` for actions, `App.core.*` for assertions, `render()` for UI).
Assert on the typed `Result` objects services return, and always fail on console
errors.
