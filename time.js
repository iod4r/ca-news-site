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

/* Hauteur de la barre du logo, mesuree plutot que devinee.

   Les deux barres sont collantes separement : la barre du logo a top:0, le
   menu a top:var(--head-h). Cette valeur doit donc valoir exactement la
   hauteur de la premiere. Ecrite a la main, elle etait fausse de onze
   pixels et ouvrait une couture par laquelle le contenu defilait entre les
   deux. Elle depend en outre de la police, donc de la langue, et de la
   largeur de l'ecran : aucune constante ne peut la couvrir.

   On la reevalue a chaque changement de taille, et une fois les polices
   chargees -- avant cela les metriques de secours donnent une autre
   hauteur. */
(function () {
  var tete = document.querySelector(".site-head");
  if (!tete || !("ResizeObserver" in window)) {
    // Sans ResizeObserver, une mesure unique vaut toujours mieux que la
    // constante : elle est juste pour la langue et l'ecran courants.
    if (tete) {
      document.documentElement.style.setProperty(
        "--head-h", Math.round(tete.getBoundingClientRect().height) + "px");
    }
    return;
  }

  var dernier = -1;
  function mesurer() {
    var h = Math.round(tete.getBoundingClientRect().height);
    if (h > 0 && h !== dernier) {
      dernier = h;
      document.documentElement.style.setProperty("--head-h", h + "px");
    }
  }

  mesurer();
  new ResizeObserver(mesurer).observe(tete);
  window.addEventListener("orientationchange", mesurer);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(mesurer).catch(function () {});
  }
})();
