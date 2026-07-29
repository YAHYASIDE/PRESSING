/* app.namespace.js — single global root for the layered architecture.
 *
 * Conservative migration (no build tools, classic scripts): instead of scattering
 * ~140 bare globals across files, every layer publishes its members onto ONE root
 * object, `App`. During the transition the existing bare globals remain as aliases
 * so inline handlers and cross-file calls keep working unchanged; they are removed
 * one layer at a time once all callers read from `App.*`.
 *
 * Layer dependency rule (must point downward only):
 *   pages ──▶ services ──▶ core
 *     │           │           ▲
 *     └──▶ ui      └──▶ repositories (ports; localStorage now, Firebase later)
 *
 * See docs/MIGRATION.md for the commit-by-commit plan.
 */
(function (root) {
  root.App = root.App || {};
  var App = root.App;
  App.config       = App.config       || {};   // constants (currency, prices, icons)
  App.store        = App.store        || {};   // in-memory app state object (to be dissolved later)
  App.core         = App.core         || {};   // pure domain rules: no DOM, no I/O
  App.repositories = App.repositories || {};   // persistence ports + adapters
  App.services     = App.services     || {};   // use-cases: orchestrate core + repositories
  App.ui           = App.ui           || {};   // reusable presentation primitives
  App.pages        = App.pages        || {};   // per-screen render + wiring
})(window);
