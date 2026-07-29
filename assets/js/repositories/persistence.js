/* repositories/persistence.js — persistence ports + the localStorage adapter.
 *
 * This is the seam that prepares the project for Firebase WITHOUT implementing it.
 * The app never talks to localStorage directly anymore; it talks to a port. Today
 * the only adapter is `localStateStore` (whole-state in localStorage, matching
 * current behaviour exactly). The Firebase phase will add a second adapter behind
 * the same port — swapping it is the migration, and no other layer changes.
 *
 * ── PORT: StateStore ─────────────────────────────────────────────
 *   read()        -> object | null        load the persisted app state
 *   write(state)  -> boolean              persist the whole app state
 *
 * ── PORT (future, documented only): Repository<T> ────────────────
 *   The Firebase phase adds per-entity repositories with this shape, so that the
 *   whole-state store can be retired collection-by-collection:
 *     list()                 -> T[]
 *     upsert(entity)         -> void
 *     remove(id)             -> void
 *     subscribe(onChange)    -> unsubscribe   (realtime; no-op for localStorage)
 *   No implementation here — this comment IS the contract the adapters must meet.
 */
(function (App) {
  "use strict";

  // localStorage adapter implementing the StateStore port.
  App.repositories.localStateStore = {
    read: function (key) {
      try {
        var d = localStorage.getItem(key);
        return d ? JSON.parse(d) : null;
      } catch (e) { return null; }
    },
    write: function (key, obj) {
      try {
        localStorage.setItem(key, JSON.stringify(obj));
        return true;
      } catch (e) { return false; }
    }
  };

  // The active StateStore used by the persistence facade. A future bootstrap can
  // point this at a Firebase-backed adapter without touching callers.
  App.repositories.stateStore = App.repositories.localStateStore;
})(window.App);
