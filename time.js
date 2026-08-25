/* Le HTML est statique et régénéré quelques fois par jour :
   l'heure absolue est rendue côté serveur (toujours juste, y compris sans JS),
   puis convertie en relatif ici, à l'instant de la lecture. */
(function () {
  var locale = document.documentElement.lang || "en";
  var rtf = null;
  try {
    rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  } catch (e) {
    try { rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" }); }
    catch (e2) { return; }   // pas d'Intl : on garde l'heure absolue
  }

  var UNITS = [
    ["year",   31536000], ["month", 2592000], ["week", 604800],
    ["day",       86400], ["hour",     3600], ["minute",   60]
  ];

  function relative(then, now) {
    var diff = (then - now) / 1000, abs = Math.abs(diff);
    for (var i = 0; i < UNITS.length; i++) {
      if (abs >= UNITS[i][1]) {
        return rtf.format(Math.round(diff / UNITS[i][1]), UNITS[i][0]);
      }
    }
    return rtf.format(Math.round(diff / 60), "minute");
  }

  function paint() {
    var now = Date.now();
    document.querySelectorAll("time[data-relative]").forEach(function (el) {
      var t = Date.parse(el.getAttribute("datetime"));
      if (isNaN(t)) return;
      if (!el.title) el.title = el.textContent.trim();  // absolu au survol
      el.textContent = relative(t, now);
    });
  }

  paint();
  setInterval(paint, 60000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) paint();
  });
})();
