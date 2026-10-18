// Runs before the first paint: picks theme and language so the page never
// flashes the wrong one. Storage may be unavailable (private mode, blocked).
(function () {
  var root = document.documentElement;
  root.classList.add("js");

  var theme = null;
  var lang = null;
  try {
    theme = localStorage.getItem("td-theme");
    lang = localStorage.getItem("td-lang");
  } catch (e) {}

  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  root.setAttribute("data-theme", theme);

  if (lang !== "en" && lang !== "it") {
    var langs = navigator.languages || [navigator.language || "en"];
    lang = "en";
    for (var i = 0; i < langs.length; i++) {
      var code = String(langs[i]).slice(0, 2).toLowerCase();
      if (code === "it" || code === "en") {
        lang = code;
        break;
      }
    }
  }
  root.setAttribute("lang", lang);
})();
