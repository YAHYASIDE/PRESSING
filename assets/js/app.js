/* app.js — starter interactions. Replace as the app grows. */
(function () {
  "use strict";

  // current year in the footer
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // light / dark theme toggle (remembers the choice, falls back to system)
  var KEY = "theme";
  var root = document.documentElement;
  var toggle = document.getElementById("themeToggle");

  function apply(theme) {
    if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
    if (toggle) toggle.textContent = current() === "dark" ? "☀️" : "🌙";
  }
  function current() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  try { apply(localStorage.getItem(KEY)); } catch (e) { apply(null); }

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
    });
  }

  var cta = document.getElementById("ctaBtn");
  if (cta) cta.addEventListener("click", function () {
    document.getElementById("about").scrollIntoView({ behavior: "smooth" });
  });
})();
