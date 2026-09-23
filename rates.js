/* Taux de change des monnaies d'Asie centrale.
 *
 * Cote client, comme la meteo : integrer les taux a la generation ferait
 * changer toutes les pages a chaque passage et detruirait la deduplication.
 *
 * Une seule requete en base USD. Les croisements EUR et RUB se calculent
 * depuis la meme reponse : KZT/EUR = (KZT/USD) / (EUR/USD).
 */
(function () {
  var hote = document.getElementById("change");
  if (!hote) return;

  var MONNAIES = ["KZT", "UZS", "KGS", "TJS", "TMT"];
  var BASES = ["USD", "EUR", "RUB"];
  var SYMBOLE = { USD: "$", EUR: "\u20AC", RUB: "\u20BD" };

  // Le manat turkmene a un taux officiel fixe, tres eloigne du marche reel.
  // L'afficher sans reserve induirait le lecteur en erreur.
  var ADMINISTRE = { TMT: true };

  var CLE = "change-v1";
  var DUREE = 6 * 60 * 60 * 1000;   // ces taux ne bougent qu'une fois par jour

  function lireCache() {
    try {
      var b = JSON.parse(localStorage.getItem(CLE));
      if (b && Date.now() - b.t < DUREE) return b.d;
    } catch (e) { /* stockage indisponible */ }
    return null;
  }

  function ecrireCache(d) {
    try { localStorage.setItem(CLE, JSON.stringify({ t: Date.now(), d: d })); }
    catch (e) { /* quota ou navigation privee */ }
  }

  var locale = document.documentElement.lang || "en";

  function nombre(v) {
    // Precision adaptee a l'ordre de grandeur. Un taux en soums n'a pas
    // besoin de decimales ; un croisement rouble/somoni, si.
    var dec = v >= 100 ? 0 : (v >= 10 ? 1 : (v >= 1 ? 2 : 3));
    try {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: dec, maximumFractionDigits: dec
      }).format(v);
    } catch (e) {
      return v.toFixed(dec);
    }
  }

  var taux = null;
  var base = "USD";

  function afficher() {
    if (!taux) return;
    var html = '<span class="change__bases">';
    for (var b = 0; b < BASES.length; b++) {
      var actif = BASES[b] === base ? ' aria-current="true"' : "";
      html += '<button type="button" class="change__base" data-base="' +
              BASES[b] + '"' + actif + ">" + SYMBOLE[BASES[b]] + "</button>";
    }
    html += "</span>";

    var div = base === "USD" ? 1 : taux[base];
    for (var i = 0; i < MONNAIES.length; i++) {
      var m = MONNAIES[i];
      if (!taux.USD[m] || !div) continue;
      var v = taux.USD[m] / div;
      html += '<span class="change__paire">' +
              '<span class="change__code">' + m + "</span> " +
              '<span class="change__val">' + nombre(v) +
              (ADMINISTRE[m] ? '<abbr class="change__note" title="taux officiel administre">*</abbr>' : "") +
              "</span></span>";
    }
    hote.innerHTML = html;
    hote.hidden = false;
  }

  hote.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".change__base") : null;
    if (!b) return;
    base = b.getAttribute("data-base");
    afficher();
  });

  var cache = lireCache();
  if (cache) { taux = cache; afficher(); return; }

  fetch("https://open.er-api.com/v6/latest/USD")
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (d) {
      if (!d || !d.rates) return;
      var r = d.rates;
      var locales = {};
      for (var i = 0; i < MONNAIES.length; i++) {
        if (r[MONNAIES[i]]) locales[MONNAIES[i]] = r[MONNAIES[i]];
      }
      if (!Object.keys(locales).length || !r.EUR || !r.RUB) return;

      // taux[base] = combien vaut 1 USD dans cette base. Diviser un taux
      // local par ce nombre donne le croisement : KZT/EUR = KZT/USD / EUR/USD
      taux = { USD: locales, EUR: r.EUR, RUB: r.RUB };
      ecrireCache(taux);
      afficher();
    })
    .catch(function () {
      /* Echec silencieux : le bandeau reste masque. */
    });
})();
